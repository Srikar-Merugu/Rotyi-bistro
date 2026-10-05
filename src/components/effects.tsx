"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/routes";
import { KettleMascot } from "./art";

/**
 * First-visit loader (CRAV's "Toasting the artisan bun…" screen).
 * Rendered on the server and dismissed purely by CSS, so it can't get stuck,
 * and skipped for the rest of the session by the inline script in the layout.
 */
export function Loader({ lang }: { lang: Locale }) {
  const lines = getDictionary(lang).loader;
  return (
    <div className="loader fixed inset-0 z-[90] grid place-items-center bg-paprika text-cream" aria-hidden>
      <div className="flex flex-col items-center">
        <div className="relative">
          <span className="loader-bubble absolute -top-4 left-6 h-3 w-3 rounded-full bg-cream/60" />
          <span className="loader-bubble absolute -top-8 left-16 h-2 w-2 rounded-full bg-cream/50 [animation-delay:.3s]" />
          <span className="loader-bubble absolute -top-6 right-8 h-4 w-4 rounded-full bg-cream/40 [animation-delay:.6s]" />
          <KettleMascot className="loader-pot h-36 w-36 sm:h-44 sm:w-44" />
        </div>
        <div className="relative mt-6 h-7 w-72 overflow-hidden text-center">
          {lines.map((l, i) => (
            <p
              key={l}
              className="loader-line absolute inset-x-0 font-[family-name:var(--font-display)] text-xl uppercase tracking-widest"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              {l}
            </p>
          ))}
        </div>
      </div>
      <span className="loader-bar absolute bottom-0 left-0 h-2 bg-mustard" />
    </div>
  );
}

/** CRAV's "concept website" notice, as a non-blocking card. */
export function DemoNotice({ lang }: { lang: Locale }) {
  const t = getDictionary(lang).demo;
  const [show, setShow] = useState(false);
  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem("rotyi.demo") === "1";
    } catch {}
    if (seen) return;
    const id = setTimeout(() => setShow(true), 1800);
    return () => clearTimeout(id);
  }, []);
  const close = () => {
    setShow(false);
    try {
      localStorage.setItem("rotyi.demo", "1");
    } catch {}
  };
  if (!show) return null;
  return (
    <div
      role="dialog"
      aria-labelledby="demo-title"
      className="fixed bottom-4 left-4 right-4 z-[70] max-w-sm rounded-3xl border-2 border-ink bg-cream-soft p-5 shadow-[6px_6px_0_var(--color-ink)] [animation:pop-in_.6s_var(--ease-bounce)] sm:right-auto"
    >
      <span className="sticker mb-2">{t.badge}</span>
      <p id="demo-title" className="display text-3xl">
        {t.title}
      </p>
      <p className="mt-2 text-base">{t.body}</p>
      <button type="button" onClick={close} className="pill pill-ink mt-4">
        {t.ok}
      </button>
    </div>
  );
}

/** Tab title changes when the guest leaves, CRAV's title ticker made calmer. */
export function TitleTicker({ lang }: { lang: Locale }) {
  const away = getDictionary(lang).tabAway;
  useEffect(() => {
    let original = document.title;
    const onVis = () => {
      if (document.hidden) {
        original = document.title;
        document.title = `🍲 ${away}`;
      } else {
        document.title = original;
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [away]);
  return null;
}

/** Adds .is-in to [data-reveal] elements as they scroll into view. */
export function Reveal() {
  const pathname = usePathname();
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-in)");
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }),
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);
  return null;
}
