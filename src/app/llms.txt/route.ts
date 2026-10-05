import { faqs } from "@/lib/i18n";
import { categories, dailyLunch, lunchPrice, menuItems } from "@/lib/menu";
import { href } from "@/lib/routes";
import { SITE_URL, formatEur, formatHuf, fullAddress, lunchWindow, mapUrl, openingHours, venue } from "@/lib/site";

// Plain-text summary for AI assistants (llms.txt convention).
export const dynamic = "force-static";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function GET() {
  const menu = categories
    .map((c) => {
      const items = menuItems
        .filter((i) => i.categoryId === c.id)
        .map((i) => `- ${i.name.en} (${i.name.hu}): ${formatHuf(i.price)} / about ${formatEur(i.price)}${i.tags.length ? ` [${i.tags.join(", ")}]` : ""}. ${i.description.en}`)
        .join("\n");
      return `### ${c.name.en}\n${items}`;
    })
    .join("\n\n");

  const body = `# ${venue.name}

> Neighbourhood bistro in Budapest's District VII serving Hungarian classics. Daily lunch menu (napi menü) on weekdays ${lunchWindow.opens}–${lunchWindow.closes}, à la carte bistro every day. ${venue.seats} seats. Note: demo concept by Kyro Studio; the venue is fictional.

## Essentials
- Address: ${fullAddress} (${venue.district})
- Map: ${mapUrl}
- Phone: ${venue.phone}
- Email: ${venue.email}
- Book a table: ${SITE_URL}${href("en", "book")} (Hungarian: ${SITE_URL}${href("hu", "book")})
- Menu: ${SITE_URL}${href("en", "menu")}
- Groups of 8+: group enquiry form on the booking page
- Delivery: Wolt and foodora, Districts VI, VII, VIII
- Payment: card, Apple Pay, Google Pay, SZÉP card, cash (HUF)
- Getting there: M2 Astoria (3 min walk), trams 4/6 Király utca

## Opening hours (Europe/Budapest)
${openingHours.map((h) => `- ${days[h.weekday]}: ${h.opens}–${h.closes}`).join("\n")}
- Kitchen closes one hour before closing.

## Daily lunch menu (napi menü)
Weekdays ${lunchWindow.opens}–${lunchWindow.closes}. Soup + main ${formatHuf(lunchPrice.two)} (about ${formatEur(lunchPrice.two)}); with dessert ${formatHuf(lunchPrice.three)} (about ${formatEur(lunchPrice.three)}).
${dailyLunch.map((d, i) => `- ${days[i]}: ${d.soup.en}; ${d.main.en}; ${d.dessert.en}`).join("\n")}

## Menu
${menu}

## FAQ
${faqs.en.map((f) => `Q: ${f.q}\nA: ${f.a}`).join("\n\n")}
`;
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
