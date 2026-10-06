"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { statusLabel, type OrderStatus } from "@/lib/orders";
import type { Locale } from "@/lib/routes";
import { formatHuf } from "@/lib/site";
import { href } from "@/lib/routes";
import { KettleMascot, Star } from "./art";

type Order = {
  id: string;
  number: number;
  status: OrderStatus;
  table_label: string;
  total: number;
  note: string | null;
  created_at: string;
  order_items: { name: string; qty: number; unit_price: number; note: string | null }[];
  /** Present once the bill is paid. */
  after: { reviewUrl: string | null; rating: number | null } | null;
};

const steps: OrderStatus[] = ["placed", "accepted", "preparing", "ready", "served"];

const copy = {
  hu: {
    title: "Rendelés", table: "Asztal", more: "Rendelnék még", total: "Összesen", lost: "Ezt a rendelést nem találjuk.", live: "Élő követés", pay: "Fizetés a felszolgálónál.",
    thanks: "Köszönjük!", thanksLead: "Reméljük, ízlett. Gyere vissza hamar!", paid: "Fizetve",
    rateTitle: "Milyen volt?", rateLead: "Egy koppintás. Csak a csapatunk látja.", star: (n: number) => `${n} csillag`,
    commentPh: "Mit csináljunk még jobban? (nem kötelező)", send: "Küldés", sending: "Küldés…", rated: "Köszönjük a visszajelzést!", change: "Módosítás",
    googleTitle: "Segíts másoknak is megtalálni minket", googleLead: "Egy Google-értékelés sokat jelent egy kis bisztrónak.", google: "Google értékelés írása",
    googleDemo: "Ez egy demó: valódi étteremnél itt a saját Google-értékelés oldala nyílik meg.",
    againTitle: "Gyere vissza!", againLead: "Napi menü hétköznap 11:30–15:00, leves + főétel 3 490 Ft-tól.", book: "Asztalt foglalok", bill: "A számlád", error: "Nem sikerült elküldeni. Próbáld újra.",
  },
  en: {
    title: "Order", table: "Table", more: "Order more", total: "Total", lost: "We can't find this order.", live: "Live tracking", pay: "Pay your server at the table.",
    thanks: "Thank you!", thanksLead: "We hope you enjoyed it. Come back soon!", paid: "Paid",
    rateTitle: "How was it?", rateLead: "One tap. Only our team sees it.", star: (n: number) => `${n} star${n === 1 ? "" : "s"}`,
    commentPh: "Anything we could do better? (optional)", send: "Send", sending: "Sending…", rated: "Thanks for the feedback!", change: "Change",
    googleTitle: "Help others find us", googleLead: "A Google review means a lot to a small bistro.", google: "Write a Google review",
    googleDemo: "This is a demo: for a real restaurant this opens its own Google review page.",
    againTitle: "Come again!", againLead: "Daily lunch menu weekdays 11:30–15:00, soup + main from 3,490 HUF.", book: "Book a table", bill: "Your bill", error: "Couldn't send. Please try again.",
  },
};

export function OrderTracker({ lang, token, id, guestKey }: { lang: Locale; token: string; id: string; guestKey: string }) {
  const t = copy[lang];
  const labels = statusLabel[lang];
  const [order, setOrder] = useState<Order | null>(null);
  const [missing, setMissing] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const last = useRef<OrderStatus | null>(null);

  useEffect(() => {
    let stop = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/orders/${id}?k=${encodeURIComponent(guestKey)}`, { cache: "no-store" });
        if (res.status === 404) return setMissing(true);
        if (!res.ok) return;
        const o = (await res.json()) as Order;
        if (stop) return;
        if (last.current && last.current !== o.status) {
          setFlash(labels[o.status]);
          navigator.vibrate?.(o.status === "ready" ? [200, 100, 200, 100, 400] : 120);
          setTimeout(() => setFlash(null), 5000);
        }
        last.current = o.status;
        setOrder(o);
      } catch {}
    };
    load();
    const timer = setInterval(() => document.visibilityState === "visible" && load(), 4000);
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, [id, guestKey, labels]);

  if (missing)
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center">
        <div>
          <KettleMascot className="mx-auto w-32" steam={false} />
          <p className="display mt-4 text-4xl">{t.lost}</p>
          <Link href={`/${lang}/t/${token}`} className="pill pill-red mt-6">
            {t.more}
          </Link>
        </div>
      </div>
    );

  const idx = order ? (order.status === "paid" ? steps.length : steps.indexOf(order.status)) : 0;
  const cancelled = order?.status === "cancelled";

  if (order?.status === "paid") return <ThankYou lang={lang} order={order} id={id} guestKey={guestKey} />;

  return (
    <div className="min-h-screen bg-cream px-4 pb-16 pt-24">
      {flash && (
        <div role="status" className="fixed inset-x-3 top-20 z-50 mx-auto max-w-md rounded-2xl bg-ink px-5 py-4 text-center font-[family-name:var(--font-display)] text-2xl uppercase text-mustard shadow-2xl [animation:pop-in_.5s_var(--ease-bounce)]">
          {flash}
        </div>
      )}
      <div className="mx-auto max-w-xl">
        <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-ink/70">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-leaf" aria-hidden /> {t.live}
        </p>
        <h1 className="display mt-2 text-6xl text-paprika-ink">
          {t.title} #{order?.number ?? "…"}
        </h1>
        <p className="font-[family-name:var(--font-display)] text-xl uppercase">
          {t.table} {order?.table_label}
        </p>

        <div className="mt-8 rounded-[2rem] border-2 border-ink bg-cream-soft p-5 shadow-[6px_6px_0_var(--color-ink)]">
          {cancelled ? (
            <p className="display text-4xl text-paprika-ink">{labels.cancelled}</p>
          ) : (
            <ol className="space-y-4" aria-live="polite">
              {steps.map((s, i) => {
                const done = order && i < idx;
                const now = order && i === idx;
                return (
                  <li key={s} className="flex items-center gap-4">
                    <span
                      className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-ink font-bold transition ${done ? "bg-leaf text-white" : now ? "scale-110 bg-paprika text-white" : "bg-white text-ink/40"}`}
                      aria-hidden
                    >
                      {done ? "✓" : i + 1}
                    </span>
                    <span className={`font-[family-name:var(--font-display)] text-2xl uppercase ${now ? "text-paprika-ink" : done ? "" : "text-ink/40"}`}>
                      {labels[s]}
                      {now && s === "preparing" && <KettleMascot className="ml-2 inline-block h-8 w-8 align-middle" />}
                    </span>
                    {now && <span className="sr-only">(current)</span>}
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {order && (
          <div className="mt-6 rounded-[2rem] bg-cream-soft p-5">
            <ul className="divide-y-2 divide-ink/10">
              {order.order_items.map((it, i) => (
                <li key={i} className="flex justify-between gap-3 py-2 text-lg">
                  <span>
                    {it.qty}× {it.name}
                  </span>
                  <span className="tabular-nums">{formatHuf(it.qty * it.unit_price)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 flex justify-between border-t-2 border-ink pt-2 font-[family-name:var(--font-display)] text-2xl uppercase">
              <span>{t.total}</span>
              <span>{formatHuf(order.total)}</span>
            </p>
            <p className="mt-2 text-sm text-ink/70">{t.pay}</p>
          </div>
        )}

        <Link href={`/${lang}/t/${token}`} className="pill pill-red mt-8 w-full text-lg">
          + {t.more}
        </Link>
      </div>
    </div>
  );
}

function ThankYou({ lang, order, id, guestKey }: { lang: Locale; order: Order; id: string; guestKey: string }) {
  const t = copy[lang];
  const [rating, setRating] = useState<number | null>(order.after?.rating ?? null);
  const [sent, setSent] = useState(order.after?.rating != null);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [demoNote, setDemoNote] = useState(false);
  const reviewUrl = order.after?.reviewUrl ?? null;

  async function send() {
    if (!rating) return;
    setStatus("sending");
    try {
      const res = await fetch(`/api/orders/${id}/feedback`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ k: guestKey, rating, comment }),
      });
      if (!res.ok) throw new Error();
      setSent(true);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen bg-cream px-4 pb-16 pt-24">
      <div className="mx-auto max-w-xl space-y-5">
        <section className="relative overflow-hidden rounded-[2rem] bg-paprika px-6 pb-7 pt-6 text-cream">
          <KettleMascot className="wobble absolute -bottom-2 right-3 w-20 sm:w-24" />
          <span className="sticker">{t.paid} · #{order.number}</span>
          <h1 className="display mt-4 text-[clamp(3rem,15vw,4.75rem)] leading-[0.9]">{t.thanks}</h1>
          <p className="mt-2 max-w-[62%] text-xl">{t.thanksLead}</p>
        </section>

        <section id="rate" className="scroll-mt-24 rounded-[2rem] border-2 border-ink bg-cream-soft p-5 shadow-[6px_6px_0_var(--color-ink)]" aria-labelledby="rate-title">
          {sent ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p id="rate-title" className="display text-3xl">{t.rated}</p>
                <p className="mt-1 text-2xl text-mustard [text-shadow:0_1px_0_var(--color-ink)]" aria-label={rating ? t.star(rating) : undefined}>
                  {"★".repeat(rating ?? 0)}
                  <span className="text-ink/15 [text-shadow:none]">{"★".repeat(5 - (rating ?? 0))}</span>
                </p>
              </div>
              <button type="button" onClick={() => setSent(false)} className="min-h-11 shrink-0 rounded-full border-2 border-ink px-4 font-bold">
                {t.change}
              </button>
            </div>
          ) : (
            <>
              <h2 id="rate-title" className="display text-3xl">{t.rateTitle}</h2>
              <p className="text-ink/70">{t.rateLead}</p>
              <div className="mt-3 flex justify-between gap-1" role="radiogroup" aria-label={t.rateTitle}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={rating === n}
                    aria-label={t.star(n)}
                    onClick={() => setRating(n)}
                    className="grid h-14 flex-1 place-items-center rounded-2xl transition active:scale-90"
                  >
                    <Star className={`h-12 w-12 transition ${rating && n <= rating ? "scale-110" : "opacity-25 grayscale"}`} />
                  </button>
                ))}
              </div>
              {rating && (
                <div className="mt-3 space-y-3 [animation:pop-in_.35s_var(--ease-out-expo)]">
                  <label className="block">
                    <span className="sr-only">{t.commentPh}</span>
                    <textarea
                      id="feedback-comment"
                      rows={2}
                      maxLength={1000}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder={t.commentPh}
                      className="w-full rounded-xl border-2 border-ink/20 bg-white px-3 py-2 text-lg"
                    />
                  </label>
                  {status === "error" && <p role="alert" className="font-semibold text-paprika-ink">{t.error}</p>}
                  <button type="button" onClick={send} disabled={status === "sending"} className="pill pill-ink w-full disabled:opacity-60">
                    {status === "sending" ? t.sending : t.send}
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* Shown to every guest regardless of rating: Google forbids review gating. */}
        <section className="rounded-[2rem] bg-ink p-5 text-cream" aria-labelledby="google-title">
          <h2 id="google-title" className="display text-3xl text-mustard">{t.googleTitle}</h2>
          <p className="mt-1">{t.googleLead}</p>
          {reviewUrl ? (
            <a href={reviewUrl} target="_blank" rel="noopener" className="pill pill-cream mt-4 w-full text-lg">
              <GoogleG /> {t.google}
            </a>
          ) : (
            <>
              <button type="button" onClick={() => setDemoNote(true)} className="pill pill-cream mt-4 w-full text-lg">
                <GoogleG /> {t.google}
              </button>
              {demoNote && <p className="mt-3 text-sm text-cream/80" role="status">{t.googleDemo}</p>}
            </>
          )}
        </section>

        <section className="rounded-[2rem] border-2 border-dashed border-ink/40 bg-mustard p-5" aria-labelledby="again-title">
          <h2 id="again-title" className="display text-3xl">{t.againTitle}</h2>
          <p className="mt-1">{t.againLead}</p>
          <Link href={href(lang, "book")} className="pill pill-red mt-4">
            {t.book}
          </Link>
        </section>

        <details className="rounded-[2rem] bg-cream-soft p-5">
          <summary className="flex cursor-pointer list-none items-center justify-between font-[family-name:var(--font-display)] text-xl uppercase [&::-webkit-details-marker]:hidden">
            {t.bill} <span>{formatHuf(order.total)}</span>
          </summary>
          <ul className="mt-3 divide-y-2 divide-ink/10">
            {order.order_items.map((it, i) => (
              <li key={i} className="flex justify-between gap-3 py-2 text-lg">
                <span>
                  {it.qty}× {it.name}
                </span>
                <span className="tabular-nums">{formatHuf(it.qty * it.unit_price)}</span>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </div>
  );
}

function GoogleG() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1 .7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9h-4v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.7V6.6h-4a12 12 0 0 0 0 10.8z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
    </svg>
  );
}
