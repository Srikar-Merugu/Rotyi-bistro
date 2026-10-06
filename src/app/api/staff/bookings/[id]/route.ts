import { NextResponse } from "next/server";
import { alert, brandedEmail, esc, niceDate, sendEmail, SITE_URL } from "@/lib/notify";
import { db, requireStaff } from "@/lib/supabase/server";
import { formatHuf, venue } from "@/lib/site";
import { createOrder } from "@/lib/order-create";

type Body = {
  action?: string;
  note?: string;
  tableId?: string | null;
  sendPreorder?: boolean;
};

// Which booking status each action may start from.
const from: Record<string, string[]> = {
  confirm: ["pending"],
  decline: ["pending"],
  cancel: ["pending", "confirmed"],
  seat: ["confirmed"],
  no_show: ["confirmed"],
  complete: ["seated"],
  table: ["confirmed", "seated"],
  preorder: ["confirmed", "seated"],
};

// Admin decides on requests (guest is emailed), then runs the reservation:
// assign/change table, seat the guest (optionally firing their website
// pre-order to the kitchen), mark no-show or finished.
export async function POST(
  req: Request,
  { params }: RouteContext<"/api/staff/bookings/[id]">,
) {
  const staff = await requireStaff(req, ["admin"]);
  if (!staff)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Body;
  const action = body.action ?? "";
  if (!from[action])
    return NextResponse.json({ error: "invalid_action" }, { status: 422 });

  const { data: current } = await db()
    .from("booking_requests")
    .select(
      "id, status, reference, name, email, party_size, booking_date, booking_time, locale, table_id, dish_ids, note",
    )
    .eq("id", id)
    .maybeSingle();
  if (!current)
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!from[action].includes(current.status))
    return NextResponse.json(
      { error: "transition_not_allowed", status: current.status },
      { status: 409 },
    );

  if (!["confirm", "decline", "cancel"].includes(action))
    return reservationAction(action, current, body, staff.userId);

  const status =
    action === "confirm"
      ? "confirmed"
      : action === "decline"
        ? "declined"
        : "cancelled";
  const note = (body.note ?? "").trim().slice(0, 1000) || null;

  const { data: b, error } = await db()
    .from("booking_requests")
    .update({
      status,
      admin_note: note,
      table_id:
        status === "confirmed" ? body.tableId || null : current.table_id,
      status_changed_at: new Date().toISOString(),
      status_changed_by: staff.userId,
    })
    .eq("id", id)
    .select(
      "id, reference, name, email, party_size, booking_date, booking_time, locale, dining_tables(label)",
    )
    .single();
  if (error || !b)
    return NextResponse.json({ error: "not_found" }, { status: 404 });

  const hu = b.locale === "hu";
  const when = `${b.booking_date}${b.booking_time ? `, ${String(b.booking_time).slice(0, 5)}` : ""}`;
  const table = (b.dining_tables as unknown as { label: string } | null)?.label;
  const ref = { type: "booking" as const, id: b.id };
  const copy = {
    confirmed: {
      subject: hu
        ? `Visszaigazoltuk az asztalod · #${b.reference}`
        : `Your table is confirmed · #${b.reference}`,
      title: hu ? "Várunk szeretettel!" : "We've approved your table!",
      lead: hu
        ? "Örömmel jelezzük, hogy a foglalásodat visszaigazoltuk:"
        : "Good news, your booking is confirmed:",
    },
    declined: {
      subject: hu
        ? `A foglalásod sajnos nem fér bele · #${b.reference}`
        : `We can't take your booking · #${b.reference}`,
      title: hu ? "Sajnáljuk!" : "Sorry!",
      lead: hu
        ? "Erre az időpontra sajnos nem tudunk asztalt adni:"
        : "Unfortunately we can't seat you at this time:",
    },
    cancelled: {
      subject: hu
        ? `Foglalás törölve · #${b.reference}`
        : `Booking cancelled · #${b.reference}`,
      title: hu ? "Foglalás törölve" : "Booking cancelled",
      lead: hu
        ? "A következő foglalást töröltük:"
        : "The following booking has been cancelled:",
    },
  }[status];

  const mail = await sendEmail(
    b.email,
    copy.subject,
    brandedEmail({
      hu,
      label: { confirmed: hu ? "Visszaigazolva" : "Confirmed", declined: hu ? "Foglalás" : "Booking", cancelled: hu ? "Törölve" : "Cancelled" }[status],
      title: copy.title,
      preheader: `${niceDate(b.booking_date, hu)} ${String(b.booking_time ?? "").slice(0, 5)} · #${b.reference}`,
      paragraphs: [copy.lead, ...(note ? [`<strong>${hu ? "Üzenet tőlünk" : "A note from us"}:</strong> ${esc(note)}`] : [])],
      details: [
        [hu ? "Nap" : "Date", esc(niceDate(b.booking_date, hu))],
        [hu ? "Időpont" : "Time", esc(String(b.booking_time ?? "—").slice(0, 5))],
        [hu ? "Létszám" : "Guests", `${b.party_size} ${hu ? "fő" : b.party_size === 1 ? "guest" : "guests"}`],
        ...((table && status === "confirmed" ? [[hu ? "Asztal" : "Table", esc(table)]] : []) as [string, string][]),
        [hu ? "Hivatkozás" : "Reference", `#${b.reference}`],
      ],
      cta:
        status === "declined"
          ? { label: hu ? "Új időpont" : "Pick another time", href: `${SITE_URL}/${hu ? "hu/foglalas" : "en/book"}` }
          : status === "confirmed"
            ? { label: hu ? "Útvonal" : "Directions", href: `${SITE_URL}/${hu ? "hu/kapcsolat" : "en/visit"}` }
            : undefined,
      after: [
        status === "confirmed"
          ? hu
            ? `${esc(venue.street)}, ${venue.postalCode} ${venue.city} · 3 perc az M2 Astoriától. Ha mégsem tudsz jönni, hívj: ${venue.phone}.`
            : `${esc(venue.street)}, ${venue.postalCode} ${venue.city} · 3 min from M2 Astoria. Can't make it? Call ${venue.phone}.`
          : hu
            ? "Próbálj másik időpontot, vagy hívj minket."
            : "Please try another time or give us a call.",
      ],
    }),
    `booking.${status}`,
    ref,
  );
  await alert(
    "admin",
    `booking.${status}`,
    `Booking #${b.reference} ${status}`,
    `${b.name} · ${when} · guest email ${mail}`,
    ref,
  );
  return NextResponse.json({ ok: true, status, email: mail });
}

type Current = {
  id: string;
  status: string;
  reference: string;
  name: string;
  party_size: number;
  booking_date: string;
  booking_time: string | null;
  locale: string;
  table_id: string | null;
  dish_ids: string[];
  note: string | null;
};

async function reservationAction(
  action: string,
  b: Current,
  body: Body,
  userId: string,
) {
  const ref = { type: "booking" as const, id: b.id };
  const when = `${b.booking_date} ${b.booking_time?.slice(0, 5) ?? ""}`.trim();
  const stamp = {
    status_changed_at: new Date().toISOString(),
    status_changed_by: userId,
  };
  const tableId = body.tableId || b.table_id;

  if (action === "table") {
    if (!body.tableId)
      return NextResponse.json({ error: "table_required" }, { status: 422 });
    await db()
      .from("booking_requests")
      .update({ table_id: body.tableId })
      .eq("id", b.id);
    return NextResponse.json({ ok: true });
  }

  if (action === "no_show" || action === "complete") {
    const status = action === "no_show" ? "no_show" : "completed";
    await db()
      .from("booking_requests")
      .update({ status, ...stamp })
      .eq("id", b.id);
    await alert(
      "admin",
      `booking.${status}`,
      `#${b.reference} ${b.name}: ${status === "no_show" ? "no-show" : "finished"}`,
      when,
      ref,
    );
    return NextResponse.json({ ok: true, status });
  }

  // seat / preorder both need a table
  if (!tableId)
    return NextResponse.json({ error: "table_required" }, { status: 422 });
  const { data: table } = await db()
    .from("dining_tables")
    .select("id, label")
    .eq("id", tableId)
    .maybeSingle();
  if (!table)
    return NextResponse.json({ error: "table_required" }, { status: 422 });

  if (action === "seat") {
    await db()
      .from("booking_requests")
      .update({
        status: "seated",
        seated_at: new Date().toISOString(),
        table_id: table.id,
        ...stamp,
      })
      .eq("id", b.id);
  }

  let preorder: { number: number; total: number; skipped: string[] } | null =
    null;
  const wantsPreorder =
    action === "preorder" || (action === "seat" && body.sendPreorder !== false);
  if (wantsPreorder && b.dish_ids.length) {
    const { data: existing } = await db()
      .from("orders")
      .select("id")
      .eq("booking_id", b.id)
      .limit(1);
    if (!existing?.length) {
      const created = await createOrder({
        table,
        lines: b.dish_ids.map((id) => ({ id, qty: 1 })),
        lang: b.locale === "en" ? "en" : "hu",
        guestName: b.name,
        note: `Reservation #${b.reference}, ${b.party_size}p${b.note ? ` · ${b.note}` : ""}`,
        source: "booking",
        bookingId: b.id,
        strict: false,
      });
      if (created.ok) {
        const o = created.order;
        preorder = { number: o.number, total: o.total, skipped: o.skipped };
        await alert(
          "all",
          "order.new",
          `Pre-order #${o.number} · table ${table.label} (reservation)`,
          `${o.rows.map((r) => `${r.qty}× ${r.name}`).join(", ")} · ${formatHuf(o.total)}`,
          { type: "order", id: o.id },
        );
      }
    } else if (action === "preorder") {
      return NextResponse.json(
        { error: "preorder_already_sent" },
        { status: 409 },
      );
    }
  }

  if (action === "seat") {
    await alert(
      "all",
      "booking.seated",
      `#${b.reference} ${b.name} seated at ${table.label}`,
      `${b.party_size} guests${preorder ? ` · pre-order #${preorder.number} sent to kitchen` : ""}`,
      ref,
    );
  }
  return NextResponse.json({
    ok: true,
    status: action === "seat" ? "seated" : b.status,
    table: table.label,
    preorder,
  });
}
