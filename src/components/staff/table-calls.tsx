"use client";

import { supabase } from "@/lib/supabase/browser";
import { useStaff } from "./staff-shell";
import { minutesSince } from "./order-card";
import { q, useLive, useTick } from "./ui";

type Call = { id: string; table_label: string; kind: "waiter" | "bill"; payment: "card" | "cash" | null; created_at: string };

/** Open "call waiter" / "bill" requests from tables, pinned on every staff screen. */
export function TableCalls() {
  useTick(20_000);
  const { staff } = useStaff();
  const { data, reload } = useLive(
    () => q<Call[]>(supabase().from("service_requests").select("id, table_label, kind, payment, created_at").eq("status", "open").order("created_at")),
    ["service_requests"],
  );
  if (!data?.length) return null;

  async function done(id: string) {
    await supabase().from("service_requests").update({ status: "done", done_at: new Date().toISOString(), done_by: staff.user_id }).eq("id", id);
    reload();
  }

  return (
    <div className="sticky top-[68px] z-10 border-b-2 border-ink bg-paprika px-3 py-2 text-white print:hidden" role="region" aria-label="Table calls">
      <div className="hide-scrollbar mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto">
        <span className="shrink-0 font-[family-name:var(--font-display)] uppercase tracking-wide">Table calls</span>
        {data.map((c) => {
          const mins = minutesSince(c.created_at);
          return (
            <div key={c.id} className={`flex shrink-0 items-center gap-2 rounded-full bg-ink py-1 pl-3 pr-1 ${mins >= 3 ? "animate-pulse" : ""}`}>
              <span className="font-bold">
                {c.kind === "bill" ? "🧾" : "🙋"} {c.table_label} · {c.kind === "bill" ? `Bill${c.payment ? ` (${c.payment})` : ""}` : "Waiter"} · {mins}′
              </span>
              <button type="button" onClick={() => done(c.id)} className="min-h-9 rounded-full bg-mustard px-3 text-sm font-bold text-ink">
                Done
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
