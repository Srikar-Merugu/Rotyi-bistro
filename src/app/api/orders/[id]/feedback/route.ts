import { NextResponse } from "next/server";
import { alert } from "@/lib/notify";
import { db, hasSupabase } from "@/lib/supabase/server";

// Guest rates their visit after paying. Same credential as order tracking
// (the order's secret guest key). One rating per order; re-submitting updates it.
export async function POST(req: Request, { params }: RouteContext<"/api/orders/[id]/feedback">) {
  if (!hasSupabase()) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { k?: string; rating?: number; comment?: string };
  const rating = Number(body.rating);
  if (!body.k || !/^[0-9a-f-]{36}$/.test(id) || !Number.isInteger(rating) || rating < 1 || rating > 5)
    return NextResponse.json({ error: "invalid" }, { status: 422 });

  const { data: order } = await db().from("orders").select("id, number, status, table_label, locale, guest_key").eq("id", id).maybeSingle();
  if (!order || order.guest_key !== body.k) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (order.status !== "paid" && order.status !== "served") return NextResponse.json({ error: "not_finished" }, { status: 409 });

  const comment = (body.comment ?? "").trim().slice(0, 1000) || null;
  const { data: existing } = await db().from("order_feedback").select("id").eq("order_id", id).maybeSingle();
  const { error } = await db()
    .from("order_feedback")
    .upsert(
      { order_id: id, rating, comment, locale: order.locale, table_label: order.table_label, updated_at: new Date().toISOString() },
      { onConflict: "order_id" },
    );
  if (error) return NextResponse.json({ error: "server" }, { status: 502 });

  if (!existing) {
    await alert(
      "admin",
      rating <= 3 ? "feedback.low" : "feedback.new",
      `${"★".repeat(rating)}${"☆".repeat(5 - rating)} from table ${order.table_label} (#${order.number})`,
      comment ?? (rating <= 3 ? "No comment. Worth a word with the table?" : "No comment"),
      { type: "order", id },
    );
  }
  return NextResponse.json({ ok: true });
}
