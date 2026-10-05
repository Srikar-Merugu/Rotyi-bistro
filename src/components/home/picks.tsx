import Link from "next/link";
import { getDictionary } from "@/lib/i18n";
import type { MenuItem } from "@/lib/menu";
import { href, type Locale } from "@/lib/routes";
import { DishCard } from "../dish-card";
import { Star } from "../art";

// CRAV's "OUR FINEST BURGER PICKS · 6 ITEMS" grid.
export function Picks({ lang, items: all }: { lang: Locale; items: MenuItem[] }) {
  const t = getDictionary(lang).picks;
  const items = all.slice(0, 6);
  return (
    <section className="relative bg-cream px-4 py-24 sm:px-6" aria-labelledby="picks-title">
      <div className="mx-auto max-w-[1300px]">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <div>
            <span className="sticker">{t.sticker}</span>
            <h2 id="picks-title" className="display mt-3 text-[clamp(3.2rem,9vw,7rem)] text-paprika-ink">
              <span className="block">{t.title[0]}</span>
              <span className="block text-ink">{t.title[1]}</span>
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <span className="relative grid h-24 w-24 place-items-center">
              <Star className="spin-slow absolute inset-0" />
              <span className="relative font-[family-name:var(--font-display)] text-lg">{t.count(items.length)}</span>
            </span>
            <Link href={href(lang, "menu")} className="pill pill-ink">
              {t.all} →
            </Link>
          </div>
        </div>
        <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => (
            <DishCard key={item.id} item={item} lang={lang} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
