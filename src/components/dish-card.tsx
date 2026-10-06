"use client";

import Image from "next/image";
import { useState } from "react";
import { getDictionary } from "@/lib/i18n";
import type { MenuItem } from "@/lib/menu";
import type { Locale } from "@/lib/routes";
import { formatEur, formatHuf } from "@/lib/site";
import { LangosBuddy, Nokedli, Paprika, SourCream } from "./art";
import { useTable } from "./table-provider";
import { photoUrl } from "@/lib/photo";

const fallbackArt: Record<string, React.ComponentType<{ className?: string }>> = {
  langos: LangosBuddy,
  ujhazi: Nokedli,
  somloi: SourCream,
};

/** HUF on the Hungarian site; EUR first on the English site, HUF kept for reference. */
export function Price({ huf, lang, className = "", stacked }: { huf: number; lang: Locale; className?: string; stacked?: boolean }) {
  if (lang === "hu") return <span className={className}>{formatHuf(huf)}</span>;
  return (
    <span className={`${className} ${stacked ? "flex flex-col items-center" : ""}`}>
      {formatEur(huf)}{" "}
      <span className="text-[0.62em] opacity-75">{stacked ? formatHuf(huf) : `(${formatHuf(huf)})`}</span>
    </span>
  );
}

export function DishCard({ item, lang, index = 0 }: { item: MenuItem & { available?: boolean }; lang: Locale; index?: number }) {
  const soldOut = item.available === false;
  const dict = getDictionary(lang);
  const p = dict.picks;
  const { items, add } = useTable();
  const [flipped, setFlipped] = useState(false);
  const added = items.includes(item.id);
  const Art = fallbackArt[item.id] ?? Paprika;
  const tilt = ["-1.5deg", "1.2deg", "-0.6deg", "1.8deg"][index % 4];
  const detailsId = `quick-${item.id}`;

  return (
    <article
      data-reveal
      className="group relative flex flex-col rounded-[2rem] border-2 border-ink bg-cream-soft p-3 shadow-[6px_6px_0_var(--color-ink)] transition-transform duration-500 ease-[var(--ease-bounce)] hover:-translate-y-1"
      style={{ ["--rr" as string]: tilt, rotate: tilt, ["--d" as string]: `${(index % 3) * 90}ms` }}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-[1.4rem] bg-mustard">
        <div className="absolute inset-0 grid place-items-center" aria-hidden>
          <Art className="w-1/3 opacity-30" />
        </div>
        {item.image ? (
          <Image
            src={photoUrl(item.image, 800, 600)}
            alt={item.name[lang]}
            fill
            sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 380px"
            quality={70}
            className="object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-110 group-hover:rotate-2"
          />
        ) : (
          <div className="grid h-full place-items-center bg-[radial-gradient(circle,var(--color-mustard-soft),var(--color-mustard))]">
            <Art className="w-1/2 transition-transform duration-700 group-hover:rotate-6 group-hover:scale-110" />
          </div>
        )}

        {/* Quick details panel, CRAV's card flip */}
        <div
          id={detailsId}
          className={`absolute inset-0 flex flex-col justify-center bg-ink/92 p-5 text-cream transition-all duration-500 ease-[var(--ease-out-expo)] ${flipped ? "visible translate-y-0 opacity-100" : "invisible translate-y-6 opacity-0"}`}
        >
          <p className="mb-3 font-[family-name:var(--font-display)] uppercase tracking-widest text-mustard">{p.quick}</p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-base">
            <div>
              <dt className="text-xs uppercase tracking-wider text-cream/70">{p.time}</dt>
              <dd className="font-[family-name:var(--font-display)] text-xl uppercase">{item.quick.time}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-cream/70">{p.side}</dt>
              <dd className="font-[family-name:var(--font-display)] text-xl uppercase leading-tight">{item.quick.side[lang]}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-cream/70">{p.spice}</dt>
              <dd className="flex items-center gap-0.5" aria-label={dict.spice[item.quick.spice]}>
                {[1, 2, 3].map((n) => (
                  <Paprika key={n} className={`h-6 w-5 ${n <= item.quick.spice ? "" : "opacity-25 grayscale"}`} />
                ))}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-cream/70">{p.protein}</dt>
              <dd className="font-[family-name:var(--font-display)] text-xl uppercase">
                {item.quick.protein} · {item.quick.kcal} {p.kcal}
              </dd>
            </div>
          </dl>
        </div>

        {soldOut && (
          <span className="absolute left-3 top-3 z-10 rounded-full bg-ink px-3 py-1 font-[family-name:var(--font-display)] uppercase tracking-wide text-cream">
            {lang === "hu" ? "Ma elfogyott" : "Sold out today"}
          </span>
        )}
        <span className="absolute right-3 top-3 grid h-[4.6rem] w-[4.6rem] rotate-12 place-items-center rounded-full border-2 border-ink bg-mustard text-center font-[family-name:var(--font-display)] text-lg leading-none text-ink shadow-[3px_3px_0_var(--color-ink)]">
          <Price huf={item.price} lang={lang} className="px-1" stacked />
        </span>
      </div>

      <div className="flex flex-1 flex-col px-2 pb-1 pt-4">
        <h3 className="display text-[1.9rem] text-ink">{item.name[lang]}</h3>
        <p className="mt-1 flex-1 text-base text-ink/80">{item.description[lang]}</p>
        {item.tags.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
              <li
                key={tag}
                className={`rounded-full px-2.5 py-0.5 text-sm font-bold uppercase tracking-wide ${tag === "vegan" ? "bg-leaf text-white" : tag === "spicy" ? "bg-paprika-ink text-white" : "bg-ink/10 text-ink"}`}
              >
                {dict.tags[tag]}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            aria-expanded={flipped}
            aria-controls={detailsId}
            onClick={() => setFlipped((v) => !v)}
            className="min-h-12 shrink-0 rounded-full border-2 border-ink px-4 font-[family-name:var(--font-display)] uppercase tracking-wide transition hover:bg-ink hover:text-cream aria-expanded:bg-ink aria-expanded:text-cream"
          >
            {flipped ? "✕" : "i"} <span className="ml-1">{p.info}</span>
          </button>
          <button
            type="button"
            onClick={() => add(item.id)}
            disabled={added || soldOut}
            className="pill pill-red !min-h-12 flex-1 !px-4 disabled:!bg-leaf disabled:!shadow-none"
            aria-label={`${p.add}: ${item.name[lang]}`}
          >
            {added ? "✓" : "+"}
            <span>{added ? p.added : p.addShort}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
