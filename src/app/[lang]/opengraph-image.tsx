import { ImageResponse } from "next/og";
import { getDictionary } from "@/lib/i18n";
import { isLocale } from "@/lib/routes";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Rotyi Bisztró, Budapest";

export default async function OgImage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const dict = getDictionary(isLocale(lang) ? lang : "hu");
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#d6331a",
          color: "#fbf3e7",
          padding: 64,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 30, letterSpacing: 4, color: "#f7c548" }}>{dict.est}</div>
        <div style={{ display: "flex", fontSize: 240, fontWeight: 900, lineHeight: 0.9, letterSpacing: -6 }}>ROTYI</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", fontSize: 40, maxWidth: 760 }}>{dict.footer.tagline}</div>
          <div
            style={{
              display: "flex",
              background: "#f7c548",
              color: "#221a16",
              borderRadius: 999,
              padding: "16px 32px",
              fontSize: 32,
              fontWeight: 800,
            }}
          >
            {dict.lunch.sticker}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
