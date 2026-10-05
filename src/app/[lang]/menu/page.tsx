import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { LunchCard } from "@/components/lunch-card";
import { MenuBrowser } from "@/components/menu-browser";
import { PageHero } from "@/components/page-hero";
import { getDictionary } from "@/lib/i18n";
import { isLocale, type Locale } from "@/lib/routes";
import { breadcrumbJsonLd, menuJsonLd, pageMetadata } from "@/lib/seo";
import { isLunchTime } from "@/lib/site";
import { getLiveLunch, getLiveMenu } from "@/lib/menu-data";

export const revalidate = 60;

export async function generateMetadata({ params }: PageProps<"/[lang]/menu">): Promise<Metadata> {
  const { lang } = await params;
  return pageMetadata(lang as Locale, "menu");
}

export default async function MenuPage({ params }: PageProps<"/[lang]/menu">) {
  const { lang } = await params;
  if (!isLocale(lang)) return null;
  const dict = getDictionary(lang);
  const lunchFirst = isLunchTime();
  const [lunchData, menu] = await Promise.all([getLiveLunch(), getLiveMenu()]);

  return (
    <>
      <PageHero sticker={dict.lunch.until} title={[dict.nav.menu]} lead={dict.hero.lead} />
      <div className="mx-auto max-w-[1300px] px-4 pb-24 sm:px-6">
        {lunchFirst && (
          <div className="mb-14">
            <LunchCard lang={lang} lunch={lunchData} />
          </div>
        )}
        <MenuBrowser lang={lang} categories={menu.categories} items={menu.items} />
        {!lunchFirst && (
          <div className="mt-20">
            <LunchCard lang={lang} lunch={lunchData} />
          </div>
        )}
      </div>
      <JsonLd data={menuJsonLd(lang)} />
      <JsonLd data={breadcrumbJsonLd(lang, "menu")} />
    </>
  );
}
