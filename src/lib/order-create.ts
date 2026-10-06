import "server-only";
import { db } from "./supabase/server";

// One place that turns "dish ids + quantities" into an order: prices and
// availability always come from the database, never from the client.

export type OrderLine = { id: string; qty: number; note?: string | null };

export type CreatedOrder = {
  id: string;
  number: number;
  guest_key: string;
  total: number;
  rows: { name: string; qty: number; unit_price: number }[];
  skipped: string[]; // dish ids that were unknown or sold out
};

export async function createOrder(opts: {
  table: { id: string; label: string };
  lines: OrderLine[];
  lang: "hu" | "en";
  guestName?: string | null;
  guestEmail?: string | null;
  note?: string | null;
  source: "qr" | "booking" | "staff";
  bookingId?: string | null;
  /** QR orders fail if a dish is sold out; booking pre-orders just skip it. */
  strict: boolean;
}): Promise<{ ok: true; order: CreatedOrder } | { ok: false; error: "unavailable" | "empty" | "server"; items?: string[] }> {
  const ids = [...new Set(opts.lines.map((l) => l.id))];
  const { data: menu } = await db().from("menu_items").select("id, name_hu, name_en, price, available").in("id", ids);
  const byId = new Map((menu ?? []).map((m) => [m.id, m]));
  const skipped = ids.filter((id) => !byId.get(id)?.available);
  if (opts.strict && skipped.length) return { ok: false, error: "unavailable", items: skipped };

  const rows = opts.lines
    .filter((l) => byId.get(l.id)?.available)
    .map((l) => {
      const m = byId.get(l.id)!;
      return {
        item_id: m.id,
        name: opts.lang === "hu" ? m.name_hu : m.name_en,
        unit_price: m.price,
        qty: l.qty,
        note: (l.note ?? "").trim().slice(0, 200) || null,
      };
    });
  if (!rows.length) return { ok: false, error: "empty" };
  const total = rows.reduce((s, r) => s + r.unit_price * r.qty, 0);

  const { data: order, error } = await db()
    .from("orders")
    .insert({
      table_id: opts.table.id,
      table_label: opts.table.label,
      guest_name: opts.guestName?.trim().slice(0, 80) || null,
      guest_email: opts.guestEmail?.trim().toLowerCase() || null,
      note: opts.note?.trim().slice(0, 500) || null,
      locale: opts.lang,
      total,
      source: opts.source,
      booking_id: opts.bookingId ?? null,
    })
    .select("id, number, guest_key")
    .single();
  if (error || !order) {
    console.error("[orders] insert failed", error);
    return { ok: false, error: "server" };
  }
  const { error: itemsError } = await db().from("order_items").insert(rows.map((r) => ({ ...r, order_id: order.id })));
  if (itemsError) {
    await db().from("orders").delete().eq("id", order.id);
    return { ok: false, error: "server" };
  }
  return { ok: true, order: { ...order, total, rows, skipped } };
}
