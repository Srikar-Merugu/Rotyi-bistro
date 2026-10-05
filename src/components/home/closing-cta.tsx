import Image from "next/image";
import Link from "next/link";
import { getDictionary } from "@/lib/i18n";
import { photos } from "@/lib/menu";
import { href, type Locale } from "@/lib/routes";
import { KettleMascot } from "../art";

// CRAV's "FEEL THE CHANGE · ORDER NOW" sign-off, as a booking prompt.
export function ClosingCta({ lang }: { lang: Locale }) {
  const t = getDictionary(lang).cta;
  return (
    <section className="wave-top relative bg-paprika px-4 pb-24 pt-16 text-cream sm:px-6" aria-labelledby="cta-title">
      <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-[1.2fr_1fr]">
        <div data-reveal>
          <span className="sticker">{t.sticker}</span>
          <h2 id="cta-title" className="display mt-3 text-[clamp(3.6rem,11vw,8.5rem)] text-cream-soft">
            <span className="block">{t.title[0]}</span>
            <span className="block text-mustard">{t.title[1]}</span>
          </h2>
          <p className="mt-4 max-w-md text-xl">{t.body}</p>
          <Link href={href(lang, "book")} className="pill pill-cream mt-7 text-lg">
            {t.button}
          </Link>
        </div>
        <div data-reveal className="relative mx-auto w-full max-w-sm [--rr:6deg]" style={{ ["--d" as string]: "150ms" }}>
          <div className="relative aspect-[4/5] rotate-3 overflow-hidden rounded-[2rem] border-[6px] border-cream-soft shadow-2xl">
            <Image
              src={`${photos.waiter}?w=800&h=1000&fit=crop`}
              alt={lang === "hu" ? "Felszolgáló hozza az ételt" : "Server bringing a plate to the table"}
              fill
              sizes="(max-width: 768px) 90vw, 380px"
              quality={70}
              className="object-cover"
            />
          </div>
          <KettleMascot className="wobble absolute -bottom-10 -left-10 w-32" />
        </div>
      </div>
    </section>
  );
}
