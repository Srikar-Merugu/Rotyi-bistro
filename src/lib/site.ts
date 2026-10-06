// Single source of truth for name, address and phone (NAP). Every page, the
// JSON-LD and llms.txt read from here so they stay identical everywhere.
// Rotyi is a fictional venue — Kyro Studio demo concept.

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bistro.demo.kyrostudio.eu";

export const venue = {
  name: "Rotyi Bisztró",
  shortName: "ROTYI",
  founded: 2019,
  street: "Rotyi köz 7.",
  postalCode: "1074",
  city: "Budapest",
  district: "VII. kerület",
  country: "HU",
  phone: "+36 1 555 0100",
  phoneHref: "tel:+3615550100",
  email: "hello@bistro.demo.kyrostudio.eu",
  geo: { lat: 47.4977, lng: 19.0647 },
  seats: 70,
  priceRange: "$$",
  eurRate: 395, // HUF per EUR, display only
  instagram: "https://www.instagram.com/",
  delivery: {
    wolt: "https://wolt.com/hu/hun/budapest",
    foodora: "https://www.foodora.hu/",
  },
} as const;

export const fullAddress = `${venue.street}, ${venue.postalCode} ${venue.city}`;
export const mapUrl = `https://www.google.com/maps/search/?api=1&query=${venue.geo.lat},${venue.geo.lng}`;

/** 0 = Monday … 6 = Sunday. Times are Europe/Budapest. */
export const openingHours: { weekday: number; opens: string; closes: string }[] = [
  { weekday: 0, opens: "11:30", closes: "23:00" },
  { weekday: 1, opens: "11:30", closes: "23:00" },
  { weekday: 2, opens: "11:30", closes: "23:00" },
  { weekday: 3, opens: "11:30", closes: "23:00" },
  { weekday: 4, opens: "11:30", closes: "24:00" },
  { weekday: 5, opens: "12:00", closes: "24:00" },
  { weekday: 6, opens: "12:00", closes: "22:00" },
];

export const lunchWindow = { opens: "11:30", closes: "15:00" };

export const schemaDays = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
];

/** Current weekday (Mon=0) and minutes since midnight in Budapest. */
export function budapestNow(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Budapest",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekday = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(get("weekday"));
  return { weekday, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** Napi menü is shown first on weekdays before 15:00. */
export function isLunchTime(date = new Date()) {
  const { weekday, minutes } = budapestNow(date);
  return weekday <= 4 && minutes < toMinutes(lunchWindow.closes);
}

/** `openAllDayDate` (YYYY-MM-DD, Budapest) is the admin's "open all day today" override. */
export function isOpenNow(date = new Date(), openAllDayDate?: string | null) {
  if (openAllDayDate && openAllDayDate === new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Budapest" }).format(date)) return true;
  const { weekday, minutes } = budapestNow(date);
  const today = openingHours[weekday];
  return minutes >= toMinutes(today.opens) && minutes < toMinutes(today.closes);
}

export const formatHuf = (huf: number) =>
  `${new Intl.NumberFormat("hu-HU").format(huf).replace(/ /g, " ")} Ft`;

export const formatEur = (huf: number) =>
  `€${(Math.round((huf / venue.eurRate) * 2) / 2).toFixed(2).replace(/\.00$/, "")}`;
