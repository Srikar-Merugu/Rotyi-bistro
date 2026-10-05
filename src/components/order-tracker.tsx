"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { statusLabel, type OrderStatus } from "@/lib/orders";
import type { Locale } from "@/lib/routes";
import { formatHuf } from "@/lib/site";
import { KettleMascot } from "./art";

type Order = {
  id: string;
  number: number;
  status: OrderStatus;
  table_label: string;
  total: number;
  note: string | null;
  created_at: string;
  order_items: { name: string; qty: number; unit_price: number; note: string | null }[];
};

const steps: OrderStatus[] = ["placed", "accepted", "preparing", "ready", "served"];

const copy = {
  hu: { title: "Rendelés", table: "Asztal", more: "Rendelnék még", total: "Összesen", lost: "Ezt a rendelést nem találjuk.", live: "Élő követés", pay: "Fizetés a felszolgálónál." },
  en: { title: "Order", table: "Table", more: "Order more", total: "Total", lost: "We can't find this order.", live: "Live tracking", pay: "Pay your server at the table." },
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

  const idx = order ? steps.indexOf(order.status === "paid" ? "served" : order.status) : 0;
  const cancelled = order?.status === "cancelled";

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
