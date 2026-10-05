import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Service-role client: bypasses RLS. Only used in route handlers / server
// components after the request has been validated.
let admin: SupabaseClient | null = null;

export function hasSupabase() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function db(): SupabaseClient {
  if (!hasSupabase()) throw new Error("Supabase env missing: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  admin ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}

export type StaffUser = { userId: string; email: string; role: "admin" | "kitchen"; name: string | null };

/** Verifies the caller's Supabase access token and returns their staff row. */
export async function requireStaff(req: Request, roles: ("admin" | "kitchen")[] = ["admin", "kitchen"]): Promise<StaffUser | null> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token || !hasSupabase()) return null;
  const { data, error } = await db().auth.getUser(token);
  if (error || !data.user) return null;
  const { data: staff } = await db().from("staff").select("role, email, name").eq("user_id", data.user.id).maybeSingle();
  if (!staff || !roles.includes(staff.role)) return null;
  return { userId: data.user.id, email: staff.email, role: staff.role, name: staff.name };
}
