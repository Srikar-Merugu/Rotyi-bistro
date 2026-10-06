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
      const [pending, todayBookings, orders, next, ratings] = await Promise.all([
        q<{ id: string }[]>(supabase().from("booking_requests").select("id").eq("status", "pending")),
        q<{ party_size: number; status: string }[]>(supabase().from("booking_requests").select("party_size, status").eq("booking_date", today)),
        q<{ status: string; total: number }[]>(supabase().from("orders").select("status, total").gte("created_at", start.toISOString())),
        q<{ id: string; booking_date: string; booking_time: string | null; name: string; party_size: number; dishes: string[]; dining_tables: { label: string } | null }[]>(
          supabase()
            .from("booking_requests")
            .select("id, booking_date, booking_time, name, party_size, dishes, dining_tables(label)")
            .eq("status", "confirmed")
            .gte("booking_date", today)
            .order("booking_date")
            .order("booking_time")
            .limit(6),
        ),
        q<{ rating: number }[]>(supabase().from("order_feedback").select("rating").gte("created_at", new Date(Date.now() - 30 * 86_400_000).toISOString())),
      ]);
      return {
        pending: pending.length,
        covers: todayBookings.filter((b) => ["confirmed", "seated"].includes(b.status)).reduce((s, b) => s + b.party_size, 0),
        next,
        rating: ratings.length ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1) + " ★" : "–",
        newOrders: orders.filter((o) => o.status === "placed").length,
        cooking: orders.filter((o) => ["accepted", "preparing"].includes(o.status)).length,
        ready: orders.filter((o) => o.status === "ready").length,
        revenue: orders.filter((o) => o.status === "paid").reduce((s, o) => s + o.total, 0),
        ordersToday: orders.filter((o) => o.status !== "cancelled").length,
      };
    },
    ["booking_requests", "orders", "order_feedback"],
  );

  const tiles = [
    { label: "Bookings to approve", value: data?.pending, href: "/admin/bookings", hot: (data?.pending ?? 0) > 0 },
    { label: "Guests booked today", value: data?.covers, href: "/admin/bookings" },
    { label: "New orders", value: data?.newOrders, href: "/kitchen", hot: (data?.newOrders ?? 0) > 0 },
    { label: "Cooking", value: data?.cooking, href: "/kitchen" },
    { label: "Ready to serve", value: data?.ready, href: "/admin/orders", hot: (data?.ready ?? 0) > 0 },
    { label: "Paid today", value: data ? huf(data.revenue) : undefined, href: "/admin/orders" },
    { label: "Guest rating · 30 days", value: data?.rating, href: "/admin/feedback" },
  ];

  return (
    <>
      <h1 className="display mb-1 text-5xl text-paprika-ink sm:text-6xl">Szia, {staff.name ?? "admin"}!</h1>
      <p className="mb-5 text-ink/70">Everything updates live. Turn on alerts (top right) for sound and phone notifications.</p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className={`rounded-2xl border-2 border-ink p-4 shadow-[4px_4px_0_var(--color-ink)] transition hover:-translate-y-0.5 ${t.hot ? "bg-mustard" : "bg-cream-soft"}`}>
            <p className="display text-4xl">{t.value ?? "…"}</p>
            <p className="text-sm font-bold uppercase tracking-wide text-ink/70">{t.label}</p>
          </Link>
        ))}
      </div>
      <div className="mb-3 mt-8 flex items-baseline justify-between">
        <h2 className="display text-3xl">Next reservations</h2>
        <Link href="/admin/bookings" className="font-semibold underline underline-offset-4">All upcoming →</Link>
      </div>
      {data && data.next.length === 0 ? (
        <Card><p className="text-ink/60">No approved reservations coming up.</p></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data?.next.map((b) => (
            <Card key={b.id} className="!p-3">
              <p className="font-[family-name:var(--font-display)] text-xl uppercase leading-tight">
                {b.booking_date === today ? "Today" : new Date(`${b.booking_date}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} · {b.booking_time?.slice(0, 5)}
              </p>
              <p className="font-bold">
                {b.name} · {b.party_size}p{b.dining_tables?.label ? ` · table ${b.dining_tables.label}` : " · no table yet"}
              </p>
              {b.dishes.length > 0 && <p className="text-sm text-ink/70">Pre-order: {b.dishes.join(", ")}</p>}
            </Card>
          ))}
        </div>
      )}
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
