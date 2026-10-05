"use client";

import Link from "next/link";
import { supabase } from "@/lib/supabase/browser";
import { useStaff } from "./staff-shell";
import { ago, Card, huf, q, useLive, useTick } from "./ui";

export function AdminOverview() {
  useTick();
  const { alerts, staff } = useStaff();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Budapest" }).format(new Date());

  const { data } = useLive(
    async () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const [pending, todayBookings, orders] = await Promise.all([
        q<{ id: string }[]>(supabase().from("booking_requests").select("id").eq("status", "pending")),
        q<{ party_size: number; status: string }[]>(supabase().from("booking_requests").select("party_size, status").eq("booking_date", today)),
        q<{ status: string; total: number }[]>(supabase().from("orders").select("status, total").gte("created_at", start.toISOString())),
      ]);
      return {
        pending: pending.length,
        covers: todayBookings.filter((b) => b.status === "confirmed").reduce((s, b) => s + b.party_size, 0),
        newOrders: orders.filter((o) => o.status === "placed").length,
        cooking: orders.filter((o) => ["accepted", "preparing"].includes(o.status)).length,
        ready: orders.filter((o) => o.status === "ready").length,
        revenue: orders.filter((o) => o.status === "paid").reduce((s, o) => s + o.total, 0),
        ordersToday: orders.filter((o) => o.status !== "cancelled").length,
      };
    },
    ["booking_requests", "orders"],
  );

  const tiles = [
    { label: "Bookings to approve", value: data?.pending, href: "/admin/bookings", hot: (data?.pending ?? 0) > 0 },
    { label: "Confirmed covers today", value: data?.covers, href: "/admin/bookings" },
    { label: "New orders", value: data?.newOrders, href: "/kitchen", hot: (data?.newOrders ?? 0) > 0 },
    { label: "Cooking", value: data?.cooking, href: "/kitchen" },
    { label: "Ready to serve", value: data?.ready, href: "/admin/orders", hot: (data?.ready ?? 0) > 0 },
    { label: "Paid today", value: data ? huf(data.revenue) : undefined, href: "/admin/orders" },
  ];

  return (
    <>
      <h1 className="display mb-1 text-5xl text-paprika-ink sm:text-6xl">Szia, {staff.name ?? "admin"}!</h1>
      <p className="mb-5 text-ink/70">Everything updates live. Turn on alerts (top right) for sound and phone notifications.</p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className={`rounded-2xl border-2 border-ink p-4 shadow-[4px_4px_0_var(--color-ink)] transition hover:-translate-y-0.5 ${t.hot ? "bg-mustard" : "bg-cream-soft"}`}>
            <p className="display text-4xl">{t.value ?? "…"}</p>
            <p className="text-sm font-bold uppercase tracking-wide text-ink/70">{t.label}</p>
          </Link>
        ))}
      </div>
      <h2 className="display mb-3 mt-8 text-3xl">Live activity</h2>
      <Card className="divide-y-2 divide-ink/10 !p-0">
        {alerts.length === 0 && <p className="p-4 text-ink/60">No activity yet. New bookings and orders appear here instantly.</p>}
        {alerts.slice(0, 15).map((a) => (
          <div key={a.id} className="flex items-start justify-between gap-3 p-3">
            <div>
              <p className="font-bold">{a.title}</p>
              {a.body && <p className="text-sm text-ink/70">{a.body}</p>}
            </div>
            <span className="shrink-0 text-xs text-ink/60">{ago(a.created_at)}</span>
          </div>
        ))}
      </Card>
    </>
  );
}
