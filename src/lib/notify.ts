import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { db } from "./supabase/server";
import { brandedEmail } from "./email-template";
export { brandedEmail };
import { SITE_URL, venue } from "./site";

// Every event writes an in-app alert (Realtime pushes it to admin/kitchen
// screens) and, where relevant, an email. Emails always land in the outbox
// table first so admin can see what was sent, failed or skipped.

type Ref = { type: "booking" | "order" | "system"; id?: string };

export async function alert(audience: "admin" | "kitchen" | "all", kind: string, title: string, body: string, ref?: Ref) {
  await db().from("notifications").insert({ audience, kind, title, body, ref_type: ref?.type ?? null, ref_id: ref?.id ?? null });
}

export async function ownerEmail(): Promise<string | null> {
  if (process.env.BOOKING_INBOX) return process.env.BOOKING_INBOX;
  const { data } = await db().from("settings").select("owner_email").maybeSingle();
  return data?.owner_email ?? null;
}

export async function sendEmail(to: string | null | undefined, subject: string, html: string, kind: string, ref?: Ref) {
  if (!to) return "skipped" as const;
  const { data: row } = await db()
    .from("email_outbox")
    .insert({ to_email: to, subject, html, kind, ref_type: ref?.type ?? null, ref_id: ref?.id ?? null })
    .select("id")
    .single();
  try {
    const providerId = await deliver(to, subject, html);
    if (!providerId) {
      await db().from("email_outbox").update({ status: "skipped", error: "No SMTP_HOST or RESEND_API_KEY configured" }).eq("id", row!.id);
      return "skipped" as const;
    }
    await db().from("email_outbox").update({ status: "sent", sent_at: new Date().toISOString(), provider_id: providerId }).eq("id", row!.id);
    return "sent" as const;
  } catch (e) {
    await db().from("email_outbox").update({ status: "failed", error: String(e).slice(0, 500) }).eq("id", row!.id);
    return "failed" as const;
  }
}

const fromAddress = () => process.env.MAIL_FROM ?? process.env.BOOKING_FROM ?? `${venue.name} <${process.env.SMTP_USER ?? "onboarding@resend.dev"}>`;

let smtp: Transporter | null = null;

/** SMTP first (e.g. Gmail app password, Brevo, Mailgun); Resend as fallback. Returns a message id, or null if no provider is configured. */
async function deliver(to: string, subject: string, html: string): Promise<string | null> {
  if (process.env.SMTP_HOST) {
    const port = Number(process.env.SMTP_PORT ?? 587);
    smtp ??= nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
    const info = await smtp.sendMail({ from: fromAddress(), to, subject, html });
    return info.messageId ?? "smtp";
  }
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from: fromAddress(), to, subject, html }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message ?? `HTTP ${res.status}`);
  return json.id ?? "resend";
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Simple branded email: title + paragraphs (+ optional button). See email-template.ts for the full layout. */
export function emailLayout(title: string, lines: string[], cta?: { label: string; href: string }, hu = true) {
  return brandedEmail({ title, paragraphs: lines, cta, hu });
}

/** "csütörtök, október 8." / "Thursday 8 October" from YYYY-MM-DD. */
export function niceDate(date: string, hu: boolean) {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat(hu ? "hu-HU" : "en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
}

export { esc, SITE_URL };
