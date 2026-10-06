import { NextResponse } from "next/server";
import { emailOk } from "@/lib/booking";
import { alert, brandedEmail, esc, sendEmail, SITE_URL } from "@/lib/notify";
import { db, requireStaff } from "@/lib/supabase/server";

// Admin invites a staff member. We ask Supabase for a secure one-time invite
// link (no Supabase email is sent) and deliver it ourselves in the Rotyi design.
// The invite row gives them their role the moment the account exists.
export async function POST(req: Request) {
  const admin = await requireStaff(req, ["admin"]);
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { email, role, name } = (await req.json().catch(() => ({}))) as { email?: string; role?: string; name?: string };
  const clean = (email ?? "").trim().toLowerCase();
  if (!emailOk(clean) || (role !== "admin" && role !== "kitchen")) return NextResponse.json({ error: "invalid" }, { status: 422 });
  const who = name?.trim() || null;

  const { error } = await db().from("staff_invites").upsert({ email: clean, role, name: who });
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  const roleLabel = role === "kitchen" ? "Kitchen" : "Admin";
  const home = `${SITE_URL}/${role === "kitchen" ? "kitchen" : "admin"}`;
  const { data: linked } = await db().from("staff").select("user_id").eq("email", clean).maybeSingle();

  let invited = false;
  let mail: string;
  if (!linked) {
    const { data, error: linkError } = await db().auth.admin.generateLink({ type: "invite", email: clean, options: { redirectTo: home } });
    if (linkError || !data?.properties?.action_link) return NextResponse.json({ error: linkError?.message ?? "invite_failed" }, { status: 502 });
    invited = true;
    mail = await sendEmail(
      clean,
      `You're invited to the Rotyi team (${roleLabel})`,
      brandedEmail({
        hu: false,
        label: `${roleLabel} access`,
        title: who ? `Welcome to the team, ${esc(who)}!` : "Welcome to the team!",
        preheader: `${esc(admin.name ?? admin.email)} invited you to Rotyi's ${roleLabel.toLowerCase()} screens`,
        paragraphs: [
          `${esc(admin.name ?? admin.email)} invited you to the Rotyi staff app.`,
          role === "kitchen"
            ? "You'll see new orders the moment guests place them, move tickets from New to Ready, and mark dishes sold out."
            : "You'll manage bookings, live orders, tables and QR codes, the menu and the napi menü.",
        ],
        details: [
          ["Your login", esc(clean)],
          ["Access", roleLabel],
        ],
        cta: { label: "Accept & set password", href: data.properties.action_link },
        after: ["The button works once and expires in 24 hours. Didn't expect this? You can ignore this email."],
      }),
      "staff.invite",
      { type: "system" },
    );
  } else {
    mail = await sendEmail(
      clean,
      `You now have ${roleLabel.toLowerCase()} access at Rotyi`,
      brandedEmail({
        hu: false,
        label: `${roleLabel} access`,
        title: "You're all set",
        paragraphs: [`Your Rotyi staff account now has <strong>${roleLabel.toLowerCase()}</strong> access. Sign in with your usual password.`],
        cta: { label: "Open Rotyi staff", href: home },
      }),
      "staff.access",
      { type: "system" },
    );
  }
  await alert("admin", "staff.invited", `Staff ${invited ? "invited" : "updated"}: ${clean}`, `Role: ${role} · by ${admin.email} · email ${mail}`, { type: "system" });
  return NextResponse.json({ ok: true, invited, email: mail });
}
