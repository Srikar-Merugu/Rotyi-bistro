"use client";

import { useState } from "react";
import { allowedTargets, canMove, statusLabel, type OrderStatus } from "@/lib/orders";
import { staffFetch, supabase } from "@/lib/supabase/browser";
import { Badge, Btn, huf } from "./ui";

export type OrderRow = {
  id: string;
  number: number;
  status: OrderStatus;
  table_label: string;
  guest_name: string | null;
  guest_email: string | null;
  note: string | null;
  total: number;
  created_at: string;
  accepted_at: string | null;
  ready_at: string | null;
  order_items: { id: string; name: string; qty: number; unit_price: number; note: string | null; done: boolean }[];
};

export const ORDER_SELECT =
  "id, number, status, table_label, guest_name, guest_email, note, total, created_at, accepted_at, ready_at, order_items(id, name, qty, unit_price, note, done)";

const next: Partial<Record<OrderStatus, OrderStatus>> = {
  placed: "accepted",
  accepted: "preparing",
  preparing: "ready",
  ready: "served",
  served: "paid",
};

const nextLabel: Partial<Record<OrderStatus, string>> = {
  accepted: "Accept",
  preparing: "Start cooking",
  ready: "Ready ✓",
  served: "Served",
  paid: "Mark paid",
};

export function minutesSince(iso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
}

export function OrderCard({ o, role, big = false, onChanged }: { o: OrderRow; role: "admin" | "kitchen"; big?: boolean; onChanged?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const mins = minutesSince(o.created_at);
  const late = o.status !== "ready" && o.status !== "served" && o.status !== "paid" && o.status !== "cancelled";
  const timerTone = !late ? "bg-ink/10" : mins >= 20 ? "bg-paprika-ink text-white animate-pulse" : mins >= 10 ? "bg-mustard" : "bg-leaf text-white";
  const target = next[o.status];
  const canNext = target && canMove(o.status, target, role);

  async function move(to: OrderStatus) {
    if (to === "cancelled" && !confirm(`Cancel order #${o.number}?`)) return;
    setBusy(true);
    setErr(null);
    try {
      await staffFetch(`/api/staff/orders/${o.id}`, { status: to });
    } catch (e) {
      const msg = (e as Error).message;
      setErr(msg === "transition_not_allowed" ? "This order was already updated on another screen. Refreshed." : msg === "unauthorized" ? "Session expired. Sign in again." : msg);
    } finally {
      setBusy(false);
      onChanged?.();
    }
  }

  async function toggleItem(id: string, done: boolean) {
    await supabase().from("order_items").update({ done }).eq("id", id);
    onChanged?.();
  }

  return (
    <article className={`flex flex-col rounded-2xl border-2 border-ink bg-cream-soft shadow-[4px_4px_0_var(--color-ink)] ${o.status === "placed" ? "ring-4 ring-mustard" : ""}`}>
      <header className="flex items-center justify-between gap-2 border-b-2 border-ink/10 p-3">
        <div>
          <p className={`font-[family-name:var(--font-display)] uppercase leading-none ${big ? "text-4xl" : "text-3xl"}`}>Table {o.table_label}</p>
          <p className="text-sm text-ink/70">
            #{o.number}
            {o.guest_name ? ` · ${o.guest_name}` : ""}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`rounded-full px-2.5 py-1 font-[family-name:var(--font-display)] text-lg tabular-nums ${timerTone}`} title="Minutes since order">
            {mins}′
          </span>
          <Badge value={o.status} label={statusLabel.en[o.status]} />
        </div>
      </header>
      <ul className="flex-1 space-y-1 p-3">
        {o.order_items.map((it) => (
          <li key={it.id}>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg p-1 hover:bg-cream">
              <input type="checkbox" checked={it.done} onChange={(e) => toggleItem(it.id, e.target.checked)} className="mt-1 h-6 w-6 accent-[var(--color-leaf)]" />
              <span className={`${big ? "text-xl" : "text-lg"} leading-tight ${it.done ? "text-ink/40 line-through" : ""}`}>
                <strong className="font-[family-name:var(--font-display)]">{it.qty}×</strong> {it.name}
                {it.note && <span className="block text-sm text-paprika-ink">↳ {it.note}</span>}
              </span>
            </label>
          </li>
        ))}
      </ul>
      {o.note && <p className="mx-3 mb-2 rounded-lg bg-mustard/60 px-2 py-1 text-sm font-semibold">Note: {o.note}</p>}
      <footer className="flex flex-wrap items-center gap-2 border-t-2 border-ink/10 p-3">
        {role === "admin" && <span className="mr-auto font-[family-name:var(--font-display)] text-lg">{huf(o.total)}</span>}
        {canNext && (
          <Btn tone={target === "ready" ? "green" : "red"} disabled={busy} onClick={() => move(target!)} className={big ? "flex-1 text-lg" : "flex-1"}>
            {busy ? "…" : nextLabel[target!]}
          </Btn>
        )}
        {role === "admin" && o.status !== "cancelled" && o.status !== "paid" && (
          <select
            aria-label={`Set status of order ${o.number}`}
            value=""
            disabled={busy}
            onChange={(e) => e.target.value && move(e.target.value as OrderStatus)}
            className="min-h-11 rounded-full border-2 border-ink bg-white px-2 text-sm font-bold"
          >
            <option value="">More…</option>
            {allowedTargets.admin
              .filter((s) => canMove(o.status, s, "admin"))
              .map((s) => (
                <option key={s} value={s}>
                  {statusLabel.en[s]}
                </option>
              ))}
          </select>
        )}
        {err && <p className="w-full text-sm font-semibold text-paprika-ink">{err}</p>}
      </footer>
    </article>
  );
}
