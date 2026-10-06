"use client";

import { useCallback, useEffect, useState } from "react";
import type { Locale } from "@/lib/routes";

const copy = {
  hu: {
    waiter: "Pincért kérek",
    bill: "Kérem a számlát",
    waiterOn: "Úton van a pincér",
    billOn: "Hozzuk a számlát",
    how: "Hogyan fizetnél?",
    card: "Kártya",
    cash: "Készpénz",
    cancel: "Mégse",
    failed: "Nem sikerült. Integess nekünk!",
  },
  en: {
    waiter: "Call a waiter",
    bill: "Bring the bill",
    waiterOn: "A waiter is coming",
    billOn: "Your bill is on its way",
    how: "How would you like to pay?",
    card: "Card",
    cash: "Cash",
    cancel: "Cancel",
    failed: "Didn't go through. Give us a wave!",
  },
};

/** Table-side buttons that alert staff instantly. State follows the staff's "Done". */
export function ServiceButtons({ lang, token }: { lang: Locale; token: string }) {
  const t = copy[lang];
  const [open, setOpen] = useState({ waiter: false, bill: false });
  const [askPay, setAskPay] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/tables/${token}/service`, { cache: "no-store" });
      if (r.ok) setOpen(await r.json());
    } catch {}
  }, [token]);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const id = setInterval(() => document.visibilityState === "visible" && load(), 8000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [load]);

  async function send(kind: "waiter" | "bill", payment?: "card" | "cash") {
    setBusy(kind);
    setErr(false);
    try {
      const r = await fetch(`/api/tables/${token}/service`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, payment }),
      });
      if (!r.ok) throw new Error();
      setOpen((o) => ({ ...o, [kind]: true }));
      navigator.vibrate?.(60);
    } catch {
      setErr(true);
    } finally {
      setBusy(null);
      setAskPay(false);
    }
  }

  const base = "flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl border-2 px-3 font-[family-name:var(--font-display)] text-lg uppercase tracking-wide transition active:scale-95";

  return (
    <div className="rounded-[1.6rem] bg-cream-soft p-3 shadow-[0_6px_0_rgb(0_0_0/0.1)]">
      {askPay ? (
        <div>
          <p className="mb-2 px-1 font-semibold">{t.how}</p>
          <div className="flex gap-2">
            <button type="button" disabled={!!busy} onClick={() => send("bill", "card")} className={`${base} border-ink bg-ink text-cream`}>
              💳 {t.card}
            </button>
            <button type="button" disabled={!!busy} onClick={() => send("bill", "cash")} className={`${base} border-ink bg-ink text-cream`}>
              💵 {t.cash}
            </button>
          </div>
          <button type="button" onClick={() => setAskPay(false)} className="mt-2 min-h-11 w-full font-semibold underline underline-offset-4">
            {t.cancel}
          </button>
        </div>
      ) : (
        <div className="flex gap-2" aria-live="polite">
          <button
            type="button"
            disabled={open.waiter || !!busy}
            onClick={() => send("waiter")}
            className={`${base} ${open.waiter ? "border-leaf bg-leaf text-white" : "border-ink bg-white text-ink"}`}
          >
            {open.waiter ? `✓ ${t.waiterOn}` : `🙋 ${t.waiter}`}
          </button>
          <button
            type="button"
            disabled={open.bill || !!busy}
            onClick={() => setAskPay(true)}
            className={`${base} ${open.bill ? "border-leaf bg-leaf text-white" : "border-paprika-ink bg-paprika-ink text-white"}`}
          >
            {open.bill ? `✓ ${t.billOn}` : `🧾 ${t.bill}`}
          </button>
        </div>
      )}
      {err && (
        <p role="alert" className="mt-2 px-1 text-sm font-semibold text-paprika-ink">
          {t.failed}
        </p>
      )}
    </div>
  );
}
