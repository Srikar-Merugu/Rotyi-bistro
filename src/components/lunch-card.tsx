import Link from "next/link";
import { getDictionary } from "@/lib/i18n";
import type { LunchData } from "@/lib/menu-data";
import { href, type Locale } from "@/lib/routes";
import { budapestNow, formatEur, formatHuf, isLunchTime } from "@/lib/site";
import { Nokedli } from "./art";

/**
 * Napi menü ticket. Weekdays before 15:00 it shows today's lunch; after that,
 * tomorrow's (if tomorrow is a weekday); at weekends, a short note.
 */
export function LunchCard({ lang, lunch, now = new Date() }: { lang: Locale; lunch: LunchData; now?: Date }) {
  const { days: dailyLunch, prices: lunchPrice } = lunch;
  const t = getDictionary(lang).lunch;
  const { weekday } = budapestNow(now);
  const live = isLunchTime(now);
  const showDay = live ? weekday : weekday + 1 <= 4 ? weekday + 1 : weekday === 6 ? 0 : -1;
  const today = showDay >= 0 ? dailyLunch[showDay] : null;
  const price = (huf: number) => (lang === "hu" ? formatHuf(huf) : `${formatEur(huf)} · ${formatHuf(huf)}`);

  return (
    <article
      className="relative mx-auto max-w-3xl rotate-[-1.2deg] rounded-[2rem] border-[3px] border-dashed border-ink/40 bg-mustard p-5 shadow-[8px_8px_0_var(--color-ink)] sm:p-8"
      aria-labelledby="lunch-title"
    >
      <Nokedli className="absolute -right-4 -top-8 w-24 rotate-12 sm:w-32" />
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <span className="sticker">{t.sticker}</span>
          <h2 id="lunch-title" className="display mt-2 text-5xl sm:text-6xl">
            {live || showDay === weekday ? t.title : t.tomorrow}
          </h2>
        </div>
        <p className="flex items-center gap-2 text-base font-bold uppercase tracking-wide">
          {live && <span className="h-3 w-3 animate-pulse rounded-full bg-leaf" aria-hidden />}
          {t.until}
        </p>
      </div>

      {today ? (
        <>
          <dl className="mt-5 grid gap-3 sm:grid-cols-3">
            {(["soup", "main", "dessert"] as const).map((k) => (
              <div key={k} className="rounded-2xl bg-cream-soft px-4 py-3">
                <dt className="text-sm font-bold uppercase tracking-wider text-paprika-ink">{t[k]}</dt>
                <dd className="font-[family-name:var(--font-display)] text-2xl uppercase leading-tight">{today[k][lang]}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <p className="text-lg">
              <strong className="font-[family-name:var(--font-display)] text-2xl">{price(lunchPrice.two)}</strong>{" "}
              <span className="text-ink/80">{t.two}</span>
              <span className="mx-2" aria-hidden>
                ·
              </span>
              <strong className="font-[family-name:var(--font-display)] text-2xl">{price(lunchPrice.three)}</strong>{" "}
              <span className="text-ink/80">{t.three}</span>
            </p>
            <Link href={href(lang, "book")} className="pill pill-ink">
              {t.cta}
            </Link>
          </div>
        </>
      ) : (
        <p className="mt-4 text-xl">{t.weekend}</p>
      )}
    </article>
  );
}
