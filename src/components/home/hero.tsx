import Image from "next/image";
import Link from "next/link";
import { getDictionary } from "@/lib/i18n";
import { photos } from "@/lib/menu";
import { href, type Locale } from "@/lib/routes";
import { KettleMascot, LangosBuddy, Paprika, Star } from "../art";
import { HeroCards } from "./hero-cards";

export function Hero({ lang }: { lang: Locale }) {
  const dict = getDictionary(lang);
  const [w1, w2, w3] = dict.hero.words;

  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-28 sm:px-6 sm:pt-32" aria-labelledby="hero-title">
      {/* sticker characters, like CRAV's burger boy */}
      <KettleMascot className="floaty absolute left-[3%] top-24 hidden w-32 [--r:-10deg] lg:block xl:w-40" />
      <LangosBuddy className="floaty absolute right-[4%] top-40 hidden w-28 [--float-speed:6s] [--r:12deg] lg:block" />
      <Star className="spin-slow absolute right-[18%] top-28 hidden w-10 md:block" />

      <div className="mx-auto max-w-6xl text-center">
        <span className="sticker hero-pop text-base sm:text-lg" style={{ animationDelay: "var(--hero-base)" }}>
          {dict.hero.sticker}
        </span>

        <h1 id="hero-title" className="display mt-4 text-paprika-ink">
          <span className="sr-only">Rotyi Bisztró: </span>
          <span className="flex flex-wrap items-end justify-center gap-x-[0.18em] gap-y-1">
            <span
              className="hero-word inline-block text-[clamp(4.5rem,17vw,13rem)] [--rot:-4deg]"
              style={{ animationDelay: "calc(var(--hero-base) + .05s)" }}
            >
              {w1}
            </span>
            <span
              className="hero-word inline-block text-[clamp(3.4rem,12vw,9.5rem)] text-paprika [--rot:3deg]"
              style={{ animationDelay: "calc(var(--hero-base) + .18s)" }}
            >
              {w2}
            </span>
          </span>
          <span className="mt-1 flex items-center justify-center gap-4">
            <Paprika className="hero-pop w-10 rotate-12 sm:w-14" />
            <span
              className="hero-word inline-block text-[clamp(2.6rem,8vw,6rem)] text-ink [--rot:-2deg]"
              style={{ animationDelay: "calc(var(--hero-base) + .3s)" }}
            >
              {w3}
            </span>
            <Paprika className="hero-pop w-10 -rotate-12 sm:w-14" />
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-xl text-ink/85 sm:text-2xl">{dict.hero.lead}</p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link href={href(lang, "book")} className="pill pill-red text-lg">
            {dict.hero.cta}
          </Link>
          <Link href={href(lang, "menu")} className="pill pill-outline text-lg text-ink">
            {dict.hero.secondary} →
          </Link>
        </div>
      </div>

      <HeroCards>
        <Image
          src={`${photos.friendsLaugh}?w=900&h=1100&fit=crop`}
          alt={lang === "hu" ? "Barátok nevetnek egy vacsoránál" : "Friends laughing over dinner"}
          width={450}
          height={550}
          sizes="(max-width: 640px) 45vw, 300px"
          quality={70}
          loading="eager"
          className="h-full w-full object-cover"
        />
        <Image
          src={`${photos.schnitzel}?w=900&h=1100&fit=crop`}
          alt={lang === "hu" ? "Rántott szelet burgonyával" : "Schnitzel with potatoes"}
          width={450}
          height={550}
          sizes="(max-width: 640px) 45vw, 300px"
          quality={70}
          loading="eager"
          className="h-full w-full object-cover"
        />
        <Image
          src={`${photos.goulashPot}?w=900&h=1100&fit=crop`}
          alt={lang === "hu" ? "Gulyás rotyog a bográcsban" : "Goulash bubbling in a kettle"}
          width={450}
          height={550}
          sizes="(max-width: 640px) 45vw, 300px"
          quality={70}
          loading="eager"
          fetchPriority="high"
          className="h-full w-full object-cover"
        />
      </HeroCards>
    </section>
  );
}
