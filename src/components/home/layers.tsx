"use client";

import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/routes";
import { useGsap } from "@/lib/use-gsap";
import { BayLeaf, Garlic, Nokedli, Onion, Paprika, SourCream, Tomato } from "../art";

// CRAV's "EVERY LAYER PACKED WITH SIGNATURE FLAVOR" with ingredients flying
// around the type. Ours: the paprikash pantry, drifting at different speeds.
const pieces = [
  { C: Paprika, cls: "left-[4%] top-[6%] w-24 sm:w-36", speed: -260, rot: -50 },
  { C: Tomato, cls: "right-[6%] top-[2%] w-20 sm:w-32", speed: -180, rot: 60 },
  { C: Onion, cls: "left-[10%] bottom-[18%] w-20 sm:w-28", speed: -120, rot: 30 },
  { C: SourCream, cls: "right-[10%] bottom-[12%] w-24 sm:w-36", speed: -300, rot: -20 },
  { C: Garlic, cls: "left-[40%] -top-[4%] w-14 sm:w-20", speed: -90, rot: 80 },
  { C: BayLeaf, cls: "right-[30%] bottom-[2%] w-20 sm:w-28", speed: -220, rot: -90 },
  { C: Nokedli, cls: "left-[28%] bottom-[0%] w-24 sm:w-32", speed: -160, rot: 20 },
];

export function Layers({ lang }: { lang: Locale }) {
  const t = getDictionary(lang).layers;

  const ref = useGsap<HTMLElement>((root, gsap) => {
    gsap.utils.toArray<HTMLElement>("[data-piece]", root).forEach((el, i) => {
      gsap.to(el, {
        y: pieces[i].speed,
        rotate: pieces[i].rot,
        ease: "none",
        scrollTrigger: { trigger: root, start: "top bottom", end: "bottom top", scrub: 0.5 },
      });
    });
    gsap.from("[data-line]", {
      xPercent: (i: number) => (i % 2 ? 30 : -30),
      opacity: 0,
      stagger: 0.12,
      ease: "power3.out",
      scrollTrigger: { trigger: root, start: "top 70%", end: "center 55%", scrub: 0.7 },
    });
  });

  return (
    <section ref={ref} className="relative overflow-hidden bg-cream px-4 py-28 sm:px-6 sm:py-40" aria-labelledby="layers-title">
      {pieces.map(({ C, cls }, i) => (
        <div key={i} data-piece className={`pointer-events-none absolute ${cls}`} aria-hidden>
          <C className="h-auto w-full drop-shadow-[0_10px_10px_rgb(62_16_18/0.18)]" />
        </div>
      ))}
      <div className="relative mx-auto max-w-5xl text-center">
        <span className="sticker">{t.sticker}</span>
        <h2 id="layers-title" className="display mt-4 text-[clamp(3.4rem,11vw,8.5rem)] text-paprika-ink">
          {t.title.map((line) => (
            <span key={line} data-line className="block">
              {line}
            </span>
          ))}
        </h2>
      </div>
    </section>
  );
}
