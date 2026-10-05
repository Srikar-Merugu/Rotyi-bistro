import { Anton, Barlow_Condensed, Titan_One } from "next/font/google";

export const anton = Anton({ weight: "400", subsets: ["latin", "latin-ext"], variable: "--font-anton", display: "swap" });
// Sticker/logo face: small, never the LCP element, so it isn't preloaded.
export const titan = Titan_One({ weight: "400", subsets: ["latin", "latin-ext"], variable: "--font-titan", display: "swap", preload: false });
export const barlow = Barlow_Condensed({ weight: ["500", "700"], subsets: ["latin", "latin-ext"], variable: "--font-barlow", display: "swap" });

export const fontVars = `${anton.variable} ${titan.variable} ${barlow.variable}`;
