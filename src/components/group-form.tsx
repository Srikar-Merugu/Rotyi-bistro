"use client";

import { useState } from "react";
import { emailOk, phoneOk, MAX_GROUP, type BookingPayload } from "@/lib/booking";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/routes";
import { trackEvent } from "@/lib/analytics";
import { Field } from "./booking-flow";

export function GroupForm({ lang, initialDate = "" }: { lang: Locale; initialDate?: string }) {
  const dict = getDictionary(lang);
  const t = dict.booking;
  const g = dict.groupForm;
  const [status, setStatus] = useState<"idle" | "sending" | "error" | "done">("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload: BookingPayload = {
      kind: "group",
      lang,
      date: String(f.get("date") ?? ""),
      time: String(f.get("time") ?? ""),
      partySize: Number(f.get("size") ?? 8),
      name: String(f.get("name") ?? "").trim(),
      phone: String(f.get("phone") ?? "").trim(),
      email: String(f.get("email") ?? "").trim(),
      occasion: String(f.get("occasion") ?? "").trim(),
      note: String(f.get("note") ?? "").trim(),
      company: String(f.get("company") ?? ""),
    };
    const errs: Record<string, string> = {};
    if (!payload.name) errs.name = t.required;
    if (!payload.date) errs.date = t.required;
    if (!phoneOk(payload.phone)) errs.phone = payload.phone ? t.invalidPhone : t.required;
    if (!emailOk(payload.email)) errs.email = payload.email ? t.invalidEmail : t.required;
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      trackEvent("booking_submitted", { party_size: payload.partySize, kind: "group", lang });
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done")
    return (
      <div className="py-6 text-center" role="status">
        <p className="display text-6xl text-paprika-ink">{t.successTitle}</p>
        <p className="mx-auto mt-3 max-w-sm text-lg">{t.successBody}</p>
      </div>
    );

  return (
    <form onSubmit={submit} noValidate>
      <span className="sticker mb-2">{g.sticker}</span>
      <h2 className="display mb-2 text-3xl sm:text-4xl">{g.title}</h2>
      <p className="mb-4 text-lg text-ink/80">{g.lead}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field name="name" label={t.name} autoComplete="name" error={errors.name} className="sm:col-span-2" />
        <Field name="phone" label={t.phone} type="tel" autoComplete="tel" error={errors.phone} />
        <Field name="email" label={t.email} type="email" autoComplete="email" error={errors.email} />
        <Field name="date" label={t.date} type="date" defaultValue={initialDate} error={errors.date} />
        <Field name="time" label={t.time} type="time" defaultValue="19:00" step={1800} />
        <Field name="size" label={g.size} type="number" min={8} max={MAX_GROUP} defaultValue={10} />
        <Field name="occasion" label={g.occasion} />
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-base font-semibold">{t.noteLabel}</span>
          <textarea
            name="note"
            rows={3}
            className="w-full rounded-xl border-2 border-ink/20 bg-white px-3 py-2 text-lg focus:border-ink focus:outline-none"
          />
        </label>
        <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      </div>
      {status === "error" && (
        <p role="alert" className="mt-3 rounded-xl bg-paprika-ink px-3 py-2 font-semibold text-white">
          {t.error}
        </p>
      )}
      <button type="submit" disabled={status === "sending"} className="pill pill-red mt-5 disabled:opacity-60">
        {status === "sending" ? t.sending : g.submit}
      </button>
    </form>
  );
}
