import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { PageHero } from "@/components/page-hero";
import { RoundBadge } from "@/components/art";
import { getDictionary } from "@/lib/i18n";
import { photos } from "@/lib/menu";
import { href, isLocale, type Locale } from "@/lib/routes";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[lang]/about">): Promise<Metadata> {
  const { lang } = await params;
  return pageMetadata(lang as Locale, "about");
}

export default async function AboutPage({ params }: PageProps<"/[lang]/about">) {
  const { lang } = await params;
  if (!isLocale(lang)) return null;
  const dict = getDictionary(lang);
  const t = dict.about;

  const gallery = [
    { src: photos.interiorDiners, alt: lang === "hu" ? "Vendégek a bisztróban" : "Guests in the bistro", rot: "-3deg" },
    { src: photos.cabbage, alt: lang === "hu" ? "Töltött káposzta" : "Stuffed cabbage", rot: "2deg" },
    { src: photos.friendsGroup, alt: lang === "hu" ? "Baráti társaság vacsorázik" : "Friends sharing dinner", rot: "-1deg" },
  ];

  return (
    <>
      <PageHero sticker={t.sticker} title={t.title} />
      <section className="mx-auto grid max-w-[1300px] gap-10 px-4 pb-20 sm:px-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-5 text-xl sm:text-2xl">
          {t.story.map((p) => (
            <p key={p} data-reveal>
              {p}
            </p>
          ))}
        </div>
        <div data-reveal className="relative [--rr:3deg]">
          <div className="relative aspect-[4/5] rotate-2 overflow-hidden rounded-[2rem] border-[6px] border-cream-soft shadow-xl">
            <Image
              src={`${photos.goulashPot}?w=900&h=1125&fit=crop`}
              alt={lang === "hu" ? "Az első bogrács" : "The first kettle"}
              fill
              sizes="(max-width: 1024px) 92vw, 560px"
              quality={70}
              className="object-cover"
            />
          </div>
          <RoundBadge text="EST. 2019" className="absolute -bottom-6 -left-6 w-28" />
        </div>
      </section>

      <section className="wave-top bg-paprika px-4 py-20 text-cream sm:px-6" aria-labelledby="chef-title">
        <div className="mx-auto grid max-w-[1300px] items-center gap-10 md:grid-cols-[1fr_1.3fr]">
          <div data-reveal className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-full border-[8px] border-cream-soft">
            <Image
              src={`${photos.waiter}?w=800&h=800&fit=crop`}
              alt={`${t.chefName}, ${t.chefRole}`}
              fill
              sizes="(max-width: 768px) 80vw, 384px"
              quality={70}
              className="object-cover"
            />
          </div>
          <div data-reveal>
            <span className="sticker">{t.chefSticker}</span>
            <h2 id="chef-title" className="display mt-3 text-[clamp(3rem,8vw,6rem)]">
              {t.chefName}
            </h2>
            <p className="font-[family-name:var(--font-display)] text-xl uppercase tracking-wide text-mustard">{t.chefRole}</p>
            <blockquote className="mt-5 font-[family-name:var(--font-sticker)] text-3xl leading-tight">“{t.chefQuote}”</blockquote>
            <p className="mt-5 max-w-xl text-xl">{t.chefBio}</p>
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6">
        <ul className="mx-auto grid max-w-[1300px] gap-6 md:grid-cols-3">
          {t.values.map(([title, body], i) => (
            <li
              key={title}
              data-reveal
              className="rounded-[2rem] border-2 border-ink bg-cream-soft p-6 shadow-[6px_6px_0_var(--color-ink)]"
              style={{ ["--d" as string]: `${i * 100}ms` }}
            >
              <h3 className="display text-4xl text-paprika-ink">{title}</h3>
              <p className="mt-2 text-lg">{body}</p>
            </li>
          ))}
        </ul>
        <div className="mx-auto mt-16 grid max-w-[1300px] grid-cols-3 gap-3 sm:gap-6">
          {gallery.map((g) => (
            <div
              key={g.src}
              data-reveal
              className="relative aspect-[3/4] overflow-hidden rounded-[1.5rem] border-[5px] border-cream-soft shadow-lg"
              style={{ rotate: g.rot }}
            >
              <Image src={`${g.src}?w=600&h=800&fit=crop`} alt={g.alt} fill sizes="33vw" quality={70} className="object-cover" />
            </div>
          ))}
        </div>
        <div className="mt-14 text-center">
          <Link href={href(lang, "book")} className="pill pill-red text-lg">
            {dict.cta.button}
          </Link>
        </div>
      </section>
      <JsonLd data={breadcrumbJsonLd(lang, "about")} />
    </>
  );
}
