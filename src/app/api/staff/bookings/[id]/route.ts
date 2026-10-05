import { NextResponse } from "next/server";
import { alert, emailLayout, esc, sendEmail, SITE_URL } from "@/lib/notify";
import { db, requireStaff } from "@/lib/supabase/server";
import { venue } from "@/lib/site";

// Admin approves or declines a booking request → guest gets an email.
export async function POST(req: Request, { params }: RouteContext<"/api/staff/bookings/[id]">) {
  const staff = await requireStaff(req, ["admin"]);
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { action?: string; note?: string; tableId?: string | null };
  const status = body.action === "confirm" ? "confirmed" : body.action === "decline" ? "declined" : body.action === "cancel" ? "cancelled" : null;
  if (!status) return NextResponse.json({ error: "invalid_action" }, { status: 422 });
  const note = (body.note ?? "").trim().slice(0, 1000) || null;

  const { data: b, error } = await db()
    .from("booking_requests")
    .update({
      status,
      admin_note: note,
      table_id: body.tableId || null,
      status_changed_at: new Date().toISOString(),
      status_changed_by: staff.userId,
    })
    .eq("id", id)
    .select("id, reference, name, email, party_size, booking_date, booking_time, locale, dining_tables(label)")
    .single();
  if (error || !b) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const hu = b.locale === "hu";
  const when = `${b.booking_date}${b.booking_time ? `, ${String(b.booking_time).slice(0, 5)}` : ""}`;
  const table = (b.dining_tables as unknown as { label: string } | null)?.label;
  const ref = { type: "booking" as const, id: b.id };
  const copy = {
    confirmed: {
      subject: hu ? `Visszaigazoltuk az asztalod · #${b.reference}` : `Your table is confirmed · #${b.reference}`,
      title: hu ? "Várunk szeretettel!" : "We've approved your table!",
      lead: hu ? "Örömmel jelezzük, hogy a foglalásodat visszaigazoltuk:" : "Good news, your booking is confirmed:",
    },
    declined: {
      subject: hu ? `A foglalásod sajnos nem fér bele · #${b.reference}` : `We can't take your booking · #${b.reference}`,
      title: hu ? "Sajnáljuk!" : "Sorry!",
      lead: hu ? "Erre az időpontra sajnos nem tudunk asztalt adni:" : "Unfortunately we can't seat you at this time:",
    },
    cancelled: {
      subject: hu ? `Foglalás törölve · #${b.reference}` : `Booking cancelled · #${b.reference}`,
      title: hu ? "Foglalás törölve" : "Booking cancelled",
      lead: hu ? "A következő foglalást töröltük:" : "The following booking has been cancelled:",
    },
  }[status];

  const lines = [
    copy.lead,
    `<strong>${esc(when)} · ${b.party_size} ${hu ? "fő" : "guests"}${table && status === "confirmed" ? ` · ${hu ? "asztal" : "table"} ${esc(table)}` : ""}</strong>`,
    note ? `${hu ? "Üzenet tőlünk" : "Message from us"}: ${esc(note)}` : "",
    status === "confirmed"
      ? hu
        ? `Címünk: ${esc(venue.street)}, ${venue.postalCode} ${venue.city}. Ha mégsem tudsz jönni, hívj: ${venue.phone}.`
        : `Find us at ${esc(venue.street)}, ${venue.postalCode} ${venue.city}. Can't make it? Call ${venue.phone}.`
      : hu
        ? "Próbálj másik időpontot, vagy hívj minket."
        : "Please try another time or give us a call.",
  ].filter(Boolean);

  const mail = await sendEmail(
    b.email,
    copy.subject,
    emailLayout(copy.title, lines, status === "declined" ? { label: hu ? "Új időpont" : "Pick another time", href: `${SITE_URL}/${hu ? "hu/foglalas" : "en/book"}` } : undefined, hu),
    `booking.${status}`,
    ref,
  );
  await alert("admin", `booking.${status}`, `Booking #${b.reference} ${status}`, `${b.name} · ${when} · guest email ${mail}`, ref);
  return NextResponse.json({ ok: true, status, email: mail });
}
