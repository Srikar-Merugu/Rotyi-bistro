import { NextResponse } from "next/server";
import { alert } from "@/lib/notify";
import { db, hasSupabase } from "@/lib/supabase/server";

// "Call waiter" / "Bring the bill" from the table QR page. The table's QR
// token is the credential; one open request per kind per table.

async function tableFor(token: string) {
  const { data } = await db().from("dining_tables").select("id, label, active").eq("qr_token", token).maybeSingle();
  return data?.active ? data : null;
}

export async function GET(_req: Request, { params }: RouteContext<"/api/tables/[token]/service">) {
  if (!hasSupabase()) return NextResponse.json({ waiter: false, bill: false });
  const table = await tableFor((await params).token);
  if (!table) return NextResponse.json({ error: "invalid_table" }, { status: 404 });
  const { data } = await db().from("service_requests").select("kind").eq("table_id", table.id).eq("status", "open");
  const open = new Set((data ?? []).map((r) => r.kind));
  return NextResponse.json({ waiter: open.has("waiter"), bill: open.has("bill") }, { headers: { "cache-control": "no-store" } });
}

export async function POST(req: Request, { params }: RouteContext<"/api/tables/[token]/service">) {
  if (!hasSupabase()) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const table = await tableFor((await params).token);
  if (!table) return NextResponse.json({ error: "invalid_table" }, { status: 404 });
  const { kind, payment } = (await req.json().catch(() => ({}))) as { kind?: string; payment?: string };
  if (kind !== "waiter" && kind !== "bill") return NextResponse.json({ error: "invalid" }, { status: 422 });
  const pay = kind === "bill" && (payment === "card" || payment === "cash") ? payment : null;

  const { data: created, error } = await db()
    .from("service_requests")
    .insert({ table_id: table.id, table_label: table.label, kind, payment: pay })
    .select("id")
    .maybeSingle();
  // Unique-violation = already an open request for this table: fine, staff already know.
  if (error && error.code !== "23505") return NextResponse.json({ error: "server" }, { status: 502 });

  if (created) {
    await alert(
      "admin",
      kind === "bill" ? "service.bill" : "service.waiter",
      kind === "bill" ? `🧾 Table ${table.label} wants the bill${pay ? ` (${pay})` : ""}` : `🙋 Table ${table.label} is calling a waiter`,
      kind === "bill" ? "Bring the bill" : "Please go to the table",
      { type: "system" },
    );
  }
  return NextResponse.json({ ok: true, alreadyOpen: !created });
}
