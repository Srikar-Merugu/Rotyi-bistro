import type { Metadata } from "next";
import { BookingFlow } from "@/components/booking-flow";
import { GroupForm } from "@/components/group-form";
import { JsonLd } from "@/components/json-ld";
import { PageHero } from "@/components/page-hero";
import { getDictionary } from "@/lib/i18n";
import { isLocale, type Locale } from "@/lib/routes";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { venue } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[lang]/book">): Promise<Metadata> {
  const { lang } = await params;
  return pageMetadata(lang as Locale, "book");
}

export default async function BookPage({ params }: PageProps<"/[lang]/book">) {
  const { lang } = await params;
  if (!isLocale(lang)) return null;
  const dict = getDictionary(lang);
  const t = dict.booking;

  return (
    <>
      <PageHero sticker={t.sticker} title={[t.title]} lead={t.lead} />
      <div className="mx-auto grid max-w-[1300px] gap-10 px-4 pb-24 sm:px-6 lg:grid-cols-[1.4fr_1fr]">
        <BookingFlow lang={lang} />
        <aside className="space-y-6">
          <div className="rounded-[2rem] border-2 border-ink bg-mustard p-6 shadow-[6px_6px_0_var(--color-ink)]">
            <p className="display text-3xl">{dict.visit.call}</p>
            <a href={venue.phoneHref} className="mt-2 block font-[family-name:var(--font-display)] text-4xl text-paprika-ink underline-offset-4 hover:underline">
              {venue.phone}
            </a>
            <p className="mt-3 text-base">{dict.lunch.until}</p>
          </div>
          <div id="group" className="scroll-mt-28 rounded-[2rem] bg-cream-soft p-6 shadow-[0_8px_0_rgb(0_0_0/0.12)]">
            <GroupForm lang={lang} />
          </div>
        </aside>
      </div>
      <JsonLd data={breadcrumbJsonLd(lang, "book")} />
    </>
  );
}
