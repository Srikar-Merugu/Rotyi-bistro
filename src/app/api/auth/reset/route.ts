import { NextResponse } from "next/server";
import { emailOk } from "@/lib/booking";
import { brandedEmail, esc, sendEmail, SITE_URL } from "@/lib/notify";
import { db, hasSupabase } from "@/lib/supabase/server";

// "Forgot password?" for staff. Only staff emails get a link; the response is
// always the same so nobody can probe which emails exist.
export async function POST(req: Request) {
  const { email } = (await req.json().catch(() => ({}))) as { email?: string };
  const clean = (email ?? "").trim().toLowerCase();
  if (!hasSupabase() || !emailOk(clean)) return NextResponse.json({ ok: true });

  const { data: staff } = await db().from("staff").select("role, name").eq("email", clean).maybeSingle();
  if (staff) {
    const home = `${SITE_URL}/${staff.role === "kitchen" ? "kitchen" : "admin"}`;
    const { data } = await db().auth.admin.generateLink({ type: "recovery", email: clean, options: { redirectTo: home } });
    if (data?.properties?.action_link) {
      await sendEmail(
        clean,
        "Reset your Rotyi staff password",
        brandedEmail({
          hu: false,
          label: "Password reset",
          title: staff.name ? `New password, ${esc(staff.name)}?` : "Choose a new password",
          paragraphs: ["Someone (hopefully you) asked to reset the password for your Rotyi staff account."],
          details: [["Account", esc(clean)]],
          cta: { label: "Choose a new password", href: data.properties.action_link },
          after: ["The button works once and expires in 1 hour. Didn't ask for this? Ignore this email; your password stays the same."],
        }),
        "staff.reset",
        { type: "system" },
      );
    }
  }
  return NextResponse.json({ ok: true });
}
