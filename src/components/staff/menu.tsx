"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/browser";
import { Btn, Card, Empty, PageTitle, huf, q, useLive } from "./ui";

type Cat = { id: string; name_en: string; name_hu: string };
type Item = { id: string; category_id: string; name_hu: string; name_en: string; description_hu: string; description_en: string; price: number; available: boolean; signature: boolean; tags: string[]; image: string | null };
type Lunch = { weekday: number; soup_hu: string; soup_en: string; main_hu: string; main_en: string; dessert_hu: string; dessert_en: string };
type Settings = { lunch_price_two: number; lunch_price_three: number; owner_email: string | null };

/** Uploads a dish photo to the public "menu-photos" bucket and returns its URL. */
async function uploadPhoto(file: File, dishId: string) {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Photo is larger than 5 MB. Please use a smaller one.");
  const ext = (file.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
  const path = `${dishId}-${Date.now()}.${ext}`;
  const bucket = supabase().storage.from("menu-photos");
  const { error } = await bucket.upload(path, file, { contentType: file.type, cacheControl: "31536000" });
  if (error) throw new Error(error.message);
  return bucket.getPublicUrl(path).data.publicUrl;
}

const thumb = (src: string) => (src.includes("images.unsplash.com") ? `${src}?w=240&h=180&fit=crop` : src);

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

export function AdminMenu() {
  const [tab, setTab] = useState<"dishes" | "lunch">("dishes");
  const { data, reload } = useLive(async () => {
    const [cats, items, lunch, settings] = await Promise.all([
      q<Cat[]>(supabase().from("menu_categories").select("id, name_en, name_hu").order("sort")),
      q<Item[]>(supabase().from("menu_items").select("*").order("sort")),
      q<Lunch[]>(supabase().from("daily_lunch").select("*").order("weekday")),
      q<Settings>(supabase().from("settings").select("lunch_price_two, lunch_price_three, owner_email").single()),
    ]);
    return { cats, items, lunch, settings };
  }, ["menu_items", "daily_lunch", "settings"]);

  return (
    <>
      <PageTitle title="Menu">
        <div className="flex gap-2">
          <Btn tone={tab === "dishes" ? "ink" : "ghost"} onClick={() => setTab("dishes")}>Dishes</Btn>
          <Btn tone={tab === "lunch" ? "ink" : "ghost"} onClick={() => setTab("lunch")}>Napi menü</Btn>
        </div>
      </PageTitle>
      <p className="mb-4 max-w-2xl text-ink/80">Changes go live on the website and the QR menu within a minute. No redeploy needed.</p>
      {!data ? <Empty>Loading…</Empty> : tab === "dishes" ? <Dishes cats={data.cats} items={data.items} onSaved={reload} /> : <LunchEditor lunch={data.lunch} settings={data.settings} onSaved={reload} />}
    </>
  );
}

function Dishes({ cats, items, onSaved }: { cats: Cat[]; items: Item[]; onSaved: () => void }) {
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name_hu = String(f.get("name_hu")).trim();
    const id = slug(String(f.get("name_en") || name_hu));
    const photo = f.get("photo");
    let image: string | null = null;
    try {
      if (photo instanceof File && photo.size > 0) image = await uploadPhoto(photo, id);
    } catch (err) {
      setErr((err as Error).message);
      return;
    }
    const { error } = await supabase()
      .from("menu_items")
      .insert({
        id,
        image,
        category_id: f.get("category_id"),
        name_hu,
        name_en: String(f.get("name_en")).trim() || name_hu,
        description_hu: String(f.get("description_hu")).trim(),
        description_en: String(f.get("description_en")).trim(),
        price: Number(f.get("price")),
        sort: items.length,
        quick: { time: "10 min", side: { hu: "", en: "" }, protein: "—", spice: 0, kcal: 0 },
      });
    setErr(error?.message ?? null);
    if (!error) {
      setAdding(false);
      onSaved();
    }
  }

  return (
    <>
      <Btn tone="red" className="mb-4" onClick={() => setAdding((v) => !v)}>
        {adding ? "Close" : "+ Add dish"}
      </Btn>
      {adding && (
        <Card className="mb-6">
          <form onSubmit={add} className="grid gap-3 sm:grid-cols-2">
            <input name="name_hu" required placeholder="Name (HU)" className="min-h-11 rounded-xl border-2 border-ink/20 bg-white px-3" />
            <input name="name_en" placeholder="Name (EN)" className="min-h-11 rounded-xl border-2 border-ink/20 bg-white px-3" />
            <input name="description_hu" placeholder="Description (HU)" className="min-h-11 rounded-xl border-2 border-ink/20 bg-white px-3" />
            <input name="description_en" placeholder="Description (EN)" className="min-h-11 rounded-xl border-2 border-ink/20 bg-white px-3" />
            <select name="category_id" className="min-h-11 rounded-xl border-2 border-ink/20 bg-white px-2">
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name_en}</option>)}
            </select>
            <input name="price" type="number" required min={0} step={10} placeholder="Price (HUF)" className="min-h-11 rounded-xl border-2 border-ink/20 bg-white px-3" />
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-sm font-semibold">Photo (JPG/PNG/WebP, max 5 MB). Shown on the website and QR menu</span>
              <input name="photo" type="file" accept="image/jpeg,image/png,image/webp,image/avif" capture="environment" className="block w-full rounded-xl border-2 border-dashed border-ink/30 bg-white p-3 text-sm" />
            </label>
            <Btn type="submit" tone="green" className="sm:col-span-2">Save dish</Btn>
            {err && <p className="text-sm font-semibold text-paprika-ink sm:col-span-2">{err}</p>}
          </form>
        </Card>
      )}
      {cats.map((c) => (
        <section key={c.id} className="mb-6">
          <h2 className="display mb-2 text-3xl">{c.name_en}</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {items.filter((i) => i.category_id === c.id).map((i) => <DishRow key={i.id} i={i} onSaved={onSaved} />)}
          </div>
        </section>
      ))}
    </>
  );
}

function DishRow({ i, onSaved }: { i: Item; onSaved: () => void }) {
  const [price, setPrice] = useState(String(i.price));
  const [saved, setSaved] = useState(false);
  const [photoMsg, setPhotoMsg] = useState<string | null>(null);
  const set = async (patch: Partial<Item>) => {
    await supabase().from("menu_items").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", i.id);
    onSaved();
  };
  return (
    <Card className={i.available ? "" : "opacity-60"}>
      <div className="flex items-start justify-between gap-2">
        <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-mustard">
          {i.image ? (
            // eslint-disable-next-line @next/next/no-img-element -- small admin thumbnail
            <img src={thumb(i.image)} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="grid h-full place-items-center text-xs font-bold">No photo</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-[family-name:var(--font-display)] text-xl uppercase leading-tight">{i.name_hu}</p>
          <p className="text-sm text-ink/70">{i.name_en} · {huf(i.price)}</p>
        </div>
        <Btn tone={i.available ? "green" : "red"} onClick={() => set({ available: !i.available })} aria-pressed={i.available}>
          {i.available ? "On" : "86"}
        </Btn>
      </div>
      <form
        className="mt-3 flex items-center gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          await set({ price: Math.max(0, Math.round(Number(price))) });
          setSaved(true);
          setTimeout(() => setSaved(false), 1500);
        }}
      >
        <label className="sr-only" htmlFor={`p-${i.id}`}>Price for {i.name_en}</label>
        <input id={`p-${i.id}`} type="number" min={0} step={10} value={price} onChange={(e) => setPrice(e.target.value)} className="min-h-11 w-32 rounded-xl border-2 border-ink/20 bg-white px-3" />
        <Btn type="submit" tone="ghost">{saved ? "Saved ✓" : "Save price"}</Btn>
        <label className="ml-auto flex items-center gap-1 text-sm font-semibold">
          <input type="checkbox" checked={i.signature} onChange={(e) => set({ signature: e.target.checked })} className="h-5 w-5" /> Home page
        </label>
      </form>
      <label className="mt-2 inline-flex min-h-11 cursor-pointer items-center rounded-full border-2 border-ink px-4 text-sm font-bold">
        📷 {i.image ? "Change photo" : "Add photo"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="sr-only"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setPhotoMsg("Uploading…");
            try {
              await set({ image: await uploadPhoto(file, i.id) });
              setPhotoMsg("Photo updated ✓ Live within a minute.");
            } catch (err) {
              setPhotoMsg((err as Error).message);
            }
            e.target.value = "";
          }}
        />
      </label>
      {photoMsg && <p className="mt-1 text-sm font-semibold" role="status">{photoMsg}</p>}
    </Card>
  );
}

function LunchEditor({ lunch, settings, onSaved }: { lunch: Lunch[]; settings: Settings; onSaved: () => void }) {
  const [status, setStatus] = useState<string | null>(null);
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const rows = days.map((_, d) => ({
      weekday: d,
      soup_hu: String(f.get(`${d}.soup_hu`)), soup_en: String(f.get(`${d}.soup_en`)),
      main_hu: String(f.get(`${d}.main_hu`)), main_en: String(f.get(`${d}.main_en`)),
      dessert_hu: String(f.get(`${d}.dessert_hu`)), dessert_en: String(f.get(`${d}.dessert_en`)),
      updated_at: new Date().toISOString(),
    }));
    const [a, b] = await Promise.all([
      supabase().from("daily_lunch").upsert(rows),
      supabase().from("settings").update({ lunch_price_two: Number(f.get("two")), lunch_price_three: Number(f.get("three")), owner_email: String(f.get("owner_email")) || null }).eq("id", true),
    ]);
    setStatus(a.error?.message ?? b.error?.message ?? "Saved ✓ Live on the site within a minute.");
    onSaved();
  }
  const field = "min-h-11 w-full rounded-xl border-2 border-ink/20 bg-white px-3";
  return (
    <form onSubmit={save} className="space-y-4">
      <Card className="grid gap-3 sm:grid-cols-3">
        <label><span className="mb-1 block text-sm font-semibold">Soup + main (HUF)</span><input name="two" type="number" defaultValue={settings.lunch_price_two} className={field} /></label>
        <label><span className="mb-1 block text-sm font-semibold">With dessert (HUF)</span><input name="three" type="number" defaultValue={settings.lunch_price_three} className={field} /></label>
        <label><span className="mb-1 block text-sm font-semibold">Owner alert email</span><input name="owner_email" type="email" defaultValue={settings.owner_email ?? ""} className={field} /></label>
      </Card>
      {days.map((day, d) => {
        const l = lunch.find((x) => x.weekday === d);
        return (
          <Card key={day}>
            <p className="display mb-2 text-2xl">{day}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {(["soup", "main", "dessert"] as const).flatMap((k) =>
                (["hu", "en"] as const).map((lang) => (
                  <label key={`${k}_${lang}`}>
                    <span className="mb-0.5 block text-xs font-bold uppercase tracking-wider text-ink/60">{k} · {lang}</span>
                    <input name={`${d}.${k}_${lang}`} required defaultValue={l?.[`${k}_${lang}`] ?? ""} className={field} />
                  </label>
                )),
              )}
            </div>
          </Card>
        );
      })}
      <div className="sticky bottom-24 flex items-center gap-3 lg:bottom-4">
        <Btn type="submit" tone="red" className="shadow-xl">Save napi menü</Btn>
        {status && <p className="rounded-full bg-ink px-3 py-1 text-sm text-cream" role="status">{status}</p>}
      </div>
    </form>
  );
}
