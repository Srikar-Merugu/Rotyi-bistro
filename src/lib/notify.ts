import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { db } from "./supabase/server";
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

/** Branded email shell. `lines` are pre-escaped HTML snippets. */
export function emailLayout(title: string, lines: string[], cta?: { label: string; href: string }, hu = true) {
  return `<!doctype html><html><body style="margin:0;background:#f6e6d0;font-family:Arial,Helvetica,sans-serif;color:#221a16">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" style="max-width:560px;background:#fbf3e7;border-radius:18px;border:2px solid #221a16">
<tr><td style="background:#c62d17;border-radius:16px 16px 0 0;padding:18px 24px;color:#fbf3e7;font-size:28px;font-weight:900;letter-spacing:1px">ROTYI</td></tr>
<tr><td style="padding:24px">
<h1 style="margin:0 0 12px;font-size:24px;color:#b8281a">${esc(title)}</h1>
${lines.map((l) => `<p style="margin:0 0 10px;font-size:16px;line-height:1.5">${l}</p>`).join("")}
${cta ? `<p style="margin:20px 0 0"><a href="${cta.href}" style="background:#221a16;color:#f6e6d0;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:bold">${esc(cta.label)}</a></p>` : ""}
</td></tr>
<tr><td style="padding:14px 24px;border-top:1px solid #e5d4bd;font-size:12px;color:#7a6a5c">${esc(venue.name)} · ${esc(venue.street)}, ${venue.postalCode} ${venue.city}<br>${
    hu ? "Ez egy Kyro Studio demó. A Rotyi Bisztró kitalált hely." : "This is a Kyro Studio demo. Rotyi Bistro is fictional."
  }</td></tr>
</table></td></tr></table></body></html>`;
}

export { esc, SITE_URL };
