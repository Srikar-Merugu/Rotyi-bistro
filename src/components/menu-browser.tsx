"use client";

import { useEffect, useMemo, useState } from "react";
import { getDictionary } from "@/lib/i18n";
import type { DietTag, MenuCategory, MenuItem } from "@/lib/menu";
import type { Locale } from "@/lib/routes";
import { DishCard } from "./dish-card";

const filters: DietTag[] = ["vegan", "vegetarian", "gluten-free", "spicy"];

export function MenuBrowser({ lang, categories, items: menuItems }: { lang: Locale; categories: MenuCategory[]; items: (MenuItem & { available?: boolean })[] }) {
  const dict = getDictionary(lang);
  const [active, setActive] = useState<DietTag | null>(null);
  const [current, setCurrent] = useState(categories[0].id);

  const visible = useMemo(
    () => (active ? menuItems.filter((i) => i.tags.includes(active) || (active === "vegetarian" && i.tags.includes("vegan"))) : menuItems),
    [active],
  );

  // Highlight the category tab for the section in view.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setCurrent(e.target.id.replace("cat-", ""))),
      { rootMargin: "-45% 0px -50% 0px" },
    );
    document.querySelectorAll("[data-cat]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [visible]);

  return (
    <>
      <div className="sticky top-0 z-30 -mx-4 border-b-2 border-ink/10 bg-cream/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <nav aria-label={dict.nav.menu} className="hide-scrollbar flex gap-2 overflow-x-auto">
          {categories.map((c) => (
            <a
              key={c.id}
              href={`#cat-${c.id}`}
              aria-current={current === c.id ? "true" : undefined}
              className="shrink-0 rounded-full border-2 border-ink px-4 py-2 font-[family-name:var(--font-display)] uppercase tracking-wide transition aria-[current=true]:bg-ink aria-[current=true]:text-cream"
            >
              {c.name[lang]}
            </a>
          ))}
        </nav>
        <div className="hide-scrollbar mt-2 flex gap-2 overflow-x-auto" role="group" aria-label="Filter">
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={active === f}
              onClick={() => setActive((v) => (v === f ? null : f))}
              className="min-h-10 shrink-0 rounded-full bg-ink/5 px-3 text-sm font-bold uppercase tracking-wide transition aria-pressed:bg-paprika-ink aria-pressed:text-white"
            >
              {dict.tags[f]}
            </button>
          ))}
        </div>
      </div>

      {categories.map((c) => {
        const list = visible.filter((i) => i.categoryId === c.id);
        if (!list.length) return null;
        return (
          <section key={c.id} id={`cat-${c.id}`} data-cat className="scroll-mt-36 pt-14" aria-labelledby={`h-${c.id}`}>
            <h2 id={`h-${c.id}`} className="display mb-8 text-[clamp(2.8rem,7vw,5rem)] text-paprika-ink">
              {c.name[lang]}
            </h2>
            <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((item, i) => (
                <DishCard key={item.id} item={item} lang={lang} index={i} />
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
