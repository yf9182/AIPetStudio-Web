/**
 * Remembers which template and upload produced a task.
 *
 * The backend deliberately never returns `input_asset_ids` or the material
 * snapshot on a task, so a "generate again" action cannot be reconstructed from
 * the API. The browser that created the task keeps the pair in sessionStorage
 * instead; when it is absent the UI falls back to picking a template again.
 *
 * `sessionStorage` is an external store, so it is read through
 * `useSyncExternalStore` rather than copied into state from an effect. That
 * keeps server rendering (`null`) and hydration consistent.
 */
import { useSyncExternalStore } from "react";

const KEY = "aipet.generation-source.v1";
const MAX_ENTRIES = 20;
const EVENT = "aipet:generation-source";

export type GenerationSource = { templateId: string; assetId: string };

type Store = Record<string, GenerationSource>;

const EMPTY: Store = {};

// `useSyncExternalStore` compares snapshots with Object.is, so the parsed store
// is memoised on the raw string. Without this every call would return a fresh
// object and React would loop forever.
let cachedRaw: string | null = null;
let cachedStore: Store = EMPTY;

function readStore(): Store {
  if (typeof window === "undefined") return EMPTY;

  let raw: string | null;
  try {
    raw = window.sessionStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }

  if (raw === cachedRaw) return cachedStore;
  cachedRaw = raw;

  try {
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    cachedStore = parsed && typeof parsed === "object" ? (parsed as Store) : EMPTY;
  } catch {
    cachedStore = EMPTY;
  }
  return cachedStore;
}

export function rememberGenerationSource(taskId: string, source: GenerationSource): void {
  if (typeof window === "undefined") return;
  try {
    const store = readStore();
    store[taskId] = source;
    const keys = Object.keys(store);
    // Keep the store small; sessionStorage has a hard size limit.
    for (const key of keys.slice(0, Math.max(0, keys.length - MAX_ENTRIES))) {
      delete store[key];
    }
    window.sessionStorage.setItem(KEY, JSON.stringify(store));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* private mode or quota exceeded — "generate again" simply stays hidden */
  }
}

export function readGenerationSource(taskId: string): GenerationSource | null {
  return readStore()[taskId] ?? null;
}

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Reads the stored source for a task without an effect-driven state copy. */
export function useGenerationSource(taskId: string): GenerationSource | null {
  return useSyncExternalStore(
    subscribe,
    () => readStore()[taskId] ?? null,
    () => null
  );
}
