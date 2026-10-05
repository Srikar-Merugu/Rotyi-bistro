import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TableOrder } from "@/components/table-order";
import { getLiveMenu } from "@/lib/menu-data";
import { isLocale } from "@/lib/routes";
import { db, hasSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Rotyi · Asztali rendelés / Table order", robots: { index: false, follow: false } };

export default async function TablePage({ params }: PageProps<"/[lang]/t/[token]">) {
  const { lang, token } = await params;
  if (!isLocale(lang) || !hasSupabase()) notFound();
  const [{ data: table }, { data: settings }, menu] = await Promise.all([
    db().from("dining_tables").select("label, active").eq("qr_token", token).maybeSingle(),
    db().from("settings").select("ordering_open").maybeSingle(),
    getLiveMenu(),
  ]);
  if (!table?.active) notFound();
  return <TableOrder lang={lang} token={token} table={table.label} open={settings?.ordering_open ?? true} menu={menu} />;
}
