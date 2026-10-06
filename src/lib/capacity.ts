import "server-only";
import { slotsFor } from "./booking";
import { db } from "./supabase/server";

// Table capacity: can every party sitting at a given time get its own table?
// A reservation holds its table for DURATION minutes. Bookings that already
// have a table keep it; the rest (plus the new party) take the smallest free
// table that fits, largest parties first. Conservative by design: if this
// says "full", staff can still squeeze people in by hand.

export const DURATION = 120; // minutes a reservation holds a table
const HOLDING = ["pending", "confirmed", "seated"]; // requests hold a table until decided

type Table = { id: string; label: string; seats: number };
type Holding = { id: string; minutes: number; party: number; tableId: string | null };

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

async function loadDay(date: string, excludeBookingId?: string) {
  const [{ data: tables }, { data: bookings }, { data: settings }] = await Promise.all([
    db().from("dining_tables").select("id, label, seats").eq("active", true).order("seats"),
    db().from("booking_requests").select("id, booking_time, party_size, table_id, kind").eq("booking_date", date).in("status", HOLDING),
    db().from("settings").select("open_all_day_date").maybeSingle(),
  ]);
  const holding: Holding[] = (bookings ?? [])
    .filter((b) => b.booking_time && b.id !== excludeBookingId && b.kind === "table")
    .map((b) => ({ id: b.id, minutes: toMin(b.booking_time!), party: b.party_size, tableId: b.table_id }));
  return { tables: (tables ?? []) as Table[], holding, openAllDayDate: (settings?.open_all_day_date as string | null) ?? null };
}

/** Assigns tables for everyone overlapping `minutes`; returns the new party's table or null if full. */
function assign(tables: Table[], holding: Holding[], minutes: number, party: number): Table | null {
  const overlapping = holding.filter((h) => Math.abs(h.minutes - minutes) < DURATION);
  const taken = new Set(overlapping.map((h) => h.tableId).filter(Boolean) as string[]);
  let free = tables.filter((t) => !taken.has(t.id)); // sorted by seats ascending
  const queue = [...overlapping.filter((h) => !h.tableId).map((h) => ({ party: h.party, isNew: false })), { party, isNew: true }].sort(
    (a, b) => b.party - a.party,
  );
  let mine: Table | null = null;
  for (const q of queue) {
    const t = free.find((x) => x.seats >= q.party);
    if (!t) return null;
    free = free.filter((x) => x.id !== t.id);
    if (q.isNew) mine = t;
  }
  return mine;
}

/** Bookable times for a date and party size, each marked available or full. */
export async function availability(date: string, party: number, now = new Date()) {
  const { tables, holding, openAllDayDate } = await loadDay(date);
  const { lunch, dinner } = slotsFor(date, now, openAllDayDate);
  const check = (time: string) => ({ time, available: assign(tables, holding, toMin(time), party) !== null });
  return { lunch: lunch.map(check), dinner: dinner.map(check) };
}

export async function isAvailable(date: string, time: string, party: number) {
  const { tables, holding } = await loadDay(date);
  return assign(tables, holding, toMin(time), party) !== null;
}

/** Best free table for an existing booking (used when approving without picking one). */
export async function suggestTable(bookingId: string, date: string, time: string, party: number) {
  const { tables, holding } = await loadDay(date, bookingId);
  return assign(tables, holding, toMin(time), party);
}
