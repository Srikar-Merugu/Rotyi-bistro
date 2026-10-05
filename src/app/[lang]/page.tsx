import type { Metadata } from "next";
import { Hero } from "@/components/home/hero";
import { FeelGood } from "@/components/home/feel-good";
import { PhotoBand } from "@/components/home/photo-band";
import { Layers } from "@/components/home/layers";
import { Delivery } from "@/components/home/delivery";
import { Picks } from "@/components/home/picks";
import { ClosingCta } from "@/components/home/closing-cta";
import { LunchCard } from "@/components/lunch-card";
import { JsonLd } from "@/components/json-ld";
import { Loader } from "@/components/effects";
import { getDictionary } from "@/lib/i18n";
import { photos } from "@/lib/menu";
import { isLocale, type Locale } from "@/lib/routes";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { isLunchTime } from "@/lib/site";
import { getLiveLunch, getLiveMenu } from "@/lib/menu-data";

// Re-render every 5 minutes so the napi menü moves to the top at the right time.
export const revalidate = 60;

export async function generateMetadata({ params }: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  return pageMetadata(lang as Locale, "home");
}

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang: raw } = await params;
  if (!isLocale(raw)) return null;
  const lang = raw;
  const dict = getDictionary(lang);
  const lunchFirst = isLunchTime();
  const [lunchData, menu] = await Promise.all([getLiveLunch(), getLiveMenu()]);

  const lunch = (
    <section className="relative bg-cream px-4 pb-24 pt-8 sm:px-6" aria-label={dict.lunch.title}>
      <LunchCard lang={lang} lunch={lunchData} />
    </section>
  );

  return (
    <>
      <Loader lang={lang} />
      {lunchFirst && <div className="pt-28">{lunch}</div>}
      <Hero lang={lang} />
      {!lunchFirst && lunch}
      <FeelGood lang={lang} />
      <PhotoBand
        src={photos.burger}
        alt={lang === "hu" ? "Rotyi burger közelről" : "Rotyi burger close-up"}
        caption={dict.photoBand}
      />
      <Layers lang={lang} />
      <Delivery lang={lang} />
      <Picks lang={lang} items={menu.items.filter((i) => i.signature && i.available)} />
      <ClosingCta lang={lang} />
      <JsonLd data={breadcrumbJsonLd(lang, "home")} />
    </>
  );
}
