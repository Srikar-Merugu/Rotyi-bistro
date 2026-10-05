import type { Metadata } from "next";
import Image from "next/image";
import { JsonLd } from "@/components/json-ld";
import { PageHero } from "@/components/page-hero";
import { Scooter } from "@/components/art";
import { getDictionary } from "@/lib/i18n";
import { photos } from "@/lib/menu";
import { isLocale, type Locale } from "@/lib/routes";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { fullAddress, lunchWindow, mapUrl, openingHours, venue } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[lang]/visit">): Promise<Metadata> {
  const { lang } = await params;
  return pageMetadata(lang as Locale, "visit");
}

export default async function VisitPage({ params }: PageProps<"/[lang]/visit">) {
  const { lang } = await params;
  if (!isLocale(lang)) return null;
  const dict = getDictionary(lang);
  const t = dict.visit;

  return (
    <>
      <PageHero sticker={venue.district.toUpperCase()} title={t.title} lead={t.lead} />
      <div className="mx-auto grid max-w-[1300px] gap-8 px-4 pb-24 sm:px-6 lg:grid-cols-2">
        <div className="space-y-8">
          <section data-reveal className="rounded-[2rem] border-2 border-ink bg-cream-soft p-6 shadow-[6px_6px_0_var(--color-ink)]">
            <h2 className="display text-4xl text-paprika-ink">{t.address}</h2>
            <address className="mt-3 text-2xl not-italic">
              {venue.name}
              <br />
              {fullAddress}
            </address>
            <div className="mt-5 flex flex-wrap gap-3">
              <a href={mapUrl} target="_blank" rel="noopener" className="pill pill-red">
                {t.map} ↗
              </a>
              <a href={venue.phoneHref} className="pill pill-outline text-ink">
                {venue.phone}
              </a>
            </div>
          </section>

          <section data-reveal className="rounded-[2rem] bg-mustard p-6">
            <h2 className="display text-4xl">{t.hours}</h2>
            <dl className="mt-4 divide-y-2 divide-ink/10 text-xl">
              {openingHours.map((h) => (
                <div key={h.weekday} className="flex justify-between py-2">
                  <dt className="font-semibold">{t.days[h.weekday]}</dt>
                  <dd className="font-[family-name:var(--font-display)] tabular-nums">
                    {h.opens} – {h.closes}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-base">
              {dict.lunch.sticker}: {lunchWindow.opens} – {lunchWindow.closes}. {t.kitchen}
            </p>
          </section>
        </div>

        <div className="space-y-8">
          <section data-reveal className="rounded-[2rem] bg-ink p-6 text-cream">
            <h2 className="display text-4xl text-mustard">{t.transport}</h2>
            <dl className="mt-4 space-y-3 text-lg">
              {t.transportItems.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[7rem_1fr] gap-3">
                  <dt className="font-[family-name:var(--font-display)] uppercase tracking-wide text-mustard">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </section>
          <div data-reveal className="relative aspect-[4/3] overflow-hidden rounded-[2rem] border-[6px] border-cream-soft shadow-xl [--rr:2deg]">
            <Image
              src={`${photos.interior}?w=1200&h=900&fit=crop`}
              alt={lang === "hu" ? "A bisztró belső tere" : "Inside the bistro"}
              fill
              sizes="(max-width: 1024px) 92vw, 620px"
              quality={70}
              className="object-cover"
            />
          </div>
          <section data-reveal className="flex flex-wrap items-center gap-4 rounded-[2rem] bg-paprika p-6 text-cream">
            <Scooter className="w-24" />
            <div className="flex-1">
              <h2 className="display text-3xl">{dict.footer.delivery}</h2>
              <div className="mt-3 flex flex-wrap gap-3">
                <a href={venue.delivery.wolt} target="_blank" rel="noopener" className="pill pill-cream">
                  Wolt ↗
                </a>
                <a href={venue.delivery.foodora} target="_blank" rel="noopener" className="pill pill-cream">
                  foodora ↗
                </a>
              </div>
            </div>
          </section>
        </div>
      </div>
      <JsonLd data={breadcrumbJsonLd(lang, "visit")} />
    </>
  );
}
