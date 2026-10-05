"use client";

import { useState } from "react";
import { staffFetch, supabase } from "@/lib/supabase/browser";
import { ago, Badge, Btn, Card, Empty, PageTitle, q, useLive, useTick } from "./ui";

type Booking = {
  id: string;
  reference: string;
  kind: "table" | "group";
  status: "pending" | "confirmed" | "declined" | "cancelled";
  name: string;
  email: string;
  phone: string;
  party_size: number;
  booking_date: string;
  booking_time: string | null;
  occasion: string | null;
  note: string | null;
  dishes: string[];
  locale: string;
  admin_note: string | null;
  table_id: string | null;
  created_at: string;
};
type Table = { id: string; label: string; seats: number; area: string };

const filters = ["pending", "confirmed", "declined", "all"] as const;

export function AdminBookings() {
  useTick();
  const [filter, setFilter] = useState<(typeof filters)[number]>("pending");
  const [when, setWhen] = useState<"upcoming" | "today" | "past">("upcoming");
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Budapest" }).format(new Date());

  const { data, reload } = useLive(async () => {
    let query = supabase().from("booking_requests").select("*").order("booking_date").order("booking_time").limit(200);
    if (filter !== "all") query = query.eq("status", filter);
    if (when === "today") query = query.eq("booking_date", today);
    if (when === "upcoming") query = query.gte("booking_date", today);
    if (when === "past") query = query.lt("booking_date", today);
    const [bookings, tables] = await Promise.all([
      q<Booking[]>(query),
      q<Table[]>(supabase().from("dining_tables").select("id, label, seats, area").eq("active", true).order("label")),
    ]);
    return { bookings, tables };
  }, ["booking_requests"], `booking_requests:${filter}:${when}`);

  return (
    <>
      <PageTitle title="Bookings">
        <div className="flex flex-wrap gap-2">
          {(["upcoming", "today", "past"] as const).map((w) => (
            <Btn key={w} tone={when === w ? "ink" : "ghost"} onClick={() => setWhen(w)}>
              {w}
            </Btn>
          ))}
        </div>
      </PageTitle>
      <div className="hide-scrollbar mb-4 flex gap-2 overflow-x-auto">
        {filters.map((f) => (
          <Btn key={f} tone={filter === f ? "red" : "ghost"} onClick={() => setFilter(f)}>
            {f}
          </Btn>
        ))}
      </div>
      {!data ? (
        <Empty>Loading…</Empty>
      ) : data.bookings.length === 0 ? (
        <Empty>No {filter === "all" ? "" : filter} bookings {when === "today" ? "today" : when}.</Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.bookings.map((b) => (
            <BookingCard key={b.id} b={b} tables={data.tables} onDone={reload} />
          ))}
        </div>
      )}
    </>
  );
}

function BookingCard({ b, tables, onDone }: { b: Booking; tables: Table[]; onDone: () => void }) {
  const [note, setNote] = useState("");
  const [tableId, setTableId] = useState(b.table_id ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const fits = tables.filter((t) => t.seats >= b.party_size);

  async function act(action: "confirm" | "decline" | "cancel") {
    if (action !== "confirm" && !confirm(`${action === "decline" ? "Decline" : "Cancel"} booking #${b.reference}? The guest will be emailed.`)) return;
    setBusy(action);
    try {
      const r = await staffFetch(`/api/staff/bookings/${b.id}`, { action, note, tableId: tableId || null });
      setResult(`Done · guest email ${r.email}`);
      onDone();
    } catch (e) {
      setResult(`Failed: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  const date = new Date(`${b.booking_date}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

  return (
    <Card className={b.status === "pending" ? "ring-4 ring-mustard" : ""}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-[family-name:var(--font-display)] text-3xl uppercase leading-none">
            {date} · {b.booking_time?.slice(0, 5) ?? "—"}
          </p>
          <p className="mt-1 text-lg font-bold">
            {b.name} · {b.party_size} {b.party_size === 1 ? "guest" : "guests"} {b.kind === "group" && <Badge value="pending" label="group" />}
          </p>
        </div>
        <Badge value={b.status} />
      </div>
      <div className="mt-2 space-y-0.5 text-sm">
        <p>
          <a className="font-semibold underline" href={`tel:${b.phone}`}>{b.phone}</a> · <a className="underline" href={`mailto:${b.email}`}>{b.email}</a>
        </p>
        {b.occasion && <p>Occasion: {b.occasion}</p>}
        {b.note && <p className="rounded-lg bg-mustard/40 px-2 py-1">“{b.note}”</p>}
        {b.dishes.length > 0 && <p>Wants to try: {b.dishes.join(", ")}</p>}
        <p className="text-ink/60">
          #{b.reference} · {b.locale.toUpperCase()} · requested {ago(b.created_at)}
        </p>
        {b.admin_note && <p className="text-ink/70">Our note: {b.admin_note}</p>}
      </div>

      {b.status === "pending" && (
        <div className="mt-3 space-y-2">
          <select value={tableId} onChange={(e) => setTableId(e.target.value)} className="min-h-11 w-full rounded-xl border-2 border-ink/20 bg-white px-2" aria-label="Assign table">
            <option value="">Assign table (optional)</option>
            {fits.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label} · {t.seats} seats · {t.area}
              </option>
            ))}
          </select>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Message to guest (optional)" className="min-h-11 w-full rounded-xl border-2 border-ink/20 bg-white px-3" aria-label="Message to guest" />
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
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-sm">{tables.find((t) => t.id === b.table_id)?.label ? `Table ${tables.find((t) => t.id === b.table_id)!.label}` : "No table assigned"}</span>
          <Btn tone="ghost" disabled={!!busy} onClick={() => act("cancel")}>
            Cancel booking
          </Btn>
        </div>
      )}
      {result && <p className="mt-2 text-sm font-semibold" role="status">{result}</p>}
    </Card>
  );
}
