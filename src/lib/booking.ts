import { openingHours, budapestNow } from "./site";

// Shared by the booking UI and the API so both agree on what's bookable.

export const MAX_PARTY = 7; // 8+ goes to the group enquiry
export const MAX_GROUP = 30;

const pad = (n: number) => String(n).padStart(2, "0");
const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const toTime = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

/** Budapest calendar date, YYYY-MM-DD, offset by `days`. */
export function budapestDate(days = 0, from = new Date()) {
  const d = new Date(from.getTime() + days * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Budapest" }).format(d);
}

/** Monday = 0 for a YYYY-MM-DD string. */
export function weekdayOf(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

const ALL_DAY = { opens: "00:00", closes: "24:00" };

/**
 * Slots every 30 min from opening until 90 min before closing.
 * `openAllDayDate` is the admin override: that date is bookable around the clock.
 */
export function slotsFor(date: string, now = new Date(), openAllDayDate?: string | null) {
  const h = date === openAllDayDate ? ALL_DAY : openingHours[weekdayOf(date)];
  const last = toMin(h.closes) - 90;
  const isToday = date === budapestDate(0, now);
  const earliest = isToday ? budapestNow(now).minutes + 45 : 0;
  const lunch: string[] = [];
  const dinner: string[] = [];
  for (let m = toMin(h.opens); m <= last; m += 30) {
    if (m < earliest) continue;
    (m < 15 * 60 ? lunch : dinner).push(toTime(m));
  }
  return { lunch, dinner };
}

export function bookableDates(count = 14, now = new Date(), openAllDayDate?: string | null) {
  return Array.from({ length: count }, (_, i) => budapestDate(i, now)).filter((d) => {
    const { lunch, dinner } = slotsFor(d, now, openAllDayDate);
    return lunch.length + dinner.length > 0;
  });
}

export type BookingPayload = {
  kind: "table" | "group";
  lang: "hu" | "en";
  date: string;
  time?: string;
  partySize: number;
  name: string;
  phone: string;
  email: string;
  note?: string;
  occasion?: string;
  dishes?: string[];
  dishIds?: string[]; // menu ids of dishes picked on the website → kitchen pre-order
  company?: string; // honeypot
};

export const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
export const phoneOk = (v: string) => /^\+?[0-9 ()\-/]{7,20}$/.test(v.trim());
