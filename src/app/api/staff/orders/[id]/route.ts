import { after, NextResponse } from "next/server";
import { alert, brandedEmail, emailLayout, sendEmail, SITE_URL } from "@/lib/notify";
import { formatHuf } from "@/lib/site";
import { canMove, statusLabel, type OrderStatus } from "@/lib/orders";
import { db, requireStaff } from "@/lib/supabase/server";

// Kitchen and admin move orders through the flow. Guests with an email hear
// when food is ready or if the order is cancelled.
export async function POST(
  req: Request,
  { params }: RouteContext<"/api/staff/orders/[id]">,
) {
  const staff = await requireStaff(req);
  if (!staff)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const { status } = (await req.json().catch(() => ({}))) as {
    status?: OrderStatus;
  };

  const { data: current } = await db()
    .from("orders")
    .select(
      "id, status, number, table_label, guest_email, guest_key, locale, table_id, dining_tables(qr_token)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!current)
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!status || !canMove(current.status, status, staff.role))
    return NextResponse.json(
      { error: "transition_not_allowed" },
      { status: 409 },
    );

  const { error } = await db()
    .from("orders")
    .update({ status })
    .eq("id", id)
    .eq("status", current.status);
  if (error) return NextResponse.json({ error: "server" }, { status: 502 });
  if (status === "ready")
    await db().from("order_items").update({ done: true }).eq("order_id", id);

  const ref = { type: "order" as const, id };
  const who = staff.role === "kitchen" ? "Kitchen" : "Admin";
  const audience =
    status === "ready" ? "all" : staff.role === "kitchen" ? "admin" : "kitchen";
  await alert(
    audience,
    `order.${status}`,
    `#${current.number} · table ${current.table_label}: ${statusLabel.en[status]}`,
    `${who} (${staff.email})`,
    ref,
  );

  if (current.guest_email && (status === "ready" || status === "cancelled"))
    after(async () => {
      const hu = current.locale === "hu";
      const token = (
        current.dining_tables as unknown as { qr_token: string } | null
      )?.qr_token;
      await sendEmail(
        current.guest_email,
        status === "ready"
          ? hu
            ? `Kész a rendelésed · #${current.number}`
            : `Your food is ready · #${current.number}`
          : hu
            ? `Rendelés törölve · #${current.number}`
            : `Order cancelled · #${current.number}`,
        emailLayout(
          statusLabel[hu ? "hu" : "en"][status],
          [
            status === "ready"
              ? hu
                ? "Már visszük is az asztalodhoz."
                : "We're bringing it to your table now."
              : hu
                ? "Kérdés esetén szólj a felszolgálónak."
                : "Please ask your server if you have any questions.",
          ],
          token
            ? {
                label: hu ? "Rendelés megnyitása" : "Open order",
                href: `${SITE_URL}/${current.locale}/t/${token}/order/${id}?k=${current.guest_key}`,
              }
            : undefined,
          hu,
        ),
        `order.guest_${status}`,
        ref,
      );
    });
  // Bill paid → one thank-you email (if the guest left an address) with a link
  // to rate the visit and the venue's Google review page. Same for every guest.
  if (current.guest_email && status === "paid")
    after(async () => {
      const hu = current.locale === "hu";
      const token = (current.dining_tables as unknown as { qr_token: string } | null)?.qr_token;
      const [{ data: s }, { data: o }] = await Promise.all([
        db().from("settings").select("google_review_url").maybeSingle(),
        db().from("orders").select("total").eq("id", id).maybeSingle(),
      ]);
      const rateUrl = token ? `${SITE_URL}/${current.locale}/t/${token}/order/${id}?k=${current.guest_key}#rate` : null;
      await sendEmail(
        current.guest_email,
        hu ? "Köszönjük, hogy nálunk ettél! · Rotyi" : "Thanks for eating with us! · Rotyi",
        brandedEmail({
          hu,
          label: hu ? "Köszönjük" : "Thank you",
          title: hu ? "Gyere vissza hamar!" : "Come back soon!",
          preheader: hu ? "Milyen volt? Egy koppintás az értékelés." : "How was it? Rating takes one tap.",
          paragraphs: [
            hu
              ? "Köszönjük, hogy a Rotyiban ettél. Reméljük, ízlett! Ha van egy perced, mondd el, milyen volt."
              : "Thanks for eating at Rotyi, we hope you enjoyed it! If you have a minute, tell us how it was.",
          ],
          details: [
            [hu ? "Rendelés" : "Order", `#${current.number}`],
            [hu ? "Asztal" : "Table", current.table_label],
            [hu ? "Összesen" : "Total", formatHuf(o?.total ?? 0)],
          ],
          cta: s?.google_review_url
            ? { label: hu ? "Google értékelés írása" : "Write a Google review", href: s.google_review_url }
            : rateUrl
              ? { label: hu ? "Értékeld a látogatást" : "Rate your visit", href: rateUrl }
              : undefined,
          after: [
            ...(s?.google_review_url && rateUrl
              ? [`${hu ? "Inkább csak nekünk írnál?" : "Rather tell just us?"} <a href="${rateUrl}" style="color:#c62d17">${hu ? "Privát értékelés" : "Private rating"}</a>`]
              : []),
            hu ? "Napi menü hétköznap 11:30–15:00. Várunk!" : "Daily lunch menu weekdays 11:30–15:00. See you soon!",
          ],
        }),
        "order.guest_thanks",
        ref,
      );
    });
  return NextResponse.json({ ok: true, status });
}
