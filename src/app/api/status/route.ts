import { NextResponse } from "next/server";
import { db, hasSupabase } from "@/lib/supabase/server";

// Public venue status for the static pages: "open all day" override (set by
// admin for testing/special days) and whether QR ordering is on.
export async function GET() {
  if (!hasSupabase()) return NextResponse.json({ openAllDayDate: null, orderingOpen: true });
  const { data } = await db().from("settings").select("open_all_day_date, ordering_open").maybeSingle();
  return NextResponse.json(
    { openAllDayDate: data?.open_all_day_date ?? null, orderingOpen: data?.ordering_open ?? true },
    { headers: { "cache-control": "public, s-maxage=15, stale-while-revalidate=30" } },
  );
}
