import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { PageHero } from "@/components/page-hero";
import { faqs, getDictionary } from "@/lib/i18n";
import { isLocale, type Locale } from "@/lib/routes";
import { breadcrumbJsonLd, faqJsonLd, pageMetadata } from "@/lib/seo";
import { venue } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[lang]/faq">): Promise<Metadata> {
  const { lang } = await params;
  return pageMetadata(lang as Locale, "faq");
}

export default async function FaqPage({ params }: PageProps<"/[lang]/faq">) {
  const { lang } = await params;
  if (!isLocale(lang)) return null;
  const dict = getDictionary(lang);
  const t = dict.faq;

  return (
    <>
      <PageHero sticker={t.sticker} title={t.title} />
      <div className="mx-auto max-w-4xl px-4 pb-24 sm:px-6">
        <div className="space-y-4">
          {faqs[lang].map((f, i) => (
            <details
              key={f.q}
              data-reveal
              className="group rounded-[1.6rem] border-2 border-ink bg-cream-soft shadow-[5px_5px_0_var(--color-ink)] open:bg-mustard"
              style={{ ["--d" as string]: `${(i % 4) * 60}ms` }}
            >
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
                <h2 className="font-[family-name:var(--font-display)] text-2xl uppercase leading-tight sm:text-3xl">{f.q}</h2>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-2xl text-cream transition group-open:rotate-45" aria-hidden>
                  +
                </span>
              </summary>
              <p className="px-5 pb-5 text-xl">{f.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-14 rounded-[2rem] bg-paprika p-8 text-center text-cream">
          <p className="display text-4xl">{t.more}</p>
          <p className="mt-2 text-xl">{t.contact}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <a href={venue.phoneHref} className="pill pill-cream">
              {venue.phone}
            </a>
            <a href={`mailto:${venue.email}`} className="pill pill-ink">
              {venue.email}
            </a>
          </div>
        </div>
      </div>
      <JsonLd data={faqJsonLd(lang)} />
      <JsonLd data={breadcrumbJsonLd(lang, "faq")} />
    </>
  );
}
