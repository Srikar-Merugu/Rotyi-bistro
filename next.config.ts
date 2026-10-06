import type { NextConfig } from "next";
import { localizedSlugs } from "./src/lib/routes";

// Hungarian pages live at translated slugs (/hu/etlap) but share one route
// folder per page (/[lang]/menu). Rewrites map the public slug to the folder;
// redirects keep the untranslated path from being indexed twice.
const huPairs = Object.entries(localizedSlugs.hu).filter(
  ([key, slug]) => key !== slug,
);

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [70, 80],
    // Unsplash crops are set via query (?w=&h=&fit=crop), so search is left open.
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", port: "", pathname: "/photo-**" },
      // Dish photos uploaded from /admin/menu (Supabase Storage, public bucket)
      { protocol: "https", hostname: "*.supabase.co", port: "", pathname: "/storage/v1/object/public/menu-photos/**" },
    ],
  },
  async rewrites() {
    return huPairs.map(([key, slug]) => ({
      source: `/hu/${slug}`,
      destination: `/hu/${key}`,
    }));
  },
  async redirects() {
    return huPairs.map(([key, slug]) => ({
      source: `/hu/${key}`,
      destination: `/hu/${slug}`,
      permanent: true,
    }));
  },
};

export default nextConfig;
