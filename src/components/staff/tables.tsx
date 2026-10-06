"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/browser";
import { Btn, Card, Empty, PageTitle, q, useLive } from "./ui";

type Table = { id: string; label: string; seats: number; area: string; qr_token: string; active: boolean };

const randomToken = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

export function AdminTables() {
  // Staff screens only render client-side (behind the auth gate), so window is available.
  const origin = process.env.NEXT_PUBLIC_SITE_URL || (typeof window === "undefined" ? "" : window.location.origin);
  const [err, setErr] = useState<string | null>(null);

  const { data, reload } = useLive(() => q<Table[]>(supabase().from("dining_tables").select("*").order("label")), ["dining_tables"]);

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const { error } = await supabase()
      .from("dining_tables")
      .insert({ label: String(f.get("label")).trim().toUpperCase(), seats: Number(f.get("seats")), area: f.get("area") });
    setErr(error?.message ?? null);
    if (!error) {
      form.reset();
      reload();
    }
  }

  return (
    <>
      <PageTitle title="Tables & QR">
        <Btn tone="mustard" onClick={() => window.print()}>🖨 Print all QR</Btn>
      </PageTitle>
      <p className="mb-4 max-w-2xl text-ink/80">
        Each table has its own QR. Guests scan it, the menu opens for that table, and orders land on the kitchen screen and in Orders.
        Regenerate a code if a printed one goes missing; the old QR stops working immediately.
      </p>

      <Card className="mb-6 print:hidden">
        <form onSubmit={add} className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Label</span>
            <input name="label" required maxLength={20} placeholder="T9" className="min-h-11 w-28 rounded-xl border-2 border-ink/20 bg-white px-3" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Seats</span>
            <input name="seats" type="number" min={1} max={30} defaultValue={4} className="min-h-11 w-24 rounded-xl border-2 border-ink/20 bg-white px-3" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Area</span>
            <select name="area" className="min-h-11 rounded-xl border-2 border-ink/20 bg-white px-2">
              <option value="inside">Inside</option>
              <option value="window">Window</option>
              <option value="terrace">Terrace</option>
              <option value="bar">Bar</option>
            </select>
          </label>
          <Btn type="submit" tone="red">+ Add table</Btn>
          {err && <p className="w-full text-sm font-semibold text-paprika-ink">{err}</p>}
        </form>
      </Card>

      {!data || !origin ? (
        <Empty>Loading…</Empty>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 print:grid-cols-3 print:gap-2">
          {data.map((t) => (
            <TableCard key={t.id} t={t} url={`${origin}/t/${t.qr_token}`} onChanged={reload} />
          ))}
        </div>
      )}
    </>
  );
}

function TableCard({ t, url, onChanged }: { t: Table; url: string; onChanged: () => void }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    QRCode.toDataURL(url, { width: 640, margin: 2, errorCorrectionLevel: "M", color: { dark: "#221a16", light: "#ffffff" } }).then(setSrc);
  }, [url]);

  const update = async (patch: Partial<Table>) => {
    await supabase().from("dining_tables").update(patch).eq("id", t.id);
    onChanged();
  };

  return (
    <Card className={`flex flex-col items-center text-center print:break-inside-avoid print:shadow-none ${t.active ? "" : "opacity-50"}`}>
      <p className="font-[family-name:var(--font-sticker)] text-2xl text-paprika-ink">ROTYI</p>
      <p className="display text-5xl">{t.label}</p>
      <p className="text-sm text-ink/70">
        {t.seats} seats · {t.area}
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element -- generated data URL */}
      {src ? <img src={src} alt={`QR code for table ${t.label}`} className="my-3 aspect-square w-full max-w-[220px] rounded-xl" /> : <div className="my-3 aspect-square w-full max-w-[220px] animate-pulse rounded-xl bg-ink/10" />}
      <p className="text-sm font-bold">Szkenneld és rendelj · Scan to order</p>
      <div className="mt-3 flex w-full flex-wrap justify-center gap-2 print:hidden">
        {src && (
          <a href={src} download={`rotyi-table-${t.label}.png`} className="min-h-11 rounded-full bg-ink px-4 py-2.5 font-[family-name:var(--font-display)] uppercase text-cream">
            PNG
          </a>
        )}
        <a href={url} target="_blank" rel="noopener" className="min-h-11 rounded-full border-2 border-ink px-4 py-2 font-[family-name:var(--font-display)] uppercase">
          Open
        </a>
        <Btn tone="ghost" onClick={() => confirm(`New QR for ${t.label}? The printed one stops working.`) && update({ qr_token: randomToken() })}>
          New code
        </Btn>
        <Btn tone={t.active ? "ghost" : "green"} onClick={() => update({ active: !t.active })}>
          {t.active ? "Disable" : "Enable"}
        </Btn>
      </div>
    </Card>
  );
}
