"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { bookableDates, emailOk, phoneOk, slotsFor, MAX_PARTY, type BookingPayload } from "@/lib/booking";
import { getDictionary } from "@/lib/i18n";
import { menuItems } from "@/lib/menu";
import type { Locale } from "@/lib/routes";
import { trackEvent } from "@/lib/analytics";
import { useTable } from "./table-provider";
import { GroupForm } from "./group-form";

type Step = "date" | "time" | "party" | "details" | "done" | "group";

// "Now" is read once on the client; on the server it's null so the date chips
// render as skeletons and never mismatch on hydration.
let clientNow: Date | null = null;
const getNow = () => (clientNow ??= new Date());
const noSubscribe = () => () => {};

export function BookingFlow({ lang, compact = false }: { lang: Locale; compact?: boolean }) {
  const t = getDictionary(lang).booking;
  const { items, clear } = useTable();
  const now = useSyncExternalStore(noSubscribe, getNow, () => null);
  const [step, setStep] = useState<Step>("date");
  const [date, setDate] = useState<string>("");
  const [time, setTime] = useState<string>("");
  const [party, setParty] = useState<number>(2);
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const headingRef = useRef<HTMLHeadingElement>(null);

  const dates = useMemo(() => (now ? bookableDates(14, now) : []), [now]);
  const slots = useMemo(() => (date && now ? slotsFor(date, now) : { lunch: [], dinner: [] }), [date, now]);

  const dishNames = items
    .map((id) => menuItems.find((m) => m.id === id)?.name[lang])
    .filter(Boolean) as string[];

  useEffect(() => {
    if (step !== "date") headingRef.current?.focus();
  }, [step]);

  const todayStr = now ? new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Budapest" }).format(now) : "";
  const fmtDate = (d: string) => {
    const [y, m, day] = d.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, day));
    const loc = lang === "hu" ? "hu-HU" : "en-GB";
    return {
      top: d === todayStr ? t.today : new Intl.DateTimeFormat(loc, { weekday: "short", timeZone: "UTC" }).format(dt),
      bottom: new Intl.DateTimeFormat(loc, { day: "numeric", month: "short", timeZone: "UTC" }).format(dt),
    };
  };

  const longDate = (d: string) => {
    if (!d) return "";
    const [y, m, day] = d.split("-").map(Number);
    return new Intl.DateTimeFormat(lang === "hu" ? "hu-HU" : "en-GB", {
      weekday: "long",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(y, m - 1, day)));
  };

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload: BookingPayload = {
      kind: "table",
      lang,
      date,
      time,
      partySize: party,
      name: String(f.get("name") ?? "").trim(),
      phone: String(f.get("phone") ?? "").trim(),
      email: String(f.get("email") ?? "").trim(),
      note: String(f.get("note") ?? "").trim(),
      dishes: dishNames,
      company: String(f.get("company") ?? ""),
    };
    const errs: Record<string, string> = {};
    if (!payload.name) errs.name = t.required;
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
      if (!res.ok) throw new Error(String(res.status));
      trackEvent("booking_submitted", { party_size: party, kind: "table", lang });
      clear();
      setStatus("idle");
      setStep("done");
    } catch {
      setStatus("error");
    }
  }

  const reset = () => {
    setStep("date");
    setDate("");
    setTime("");
    setStatus("idle");
  };

  const stepNo = step === "date" ? 1 : step === "time" ? 2 : step === "party" ? 3 : 4;
  const chip =
    "min-h-12 rounded-2xl border-2 border-ink/15 bg-cream-soft px-3 py-2 font-[family-name:var(--font-display)] uppercase tracking-wide text-ink transition hover:-translate-y-0.5 hover:border-ink aria-pressed:border-paprika-ink aria-pressed:bg-paprika-ink aria-pressed:text-white";

  return (
    <div className={compact ? "" : "rounded-[2rem] bg-cream-soft p-5 shadow-[0_8px_0_rgb(0_0_0/0.12)] sm:p-8"}>
      {step !== "done" && step !== "group" && (
        <div className="mb-5 flex items-center justify-between gap-3">
          <p className="font-[family-name:var(--font-display)] uppercase tracking-wide text-paprika-ink">
            {t.step(stepNo)} / 4
          </p>
          <div className="flex gap-1.5" aria-hidden>
            {[1, 2, 3, 4].map((n) => (
              <span key={n} className={`h-2 w-8 rounded-full ${n <= stepNo ? "bg-paprika-ink" : "bg-ink/15"}`} />
            ))}
          </div>
        </div>
      )}

      {(date || time) && step !== "done" && step !== "group" && (
        <p className="mb-4 rounded-xl bg-mustard/60 px-3 py-2 text-base font-semibold" aria-live="polite">
          {date && longDate(date)}
          {time && ` · ${time}`}
          {step === "details" && ` · ${party} ${lang === "hu" ? "fő" : party === 1 ? "guest" : "guests"}`}
        </p>
      )}

      {step === "date" && (
        <fieldset>
          <legend className="display mb-4 text-3xl sm:text-4xl">{t.date}</legend>
          <div className="hide-scrollbar -mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2">
            {!now &&
              Array.from({ length: 7 }).map((_, i) => (
                <span key={i} className="h-[72px] w-[78px] shrink-0 animate-pulse rounded-2xl bg-ink/10" />
              ))}
            {dates.map((d) => {
              const label = fmtDate(d);
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={d === date}
                  onClick={() => {
                    setDate(d);
                    setTime("");
                    setStep("time");
                  }}
                  className={`${chip} flex w-[78px] shrink-0 snap-start flex-col items-center leading-tight`}
                >
                  <span className="text-sm opacity-80">{label.top}</span>
                  <span className="text-lg">{label.bottom}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {step === "time" && (
        <fieldset>
          <legend>
            <h3 ref={headingRef} tabIndex={-1} className="display mb-4 text-3xl outline-none sm:text-4xl">
              {t.time}
            </h3>
          </legend>
          {(["lunch", "dinner"] as const).map((k) =>
            slots[k].length ? (
              <div key={k} className="mb-4">
                <p className="mb-2 text-sm font-bold uppercase tracking-wider text-ink/70">{t[k]}</p>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                  {slots[k].map((s) => (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={s === time}
                      onClick={() => {
                        setTime(s);
                        setStep("party");
                      }}
                      className={chip}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : null,
          )}
          <BackButton label={t.back} onClick={() => setStep("date")} />
        </fieldset>
      )}

      {step === "party" && (
        <fieldset>
          <legend>
            <h3 ref={headingRef} tabIndex={-1} className="display mb-4 text-3xl outline-none sm:text-4xl">
              {t.party}
            </h3>
          </legend>
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: MAX_PARTY }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={n === party}
                onClick={() => {
                  setParty(n);
                  setStep("details");
                }}
                className={`${chip} text-2xl`}
              >
                {n}
              </button>
            ))}
            <button type="button" onClick={() => setStep("group")} className={`${chip} text-xl`}>
              {t.group}
            </button>
          </div>
          <p className="mt-3 text-base text-ink/70">{t.groupHint}</p>
          <BackButton label={t.back} onClick={() => setStep("time")} />
        </fieldset>
      )}

      {step === "details" && (
        <form onSubmit={submit} noValidate>
          <h3 ref={headingRef} tabIndex={-1} className="display mb-4 text-3xl outline-none sm:text-4xl">
            {t.details}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field name="name" label={t.name} autoComplete="name" error={errors.name} className="sm:col-span-2" />
            <Field name="phone" label={t.phone} type="tel" autoComplete="tel" inputMode="tel" error={errors.phone} />
            <Field name="email" label={t.email} type="email" autoComplete="email" inputMode="email" error={errors.email} />
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-base font-semibold">{t.noteLabel}</span>
              <textarea
                name="note"
                rows={2}
                defaultValue={dishNames.length ? `${getDictionary(lang).table.wishes}: ${dishNames.join(", ")}` : ""}
                className="w-full rounded-xl border-2 border-ink/20 bg-white px-3 py-2 text-lg focus:border-ink focus:outline-none"
              />
            </label>
            {/* honeypot */}
            <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
          </div>
          <p className="mt-3 text-sm text-ink/70">{t.privacy}</p>
          {status === "error" && (
            <p role="alert" className="mt-3 rounded-xl bg-paprika-ink px-3 py-2 font-semibold text-white">
              {t.error}
            </p>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button type="submit" disabled={status === "sending"} className="pill pill-red disabled:opacity-60">
              {status === "sending" ? t.sending : t.submit}
            </button>
            <BackButton label={t.back} onClick={() => setStep("party")} inline />
          </div>
        </form>
      )}

      {step === "group" && (
        <div>
          <GroupForm lang={lang} initialDate={date} />
          <BackButton label={t.back} onClick={() => setStep("party")} />
        </div>
      )}

      {step === "done" && (
        <div className="py-6 text-center" role="status">
          <p className="display text-6xl text-paprika-ink">{t.successTitle}</p>
          <p className="mx-auto mt-3 max-w-sm text-lg">{t.successBody}</p>
          <p className="mt-2 font-semibold">{t.summary(longDate(date), time, party)}</p>
          <button type="button" onClick={reset} className="pill pill-ink mt-6">
            {t.again}
          </button>
        </div>
      )}
    </div>
  );
}

function BackButton({ label, onClick, inline }: { label: string; onClick: () => void; inline?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${inline ? "" : "mt-4"} min-h-12 px-2 font-semibold underline decoration-2 underline-offset-4`}
    >
      ← {label}
    </button>
  );
}

export function Field({
  label,
  error,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; name: string }) {
  const id = `f-${props.name}`;
  return (
    <label className={`block ${className ?? ""}`} htmlFor={id}>
      <span className="mb-1 block text-base font-semibold">{label}</span>
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-err` : undefined}
        className="min-h-12 w-full rounded-xl border-2 border-ink/20 bg-white px-3 text-lg focus:border-ink focus:outline-none aria-invalid:border-paprika-ink"
        {...props}
      />
      {error && (
        <span id={`${id}-err`} className="mt-1 block text-sm font-semibold text-paprika-ink">
          {error}
        </span>
      )}
    </label>
  );
}
