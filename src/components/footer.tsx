import Link from "next/link";
import { getDictionary } from "@/lib/i18n";
import { href, pageKeys, type Locale } from "@/lib/routes";
import { fullAddress, mapUrl, openingHours, venue } from "@/lib/site";
import { LangosBuddy, Paprika } from "./art";

export function Footer({ lang }: { lang: Locale }) {
  const dict = getDictionary(lang);
  const days = dict.visit.days;
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden bg-ink pt-16 text-cream">
      <div className="mx-auto grid max-w-[1400px] gap-10 px-4 sm:px-6 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div>
          <p className="display text-5xl text-mustard">{dict.cta.title.join(" ")}</p>
          <Link href={href(lang, "book")} className="pill pill-red mt-6">
            {dict.cta.button}
          </Link>
        </div>
        <nav aria-label="Footer">
          <ul className="space-y-1">
            {pageKeys.map((k) => (
              <li key={k}>
                <Link
                  href={href(lang, k)}
                  className="display inline-block py-1 text-2xl transition hover:translate-x-1 hover:text-mustard"
                >
                  {dict.nav[k]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="text-base">
          <p className="mb-2 font-bold uppercase tracking-wider text-mustard">{dict.visit.address}</p>
          <address className="not-italic">
            <a href={mapUrl} target="_blank" rel="noopener" className="underline-offset-4 hover:underline">
              {venue.name}
              <br />
              {fullAddress}
            </a>
            <br />
            <a href={venue.phoneHref} className="mt-2 inline-block underline-offset-4 hover:underline">
              {venue.phone}
            </a>
            <br />
            <a href={`mailto:${venue.email}`} className="underline-offset-4 hover:underline">
              {venue.email}
            </a>
          </address>
          <p className="mb-2 mt-5 font-bold uppercase tracking-wider text-mustard">{dict.footer.delivery}</p>
          <p className="flex gap-4">
            <a href={venue.delivery.wolt} target="_blank" rel="noopener" className="underline underline-offset-4">
              Wolt
            </a>
            <a href={venue.delivery.foodora} target="_blank" rel="noopener" className="underline underline-offset-4">
              foodora
            </a>
          </p>
        </div>
        <div className="text-base">
          <p className="mb-2 font-bold uppercase tracking-wider text-mustard">{dict.visit.hours}</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5">
            {openingHours.map((h) => (
              <div key={h.weekday} className="contents">
                <dt>{days[h.weekday]}</dt>
                <dd className="tabular-nums">
                  {h.opens}–{h.closes}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* Giant wordmark, CRAV's footer sign-off */}
      <div className="relative mt-16 select-none" aria-hidden>
        <LangosBuddy className="floaty absolute left-[6%] top-0 z-10 hidden w-28 [--r:-12deg] md:block" />
        <Paprika face className="floaty absolute right-[8%] top-4 z-10 hidden w-20 [--float-speed:4s] [--r:14deg] md:block" />
        <p className="text-center font-[family-name:var(--font-sticker)] text-[30vw] leading-[0.8] text-paprika">ROTYI</p>
      </div>

      <div className="border-t border-cream/15">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-2 px-4 py-5 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="font-[family-name:var(--font-display)] uppercase tracking-widest text-cream/80">{dict.footer.tagline}</p>
          <p className="text-cream/70">
            © {year} {venue.name}. {dict.footer.rights} · {dict.footer.photos}
          </p>
          <a
            href="https://kyrostudio.eu"
            target="_blank"
            rel="noopener"
            className="font-semibold text-mustard underline-offset-4 hover:underline"
          >
            {dict.demo.footer}
          </a>
        </div>
      </div>
    </footer>
  );
}
