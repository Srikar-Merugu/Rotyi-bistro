// Fires to GA4 (gtag) and Vercel Analytics when the starter has loaded them.
// No-ops otherwise, so local dev and the demo never break.
type W = Window & {
  gtag?: (...args: unknown[]) => void;
  va?: (event: "event", payload: { name: string; data?: Record<string, unknown> }) => void;
};

export function trackEvent(name: string, data: Record<string, string | number> = {}) {
  if (typeof window === "undefined") return;
  const w = window as W;
  w.gtag?.("event", name, data);
  w.va?.("event", { name, data });
}
