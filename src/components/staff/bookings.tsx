"use client";

import { useState } from "react";
import { staffFetch, supabase } from "@/lib/supabase/browser";
import { ago, Badge, Btn, Card, Empty, PageTitle, q, useLive, useTick } from "./ui";

type Booking = {
  id: string;
  reference: string;
  kind: "table" | "group";
  status: "pending" | "confirmed" | "declined" | "cancelled" | "seated" | "completed" | "no_show";
  name: string;
  email: string;
  phone: string;
  party_size: number;
  booking_date: string;
  booking_time: string | null;
  occasion: string | null;
  note: string | null;
  dishes: string[];
  dish_ids: string[];
  locale: string;
  admin_note: string | null;
  table_id: string | null;
  created_at: string;
  seated_at: string | null;
};
type Table = { id: string; label: string; seats: number; area: string };
type LinkedOrder = { id: string; number: number; status: string; booking_id: string };

type View = "upcoming" | "requests" | "history";

const statusLabel: Record<Booking["status"], string> = {
  pending: "Waiting",
  confirmed: "Approved",
  declined: "Declined",
  cancelled: "Cancelled",
  seated: "Seated",
  completed: "Finished",
  no_show: "No-show",
};

const budapestToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Budapest" }).format(new Date());

function dayLabel(date: string, today: string) {
  const d = new Date(`${date}T12:00:00`);
  const diff = Math.round((d.getTime() - new Date(`${today}T12:00:00`).getTime()) / 86_400_000);
  const nice = d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  return diff === 0 ? `Today · ${nice}` : diff === 1 ? `Tomorrow · ${nice}` : nice;
}

export function AdminBookings() {
  useTick();
  const [view, setView] = useState<View>("upcoming");
  const today = budapestToday();

  const { data, reload } = useLive(
    async () => {
      let query = supabase().from("booking_requests").select("*").limit(300);
      if (view === "upcoming") query = query.in("status", ["confirmed", "seated"]).gte("booking_date", today).order("booking_date").order("booking_time");
      if (view === "requests") query = query.eq("status", "pending").order("booking_date").order("booking_time");
      if (view === "history")
        query = query
          .or(`status.in.(declined,cancelled,completed,no_show),booking_date.lt.${today}`)
          .order("booking_date", { ascending: false })
          .order("booking_time", { ascending: false });
      const bookings = await q<Booking[]>(query);
      const [tables, orders, pending] = await Promise.all([
        q<Table[]>(supabase().from("dining_tables").select("id, label, seats, area").eq("active", true).order("label")),
        bookings.length
          ? q<LinkedOrder[]>(supabase().from("orders").select("id, number, status, booking_id").in("booking_id", bookings.map((b) => b.id)))
          : Promise.resolve([] as LinkedOrder[]),
        q<{ id: string }[]>(supabase().from("booking_requests").select("id").eq("status", "pending")),
      ]);
      return { bookings, tables, orders, pendingCount: pending.length };
    },
    ["booking_requests", "orders"],
    `bookings:${view}`,
  );

  // Group upcoming reservations by day, with a guests count per day.
  const groups = new Map<string, Booking[]>();
  for (const b of data?.bookings ?? []) groups.set(b.booking_date, [...(groups.get(b.booking_date) ?? []), b]);

  return (
    <>
      <PageTitle title="Bookings" />
      <div className="hide-scrollbar mb-5 flex gap-2 overflow-x-auto">
        <Btn tone={view === "upcoming" ? "red" : "ghost"} onClick={() => setView("upcoming")}>
          Upcoming
        </Btn>
        <Btn tone={view === "requests" ? "red" : "ghost"} onClick={() => setView("requests")}>
          Requests {data && data.pendingCount > 0 && <span className="ml-1 rounded-full bg-mustard px-2 text-ink">{data.pendingCount}</span>}
        </Btn>
        <Btn tone={view === "history" ? "red" : "ghost"} onClick={() => setView("history")}>
          History
        </Btn>
      </div>

      {!data ? (
        <Empty>Loading…</Empty>
      ) : data.bookings.length === 0 ? (
        <Empty>
          {view === "upcoming"
            ? "No approved reservations coming up. Approve requests in the Requests tab and they appear here."
            : view === "requests"
              ? "No requests waiting. New website bookings land here instantly."
              : "Nothing in the history yet."}
        </Empty>
      ) : view === "upcoming" ? (
        <div className="space-y-8">
          {[...groups.entries()].map(([date, list]) => (
            <section key={date}>
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-ink pb-1">
                <h2 className="display text-3xl">{dayLabel(date, today)}</h2>
                <p className="font-bold">
                  {list.length} {list.length === 1 ? "reservation" : "reservations"} · {list.reduce((s, b) => s + b.party_size, 0)} guests ·{" "}
                  {list.filter((b) => b.dish_ids.length).length} with pre-order
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {list.map((b) => (
                  <BookingCard key={b.id} b={b} tables={data.tables} order={data.orders.find((o) => o.booking_id === b.id)} onDone={reload} today={today} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.bookings.map((b) => (
            <BookingCard key={b.id} b={b} tables={data.tables} order={data.orders.find((o) => o.booking_id === b.id)} onDone={reload} today={today} />
          ))}
        </div>
      )}
    </>
  );
}

function BookingCard({ b, tables, order, onDone, today }: { b: Booking; tables: Table[]; order?: LinkedOrder; onDone: () => void; today: string }) {
  const [note, setNote] = useState("");
  const [tableId, setTableId] = useState(b.table_id ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const fits = tables.filter((t) => t.seats >= b.party_size);
  const tableLabel = tables.find((t) => t.id === (tableId || b.table_id))?.label;
  const isToday = b.booking_date === today;

  async function act(action: string, extra: Record<string, unknown> = {}) {
    const confirmText: Record<string, string> = {
      decline: `Decline booking #${b.reference}? The guest will be emailed.`,
      cancel: `Cancel booking #${b.reference}? The guest will be emailed.`,
      no_show: `Mark #${b.reference} (${b.name}) as no-show?`,
    };
    if (confirmText[action] && !confirm(confirmText[action])) return;
    setBusy(action);
    try {
      const r = await staffFetch(`/api/staff/bookings/${b.id}`, { action, note, tableId: tableId || null, ...extra });
      setResult(
        r.email
          ? `Done · guest email ${r.email}`
          : r.preorder
            ? `Table ${r.table} · pre-order #${r.preorder.number} sent to kitchen${r.preorder.skipped.length ? ` (${r.preorder.skipped.length} sold-out dish skipped)` : ""}`
            : "Saved ✓",
      );
    } catch (e) {
      const m = (e as Error).message;
      setResult(
        m === "table_required"
          ? "Pick a table first."
          : m === "transition_not_allowed"
            ? "Already updated on another screen. Refreshed."
            : m === "preorder_already_sent"
              ? "Pre-order was already sent."
              : `Failed: ${m}`,
      );
    } finally {
      setBusy(null);
      onDone();
    }
  }

  const date = new Date(`${b.booking_date}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  const tableSelect = (
    <select
      value={tableId}
      onChange={(e) => {
        setTableId(e.target.value);
        if ((b.status === "confirmed" || b.status === "seated") && e.target.value) act("table", { tableId: e.target.value });
      }}
      className="min-h-11 w-full rounded-xl border-2 border-ink/20 bg-white px-2"
      aria-label={`Table for booking ${b.reference}`}
    >
      <option value="">{b.status === "pending" ? "Assign table (optional)" : "Choose table…"}</option>
      {fits.map((t) => (
        <option key={t.id} value={t.id}>
          {t.label} · {t.seats} seats · {t.area}
        </option>
      ))}
    </select>
  );

  return (
    <Card className={b.status === "pending" ? "ring-4 ring-mustard" : b.status === "seated" ? "ring-4 ring-leaf" : ""}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-[family-name:var(--font-display)] text-3xl uppercase leading-none">
            {b.status === "pending" || !isToday ? `${date} · ` : ""}
            {b.booking_time?.slice(0, 5) ?? "—"}
          </p>
          <p className="mt-1 text-lg font-bold">
            {b.name} · {b.party_size} {b.party_size === 1 ? "guest" : "guests"} {b.kind === "group" && <Badge value="pending" label="group" />}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge
            value={b.status === "seated" ? "ready" : b.status === "no_show" ? "declined" : b.status === "completed" ? "paid" : b.status}
            label={statusLabel[b.status]}
          />
          {tableLabel && b.status !== "pending" && <span className="rounded-full bg-ink px-2.5 py-0.5 text-xs font-bold text-cream">Table {tableLabel}</span>}
        </div>
      </div>

      <div className="mt-2 space-y-1 text-sm">
        <p>
          <a className="font-semibold underline" href={`tel:${b.phone}`}>
            {b.phone}
          </a>{" "}
          ·{" "}
          <a className="underline" href={`mailto:${b.email}`}>
            {b.email}
          </a>
        </p>
        {b.occasion && <p>Occasion: {b.occasion}</p>}
        {b.note && <p className="rounded-lg bg-mustard/40 px-2 py-1">“{b.note}”</p>}
        {b.dishes.length > 0 && (
          <div className="rounded-lg border-2 border-dashed border-ink/25 px-2 py-1.5">
            <p className="text-xs font-bold uppercase tracking-wider text-paprika-ink">Pre-order from website</p>
            <p className="font-semibold">{b.dishes.join(", ")}</p>
            {order ? (
              <p className="text-xs">
                Sent to kitchen as order #{order.number} · <Badge value={order.status} />
              </p>
            ) : b.dish_ids.length ? (
              <p className="text-xs text-ink/70">Goes to the kitchen when you seat the guest.</p>
            ) : (
              <p className="text-xs text-ink/70">Wishes only (booked before pre-orders were saved).</p>
            )}
          </div>
        )}
        <p className="text-ink/60">
          #{b.reference} · {b.locale.toUpperCase()} · requested {ago(b.created_at)}
          {b.seated_at ? ` · seated ${ago(b.seated_at)}` : ""}
        </p>
        {b.admin_note && <p className="text-ink/70">Our note: {b.admin_note}</p>}
      </div>

      {b.status === "pending" && (
        <div className="mt-3 space-y-2">
          {tableSelect}
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Message to guest (optional)"
            className="min-h-11 w-full rounded-xl border-2 border-ink/20 bg-white px-3"
            aria-label="Message to guest"
          />
          <div className="flex gap-2">
            <Btn tone="green" className="flex-1" disabled={!!busy} onClick={() => act("confirm")}>
              {busy === "confirm" ? "…" : "✓ Approve"}
            </Btn>
            <Btn tone="red" className="flex-1" disabled={!!busy} onClick={() => act("decline")}>
              {busy === "decline" ? "…" : "✕ Decline"}
            </Btn>
          </div>
        </div>
      )}

      {b.status === "confirmed" && (
        <div className="mt-3 space-y-2">
          {tableSelect}
          <Btn tone="green" className="w-full" disabled={!!busy || !(tableId || b.table_id)} onClick={() => act("seat")}>
            {busy === "seat" ? "…" : b.dish_ids.length && !order ? "Guest arrived · seat & send pre-order" : "Guest arrived · seat"}
          </Btn>
          {!(tableId || b.table_id) && <p className="text-xs text-ink/70">Pick a table to seat the guest.</p>}
          <div className="flex gap-2">
            <Btn tone="ghost" className="flex-1" disabled={!!busy} onClick={() => act("no_show")}>
              No-show
            </Btn>
            <Btn tone="ghost" className="flex-1" disabled={!!busy} onClick={() => act("cancel")}>
              Cancel
            </Btn>
          </div>
        </div>
      )}

      {b.status === "seated" && (
        <div className="mt-3 space-y-2">
          {tableSelect}
          <div className="flex gap-2">
            {b.dish_ids.length > 0 && !order && (
              <Btn tone="red" className="flex-1" disabled={!!busy} onClick={() => act("preorder")}>
                Send pre-order
              </Btn>
            )}
            <Btn tone="ink" className="flex-1" disabled={!!busy} onClick={() => act("complete")}>
              {busy === "complete" ? "…" : "Finished · table free"}
            </Btn>
          </div>
        </div>
      )}

      {result && (
        <p className="mt-2 text-sm font-semibold" role="status">
          {result}
        </p>
      )}
    </Card>
  );
}
