import { NextResponse } from "next/server";
import { alert, emailLayout, sendEmail, SITE_URL } from "@/lib/notify";
import { canMove, statusLabel, type OrderStatus } from "@/lib/orders";
import { db, requireStaff } from "@/lib/supabase/server";

// Kitchen and admin move orders through the flow. Guests with an email hear
// when food is ready or if the order is cancelled.
export async function POST(req: Request, { params }: RouteContext<"/api/staff/orders/[id]">) {
  const staff = await requireStaff(req);
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const { status } = (await req.json().catch(() => ({}))) as { status?: OrderStatus };

  const { data: current } = await db().from("orders").select("id, status, number, table_label, guest_email, guest_key, locale, table_id, dining_tables(qr_token)").eq("id", id).maybeSingle();
  if (!current) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!status || !canMove(current.status, status, staff.role)) return NextResponse.json({ error: "transition_not_allowed" }, { status: 409 });

  const { error } = await db().from("orders").update({ status }).eq("id", id).eq("status", current.status);
  if (error) return NextResponse.json({ error: "server" }, { status: 502 });
  if (status === "ready") await db().from("order_items").update({ done: true }).eq("order_id", id);

  const ref = { type: "order" as const, id };
  const who = staff.role === "kitchen" ? "Kitchen" : "Admin";
  const audience = status === "ready" ? "all" : staff.role === "kitchen" ? "admin" : "kitchen";
  await alert(audience, `order.${status}`, `#${current.number} · table ${current.table_label}: ${statusLabel.en[status]}`, `${who} (${staff.email})`, ref);

  if (current.guest_email && (status === "ready" || status === "cancelled")) {
    const hu = current.locale === "hu";
    const token = (current.dining_tables as unknown as { qr_token: string } | null)?.qr_token;
    await sendEmail(
      current.guest_email,
      status === "ready" ? (hu ? `Kész a rendelésed · #${current.number}` : `Your food is ready · #${current.number}`) : hu ? `Rendelés törölve · #${current.number}` : `Order cancelled · #${current.number}`,
      emailLayout(
        statusLabel[hu ? "hu" : "en"][status],
        [status === "ready" ? (hu ? "Már visszük is az asztalodhoz." : "We're bringing it to your table now.") : hu ? "Kérdés esetén szólj a felszolgálónak." : "Please ask your server if you have any questions."],
        token ? { label: hu ? "Rendelés megnyitása" : "Open order", href: `${SITE_URL}/${current.locale}/t/${token}/order/${id}?k=${current.guest_key}` } : undefined,
        hu,
      ),
      `order.guest_${status}`,
      ref,
    );
  }
  return NextResponse.json({ ok: true, status });
}
