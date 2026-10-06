import { NextResponse } from "next/server";
import { db, hasSupabase } from "@/lib/supabase/server";

// Guest order tracking. The unguessable guest_key from the order response is
// the only credential, so nobody can read another table's order.
export async function GET(req: Request, { params }: RouteContext<"/api/orders/[id]">) {
  if (!hasSupabase()) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const { id } = await params;
  const key = new URL(req.url).searchParams.get("k");
  if (!key || !/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const { data } = await db()
    .from("orders")
    .select("id, number, status, table_label, total, note, created_at, accepted_at, ready_at, served_at, guest_key, order_items(name, qty, unit_price, note)")
    .eq("id", id)
    .maybeSingle();
  if (!data || data.guest_key !== key) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const { guest_key: _omit, ...order } = data;
  void _omit;
  // After the meal: the guest's own rating (if any) and the venue's review link.
  let after: { reviewUrl: string | null; rating: number | null } | null = null;
  if (order.status === "paid") {
    const [{ data: s }, { data: f }] = await Promise.all([
      db().from("settings").select("google_review_url").maybeSingle(),
      db().from("order_feedback").select("rating").eq("order_id", id).maybeSingle(),
    ]);
    after = { reviewUrl: s?.google_review_url ?? null, rating: f?.rating ?? null };
  }
  return NextResponse.json({ ...order, after }, { headers: { "cache-control": "no-store" } });
}
