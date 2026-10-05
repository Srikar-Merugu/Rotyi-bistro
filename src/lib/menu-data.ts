import "server-only";
import { db, hasSupabase } from "./supabase/server";
import { categories as staticCategories, menuItems as staticItems, type MenuItem, type MenuCategory } from "./menu";

export type LiveMenuItem = MenuItem & { available: boolean };

/** Menu from Supabase (so admin edits and 86'd dishes show), falling back to the bundled menu. */
export async function getLiveMenu(): Promise<{ categories: MenuCategory[]; items: LiveMenuItem[] }> {
  if (!hasSupabase()) return { categories: staticCategories, items: staticItems.map((i) => ({ ...i, available: true })) };
  const [{ data: cats }, { data: items }] = await Promise.all([
    db().from("menu_categories").select("*").order("sort"),
    db().from("menu_items").select("*").order("sort"),
  ]);
  if (!cats?.length || !items?.length) return { categories: staticCategories, items: staticItems.map((i) => ({ ...i, available: true })) };
  return {
    categories: cats.map((c) => ({ id: c.id, name: { hu: c.name_hu, en: c.name_en }, sort: c.sort })),
    items: items.map((m) => ({
      id: m.id,
      categoryId: m.category_id,
      name: { hu: m.name_hu, en: m.name_en },
      description: { hu: m.description_hu, en: m.description_en },
      price: m.price,
      tags: m.tags ?? [],
      image: m.image ?? undefined,
      quick: m.quick,
      signature: m.signature,
      available: m.available,
    })),
  };
}

export type LunchData = {
  days: { soup: { hu: string; en: string }; main: { hu: string; en: string }; dessert: { hu: string; en: string } }[];
  prices: { two: number; three: number };
};

/** Napi menü + prices, editable in /admin/menu. */
export async function getLiveLunch(): Promise<LunchData> {
  const { dailyLunch, lunchPrice } = await import("./menu");
  const fallback = { days: dailyLunch, prices: lunchPrice };
  if (!hasSupabase()) return fallback;
  const [{ data: rows }, { data: s }] = await Promise.all([
    db().from("daily_lunch").select("*").order("weekday"),
    db().from("settings").select("lunch_price_two, lunch_price_three").maybeSingle(),
  ]);
  if (!rows || rows.length < 5) return fallback;
  return {
    days: rows.map((r) => ({
      soup: { hu: r.soup_hu, en: r.soup_en },
      main: { hu: r.main_hu, en: r.main_en },
      dessert: { hu: r.dessert_hu, en: r.dessert_en },
    })),
    prices: { two: s?.lunch_price_two ?? lunchPrice.two, three: s?.lunch_price_three ?? lunchPrice.three },
  };
}
