# Rotyi Bisztró: casual bistro demo (Brief 3, Budapest)

Fictional District VII bistro built for Kyro Studio's hospitality demos. HU + EN.
Design language adapted from the CRAV concept site (Awwwards): structure, motion and UX patterns only.
All copy, illustrations, name and palette are original. Food photos are from Unsplash (free licence).

**Live target:** `bistro.demo.kyrostudio.eu` · **Stack:** Next.js 16 (App Router, TS), Tailwind 4, GSAP.

## Run

```bash
npm install
npm run dev        # http://localhost:3000 → redirects to /hu or /en
npm run build && npm start
```

Without env vars the booking API validates and logs requests (demo mode). Copy `.env.example` to `.env.local` to wire Supabase and Resend.

## Pages

| Page | HU | EN |
|---|---|---|
| Home | `/hu` | `/en` |
| Menu | `/hu/etlap` | `/en/menu` |
| Book | `/hu/foglalas` | `/en/book` |
| Visit | `/hu/kapcsolat` | `/en/visit` |
| About | `/hu/rolunk` | `/en/about` |
| FAQ | `/hu/gyik` | `/en/faq` |

Plus `/sitemap.xml` (with hreflang alternates), `/robots.txt`, `/llms.txt`, per-locale OG images.

## CRAV → Rotyi mapping

| CRAV | Rotyi |
|---|---|
| "Toasting the artisan bun…" loader | Bubbling bogrács loader, ~0.65 s, once per session, home only |
| JUICY / CHEESY kinetic hero + fanned photo cards | SZAFTOS / ROPOGÓS / HÁZI + fanned cards that spread on scroll |
| Red "Food that feels good" burger with eyes + gloves | Goulash kettle with googly eyes + waving gloves, scales in on scroll |
| Full-bleed hand-held burger | Parallax burger close-up band |
| Floating lettuce/tomato/cheese/patty | Floating paprika, onion, garlic, tomato, sour cream, bay leaf, nokedli |
| Plane on dashed route (London/Berlin) | Scooter on dashed route (VII/VI/VIII districts) → Wolt/foodora links |
| Burger cards + quick details + add to cart | Dish cards + "Info" flip + **add to my table** (goes into booking note) |
| Cart drawer + checkout | "Your table" drawer with the 3-tap booking (no payments) |
| Concept-site notice | "Demo concept by Kyro Studio" card + footer label |
| Title ticker | Tab title changes when guest leaves ("Gyere vissza, kihűl!") |

## Brief features

- **Napi menü** shown first on weekdays before 15:00 (Budapest time, ISR every 5 min). After 15:00 it shows tomorrow's lunch; at weekends, a note.
- **Fast booking**: date → time → party size (3 taps), then name/phone/email. Slots run every 30 min from opening to 90 min before close.
- **Group enquiry 8+**: separate form (Book page, and the "8+" chip in the flow).
- **Prices**: HUF on HU; EUR first with HUF reference on EN (rate in `src/lib/site.ts`).
- **Delivery**: Wolt + foodora links only.

## Where things live

- `src/lib/site.ts`: name, address, phone, hours (single source for NAP / JSON-LD / llms.txt)
- `src/lib/menu.ts`: categories, dishes, napi menü (shaped like `menu_categories` / `menu_items`)
- `src/lib/i18n.ts`: all HU/EN copy + FAQ (shaped like `faqs`)
- `src/app/api/booking/route.ts`: inserts into `booking_requests` (pending) + Resend emails

## Operations app (Supabase)

| Who | URL | What |
|---|---|---|
| Guest | `/hu/foglalas`, `/en/book` | Booking request → guest gets "received" email, owner gets "new request" email + live alert |
| Admin | `/admin` | Live overview, alerts feed with sound/phone notifications |
| Admin | `/admin/bookings` | Approve (assign table, message) or decline → guest emailed |
| Admin | `/admin/orders` | All QR orders, full status control, mark paid, pause QR ordering, today's revenue |
| Admin | `/admin/tables` | Tables, per-table QR (PNG / print sheet), regenerate or disable codes |
| Admin | `/admin/menu` | 86/un-86 dishes, prices, home-page picks, add dishes, napi menü + prices, owner email |
| Admin | `/admin/staff` | Invite admin/kitchen staff (Supabase sends a set-password email) |
| Admin | `/admin/emails` | Every email sent / failed / skipped, with preview |
| Kitchen | `/kitchen` | Ticket board New → Accepted → Cooking → Ready, item tick-off, timers, 86 stock |
| Guest | `/t/<token>` (QR) | Table menu → basket → order → live tracker (`/…/order/<id>?k=…`) |

Order flow: placed → accepted → preparing → ready → served → paid (or cancelled). Kitchen can move to
accepted/preparing/ready; admin can do everything. Each step raises a Realtime alert; guests who leave
an email get "order placed", "ready" and "cancelled" emails.

### Setup

1. Create Supabase project `rotyi-bistro` (eu-central-1).
2. Run `supabase/migrations/20261005200000_rotyi_init.sql`, then `supabase/seed.sql`
   (regenerate the seed from the site content with `node --experimental-strip-types scripts/gen-seed.mts`).
3. Authentication → Users → create the admin user with a password (the seed invites `ADMIN_EMAIL` as admin, set it when generating: `ADMIN_EMAIL=you@x.com node --experimental-strip-types scripts/gen-seed.mts`;
   the account is linked to the admin role automatically on creation).
4. Fill `.env.local` from `.env.example` (Supabase keys + SMTP for email), `npm run dev`, sign in at `/admin`.

Email: every message is written to `email_outbox` first, then sent via SMTP (nodemailer); Resend is used only if SMTP isn't configured. Status (sent / failed / skipped) shows in `/admin/emails`.

Security: RLS on every table. Guests never write to the database directly; the server validates,
prices and inserts with the service role. Staff read and act through RLS and Realtime.

## Still to do

- [ ] SMTP credentials in env (`SMTP_HOST/PORT/USER/PASS`, e.g. Gmail + App Password). Resend is an optional fallback
- [ ] Vercel env vars + deploy to `bistro.demo.kyrostudio.eu`
- [ ] Vercel Analytics + GA4 snippet (the `booking_submitted` event already fires via `src/lib/analytics.ts`)
- [ ] Native HU speaker review of all copy; admin UI is English
- [ ] Real-phone test (iOS + Android), Rich Results Test, Lighthouse screenshots on the deployed URL

## Lighthouse (local prod build, mobile, before the ops app)

Home 90–91 · Menu 91–96 · Book 96 · Visit 95 · About 90 · FAQ 96. Accessibility, Best Practices, SEO: 100 on all.
