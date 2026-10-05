"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/browser";
import { OrderCard, ORDER_SELECT, type OrderRow } from "./order-card";
import { Btn, Card, Empty, PageTitle, huf, q, useLive, useTick } from "./ui";

export function AdminOrders() {
  useTick(15_000);
  const [view, setView] = useState<"active" | "closed">("active");
  const [ordering, setOrdering] = useState<boolean | null>(null);

  const { data } = useLive(
    async () => {
      const since = new Date();
      since.setHours(0, 0, 0, 0);
      const [orders, settings] = await Promise.all([
        q<OrderRow[]>(
          supabase()
            .from("orders")
            .select(ORDER_SELECT)
            .gte("created_at", view === "closed" ? since.toISOString() : new Date(Date.now() - 2 * 86400_000).toISOString())
            .in("status", view === "active" ? ["placed", "accepted", "preparing", "ready", "served"] : ["paid", "cancelled"])
            .order("created_at", { ascending: view === "active" }),
        ),
        q<{ ordering_open: boolean }>(supabase().from("settings").select("ordering_open").single()),
      ]);
      setOrdering(settings.ordering_open);
      return orders;
    },
    ["orders", "order_items", "settings"],
    `orders:${view}`,
  );

  const revenue = (data ?? []).filter((o) => o.status === "paid").reduce((s, o) => s + o.total, 0);

  return (
    <>
      <PageTitle title="Orders">
        <div className="flex flex-wrap items-center gap-2">
          <Btn tone={view === "active" ? "ink" : "ghost"} onClick={() => setView("active")}>Active</Btn>
          <Btn tone={view === "closed" ? "ink" : "ghost"} onClick={() => setView("closed")}>Closed today</Btn>
          {ordering !== null && (
            <Btn
              tone={ordering ? "green" : "red"}
              onClick={async () => {
                setOrdering(!ordering);
                await supabase().from("settings").update({ ordering_open: !ordering, updated_at: new Date().toISOString() }).eq("id", true);
              }}
            >
              QR ordering: {ordering ? "ON" : "PAUSED"}
            </Btn>
          )}
        </div>
      </PageTitle>
      {view === "closed" && (
        <Card className="mb-4 flex flex-wrap gap-6">
          <p><span className="block text-sm uppercase tracking-wider text-ink/60">Paid today</span><span className="display text-4xl">{huf(revenue)}</span></p>
          <p><span className="block text-sm uppercase tracking-wider text-ink/60">Orders</span><span className="display text-4xl">{data?.filter((o) => o.status === "paid").length ?? 0}</span></p>
        </Card>
      )}
      {!data ? (
        <Empty>Loading…</Empty>
      ) : data.length === 0 ? (
        <Empty>{view === "active" ? "No open orders. New QR orders appear here instantly." : "Nothing closed yet today."}</Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((o) => (
            <OrderCard key={o.id} o={o} role="admin" />
          ))}
        </div>
      )}
    </>
  );
}
