"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/browser";
import type { OrderStatus } from "@/lib/orders";
import { OrderCard, ORDER_SELECT, type OrderRow } from "./order-card";
import { useStaff } from "./staff-shell";
import { Btn, Empty, q, useLive, useTick } from "./ui";

// Kitchen display: tickets flow New → Accepted → Cooking → Ready. Built for a
// tablet on the pass; on phones the columns stack and become tabs.
const columns: { status: OrderStatus; title: string }[] = [
  { status: "placed", title: "New" },
  { status: "accepted", title: "Accepted" },
  { status: "preparing", title: "Cooking" },
  { status: "ready", title: "Ready to serve" },
];

type Item = { id: string; name_en: string; name_hu: string; available: boolean; category_id: string };

export function KitchenBoard() {
  useTick(15_000);
  const { staff } = useStaff();
  const [tab, setTab] = useState<OrderStatus>("placed");
  const [showStock, setShowStock] = useState(false);

  const { data, reload } = useLive(
    async () => {
      const [orders, items] = await Promise.all([
        q<OrderRow[]>(supabase().from("orders").select(ORDER_SELECT).in("status", ["placed", "accepted", "preparing", "ready"]).order("created_at")),
        q<Item[]>(supabase().from("menu_items").select("id, name_en, name_hu, available, category_id").order("sort")),
      ]);
      return { orders, items };
    },
    ["orders", "order_items", "menu_items"],
  );

  const counts = Object.fromEntries(columns.map((c) => [c.status, data?.orders.filter((o) => o.status === c.status).length ?? 0]));

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="display text-5xl text-paprika-ink">Kitchen</h1>
        <Btn tone={showStock ? "ink" : "mustard"} onClick={() => setShowStock((v) => !v)}>
          {showStock ? "Close stock" : "86 / stock"}
        </Btn>
      </div>

      {showStock && data && (
        <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {data.items.map((i) => (
            <button
              key={i.id}
              type="button"
              aria-pressed={!i.available}
              onClick={async () => {
                await supabase().from("menu_items").update({ available: !i.available }).eq("id", i.id);
                reload();
              }}
              className={`min-h-14 rounded-xl border-2 border-ink px-3 py-2 text-left text-sm font-bold ${i.available ? "bg-cream-soft" : "bg-ink text-cream line-through"}`}
            >
              {i.name_hu}
              <span className="block text-xs font-normal">{i.available ? "Available" : "Sold out (86)"}</span>
            </button>
          ))}
        </div>
      )}

      {/* Mobile tabs */}
      <div className="hide-scrollbar mb-3 flex gap-2 overflow-x-auto lg:hidden">
        {columns.map((c) => (
          <Btn key={c.status} tone={tab === c.status ? "red" : "ghost"} onClick={() => setTab(c.status)}>
            {c.title} ({counts[c.status]})
          </Btn>
        ))}
      </div>

      {!data ? (
        <Empty>Loading tickets…</Empty>
      ) : (
        <div className="grid gap-4 lg:grid-cols-4">
          {columns.map((c) => {
            const list = data.orders.filter((o) => o.status === c.status);
            return (
              <section key={c.status} className={`${tab === c.status ? "" : "hidden"} lg:block`} aria-label={c.title}>
                <h2 className="mb-2 hidden items-center justify-between font-[family-name:var(--font-display)] text-2xl uppercase lg:flex">
                  {c.title} <span className="rounded-full bg-ink px-2 text-cream">{list.length}</span>
                </h2>
                <div className="space-y-4">
                  {list.length === 0 ? <Empty>Nothing here</Empty> : list.map((o) => <OrderCard key={o.id} o={o} role={staff.role} big onChanged={reload} />)}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
