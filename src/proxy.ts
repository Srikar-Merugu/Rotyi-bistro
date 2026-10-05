import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale } from "@/lib/routes";

// "/" and table QR links ("/t/<token>") → /hu/… or /en/… from Accept-Language.
// Hungarian is the default (x-default); tourists' phones land in English.
export function proxy(request: NextRequest) {
  const accept = request.headers.get("accept-language") ?? "";
  const prefersEnglish = /^\s*en\b/i.test(accept) || (!/\bhu\b/i.test(accept) && accept.trim() !== "");
  const lang = prefersEnglish ? "en" : defaultLocale;
  const url = request.nextUrl.clone();
  url.pathname = `/${lang}${request.nextUrl.pathname === "/" ? "" : request.nextUrl.pathname}`;
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/", "/t/:token"] };
