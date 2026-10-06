"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { bookableDates, emailOk, phoneOk, slotsFor, MAX_PARTY, type BookingPayload } from "@/lib/booking";
import { getDictionary } from "@/lib/i18n";
import { menuItems } from "@/lib/menu";
import type { Locale } from "@/lib/routes";
import { trackEvent } from "@/lib/analytics";
import { useTable } from "./table-provider";
import { useOpenAllDayDate } from "@/lib/venue-status";
import { GroupForm } from "./group-form";

type Step = "date" | "party" | "time" | "details" | "done" | "group";
type Slot = { time: string; available: boolean };

const extra = {
  hu: { more: "Több nap", less: "Kevesebb nap", full: "Telt ház", loading: "Szabad asztalok keresése…", noneTitle: "Erre a napra nincs szabad asztal", none: "Válassz másik napot vagy kisebb létszámot, vagy hívj minket.", taken: "Ezt az időpontot közben lefoglalták. Válassz másikat!" },
  en: { more: "More days", less: "Fewer days", full: "Full", loading: "Checking free tables…", noneTitle: "No free table that day", none: "Try another day or a smaller group, or give us a call.", taken: "That time was just taken. Please pick another." },
};

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
  const [allDays, setAllDays] = useState(false);
  const [avail, setAvail] = useState<{ key: string; lunch: Slot[]; dinner: Slot[] } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const x = extra[lang];
  const headingRef = useRef<HTMLHeadingElement>(null);

  const openAllDayDate = useOpenAllDayDate();
  const dates = useMemo(() => (now ? bookableDates(14, now, openAllDayDate) : []), [now, openAllDayDate]);
  const availKey = `${date}|${party}`;
  const baseSlots = useMemo(() => (date && now ? slotsFor(date, now, openAllDayDate) : { lunch: [], dinner: [] }), [date, now, openAllDayDate]);
  // Free tables for this date + party size; until it loads, show times as checking.
  const slots = avail && avail.key === availKey ? avail : null;

  useEffect(() => {
    if (step !== "time" || !date) return;
    let stop = false;
    fetch(`/api/availability?date=${date}&party=${party}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (stop) return;
        // No database (local demo): treat every time as free.
        const all = (list: string[]) => list.map((time) => ({ time, available: true }));
        setAvail({ key: `${date}|${party}`, lunch: d?.lunch ?? all(baseSlots.lunch), dinner: d?.dinner ?? all(baseSlots.dinner) });
      })
      .catch(() => {});
    return () => {
      stop = true;
    };
  }, [step, date, party, baseSlots]);

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
      dishIds: items.filter((id) => menuItems.some((m) => m.id === id)),
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
      if (res.status === 409) {
        setStatus("idle");
        setTime("");
        setAvail(null);
        setNotice(x.taken);
        setStep("time");
        return;
      }
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

  const stepNo = step === "date" ? 1 : step === "party" ? 2 : step === "time" ? 3 : 4;
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
          {(step === "time" || step === "details") && ` · ${party} ${lang === "hu" ? "fő" : party === 1 ? "guest" : "guests"}`}
          {time && ` · ${time}`}
        </p>
      )}

      {step === "date" && (
        <fieldset>
          <legend className="display mb-4 text-3xl sm:text-4xl">{t.date}</legend>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {!now &&
              Array.from({ length: 8 }).map((_, i) => (
                <span key={i} className="h-[68px] animate-pulse rounded-2xl bg-ink/10" />
              ))}
            {dates.map((d, i) => {
              const label = fmtDate(d);
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={d === date}
                  onClick={() => {
                    setDate(d);
                    setTime("");
                    setNotice(null);
                    setStep("party");
                  }}
                  className={`${chip} min-w-0 flex-col items-center !px-1 leading-tight ${i >= 8 && !allDays ? "hidden sm:flex" : "flex"}`}
                >
                  <span className="text-sm opacity-80">{label.top}</span>
                  <span className="whitespace-nowrap text-base sm:text-lg">{label.bottom}</span>
                </button>
              );
            })}
          </div>
          {dates.length > 8 && (
            <button type="button" onClick={() => setAllDays((v) => !v)} className="mt-3 min-h-11 font-semibold underline decoration-2 underline-offset-4 sm:hidden">
              {allDays ? x.less : `${x.more} →`}
            </button>
          )}
        </fieldset>
      )}

      {step === "time" && (
        <fieldset>
          <legend>
            <h3 ref={headingRef} tabIndex={-1} className="display mb-4 text-3xl outline-none sm:text-4xl">
              {t.time}
            </h3>
          </legend>
          {notice && (
            <p role="alert" className="mb-3 rounded-xl bg-paprika-ink px-3 py-2 font-semibold text-white">
              {notice}
            </p>
          )}
          {!slots ? (
            <p className="mb-4 text-ink/70" role="status">
              {x.loading}
            </p>
          ) : [...slots.lunch, ...slots.dinner].every((s) => !s.available) ? (
            <div className="mb-4 rounded-2xl border-2 border-dashed border-ink/30 p-4">
              <p className="font-[family-name:var(--font-display)] text-2xl uppercase">{x.noneTitle}</p>
              <p className="mt-1 text-ink/80">{x.none}</p>
            </div>
          ) : (
            (["lunch", "dinner"] as const).map((k) =>
              slots[k].length ? (
                <div key={k} className="mb-4">
                  <p className="mb-2 text-sm font-bold uppercase tracking-wider text-ink/70">{t[k]}</p>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                    {slots[k].map((s) => (
                      <button
                        key={s.time}
                        type="button"
                        disabled={!s.available}
                        aria-pressed={s.time === time}
                        aria-label={s.available ? s.time : `${s.time} · ${x.full}`}
                        onClick={() => {
                          setTime(s.time);
                          setNotice(null);
                          setStep("details");
                        }}
                        className={`${chip} flex flex-col items-center justify-center !px-1 leading-none disabled:pointer-events-none disabled:border-dashed disabled:bg-transparent disabled:text-ink/35`}
                      >
                        <span className={s.available ? "" : "line-through"}>{s.time}</span>
                        {!s.available && <span className="mt-0.5 text-[10px] tracking-wider">{x.full}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null,
            )
          )}
          <BackButton label={t.back} onClick={() => setStep("party")} />
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
                  setTime("");
                  setStep("time");
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
          <BackButton label={t.back} onClick={() => setStep("date")} />
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
            <BackButton label={t.back} onClick={() => setStep("time")} inline />
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
