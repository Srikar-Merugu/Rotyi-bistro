import type { Metadata } from "next";
import { getDictionary, faqs } from "./i18n";
import { categories, menuItems, photos } from "./menu";
import { alternates, href, type Locale, type PageKey } from "./routes";
import { SITE_URL, fullAddress, openingHours, schemaDays, venue } from "./site";

export function pageMetadata(lang: Locale, page: PageKey): Metadata {
  const { title, description } = getDictionary(lang).seo[page];
  const alt = alternates(page);
  const url = href(lang, page);
  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: { hu: alt.hu, en: alt.en, "x-default": alt.hu },
    },
    openGraph: {
      type: "website",
      url,
      title,
      description,
      siteName: venue.name,
      locale: lang === "hu" ? "hu_HU" : "en_GB",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

const abs = (path: string) => `${SITE_URL}${path}`;

function hoursSpec() {
  return openingHours.map((h) => ({
    "@type": "OpeningHoursSpecification",
    dayOfWeek: schemaDays[h.weekday],
    opens: h.opens,
    closes: h.closes === "24:00" ? "23:59" : h.closes,
  }));
}

export function restaurantJsonLd(lang: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "@id": `${SITE_URL}/#restaurant`,
    name: venue.name,
    url: abs(href(lang, "home")),
    image: [`${photos.goulashPot}?w=1200&q=70`],
    telephone: venue.phone,
    email: venue.email,
    priceRange: venue.priceRange,
    servesCuisine: ["Hungarian", "Bistro"],
    acceptsReservations: abs(href(lang, "book")),
    hasMenu: abs(href(lang, "menu")),
    currenciesAccepted: "HUF",
    paymentAccepted: "Cash, Credit Card, SZÉP card",
    address: {
      "@type": "PostalAddress",
      streetAddress: venue.street,
      postalCode: venue.postalCode,
      addressLocality: venue.city,
      addressRegion: venue.district,
      addressCountry: venue.country,
    },
    geo: { "@type": "GeoCoordinates", latitude: venue.geo.lat, longitude: venue.geo.lng },
    openingHoursSpecification: hoursSpec(),
    maximumAttendeeCapacity: venue.seats,
  };
}

export function menuJsonLd(lang: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "Menu",
    name: lang === "hu" ? "Étlap" : "Menu",
    url: abs(href(lang, "menu")),
    inLanguage: lang,
    hasMenuSection: categories.map((c) => ({
      "@type": "MenuSection",
      name: c.name[lang],
      hasMenuItem: menuItems
        .filter((i) => i.categoryId === c.id)
        .map((i) => ({
          "@type": "MenuItem",
          name: i.name[lang],
          description: i.description[lang],
          offers: { "@type": "Offer", price: i.price, priceCurrency: "HUF" },
          ...(i.tags.includes("vegan") && { suitableForDiet: "https://schema.org/VeganDiet" }),
          ...(i.tags.includes("gluten-free") && { suitableForDiet: "https://schema.org/GlutenFreeDiet" }),
        })),
    })),
  };
}

export function faqJsonLd(lang: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs[lang].map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export function breadcrumbJsonLd(lang: Locale, page: PageKey) {
  const dict = getDictionary(lang);
  const items = [{ name: dict.nav.home, url: abs(href(lang, "home")) }];
  if (page !== "home") items.push({ name: dict.nav[page], url: abs(href(lang, page)) });
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

export { fullAddress };
