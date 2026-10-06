"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { LiveMenuItem } from "@/lib/menu-data";
import type { MenuCategory } from "@/lib/menu";
import type { Locale } from "@/lib/routes";
import { formatEur, formatHuf } from "@/lib/site";
import { emailOk } from "@/lib/booking";
import { getDictionary } from "@/lib/i18n";
import { KettleMascot } from "./art";
import { photoUrl } from "@/lib/photo";

const copy = {
  hu: {
    table: "Asztal",
    hello: "Rendelj az asztalodtól",
    lead: "Válassz, add le, és szólunk, amikor kész. Fizetni a végén tudsz a felszolgálónál.",
    soldOut: "Elfogyott",
    basket: "Kosár",
    review: "Tovább",
    yourOrder: "A rendelésed",
    name: "Neved (nem kötelező)",
    email: "E-mail, ha szólnánk, amikor kész (nem kötelező)",
    note: "Megjegyzés a konyhának (allergia, kevésbé csípős…)",
    place: "Rendelés leadása",
    sending: "Küldés…",
    total: "Összesen",
    closed: "A rendelés most szünetel. Kérd a felszolgálót!",
    error: "Nem sikerült leadni. Próbáld újra, vagy szólj a felszolgálónak.",
    unavailable: "Néhány étel közben elfogyott, kivettük a kosárból.",
    previous: "Korábbi rendeléseid ennél az asztalnál",
    remove: "Kivesz",
    add: "Hozzáad",
    close: "Bezár",
    payNote: "Fizetés a felszolgálónál. Online fizetés nincs.",
  },
  en: {
    table: "Table",
    hello: "Order from your table",
    lead: "Pick, send, and we'll tell you when it's ready. Pay your server at the end.",
    soldOut: "Sold out",
    basket: "Basket",
    review: "Review",
    yourOrder: "Your order",
    name: "Your name (optional)",
    email: "Email, to hear when it's ready (optional)",
    note: "Note for the kitchen (allergies, less spicy…)",
    place: "Place order",
    sending: "Sending…",
    total: "Total",
    closed: "Ordering is paused right now. Please ask your server.",
    error: "Couldn't place the order. Try again or ask your server.",
    unavailable: "Some dishes just sold out, we removed them from your basket.",
    previous: "Your earlier orders at this table",
    remove: "Remove",
    add: "Add",
    close: "Close",
    payNote: "Pay your server at the table. No online payment.",
  },
};

type Saved = { id: string; key: string; number: number; at: number };

const nowMs = () => Date.now();

export function TableOrder({
  lang,
  token,
  table,
  open,
  menu,
}: {
  lang: Locale;
  token: string;
  table: string;
  open: boolean;
  menu: { categories: MenuCategory[]; items: LiveMenuItem[] };
}) {
  const t = copy[lang];
  const dict = getDictionary(lang);
  const router = useRouter();
  const storeKey = `rotyi.basket.${token}`;
  const [qty, setQty] = useState<Record<string, number>>({});
  const [sheet, setSheet] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const [previous, setPrevious] = useState<Saved[]>([]);
  const [active, setActive] = useState(menu.categories[0]?.id);

  // Restore basket + this table's earlier orders (per device).
  useEffect(() => {
    try {
      const b = JSON.parse(sessionStorage.getItem(storeKey) ?? "{}");
      const prev = JSON.parse(localStorage.getItem(`rotyi.orders.${token}`) ?? "[]") as Saved[];
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from browser storage
      setQty(b);
      setPrevious(prev.filter((p) => nowMs() - p.at < 6 * 3600_000));
    } catch {}
  }, [storeKey, token]);

  const update = (id: string, delta: number) =>
    setQty((q) => {
      const next = { ...q, [id]: Math.max(0, Math.min(20, (q[id] ?? 0) + delta)) };
      if (!next[id]) delete next[id];
      try {
        sessionStorage.setItem(storeKey, JSON.stringify(next));
      } catch {}
      return next;
    });

  const byId = useMemo(() => new Map(menu.items.map((i) => [i.id, i])), [menu.items]);
  const lines = Object.entries(qty).filter(([id]) => byId.get(id)?.available);
  const count = lines.reduce((s, [, n]) => s + n, 0);
  const total = lines.reduce((s, [id, n]) => s + (byId.get(id)?.price ?? 0) * n, 0);
  const price = (huf: number) => (lang === "hu" ? formatHuf(huf) : `${formatEur(huf)} · ${formatHuf(huf)}`);

  async function place(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") ?? "").trim();
    if (email && !emailOk(email)) {
      setMsg(dict.booking.invalidEmail);
      return;
    }
    setStatus("sending");
    setMsg(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token,
          lang,
          items: lines.map(([id, n]) => ({ id, qty: n })),
          name: f.get("name"),
          email,
          note: f.get("note"),
        }),
      });
      const json = await res.json();
      if (res.status === 409 && json.error === "unavailable") {
        (json.items as string[]).forEach((id) => update(id, -99));
        setMsg(t.unavailable);
        setStatus("idle");
        router.refresh();
        return;
      }
      if (!res.ok) throw new Error(json.error);
      const saved: Saved = { id: json.id, key: json.key, number: json.number, at: nowMs() };
      try {
        localStorage.setItem(`rotyi.orders.${token}`, JSON.stringify([saved, ...previous].slice(0, 10)));
        sessionStorage.removeItem(storeKey);
      } catch {}
      router.push(`/${lang}/t/${token}/order/${json.id}?k=${json.key}`);
    } catch {
      setStatus("error");
      setMsg(t.error);
    }
  }

  return (
    <div className="min-h-screen bg-cream pb-32">
      <section className="bg-ink px-4 pb-10 pt-24 text-cream">
        <div className="mx-auto flex max-w-3xl items-center gap-4">
          <KettleMascot className="wobble w-20 shrink-0" />
          <div>
            <p className="font-[family-name:var(--font-display)] text-xl uppercase tracking-widest text-mustard">
              {t.table} {table}
            </p>
            <h1 className="display text-5xl">{t.hello}</h1>
          </div>
        </div>
        <p className="mx-auto mt-4 max-w-3xl text-lg">{t.lead}</p>
        {previous.length > 0 && (
          <div className="mx-auto mt-4 max-w-3xl rounded-2xl bg-cream-soft/15 p-3">
            <p className="text-sm font-bold uppercase tracking-wider">{t.previous}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {previous.map((p) => (
                <Link key={p.id} href={`/${lang}/t/${token}/order/${p.id}?k=${p.key}`} className="rounded-full bg-cream-soft px-3 py-1.5 font-bold text-ink">
                  #{p.number} →
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      {!open && <p className="mx-auto mt-6 max-w-3xl rounded-2xl bg-mustard px-4 py-3 text-lg font-bold">{t.closed}</p>}

      <nav className="sticky top-0 z-20 border-b-2 border-ink/10 bg-cream/95 backdrop-blur" aria-label={dict.nav.menu}>
        <div className="hide-scrollbar mx-auto flex max-w-3xl gap-2 overflow-x-auto px-4 py-3">
          {menu.categories.map((c) => (
            <a
              key={c.id}
              href={`#c-${c.id}`}
              onClick={() => setActive(c.id)}
              aria-current={active === c.id ? "true" : undefined}
              className="shrink-0 rounded-full border-2 border-ink px-4 py-2 font-[family-name:var(--font-display)] uppercase aria-[current=true]:bg-ink aria-[current=true]:text-cream"
            >
              {c.name[lang]}
            </a>
          ))}
        </div>
      </nav>

      <div className="mx-auto max-w-3xl px-4">
        {menu.categories.map((c) => {
          const items = menu.items.filter((i) => i.categoryId === c.id);
          if (!items.length) return null;
          return (
            <section key={c.id} id={`c-${c.id}`} className="scroll-mt-20 pt-8">
              <h2 className="display mb-4 text-4xl text-paprika-ink">{c.name[lang]}</h2>
              <ul className="space-y-3">
                {items.map((item) => {
                  const n = qty[item.id] ?? 0;
                  return (
                    <li
                      key={item.id}
                      className={`flex gap-3 rounded-2xl border-2 border-ink bg-cream-soft p-2.5 shadow-[4px_4px_0_var(--color-ink)] ${item.available ? "" : "opacity-55"}`}
                    >
                      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-mustard">
                        {/* Mascot sits underneath, so a slow photo never looks like an empty box */}
                        <KettleMascot className="absolute inset-4 opacity-40" steam={false} />
                        {item.image && <Image src={photoUrl(item.image, 300, 300)} alt={item.name[lang]} fill sizes="96px" quality={70} className="object-cover" />}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <h3 className="font-[family-name:var(--font-display)] text-xl uppercase leading-tight">{item.name[lang]}</h3>
                        <p className="line-clamp-2 text-sm text-ink/75">{item.description[lang]}</p>
                        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                          <span className="font-[family-name:var(--font-display)] text-lg">{lang === "hu" ? formatHuf(item.price) : formatEur(item.price)}</span>
                          {!item.available ? (
                            <span className="rounded-full bg-ink px-3 py-1 text-sm font-bold uppercase text-cream">{t.soldOut}</span>
                          ) : n === 0 ? (
                            <button
                              type="button"
                              disabled={!open}
                              onClick={() => update(item.id, 1)}
                              className="pill pill-red !min-h-11 !px-4 disabled:opacity-50"
                              aria-label={`${t.add}: ${item.name[lang]}`}
                            >
                              + {t.add}
                            </button>
                          ) : (
                            <div className="flex items-center gap-1 rounded-full bg-ink p-1 text-cream">
                              <button type="button" onClick={() => update(item.id, -1)} className="grid h-10 w-10 place-items-center rounded-full text-2xl" aria-label={`${t.remove}: ${item.name[lang]}`}>
                                −
                              </button>
                              <span className="w-6 text-center font-[family-name:var(--font-display)] text-xl" aria-live="polite">
                                {n}
                              </span>
                              <button type="button" onClick={() => update(item.id, 1)} className="grid h-10 w-10 place-items-center rounded-full bg-paprika text-2xl" aria-label={`${t.add}: ${item.name[lang]}`}>
                                +
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      {count > 0 && !sheet && (
        <div className="fixed inset-x-0 bottom-0 z-30 p-3 [animation:pop-in_.4s_var(--ease-bounce)]">
          <button
            type="button"
            onClick={() => setSheet(true)}
            className="mx-auto flex w-full max-w-3xl items-center justify-between rounded-full bg-ink px-5 py-4 text-cream shadow-2xl"
          >
            <span className="flex items-center gap-3 font-[family-name:var(--font-display)] text-xl uppercase">
              <span className="grid h-8 min-w-8 place-items-center rounded-full bg-mustard px-2 text-ink">{count}</span>
              {t.basket}
            </span>
            <span className="font-[family-name:var(--font-display)] text-xl">
              {formatHuf(total)} · {t.review} →
            </span>
          </button>
        </div>
      )}

      {sheet && (
        <div className="fixed inset-0 z-50 flex items-end bg-ink/50" role="dialog" aria-modal="true" aria-label={t.yourOrder} onClick={() => setSheet(false)}>
          <form
            onSubmit={place}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[92vh] w-full overflow-y-auto rounded-t-[2rem] bg-cream p-5 [animation:pop-in_.4s_var(--ease-out-expo)] sm:mx-auto sm:mb-6 sm:max-w-xl sm:rounded-[2rem]"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="display text-4xl text-paprika-ink">{t.yourOrder}</h2>
              <button type="button" onClick={() => setSheet(false)} className="grid h-11 w-11 place-items-center rounded-full bg-ink text-cream" aria-label={t.close}>
                ✕
              </button>
            </div>
            <ul className="divide-y-2 divide-ink/10">
              {lines.map(([id, n]) => {
                const item = byId.get(id)!;
                return (
                  <li key={id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="font-[family-name:var(--font-display)] text-lg uppercase leading-tight">{item.name[lang]}</p>
                      <p className="text-sm text-ink/70">{formatHuf(item.price * n)}</p>
                    </div>
                    <div className="flex items-center gap-1 rounded-full bg-ink p-1 text-cream">
                      <button type="button" onClick={() => update(id, -1)} className="grid h-9 w-9 place-items-center rounded-full text-xl" aria-label={`${t.remove}: ${item.name[lang]}`}>
                        −
                      </button>
                      <span className="w-6 text-center font-bold">{n}</span>
                      <button type="button" onClick={() => update(id, 1)} className="grid h-9 w-9 place-items-center rounded-full bg-paprika text-xl" aria-label={`${t.add}: ${item.name[lang]}`}>
                        +
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 flex justify-between border-t-2 border-ink pt-3 font-[family-name:var(--font-display)] text-2xl uppercase">
              <span>{t.total}</span>
              <span>{price(total)}</span>
            </p>
            <div className="mt-4 grid gap-3">
              <input name="name" autoComplete="given-name" placeholder={t.name} aria-label={t.name} className="min-h-12 rounded-xl border-2 border-ink/20 bg-white px-3 text-lg" />
              <input name="email" type="email" inputMode="email" autoComplete="email" placeholder={t.email} aria-label={t.email} className="min-h-12 rounded-xl border-2 border-ink/20 bg-white px-3 text-lg" />
              <textarea name="note" rows={2} placeholder={t.note} aria-label={t.note} className="rounded-xl border-2 border-ink/20 bg-white px-3 py-2 text-lg" />
            </div>
            {msg && (
              <p role="alert" className="mt-3 rounded-xl bg-paprika-ink px-3 py-2 font-semibold text-white">
                {msg}
              </p>
            )}
            <button type="submit" disabled={status === "sending" || !lines.length || !open} className="pill pill-red mt-4 w-full text-xl disabled:opacity-60">
              {status === "sending" ? t.sending : `${t.place} · ${formatHuf(total)}`}
            </button>
            <p className="mt-2 text-center text-sm text-ink/70">{t.payNote}</p>
          </form>
        </div>
      )}
    </div>
  );
}
