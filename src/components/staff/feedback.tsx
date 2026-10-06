"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/browser";
import { ago, Btn, Card, Empty, PageTitle, q, useLive, useTick } from "./ui";

type Feedback = { id: string; rating: number; comment: string | null; table_label: string | null; locale: string; created_at: string; orders: { number: number; total: number } | null };

const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

export function AdminFeedback() {
  useTick();
  const [range, setRange] = useState<7 | 30 | 365>(30);
  const { data, reload } = useLive(
    async () => {
      const since = new Date(Date.now() - range * 86_400_000).toISOString();
      const [rows, settings] = await Promise.all([
        q<Feedback[]>(supabase().from("order_feedback").select("id, rating, comment, table_label, locale, created_at, orders(number, total)").gte("created_at", since).order("created_at", { ascending: false })),
        q<{ google_review_url: string | null }>(supabase().from("settings").select("google_review_url").single()),
      ]);
      return { rows, reviewUrl: settings.google_review_url };
    },
    ["order_feedback", "settings"],
    `feedback:${range}`,
  );

  const rows = data?.rows ?? [];
  const avg = rows.length ? rows.reduce((s, r) => s + r.rating, 0) / rows.length : 0;
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, count: rows.filter((r) => r.rating === n).length }));

  return (
    <>
      <PageTitle title="Feedback">
        <div className="flex gap-2">
          {([7, 30, 365] as const).map((r) => (
            <Btn key={r} tone={range === r ? "ink" : "ghost"} onClick={() => setRange(r)}>
              {r === 365 ? "Year" : `${r} days`}
            </Btn>
          ))}
        </div>
      </PageTitle>
      <p className="mb-5 max-w-2xl text-ink/80">
        After paying, every guest can rate their visit privately, and every guest also sees the Google review button, whatever they rated. Google doesn&apos;t allow showing it only to happy guests.
      </p>

      {data && <ReviewLink current={data.reviewUrl} onSaved={reload} />}

      <div className="mb-6 grid gap-4 md:grid-cols-[auto_1fr]">
        <Card className="text-center md:min-w-56">
          <p className="display text-6xl">{rows.length ? avg.toFixed(1) : "–"}</p>
          <p className="text-2xl text-mustard [text-shadow:0_1px_0_var(--color-ink)]">{rows.length ? stars(Math.round(avg)) : "☆☆☆☆☆"}</p>
          <p className="text-sm font-bold uppercase tracking-wide text-ink/70">
            {rows.length} {rows.length === 1 ? "rating" : "ratings"}
          </p>
        </Card>
        <Card>
          <ul className="space-y-1.5">
            {dist.map(({ n, count }) => (
              <li key={n} className="grid grid-cols-[3rem_1fr_2.5rem] items-center gap-3">
                <span className="font-bold tabular-nums">{n} ★</span>
                <span className="h-3 overflow-hidden rounded-full bg-ink/10">
                  <span className={`block h-full rounded-full ${n <= 2 ? "bg-paprika" : n === 3 ? "bg-mustard" : "bg-leaf"}`} style={{ width: `${rows.length ? (count / rows.length) * 100 : 0}%` }} />
                </span>
                <span className="text-right tabular-nums">{count}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {!data ? (
        <Empty>Loading…</Empty>
      ) : rows.length === 0 ? (
        <Empty>No ratings yet. They appear here the moment a guest rates their visit after paying.</Empty>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => (
            <Card key={r.id} className={r.rating <= 2 ? "ring-4 ring-paprika/60" : ""}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-2xl leading-none text-mustard [text-shadow:0_1px_0_var(--color-ink)]" aria-label={`${r.rating} of 5`}>
                  {stars(r.rating)}
                </p>
                <span className="text-xs text-ink/60">{ago(r.created_at)}</span>
              </div>
              <p className="mt-2 text-lg">{r.comment ? `“${r.comment}”` : <span className="text-ink/50">No comment</span>}</p>
              <p className="mt-2 text-sm text-ink/60">
                Table {r.table_label ?? "—"}
                {r.orders ? ` · order #${r.orders.number}` : ""} · {r.locale.toUpperCase()}
              </p>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function ReviewLink({ current, onSaved }: { current: string | null; onSaved: () => void }) {
  const [value, setValue] = useState(current ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <Card className="mb-6">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const url = value.trim();
          if (url && !/^https:\/\//.test(url)) return setMsg("The link must start with https://");
          const { error } = await supabase().from("settings").update({ google_review_url: url || null, updated_at: new Date().toISOString() }).eq("id", true);
          setMsg(error ? error.message : url ? "Saved ✓ Guests now see your Google review page." : "Cleared. Guests see a demo note instead.");
          onSaved();
        }}
      >
        <label className="block min-w-0 flex-1" htmlFor="review-url">
          <span className="mb-1 block text-sm font-semibold">Google review link</span>
          <input
            id="review-url"
            type="url"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="https://g.page/r/…/review"
            className="min-h-11 w-full rounded-xl border-2 border-ink/20 bg-white px-3"
          />
          <span className="mt-1 block text-xs text-ink/60">
            Google Business Profile → Ask for reviews → copy the link. Empty = demo mode.
          </span>
        </label>
        <Btn type="submit" tone="red">
          Save
        </Btn>
        {msg && (
          <p className="w-full text-sm font-semibold" role="status">
            {msg}
          </p>
        )}
      </form>
    </Card>
  );
}
