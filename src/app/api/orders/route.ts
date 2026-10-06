import { after, NextResponse } from "next/server";
import {
  alert,
  emailLayout,
  esc,
  ownerEmail,
  sendEmail,
  SITE_URL,
} from "@/lib/notify";
import { MAX_LINES, MAX_QTY } from "@/lib/orders";
import { formatHuf } from "@/lib/site";
import { emailOk } from "@/lib/booking";
import { db, hasSupabase } from "@/lib/supabase/server";
import { createOrder } from "@/lib/order-create";

// Guest scans the table QR and orders. Prices and availability come from the
// database, never from the client.
type Line = { id: string; qty: number; note?: string };
type Body = {
  token?: string;
  items?: Line[];
  name?: string;
  email?: string;
  note?: string;
  lang?: string;
};

export async function POST(req: Request) {
  if (!hasSupabase())
    return NextResponse.json(
      { error: "ordering_unavailable" },
      { status: 503 },
    );
  const body = (await req.json().catch(() => ({}))) as Body;
  const lang = body.lang === "en" ? "en" : "hu";
  const lines = Array.isArray(body.items) ? body.items : [];
  if (!body.token || !lines.length || lines.length > MAX_LINES)
    return NextResponse.json({ error: "invalid_items" }, { status: 422 });
  if (
    lines.some(
      (l) =>
        typeof l.id !== "string" ||
        !Number.isInteger(l.qty) ||
        l.qty < 1 ||
        l.qty > MAX_QTY,
    )
  )
    return NextResponse.json({ error: "invalid_items" }, { status: 422 });
  const email = (body.email ?? "").trim().toLowerCase();
  if (email && !emailOk(email))
    return NextResponse.json({ error: "invalid_email" }, { status: 422 });

  const [{ data: table }, { data: settings }] = await Promise.all([
    db()
      .from("dining_tables")
      .select("id, label, active")
      .eq("qr_token", body.token)
      .maybeSingle(),
    db().from("settings").select("ordering_open").maybeSingle(),
  ]);
  if (!table || !table.active)
    return NextResponse.json({ error: "invalid_table" }, { status: 404 });
  if (settings && !settings.ordering_open)
    return NextResponse.json({ error: "ordering_closed" }, { status: 409 });

  const created = await createOrder({
    table,
    lines,
    lang,
    guestName: body.name,
    guestEmail: email || null,
    note: body.note,
    source: "qr",
    strict: true,
  });
  if (!created.ok)
    return created.error === "unavailable"
      ? NextResponse.json(
          { error: "unavailable", items: created.items },
          { status: 409 },
        )
      : NextResponse.json(
          { error: created.error === "empty" ? "invalid_items" : "server" },
          { status: created.error === "empty" ? 422 : 502 },
        );
  const { order } = created;
  const { rows, total } = order;

  const ref = { type: "order" as const, id: order.id };
  const summary = rows.map((r) => `${r.qty}× ${r.name}`).join(", ");
  const hu = lang === "hu";
  const trackUrl = `${SITE_URL}/${lang}/t/${body.token}/order/${order.id}?k=${order.guest_key}`;
  // The kitchen alert is written before responding so tickets appear instantly; emails go out after.
  await alert(
    "all",
    "order.new",
    `New order #${order.number} · table ${table.label}`,
    `${summary} · ${formatHuf(total)}`,
    ref,
  );
  after(async () => {
    await Promise.all([
      sendEmail(
        await ownerEmail(),
        `New order #${order.number} · table ${table.label} · ${formatHuf(total)}`,
        emailLayout(
          `Order #${order.number} · table ${table.label}`,
          [
            esc(summary),
            `Total: <strong>${formatHuf(total)}</strong>`,
            body.note ? `Note: ${esc(body.note)}` : "",
          ].filter(Boolean),
          {
            label: "Open orders",
            href: `${SITE_URL}/admin/orders`,
          },
        ),
        "order.owner",
        ref,
      ),
      email
        ? sendEmail(
            email,
            hu
              ? `Rendelés leadva · #${order.number}`
              : `Order placed · #${order.number}`,
            emailLayout(
              hu ? "Megkaptuk a rendelésed!" : "We've got your order!",
              [
                esc(summary),
                `${hu ? "Összesen" : "Total"}: <strong>${formatHuf(total)}</strong>`,
                hu
                  ? "Szólunk, amikor kész."
                  : "We'll let you know when it's ready.",
              ],
              {
                label: hu ? "Rendelés követése" : "Track your order",
                href: trackUrl,
              },
              hu,
            ),
            "order.guest_placed",
            ref,
          )
        : null,
    ]);
  });

  return NextResponse.json({
    ok: true,
    id: order.id,
    number: order.number,
    key: order.guest_key,
  });
}
