export const locales = ["hu", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "hu";

export const isLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value);

export type PageKey = "home" | "menu" | "book" | "visit" | "about" | "faq";

// Public URL slug per locale. The route folder name is the PageKey.
export const localizedSlugs: Record<Locale, Record<Exclude<PageKey, "home">, string>> = {
  hu: { menu: "etlap", book: "foglalas", visit: "kapcsolat", about: "rolunk", faq: "gyik" },
  en: { menu: "menu", book: "book", visit: "visit", about: "about", faq: "faq" },
};

export const pageKeys: PageKey[] = ["home", "menu", "book", "visit", "about", "faq"];

export function href(lang: Locale, page: PageKey): string {
  return page === "home" ? `/${lang}` : `/${lang}/${localizedSlugs[lang][page]}`;
}

/** Same page in the other language — used by the language switch and hreflang. */
export function alternates(page: PageKey): Record<Locale, string> {
  return { hu: href("hu", page), en: href("en", page) };
}
