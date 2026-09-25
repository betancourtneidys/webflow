"use client";

import { useSyncExternalStore } from "react";

// Per-browser record of solved cases. Purely cosmetic: if storage is blocked
// (private mode, previews) everything still works, just without the record.
const KEY = "cloud-detective:solved";

export type SolvedRecord = Record<string, { bestMs: number }>;

let cachedRaw: string | null | undefined;
let cached: SolvedRecord = {};
const listeners = new Set<() => void>();

function read(): SolvedRecord {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    raw = null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cached = raw ? JSON.parse(raw) : {};
    } catch {
      cached = {};
    }
  }
  return cached;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** Records a solve and reports whether it was the first one or a new best. */
export function recordSolve(id: string, ms: number): "first" | "best" | null {
  const current = read();
  const previous = current[id]?.bestMs;
  if (previous !== undefined && ms >= previous) return null;
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...current, [id]: { bestMs: ms } }));
  } catch {
    return null;
  }
  listeners.forEach((l) => l());
  return previous === undefined ? "first" : "best";
}

/** null until hydrated, so server and first client render match. */
export function useSolved(): SolvedRecord | null {
  return useSyncExternalStore(subscribe, read, () => null);
}
