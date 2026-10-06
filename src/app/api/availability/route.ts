import { NextResponse } from "next/server";
import { MAX_PARTY } from "@/lib/booking";
import { availability } from "@/lib/capacity";
import { hasSupabase } from "@/lib/supabase/server";

// GET /api/availability?date=YYYY-MM-DD&party=4 → times with a free table for that party.
export async function GET(req: Request) {
  const u = new URL(req.url);
  const date = u.searchParams.get("date") ?? "";
  const party = Number(u.searchParams.get("party"));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isInteger(party) || party < 1 || party > MAX_PARTY)
    return NextResponse.json({ error: "invalid" }, { status: 422 });
  if (!hasSupabase()) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const slots = await availability(date, party);
  return NextResponse.json(slots, { headers: { "cache-control": "no-store" } });
}
