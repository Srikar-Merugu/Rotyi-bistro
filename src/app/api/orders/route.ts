import { NextResponse } from "next/server";
import { alert, emailLayout, esc, ownerEmail, sendEmail, SITE_URL } from "@/lib/notify";
import { MAX_LINES, MAX_QTY } from "@/lib/orders";
import { formatHuf } from "@/lib/site";
import { emailOk } from "@/lib/booking";
import { db, hasSupabase } from "@/lib/supabase/server";

// Guest scans the table QR and orders. Prices and availability come from the
// database, never from the client.
type Line = { id: string; qty: number; note?: string };
type Body = { token?: string; items?: Line[]; name?: string; email?: string; note?: string; lang?: string };

export async function POST(req: Request) {
  if (!hasSupabase()) return NextResponse.json({ error: "ordering_unavailable" }, { status: 503 });
  const body = (await req.json().catch(() => ({}))) as Body;
  const lang = body.lang === "en" ? "en" : "hu";
  const lines = Array.isArray(body.items) ? body.items : [];
  if (!body.token || !lines.length || lines.length > MAX_LINES) return NextResponse.json({ error: "invalid_items" }, { status: 422 });
  if (lines.some((l) => typeof l.id !== "string" || !Number.isInteger(l.qty) || l.qty < 1 || l.qty > MAX_QTY))
    return NextResponse.json({ error: "invalid_items" }, { status: 422 });
  const email = (body.email ?? "").trim().toLowerCase();
  if (email && !emailOk(email)) return NextResponse.json({ error: "invalid_email" }, { status: 422 });

  const [{ data: table }, { data: settings }] = await Promise.all([
    db().from("dining_tables").select("id, label, active").eq("qr_token", body.token).maybeSingle(),
    db().from("settings").select("ordering_open").maybeSingle(),
  ]);
  if (!table || !table.active) return NextResponse.json({ error: "invalid_table" }, { status: 404 });
  if (settings && !settings.ordering_open) return NextResponse.json({ error: "ordering_closed" }, { status: 409 });

  const ids = [...new Set(lines.map((l) => l.id))];
  const { data: menu } = await db().from("menu_items").select("id, name_hu, name_en, price, available").in("id", ids);
  const byId = new Map((menu ?? []).map((m) => [m.id, m]));
  const unavailable = ids.filter((id) => !byId.get(id)?.available);
  if (unavailable.length) return NextResponse.json({ error: "unavailable", items: unavailable }, { status: 409 });

  const rows = lines.map((l) => {
    const m = byId.get(l.id)!;
    return { item_id: m.id, name: lang === "hu" ? m.name_hu : m.name_en, unit_price: m.price, qty: l.qty, note: (l.note ?? "").trim().slice(0, 200) || null };
  });
  const total = rows.reduce((s, r) => s + r.unit_price * r.qty, 0);

  const { data: order, error } = await db()
    .from("orders")
    .insert({
      table_id: table.id,
      table_label: table.label,
      guest_name: (body.name ?? "").trim().slice(0, 80) || null,
      guest_email: email || null,
      note: (body.note ?? "").trim().slice(0, 500) || null,
      locale: lang,
      total,
    })
    .select("id, number, guest_key")
    .single();
  if (error || !order) {
    console.error("[orders] insert failed", error);
    return NextResponse.json({ error: "server" }, { status: 502 });
  }
  const { error: itemsError } = await db().from("order_items").insert(rows.map((r) => ({ ...r, order_id: order.id })));
  if (itemsError) {
    await db().from("orders").delete().eq("id", order.id);
    return NextResponse.json({ error: "server" }, { status: 502 });
  }

  const ref = { type: "order" as const, id: order.id };
  const summary = rows.map((r) => `${r.qty}× ${r.name}`).join(", ");
  const hu = lang === "hu";
  const trackUrl = `${SITE_URL}/${lang}/t/${body.token}/order/${order.id}?k=${order.guest_key}`;
  await Promise.all([
    alert("all", "order.new", `New order #${order.number} · table ${table.label}`, `${summary} · ${formatHuf(total)}`, ref),
    sendEmail(
      await ownerEmail(),
      `New order #${order.number} · table ${table.label} · ${formatHuf(total)}`,
      emailLayout(`Order #${order.number} · table ${table.label}`, [esc(summary), `Total: <strong>${formatHuf(total)}</strong>`, body.note ? `Note: ${esc(body.note)}` : ""].filter(Boolean), {
        label: "Open orders",
        href: `${SITE_URL}/admin/orders`,
      }),
      "order.owner",
      ref,
    ),
    email
      ? sendEmail(
          email,
          hu ? `Rendelés leadva · #${order.number}` : `Order placed · #${order.number}`,
          emailLayout(
            hu ? "Megkaptuk a rendelésed!" : "We've got your order!",
            [esc(summary), `${hu ? "Összesen" : "Total"}: <strong>${formatHuf(total)}</strong>`, hu ? "Szólunk, amikor kész." : "We'll let you know when it's ready."],
            { label: hu ? "Rendelés követése" : "Track your order", href: trackUrl },
            hu,
          ),
          "order.guest_placed",
          ref,
        )
      : null,
  ]);

  return NextResponse.json({ ok: true, id: order.id, number: order.number, key: order.guest_key });
}
