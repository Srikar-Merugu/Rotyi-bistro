"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/browser";
import { Btn, Card, Empty, PageTitle, huf, q, useLive } from "./ui";

// Owner reports: revenue, orders, covers, best sellers, busy hours, ratings,
// with CSV export. Aggregated in the browser from rows the admin can already
// read (fine at bistro volume; move to SQL views if a client grows large).

type Range = "today" | "7d" | "30d" | "month";
type OrderRow = {
  id: string;
  number: number;
  status: string;
  total: number;
  created_at: string;
  source: string;
  table_label: string;
  order_items: { name: string; qty: number; unit_price: number; item_id: string | null }[];
};
type BookingRow = { status: string; party_size: number; booking_date: string };

const TZ = "Europe/Budapest";
const dayKey = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(iso));
const hourOf = (iso: string) => Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hourCycle: "h23" }).format(new Date(iso)));
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());

function rangeDays(r: Range): string[] {
  const end = new Date(`${today()}T12:00:00Z`);
  const n = r === "today" ? 1 : r === "7d" ? 7 : r === "30d" ? 30 : end.getUTCDate();
  return Array.from({ length: n }, (_, i) => new Date(end.getTime() - (n - 1 - i) * 86_400_000).toISOString().slice(0, 10));
}

const shortDay = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export function AdminReports() {
  const [range, setRange] = useState<Range>("7d");
  const days = rangeDays(range);
  const from = days[0];
  const to = days[days.length - 1];

  const { data } = useLive(
    async () => {
      // Wide UTC window, then filtered by Budapest calendar day below.
      const startIso = new Date(new Date(`${from}T00:00:00Z`).getTime() - 2 * 3600_000).toISOString();
      const [orders, bookings, ratings] = await Promise.all([
        q<OrderRow[]>(
          supabase()
            .from("orders")
            .select("id, number, status, total, created_at, source, table_label, order_items(name, qty, unit_price, item_id)")
            .gte("created_at", startIso)
            .order("created_at")
            .limit(5000),
        ),
        q<BookingRow[]>(supabase().from("booking_requests").select("status, party_size, booking_date").gte("booking_date", from).lte("booking_date", to)),
        q<{ rating: number; created_at: string }[]>(supabase().from("order_feedback").select("rating, created_at").gte("created_at", startIso)),
      ]);
      const inRange = (iso: string) => {
        const d = dayKey(iso);
        return d >= from && d <= to;
      };
      return { orders: orders.filter((o) => inRange(o.created_at)), bookings, ratings: ratings.filter((r) => inRange(r.created_at)) };
    },
    ["orders", "booking_requests", "order_feedback"],
    `reports:${range}:${from}`,
  );

  const paid = (data?.orders ?? []).filter((o) => o.status === "paid");
  const live = (data?.orders ?? []).filter((o) => o.status !== "cancelled");
  const revenue = paid.reduce((s, o) => s + o.total, 0);
  const avgTicket = paid.length ? Math.round(revenue / paid.length) : 0;
  const seated = (data?.bookings ?? []).filter((b) => b.status === "seated" || b.status === "completed");
  const covers = seated.reduce((s, b) => s + b.party_size, 0);
  const noShows = (data?.bookings ?? []).filter((b) => b.status === "no_show").length;
  const decided = seated.length + noShows;
  const ratings = data?.ratings ?? [];
  const avgRating = ratings.length ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length : null;
  const preorders = live.filter((o) => o.source === "booking").length;

  const perDay = days.map((d) => ({ label: shortDay(d), value: paid.filter((o) => dayKey(o.created_at) === d).reduce((s, o) => s + o.total, 0) }));
  const perHour = Array.from({ length: 13 }, (_, i) => i + 11).map((h) => ({
    label: `${String(h).padStart(2, "0")}h`,
    value: live.filter((o) => hourOf(o.created_at) === h).length,
  }));

  const sellers = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const o of live)
    for (const it of o.order_items) {
      const k = it.item_id ?? it.name;
      const cur = sellers.get(k) ?? { name: it.name, qty: 0, revenue: 0 };
      cur.qty += it.qty;
      cur.revenue += it.qty * it.unit_price;
      sellers.set(k, cur);
    }
  const best = [...sellers.values()].sort((a, b) => b.qty - a.qty).slice(0, 10);
  const maxQty = best[0]?.qty ?? 1;

  function exportCsv() {
    const rows = [["date", "time", "order", "table", "source", "status", "item", "qty", "unit_price_huf", "line_total_huf", "order_total_huf"]];
    for (const o of data?.orders ?? []) {
      const date = dayKey(o.created_at);
      const time = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(o.created_at));
      for (const it of o.order_items)
        rows.push([date, time, String(o.number), o.table_label, o.source, o.status, it.name, String(it.qty), String(it.unit_price), String(it.qty * it.unit_price), String(o.total)]);
    }
    const csv = rows.map((r) => r.map((c) => (/[",\n;]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `rotyi-orders-${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const tiles = [
    { label: "Revenue (paid)", value: huf(revenue) },
    { label: "Paid orders", value: String(paid.length) },
    { label: "Average bill", value: paid.length ? huf(avgTicket) : "–" },
    { label: "Reservation guests", value: String(covers) },
    { label: "No-show rate", value: decided ? `${Math.round((noShows / decided) * 100)}%` : "–" },
    { label: "Guest rating", value: avgRating ? `${avgRating.toFixed(1)} ★ (${ratings.length})` : "–" },
  ];

  return (
    <>
      <PageTitle title="Reports">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["today", "Today"],
              ["7d", "7 days"],
              ["30d", "30 days"],
              ["month", "This month"],
            ] as const
          ).map(([k, l]) => (
            <Btn key={k} tone={range === k ? "ink" : "ghost"} onClick={() => setRange(k)}>
              {l}
            </Btn>
          ))}
          <Btn tone="red" onClick={exportCsv} disabled={!data?.orders.length}>
            ⬇ CSV for accountant
          </Btn>
        </div>
      </PageTitle>
      <p className="mb-5 text-ink/70">
        {shortDay(from)}
        {from !== to ? ` – ${shortDay(to)}` : ""} · Budapest time · {live.length} orders ({preorders} reservation pre-orders)
      </p>

      {!data ? (
        <Empty>Loading…</Empty>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {tiles.map((t) => (
              <Card key={t.label} className="!p-4">
                <p className="display text-3xl tabular-nums">{t.value}</p>
                <p className="text-sm font-bold uppercase tracking-wide text-ink/70">{t.label}</p>
              </Card>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <h2 className="display text-2xl">Revenue per day</h2>
              <p className="mb-3 text-sm text-ink/70">Paid orders, HUF</p>
              <Bars data={perDay} format={huf} />
            </Card>
            <Card>
              <h2 className="display text-2xl">Busiest hours</h2>
              <p className="mb-3 text-sm text-ink/70">Orders placed per hour of the day</p>
              <Bars data={perHour} format={(v) => `${v} ${v === 1 ? "order" : "orders"}`} />
            </Card>
          </div>

          <Card className="mt-5">
            <h2 className="display mb-3 text-2xl">Best sellers</h2>
            {best.length === 0 ? (
              <p className="text-ink/60">No orders in this period yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs uppercase tracking-wider text-ink/60">
                      <th className="py-2 pr-3 font-bold">#</th>
                      <th className="py-2 pr-3 font-bold">Dish</th>
                      <th className="py-2 pr-3 font-bold">Sold</th>
                      <th className="py-2 text-right font-bold">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {best.map((b, i) => (
                      <tr key={b.name} className="border-t border-ink/10">
                        <td className="py-2 pr-3 tabular-nums text-ink/60">{i + 1}</td>
                        <td className="py-2 pr-3 font-semibold">{b.name}</td>
                        <td className="w-1/3 py-2 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 rounded-r bg-paprika" style={{ width: `${Math.max(4, (b.qty / maxQty) * 100)}%` }} aria-hidden />
                            <span className="tabular-nums">{b.qty}</span>
                          </div>
                        </td>
                        <td className="py-2 text-right tabular-nums">{huf(b.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </>
  );
}

/** Single-series bar chart: one hue, recessive grid, hover/tap tooltip, table for screen readers. */
function Bars({ data, format }: { data: { label: string; value: number }[]; format: (v: number) => string }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.value), 0);
  const top = max > 0 ? niceMax(max) : 1;
  const ticks = [top, top / 2, 0];
  const dense = data.length > 14;
  const shown = active ?? (max > 0 ? data.findIndex((d) => d.value === max) : null);

  return (
    <div>
      <p className="mb-2 h-6 text-sm font-semibold" aria-live="polite">
        {shown !== null && data[shown] ? `${data[shown].label}: ${format(data[shown].value)}${active === null ? " · peak" : ""}` : "No data yet"}
      </p>
      <div className="relative h-48 pl-14">
        {ticks.map((t, i) => (
          <div key={i} className="absolute left-0 right-0 flex items-center gap-2" style={{ top: `${(1 - t / top) * 100}%` }}>
            <span className="w-12 -translate-y-1/2 text-right text-[11px] tabular-nums text-ink/50">{t === 0 ? "0" : compact(t)}</span>
            <span className="h-px flex-1 -translate-y-1/2 bg-ink/10" />
          </div>
        ))}
        <div className="absolute inset-y-0 left-14 right-0 flex items-end gap-[2px]" onMouseLeave={() => setActive(null)}>
          {data.map((d, i) => (
            <button
              key={d.label}
              type="button"
              aria-label={`${d.label}: ${format(d.value)}`}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onClick={() => setActive(i)}
              className="group flex h-full flex-1 items-end"
            >
              <span
                className={`block w-full rounded-t-[4px] transition-colors ${active === i ? "bg-paprika-deep" : "bg-paprika"}`}
                style={{ height: d.value > 0 ? `${Math.max(2, (d.value / top) * 100)}%` : "0%" }}
              />
            </button>
          ))}
        </div>
      </div>
      <div className="ml-14 mt-1 flex gap-[2px]" aria-hidden>
        {data.map((d, i) => (
          <span key={d.label} className="flex-1 truncate text-center text-[10px] text-ink/50">
            {!dense || i % Math.ceil(data.length / 7) === 0 ? d.label : ""}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <th>{d.label}</th>
              <td>{format(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function niceMax(v: number) {
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const m = v / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
}
const compact = (v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(Math.round(v)));
