"use client";

import { useSyncExternalStore } from "react";

// Fetches /api/status once per page load and shares it between components.
type Status = { openAllDayDate: string | null; orderingOpen: boolean };
let status: Status | null = null;
let started = false;
const listeners = new Set<() => void>();

function load() {
  if (started) return;
  started = true;
  fetch("/api/status")
    .then((r) => r.json())
    .then((s: Status) => {
      status = s;
      listeners.forEach((l) => l());
    })
    .catch(() => {});
}

function subscribe(l: () => void) {
  listeners.add(l);
  load();
  return () => listeners.delete(l);
}

/** Budapest date the venue is open 24h (admin override), or null. */
export function useOpenAllDayDate(): string | null {
  return useSyncExternalStore(subscribe, () => status?.openAllDayDate ?? null, () => null);
}
