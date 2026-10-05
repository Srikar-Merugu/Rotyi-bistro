"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getDictionary } from "@/lib/i18n";
import { href, localizedSlugs, pageKeys, type Locale, type PageKey } from "@/lib/routes";
import { isOpenNow, venue } from "@/lib/site";
import { menuItems } from "@/lib/menu";
import { KettleMascot, Paprika } from "./art";
import { BookingFlow } from "./booking-flow";
import { useTable } from "./table-provider";

/** Works out which page we're on so the language switch keeps it. */
function currentPage(pathname: string, lang: Locale): PageKey {
  const seg = pathname.split("/")[2];
  if (!seg) return "home";
  const entry = Object.entries(localizedSlugs[lang]).find(([, slug]) => slug === seg);
  return (entry?.[0] as PageKey) ?? "home";
}

export function Header({ lang }: { lang: Locale }) {
  const dict = getDictionary(lang);
  const pathname = usePathname();
  const page = currentPage(pathname, lang);
  const other: Locale = lang === "hu" ? "en" : "hu";
  const { items, setOpen } = useTable();
  // The menu belongs to the page it was opened on, so navigating closes it.
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const menuOpen = menuPath === pathname;
  const setMenuOpen = (open: boolean) => setMenuPath(open ? pathname : null);
  const [hidden, setHidden] = useState(false);
  const [solid, setSolid] = useState(false);
  const [openNow, setOpenNow] = useState<boolean | null>(null);
  const lastY = useRef(0);

  useEffect(() => {
    const tick = () => setOpenNow(isOpenNow());
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setSolid(y > 40);
      setHidden(y > 300 && y > lastY.current + 4);
      if (y < lastY.current - 4) setHidden(false);
      lastY.current = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.documentElement.style.overflow = menuOpen ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuPath(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <>
      <a
        href="#main"
        className="sr-only z-[100] rounded-full bg-ink px-4 py-2 text-cream focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        {dict.nav.skip}
      </a>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-transform duration-500 ${hidden && !menuOpen ? "-translate-y-full" : ""}`}
      >
        <div
          className={`mx-auto flex max-w-[1400px] items-center justify-between gap-2 px-3 py-3 transition-colors sm:px-6 ${solid && !menuOpen ? "bg-cream/90 backdrop-blur-md" : ""}`}
        >
          <Link
            href={href(lang, "home")}
            className={`group flex shrink-0 items-center gap-1.5 transition-colors ${menuOpen ? "text-cream-soft" : "text-paprika-ink"}`}
            aria-label={`${venue.name}, ${dict.nav.home}`}
          >
            <KettleMascot className="h-9 w-9 shrink-0 transition-transform duration-500 group-hover:-rotate-12 sm:h-10 sm:w-10" steam={false} />
            <span className="font-[family-name:var(--font-sticker)] text-[1.65rem] leading-none sm:text-4xl">ROTYI</span>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {openNow !== null && (
            <span
              className={`hidden items-center gap-2 rounded-full border-2 border-ink/15 px-3 py-1.5 text-sm font-bold uppercase tracking-wide md:inline-flex`}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${openNow ? "bg-leaf animate-pulse" : "bg-ink/40"}`} />
              {openNow ? dict.openNow : dict.closedNow}
            </span>
            )}
            <Link
              href={href(other, page)}
              hrefLang={other}
              lang={other}
              className="grid h-12 min-w-12 place-items-center rounded-full border-2 border-ink/80 px-2 font-[family-name:var(--font-display)] uppercase"
              aria-label={getDictionary(other).langName}
            >
              {other}
            </Link>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="pill pill-red relative !gap-1.5 !px-3 sm:!gap-2 sm:!px-5"
              aria-label={`${dict.table.title} (${items.length})`}
            >
              <span className="hidden sm:inline">{dict.nav.book}</span>
              <svg viewBox="0 0 24 24" className="h-5 w-5 sm:hidden" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.4">
                <rect x="3" y="5" width="18" height="16" rx="3" />
                <path d="M3 10h18M8 3v4M16 3v4" />
              </svg>
              <span
                className="grid h-6 min-w-6 place-items-center rounded-full bg-mustard px-1.5 text-sm text-ink"
                aria-hidden
              >
                {items.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-expanded={menuOpen}
              aria-controls="site-menu"
              className="pill pill-ink !px-3.5 sm:!px-4"
            >
              <span className="hidden sm:inline">{menuOpen ? dict.nav.close : dict.nav.open}</span>
              <span className="relative block h-3.5 w-5" aria-hidden>
                <span className={`absolute left-0 h-0.5 w-5 bg-current transition ${menuOpen ? "top-1.5 rotate-45" : "top-0"}`} />
                <span className={`absolute left-0 top-1.5 h-0.5 w-5 bg-current transition ${menuOpen ? "opacity-0" : ""}`} />
                <span className={`absolute left-0 h-0.5 w-5 bg-current transition ${menuOpen ? "top-1.5 -rotate-45" : "top-3"}`} />
              </span>
              <span className="sr-only sm:hidden">{menuOpen ? dict.nav.close : dict.nav.open}</span>
            </button>
          </div>
        </div>
      </header>

      <MenuOverlay lang={lang} open={menuOpen} page={page} onClose={() => setMenuOpen(false)} />
      <TableDrawer lang={lang} />
      <AddedToast lang={lang} />
    </>
  );
}

function MenuOverlay({ lang, open, page, onClose }: { lang: Locale; open: boolean; page: PageKey; onClose: () => void }) {
  const dict = getDictionary(lang);
  return (
    <div
      id="site-menu"
      role="dialog"
      aria-modal="true"
      aria-label={dict.nav.open}
      inert={!open}
      className={`fixed inset-0 z-40 overflow-y-auto bg-paprika text-cream transition-[clip-path] duration-700 ease-[var(--ease-out-expo)] ${open ? "[clip-path:circle(150%_at_100%_0)]" : "[clip-path:circle(0%_at_100%_0)]"}`}
    >
      <div className="mx-auto flex min-h-full max-w-[1400px] flex-col justify-between px-4 pb-8 pt-24 sm:px-6">
        <nav aria-label="Primary">
          <ul className="space-y-1">
            {pageKeys.map((k, i) => (
              <li
                key={k}
                className="overflow-hidden pt-[0.14em]"
                style={{ transitionDelay: open ? `${120 + i * 60}ms` : "0ms" }}
              >
                <Link
                  href={href(lang, k)}
                  onClick={onClose}
                  aria-current={k === page ? "page" : undefined}
                  className={`display group inline-flex items-center gap-4 !leading-[0.95] text-[clamp(3.2rem,11vw,8.5rem)] transition duration-700 ease-[var(--ease-out-expo)] hover:text-mustard aria-[current=page]:text-mustard ${open ? "translate-y-0" : "translate-y-full"}`}
                  style={{ transitionDelay: open ? `${120 + i * 60}ms` : "0ms" }}
                >
                  {dict.nav[k]}
                  <Paprika className="h-[0.6em] w-[0.5em] -rotate-12 opacity-0 transition group-hover:opacity-100" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-10 flex flex-wrap items-end justify-between gap-6 border-t-2 border-cream/30 pt-6">
          <p className="font-[family-name:var(--font-display)] text-xl uppercase tracking-wider">{dict.est}</p>
          <div className="flex flex-wrap gap-3">
            <a href={venue.delivery.wolt} target="_blank" rel="noopener" className="pill pill-cream">
              Wolt ↗
            </a>
            <a href={venue.delivery.foodora} target="_blank" rel="noopener" className="pill pill-cream">
              foodora ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function TableDrawer({ lang }: { lang: Locale }) {
  const dict = getDictionary(lang);
  const { open, setOpen, items, remove } = useTable();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  return (
    <div className={`fixed inset-0 z-[60] ${open ? "" : "pointer-events-none"}`} inert={!open}>
      <div
        className={`absolute inset-0 bg-ink/50 transition-opacity duration-500 ${open ? "opacity-100" : "opacity-0"}`}
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={dict.table.title}
        className={`absolute inset-y-0 right-0 flex w-full max-w-[520px] flex-col bg-cream shadow-2xl transition-transform duration-700 ease-[var(--ease-out-expo)] ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between border-b-2 border-ink/10 px-5 py-4">
          <h2 className="display text-4xl text-paprika-ink">{dict.table.title}</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={() => setOpen(false)}
            className="grid h-12 w-12 place-items-center rounded-full bg-ink text-cream transition hover:rotate-90"
            aria-label={dict.nav.close}
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <section className="mb-6">
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-ink/70">{dict.table.wishes}</h3>
            {items.length === 0 ? (
              <p className="text-base text-ink/70">{dict.table.empty}</p>
            ) : (
              <>
                <ul className="flex flex-wrap gap-2">
                  {items.map((id) => {
                    const item = menuItems.find((m) => m.id === id);
                    if (!item) return null;
                    return (
                      <li key={id} className="flex items-center gap-1 rounded-full bg-mustard py-1 pl-3 pr-1 font-semibold">
                        {item.name[lang]}
                        <button
                          type="button"
                          onClick={() => remove(id)}
                          className="grid h-8 w-8 place-items-center rounded-full hover:bg-ink hover:text-cream"
                          aria-label={`${dict.table.remove}: ${item.name[lang]}`}
                        >
                          ✕
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-2 text-sm text-ink/70">{dict.table.note}</p>
              </>
            )}
          </section>
          {open && <BookingFlow lang={lang} compact />}
        </div>
      </aside>
    </div>
  );
}

function AddedToast({ lang }: { lang: Locale }) {
  const dict = getDictionary(lang);
  const { toast, setOpen } = useTable();
  const item = toast ? menuItems.find((m) => m.id === toast) : null;
  return (
    <div
      aria-live="polite"
      className={`fixed bottom-5 left-1/2 z-[55] -translate-x-1/2 transition-all duration-500 ease-[var(--ease-bounce)] ${item ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-24 opacity-0"}`}
    >
      {item && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-3 rounded-full bg-ink py-2 pl-2 pr-5 text-cream shadow-xl"
        >
          <span className="grid h-10 w-10 place-items-center rounded-full bg-mustard text-ink">✓</span>
          <span className="text-left leading-tight">
            <span className="block font-[family-name:var(--font-display)] uppercase tracking-wide text-mustard">
              {dict.picks.added}
            </span>
            <span className="block text-base">{item.name[lang]}</span>
          </span>
        </button>
      )}
    </div>
  );
}
