"use client";

import Image from "next/image";
import { getDictionary } from "@/lib/i18n";
import { photos } from "@/lib/menu";
import type { Locale } from "@/lib/routes";
import { venue } from "@/lib/site";
import { useGsap } from "@/lib/use-gsap";
import { Scooter } from "../art";

const PATH =
  "M-40 120 C 180 40, 260 260, 460 200 S 760 40, 900 160 S 1100 420, 900 470 S 520 420, 420 540 S 600 760, 1000 700 S 1300 560, 1480 640";

export function Delivery({ lang }: { lang: Locale }) {
  const t = getDictionary(lang).delivery;

  const ref = useGsap<HTMLElement>((root, gsap) => {
    gsap.to("[data-rider]", {
      motionPath: { path: "#delivery-path", align: "#delivery-path", alignOrigin: [0.5, 0.6], autoRotate: true },
      ease: "none",
      scrollTrigger: { trigger: root, start: "top 70%", end: "bottom 60%", scrub: 0.8 },
    });
    gsap.from("[data-stop]", {
      scale: 0,
      rotate: -20,
      stagger: 0.2,
      ease: "back.out(2)",
      scrollTrigger: { trigger: root, start: "top 60%", end: "center center", scrub: 0.6 },
    });
  });

  const stops = [
    { label: t.stops[0], img: photos.interiorDiners, cls: "left-[34%] top-[26%] rotate-[-6deg]" },
    { label: t.stops[1], img: photos.friendsGroup, cls: "right-[4%] top-[2%] rotate-[5deg]" },
    { label: t.stops[2], img: photos.waiter, cls: "right-[14%] bottom-[6%] rotate-[-4deg]" },
  ];

  return (
    <section ref={ref} className="wave-top relative bg-mustard px-4 pb-24 pt-14 sm:px-6" aria-labelledby="delivery-title">
      <div className="relative mx-auto min-h-[760px] max-w-[1400px] sm:min-h-[820px]">
        <svg viewBox="0 0 1440 800" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
          <path id="delivery-path" d={PATH} fill="none" stroke="#c98a12" strokeWidth="5" strokeDasharray="18 16" strokeLinecap="round" />
          <g data-rider>
            <foreignObject width="150" height="110" x="0" y="0">
              <Scooter className="h-full w-full" />
            </foreignObject>
          </g>
        </svg>

        <div className="relative z-10 max-w-xl">
          <span className="sticker">{t.sticker}</span>
          <h2 id="delivery-title" className="display mt-3 text-[clamp(3.2rem,9vw,7.5rem)] text-cream-soft [text-shadow:0_4px_0_rgb(62_16_18/0.25)]">
            <span className="block">{t.title[0]}</span>
            <span className="block">{t.title[1]}</span>
          </h2>
          <p className="mt-4 max-w-md text-xl font-semibold">{t.body}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={venue.delivery.wolt} target="_blank" rel="noopener" className="pill pill-ink">
              {t.wolt} ↗
            </a>
            <a href={venue.delivery.foodora} target="_blank" rel="noopener" className="pill pill-red">
              {t.foodora} ↗
            </a>
          </div>
        </div>

        {stops.map((s) => (
          <figure key={s.label} data-stop className={`absolute z-10 hidden w-40 md:block lg:w-48 ${s.cls}`}>
            <figcaption className="sticker absolute -top-4 left-2 z-10 text-sm">{s.label}</figcaption>
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border-[5px] border-cream-soft shadow-xl">
              <Image src={`${s.img}?w=500&h=620&fit=crop`} alt="" fill sizes="200px" quality={70} className="object-cover" />
            </div>
          </figure>
        ))}
      </div>
    </section>
  );
}
