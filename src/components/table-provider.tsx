"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

// CRAV's cart, adapted: guests "add dishes to their table" instead of paying.
// Picked dishes travel into the booking note so the kitchen knows what's coming.

type TableState = {
  items: string[];
  add: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  toast: string | null;
};

const TableContext = createContext<TableState | null>(null);
const KEY = "rotyi.table";

// Picked dishes live in localStorage; this tiny store lets React read them
// without a hydration mismatch (server snapshot is always empty).
const EMPTY: string[] = [];
const listeners = new Set<() => void>();
let cache: string[] | null = null;

function readItems(): string[] {
  if (cache) return cache;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    cache = Array.isArray(saved) ? saved.filter((v): v is string => typeof v === "string") : [];
  } catch {
    cache = [];
  }
  return cache;
}

function writeItems(next: string[]) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function TableProvider({ children }: { children: React.ReactNode }) {
  const items = useSyncExternalStore(subscribe, readItems, () => EMPTY);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const add = useCallback((id: string) => {
    const prev = readItems();
    if (!prev.includes(id)) writeItems([...prev, id]);
    setToast(id);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  const remove = useCallback((id: string) => writeItems(readItems().filter((v) => v !== id)), []);
  const clear = useCallback(() => writeItems([]), []);

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
  }, [open]);

  const value = useMemo(() => ({ items, add, remove, clear, open, setOpen, toast }), [items, add, remove, clear, open, toast]);
  return <TableContext.Provider value={value}>{children}</TableContext.Provider>;
}

export function useTable() {
  const ctx = useContext(TableContext);
  if (!ctx) throw new Error("useTable must be used inside TableProvider");
  return ctx;
}
