"use client";

import { Children } from "react";
import { useGsap } from "@/lib/use-gsap";

// CRAV's fanned photo cards under the headline. They spread and settle as the
// hero scrolls away, and lean towards the pointer on desktop.
const base = [
  { rot: -8, y: 18, bg: "bg-cream-soft" },
  { rot: 2, y: -6, bg: "bg-cream-soft" },
  { rot: 9, y: 24, bg: "bg-paprika" },
];

export function HeroCards({ children }: { children: React.ReactNode }) {
  const ref = useGsap<HTMLDivElement>((root, gsap) => {
    const cards = gsap.utils.toArray<HTMLElement>("[data-card]", root);
    cards.forEach((card, i) => {
      gsap.to(card, {
        x: (i - 1) * 60,
        rotate: base[i].rot * 1.6,
        y: base[i].y - 40,
        ease: "none",
        scrollTrigger: { trigger: root, start: "top 80%", end: "bottom top", scrub: 0.6 },
      });
    });
    if (window.matchMedia("(pointer: fine)").matches) {
      const qx = cards.map((c) => gsap.quickTo(c, "xPercent", { duration: 0.8, ease: "power3" }));
      const onMove = (e: PointerEvent) => {
        const dx = e.clientX / window.innerWidth - 0.5;
        qx.forEach((q, i) => q(dx * (6 + i * 3)));
      };
      window.addEventListener("pointermove", onMove);
      return () => window.removeEventListener("pointermove", onMove);
    }
  });

  return (
    <div ref={ref} className="relative mx-auto mt-12 flex max-w-4xl items-start justify-center sm:mt-16">
      {Children.toArray(children).map((child, i) => (
        <div
          key={i}
          data-card
          className={`relative -mx-3 aspect-[9/11] w-[38%] max-w-[300px] overflow-hidden rounded-[1.6rem] border-[6px] border-cream-soft shadow-[0_18px_40px_-12px_rgb(62_16_18/0.45)] sm:-mx-4 ${base[i].bg} ${i === 1 ? "z-10" : ""}`}
          style={{ transform: `translateY(${base[i].y}px) rotate(${base[i].rot}deg)` }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
