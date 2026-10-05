"use client";

import Image from "next/image";
import { getDictionary } from "@/lib/i18n";
import { photos } from "@/lib/menu";
import type { Locale } from "@/lib/routes";
import { useGsap } from "@/lib/use-gsap";
import { Glove, LangosBuddy, Paprika, RoundBadge } from "../art";

// CRAV's red "FOOD THAT FEELS GOOD" block: a real dish photo given cartoon
// eyes and gloves. Ours is the goulash kettle, waving at you as you scroll.
export function FeelGood({ lang }: { lang: Locale }) {
  const t = getDictionary(lang).feel;

  const ref = useGsap<HTMLElement>((root, gsap) => {
    const tl = gsap.timeline({
      scrollTrigger: { trigger: root, start: "top 75%", end: "center center", scrub: 0.8 },
    });
    tl.from("[data-dish]", { scale: 0.55, rotate: -12, ease: "back.out(1.6)" }, 0)
      .from("[data-glove-l]", { xPercent: -140, rotate: -40 }, 0.1)
      .from("[data-glove-r]", { xPercent: 140, rotate: 40 }, 0.1)
      .from("[data-eyes]", { yPercent: 80, opacity: 0 }, 0.25)
      .from("[data-title] > span", { yPercent: 60, stagger: 0.1 }, 0);
    gsap.to("[data-glove-l]", { rotate: 10, yoyo: true, repeat: -1, duration: 0.9, ease: "sine.inOut", delay: 1 });
    gsap.to("[data-glove-r]", { rotate: -10, yoyo: true, repeat: -1, duration: 1.1, ease: "sine.inOut", delay: 1 });
  });

  return (
    <section ref={ref} className="wave-top wave-bottom relative z-10 bg-paprika px-4 pb-16 pt-10 text-cream sm:px-6" aria-labelledby="feel-title">
      <LangosBuddy className="floaty absolute left-[4%] top-0 w-24 [--r:-14deg] sm:w-32" />
      <Paprika face className="floaty absolute right-[6%] top-6 w-16 [--float-speed:4.5s] [--r:16deg] sm:w-24" />

      <div className="mx-auto max-w-6xl text-center">
        <span className="sticker">{t.sticker}</span>
        <h2 id="feel-title" data-title className="display mt-3 text-[clamp(3.6rem,12vw,9.5rem)] text-cream-soft">
          <span className="block">{t.title[0]}</span>
          <span className="block">{t.title[1]}</span>
        </h2>

        <div className="relative mx-auto mt-6 grid max-w-5xl grid-cols-[1fr_auto_1fr] items-end gap-2">
          <ul className="hidden self-end text-left font-[family-name:var(--font-display)] text-lg uppercase leading-snug tracking-wide sm:block">
            {t.left.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>

          <div className="relative mx-auto w-[min(78vw,460px)]">
            <div data-glove-l className="absolute -left-[22%] top-[34%] z-20 w-[34%] origin-right">
              <Glove />
            </div>
            <div data-glove-r className="absolute -right-[22%] top-[34%] z-20 w-[34%] origin-left">
              <Glove flip />
            </div>
            <div data-dish className="relative aspect-square overflow-hidden rounded-full border-[8px] border-cream-soft shadow-[0_30px_60px_-20px_rgb(0_0_0/0.5)]">
              <Image
                src={`${photos.goulashPot}?w=900&h=900&fit=crop&crop=center`}
                alt={lang === "hu" ? "Bográcsgulyás közelről" : "Kettle goulash close-up"}
                fill
                sizes="(max-width: 640px) 78vw, 460px"
                quality={70}
                className="object-cover"
              />
            </div>
            {/* googly eyes */}
            <div data-eyes className="absolute left-1/2 top-[-6%] z-10 flex -translate-x-1/2 gap-3">
              {[0, 1].map((i) => (
                <span key={i} className="grid h-16 w-14 place-items-center rounded-full border-4 border-plum bg-white sm:h-20 sm:w-16">
                  <span className="blink h-7 w-7 rounded-full bg-plum sm:h-8 sm:w-8" />
                </span>
              ))}
            </div>
            <RoundBadge text={t.badge} className="absolute -bottom-4 -right-6 z-30 w-24 rotate-12 sm:w-28" />
          </div>

          <ul className="hidden self-end text-right font-[family-name:var(--font-display)] text-lg uppercase leading-snug tracking-wide sm:block">
            {t.right.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </div>

        <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-1 font-[family-name:var(--font-display)] text-base uppercase tracking-wide sm:hidden">
          {[...t.left, ...t.right].map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
