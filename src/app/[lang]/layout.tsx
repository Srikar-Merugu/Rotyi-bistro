import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { DemoNotice, Reveal, TitleTicker } from "@/components/effects";
import { JsonLd } from "@/components/json-ld";
import { TableProvider } from "@/components/table-provider";
import { restaurantJsonLd } from "@/lib/seo";
import { isLocale, locales } from "@/lib/routes";
import { SITE_URL, venue } from "@/lib/site";
import { fontVars } from "@/lib/fonts";
import "../globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: venue.name,
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#c62d17",
  width: "device-width",
  initialScale: 1,
};

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export const dynamicParams = false;

// Skips the loader for the rest of the session once it has played.
const loaderScript = `try{if(sessionStorage.getItem('rotyi.loaded'))document.documentElement.classList.add('skip-loader');else sessionStorage.setItem('rotyi.loaded','1')}catch(e){}`;

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  return (
    <html lang={lang} className={fontVars} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: loaderScript }} />
      </head>
      <body>
        <TableProvider>
          <Header lang={lang} />
          <main id="main">{children}</main>
          <Footer lang={lang} />
          <DemoNotice lang={lang} />
        </TableProvider>
        <Reveal />
        <TitleTicker lang={lang} />
        <JsonLd data={restaurantJsonLd(lang)} />
      </body>
    </html>
  );
}
