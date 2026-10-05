"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/browser";

/**
 * Loads data and re-runs the loader whenever any of `tables` changes in
 * Realtime. Simple and always consistent; debounced so bursts refetch once.
 */
export function useLive<T>(loader: () => Promise<T>, tables: string[], key = tables.join(",")) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loaderRef = useRef(loader);
  useEffect(() => {
    loaderRef.current = loader;
  });

  const reload = useCallback(async () => {
    try {
      setData(await loaderRef.current());
      setError(null);
    } catch (e) {
      setError(String((e as Error).message ?? e));
    }
  }, []);

  useEffect(() => {
    reload();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sb = supabase();
    let ch = sb.channel(`live-${key}-${Math.random().toString(36).slice(2)}`);
    for (const table of key.split(",")) {
      ch = ch.on("postgres_changes", { event: "*", schema: "public", table }, () => {
        clearTimeout(timer);
        timer = setTimeout(reload, 250);
      });
    }
    ch.subscribe();
    // Safety net if a websocket event is missed (phone sleeps, flaky wifi).
    const poll = setInterval(() => document.visibilityState === "visible" && reload(), 30_000);
    return () => {
      clearTimeout(timer);
      clearInterval(poll);
      sb.removeChannel(ch);
    };
  }, [key, reload]);

  return { data, error, reload };
}

export async function q<T>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data as T;
}

const tones: Record<string, string> = {
  pending: "bg-mustard text-ink",
  confirmed: "bg-leaf text-white",
  declined: "bg-paprika-ink text-white",
  cancelled: "bg-ink/20 text-ink",
  placed: "bg-mustard text-ink",
  accepted: "bg-sky-700 text-white",
  preparing: "bg-orange-600 text-white",
  ready: "bg-leaf text-white",
  served: "bg-ink text-cream",
  paid: "bg-ink/20 text-ink",
  sent: "bg-leaf text-white",
  failed: "bg-paprika-ink text-white",
  skipped: "bg-ink/20 text-ink",
  queued: "bg-mustard text-ink",
};

export function Badge({ value, label }: { value: string; label?: string }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${tones[value] ?? "bg-ink/10"}`}>{label ?? value}</span>;
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border-2 border-ink bg-cream-soft p-4 shadow-[4px_4px_0_var(--color-ink)] ${className}`}>{children}</div>;
}

export function PageTitle({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <h1 className="display text-5xl text-paprika-ink sm:text-6xl">{title}</h1>
      {children}
    </div>
  );
}

export function Btn({
  tone = "ink",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "ink" | "red" | "green" | "ghost" | "mustard" }) {
  const t = {
    ink: "bg-ink text-cream",
    red: "bg-paprika-ink text-white",
    green: "bg-leaf text-white",
    mustard: "bg-mustard text-ink",
    ghost: "border-2 border-ink bg-transparent text-ink",
  }[tone];
  return (
    <button
      type="button"
      {...props}
      className={`min-h-11 rounded-full px-4 font-[family-name:var(--font-display)] uppercase tracking-wide transition active:scale-95 disabled:opacity-50 ${t} ${className}`}
    />
  );
}

export function ago(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h} h ${m % 60} min ago` : new Date(iso).toLocaleDateString("hu-HU");
}

/** Re-render every `ms` so "x min ago" labels stay fresh. */
export function useTick(ms = 30_000) {
  const [, set] = useState(0);
  useEffect(() => {
    const id = setInterval(() => set((n) => n + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
}

export const huf = (n: number) => `${new Intl.NumberFormat("hu-HU").format(n).replace(/ /g, " ")} Ft`;

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border-2 border-dashed border-ink/25 p-6 text-center text-ink/60">{children}</p>;
}
