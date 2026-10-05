import type { MetadataRoute } from "next";
import { alternates, locales, pageKeys } from "@/lib/routes";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return pageKeys.flatMap((page) => {
    const alt = alternates(page);
    const languages = { hu: `${SITE_URL}${alt.hu}`, en: `${SITE_URL}${alt.en}`, "x-default": `${SITE_URL}${alt.hu}` };
    return locales.map((lang) => ({
      url: `${SITE_URL}${alt[lang]}`,
      lastModified: new Date(),
      changeFrequency: page === "menu" || page === "home" ? ("daily" as const) : ("monthly" as const),
      priority: page === "home" ? 1 : page === "menu" || page === "book" ? 0.9 : 0.6,
      alternates: { languages },
    }));
  });
}
