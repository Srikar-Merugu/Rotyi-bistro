"use client";

import Image from "next/image";
import { useGsap } from "@/lib/use-gsap";

// Full-bleed close-up with scroll parallax, CRAV's "hands holding the burger".
export function PhotoBand({ src, alt, caption }: { src: string; alt: string; caption: string }) {
  const ref = useGsap<HTMLElement>((root, gsap) => {
    gsap.fromTo(
      "[data-img]",
      { yPercent: -12, scale: 1.15 },
      { yPercent: 12, scale: 1, ease: "none", scrollTrigger: { trigger: root, start: "top bottom", end: "bottom top", scrub: true } },
    );
    gsap.from("[data-cap]", {
      yPercent: 100,
      ease: "none",
      scrollTrigger: { trigger: root, start: "top 70%", end: "center center", scrub: 0.6 },
    });
  });

  return (
    <section ref={ref} className="relative h-[85vh] min-h-[480px] overflow-hidden bg-ink" aria-label={caption}>
      <div data-img className="absolute inset-0">
        <Image src={`${src}?w=2000&q=70`} alt={alt} fill sizes="100vw" quality={70} className="object-cover" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-transparent" />
      <div className="absolute inset-x-0 bottom-0 overflow-hidden px-4 pb-24 pt-6 sm:px-6">
        <p data-cap className="display mx-auto max-w-6xl text-[clamp(2.6rem,8vw,6.5rem)] text-cream-soft">
          {caption}
        </p>
      </div>
    </section>
  );
}
