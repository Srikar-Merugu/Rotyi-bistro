import { after, NextResponse } from "next/server";
import {
  emailOk,
  phoneOk,
  slotsFor,
  MAX_GROUP,
  MAX_PARTY,
  type BookingPayload,
} from "@/lib/booking";
import {
  alert,
  brandedEmail,
  niceDate,
  esc,
  ownerEmail,
  sendEmail,
  SITE_URL,
} from "@/lib/notify";
import { db, hasSupabase } from "@/lib/supabase/server";

// Guest booking request → booking_requests (pending) → admin alert +
// "we received your request" to the guest + "new request" to the owner.

function validate(b: Partial<BookingPayload>, openAllDayDate: string | null): string | null {
  if (b.kind !== "table" && b.kind !== "group") return "kind";
  if (b.lang !== "hu" && b.lang !== "en") return "lang";
  if (!b.date || !/^\d{4}-\d{2}-\d{2}$/.test(b.date)) return "date";
  if (!b.name || b.name.length > 120) return "name";
  if (!b.phone || !phoneOk(b.phone)) return "phone";
  if (!b.email || !emailOk(b.email) || b.email.length > 200) return "email";
  if ((b.note?.length ?? 0) > 1000) return "note";
  const size = Number(b.partySize);
  if (!Number.isInteger(size) || size < 1) return "partySize";
  if (b.kind === "table") {
    if (size > MAX_PARTY) return "partySize";
    const { lunch, dinner } = slotsFor(b.date, new Date(), openAllDayDate);
    if (!b.time || ![...lunch, ...dinner].includes(b.time)) return "time";
  } else if (size > MAX_GROUP) return "partySize";
  return null;
}

export async function POST(req: Request) {
  let body: Partial<BookingPayload>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 },
    );
  }
  if (body.company) return NextResponse.json({ ok: true }); // honeypot

  const openAllDayDate = hasSupabase()
    ? ((await db().from("settings").select("open_all_day_date").maybeSingle()).data?.open_all_day_date ?? null)
    : null;
  const invalid = validate(body, openAllDayDate);
  if (invalid)
    return NextResponse.json(
      { ok: false, error: `invalid_${invalid}` },
      { status: 422 },
    );
  const b = body as BookingPayload;

  if (!hasSupabase()) {
    console.info("[booking:demo] Supabase env missing, request not stored");
    return NextResponse.json({ ok: true, saved: false });
  }

  const { data: booking, error } = await db()
    .from("booking_requests")
    .insert({
      kind: b.kind,
      name: b.name.trim(),
      email: b.email.trim().toLowerCase(),
      phone: b.phone.trim(),
      party_size: b.partySize,
      booking_date: b.date,
      booking_time: b.time || null,
      occasion: b.occasion || null,
      note: b.note || null,
      dishes: (b.dishes ?? []).slice(0, 20),
      dish_ids: (b.dishIds ?? []).filter((id) => typeof id === "string" && /^[a-z0-9-]{1,40}$/.test(id)).slice(0, 20),
      locale: b.lang,
    })
    .select("id, reference")
    .single();
  if (error || !booking) {
    console.error("[booking] insert failed", error);
    return NextResponse.json({ ok: false, error: "server" }, { status: 502 });
  }

  const hu = b.lang === "hu";
  const when = `${b.date}${b.time ? `, ${b.time}` : ""}`;
  const ref = { type: "booking" as const, id: booking.id };
  const groupTag = b.kind === "group" ? (hu ? " (csoport)" : " (group)") : "";

  // Respond immediately; alerts and emails go out right after the response.
  after(async () => {
    await Promise.all([
      alert(
        "admin",
        "booking.new",
        `New ${b.kind === "group" ? "group " : ""}booking request`,
        `${b.name} · ${b.partySize}p · ${when}`,
        ref,
      ),
      sendEmail(
        b.email,
        hu
          ? `Megkaptuk a foglalási kérésed · #${booking.reference}`
          : `We received your booking request · #${booking.reference}`,
        brandedEmail({
          hu,
          label: hu ? "Foglalási kérés" : "Booking request",
          title: hu ? `Köszönjük, ${esc(b.name)}!` : `Thanks, ${esc(b.name)}!`,
          preheader: hu ? `Megkaptuk: ${niceDate(b.date, true)} ${b.time ?? ""}` : `Received: ${niceDate(b.date, false)} ${b.time ?? ""}`,
          paragraphs: [
            hu
              ? "Megkaptuk a foglalási kérésedet. Hamarosan visszaigazoljuk e-mailben, általában egy órán belül."
              : "We've received your booking request and will confirm by email shortly, usually within the hour.",
          ],
          details: [
            [hu ? "Nap" : "Date", esc(niceDate(b.date, hu))],
            [hu ? "Időpont" : "Time", esc(b.time ?? "—")],
            [hu ? "Létszám" : "Guests", `${b.partySize} ${hu ? "fő" : b.partySize === 1 ? "guest" : "guests"}${groupTag}`],
            ...((b.dishes?.length ? [[hu ? "Előrendelés" : "Pre-order", esc(b.dishes.join(", "))]] : []) as [string, string][]),
            [hu ? "Hivatkozás" : "Reference", `#${booking.reference}`],
          ],
          after: [hu ? "Változott a terv? Válaszolj erre az e-mailre, vagy hívj minket." : "Change of plans? Reply to this email or give us a call."],
        }),
        "booking.received",
        ref,
      ),
      sendEmail(
        await ownerEmail(),
        `New booking request #${booking.reference}: ${when} · ${b.partySize}p · ${b.name}`,
        brandedEmail({
          label: "New request",
          title: `${esc(b.name)} · ${b.partySize}p`,
          preheader: `${niceDate(b.date, false)} ${b.time ?? ""} · approve or decline`,
          details: [
            ["Date", esc(niceDate(b.date, false))],
            ["Time", esc(b.time ?? "—")],
            ["Guests", `${b.partySize}${groupTag}`],
            ["Phone", esc(b.phone)],
            ["Email", esc(b.email)],
            ...((b.occasion ? [["Occasion", esc(b.occasion)]] : []) as [string, string][]),
            ...((b.dishes?.length ? [["Pre-order", esc(b.dishes.join(", "))]] : []) as [string, string][]),
            ...((b.note ? [["Note", esc(b.note)]] : []) as [string, string][]),
            ["Reference", `#${booking.reference}`],
          ],
          cta: { label: "Approve or decline", href: `${SITE_URL}/admin/bookings` },
        }),
        "booking.owner",
        ref,
      ),
    ]);
  });

  return NextResponse.json({
    ok: true,
    saved: true,
    reference: booking.reference,
  });
}
