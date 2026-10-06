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
  emailLayout,
  esc,
  ownerEmail,
  sendEmail,
  SITE_URL,
} from "@/lib/notify";
import { db, hasSupabase } from "@/lib/supabase/server";

// Guest booking request → booking_requests (pending) → admin alert +
// "we received your request" to the guest + "new request" to the owner.

function validate(b: Partial<BookingPayload>): string | null {
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
    const { lunch, dinner } = slotsFor(b.date);
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

  const invalid = validate(body);
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
        emailLayout(
          hu ? `Szia ${b.name}!` : `Hi ${b.name}!`,
          [
            hu
              ? "Megkaptuk a foglalási kérésedet:"
              : "We received your booking request:",
            `<strong>${esc(when)} · ${b.partySize} ${hu ? "fő" : "guests"}${groupTag}</strong>`,
            `${hu ? "Hivatkozási szám" : "Reference"}: <strong>#${booking.reference}</strong>`,
            hu
              ? "Hamarosan e-mailben visszaigazoljuk."
              : "We'll confirm by email shortly.",
          ],
          undefined,
          hu,
        ),
        "booking.received",
        ref,
      ),
      sendEmail(
        await ownerEmail(),
        `New booking request #${booking.reference}: ${when} · ${b.partySize}p · ${b.name}`,
        emailLayout(
          "New booking request",
          [
            `<strong>${esc(b.name)}</strong> · ${b.partySize} guests${groupTag}`,
            `${esc(when)}`,
            `${esc(b.phone)} · ${esc(b.email)}`,
            b.occasion ? `Occasion: ${esc(b.occasion)}` : "",
            b.note ? `Note: ${esc(b.note)}` : "",
          ].filter(Boolean),
          { label: "Approve or decline", href: `${SITE_URL}/admin/bookings` },
        ),
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
