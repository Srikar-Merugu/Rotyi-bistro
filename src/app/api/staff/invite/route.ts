import { NextResponse } from "next/server";
import { emailOk } from "@/lib/booking";
import { alert, SITE_URL } from "@/lib/notify";
import { db, requireStaff } from "@/lib/supabase/server";

// Admin invites a staff member. Supabase emails them a link to set their own
// password; the invite row gives them the role when the account is created.
export async function POST(req: Request) {
  const admin = await requireStaff(req, ["admin"]);
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { email, role, name } = (await req.json().catch(() => ({}))) as { email?: string; role?: string; name?: string };
  const clean = (email ?? "").trim().toLowerCase();
  if (!emailOk(clean) || (role !== "admin" && role !== "kitchen")) return NextResponse.json({ error: "invalid" }, { status: 422 });

  const { error } = await db().from("staff_invites").upsert({ email: clean, role, name: name?.trim() || null });
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  // Existing account → the invite trigger already linked it. New → send invite.
  const { data: linked } = await db().from("staff").select("user_id").eq("email", clean).maybeSingle();
  let invited = false;
  if (!linked) {
    const { error: inviteError } = await db().auth.admin.inviteUserByEmail(clean, { redirectTo: `${SITE_URL}/${role === "kitchen" ? "kitchen" : "admin"}` });
    if (inviteError) return NextResponse.json({ error: inviteError.message }, { status: 502 });
    invited = true;
  }
  await alert("admin", "staff.invited", `Staff ${invited ? "invited" : "updated"}: ${clean}`, `Role: ${role} · by ${admin.email}`, { type: "system" });
  return NextResponse.json({ ok: true, invited });
}
