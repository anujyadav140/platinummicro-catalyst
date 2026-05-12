'use client';

/**
 * pm-compare-store
 * ----------------
 * Client-side state for the product-comparison feature. Users toggle
 * products from the catalog into a small "compare list" via a checkbox
 * on each card/row; the list is rendered as a fixed bottom bar and
 * powers the side-by-side comparison page at /dev/preview/compare/.
 *
 * Persists to localStorage under `pm-compare-v1` so the selection
 * survives navigation + refresh. Like `pm-lists-store`, we hydrate in
 * a `useEffect` after mount so SSR markup doesn't depend on browser
 * state.
 *
 * Cap is 4 products — anything beyond that triggers an "overflow"
 * flag that consuming components can read for inline feedback (a
 * shake / "Max 4 products" toast). The flag auto-clears after a
 * short window so the same nudge can fire again on the next attempt.
 *
 * Shape mirrors what pm-product-card / pm-product-row already pass
 * to PmQuoteStore and PmListsStore (sku, name, imageUrl, brand,
 * priceLabel, href, inStock) so the call site is a one-liner.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

// Bumped from v1 → v2 when the dedupe key switched from `sku` to `id`.
// Old v1 entries deserialize fine (they're missing `id`) but get filtered
// out by the safer loader below; users start with a fresh compare list.
const STORAGE_KEY = 'pm-compare-v2';
const MAX_ITEMS = 4;
/** How long the "tried to add a 5th" flag stays truthy, ms. */
const OVERFLOW_FLAG_MS = 1200;

export interface PmCompareItem {
  /**
   * BC product entity ID — the TRUE unique key, even across products that
   * happen to share a SKU. Was historically `sku` but that broke when the
   * catalog had duplicate-SKU listings (clicking one card toggled both).
   * Carry the SKU as a separate display field; never use it as a dedupe key.
   */
  id: number;
  /** Product SKU — display only (NOT the dedupe key). */
  sku: string;
  /** Display name */
  name: string;
  /** Hero thumbnail */
  imageUrl?: string;
  /** Brand/manufacturer */
  brand?: string;
  /** Display price string (e.g. "$8,420") */
  priceLabel?: string;
  /** PDP path */
  href?: string;
  /** Whether inventory is available now */
  inStock?: boolean;
}

interface PmCompareContextValue {
  /** Current compare items, in insertion order. Empty until hydrated. */
  items: PmCompareItem[];
  /** False until localStorage hydration completes — guards SSR/CSR mismatch. */
  ready: boolean;
  /** Hard cap. Exposed so callers don't hardcode the number. */
  MAX: number;
  /** Briefly truthy when the user tried to add past the cap. */
  overflowed: boolean;

  add: (item: PmCompareItem) => void;
  remove: (id: number) => void;
  toggle: (item: PmCompareItem) => void;
  clear: () => void;
  isInCompare: (id: number) => boolean;
}

const PmCompareContext = createContext<PmCompareContextValue | null>(null);

function loadFromStorage(): PmCompareItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (i): i is PmCompareItem =>
          i != null &&
          typeof i === 'object' &&
          typeof (i as PmCompareItem).id === 'number' &&
          typeof (i as PmCompareItem).sku === 'string' &&
          typeof (i as PmCompareItem).name === 'string',
      )
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

function saveToStorage(items: PmCompareItem[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // quota exceeded or storage disabled — non-fatal
  }
}

export function PmCompareProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<PmCompareItem[]>([]);
  const [ready, setReady] = useState(false);
  const [overflowed, setOverflowed] = useState(false);
  const overflowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate from localStorage after mount.
  useEffect(() => {
    setItems(loadFromStorage());
    setReady(true);
  }, []);

  // Persist after every change once hydrated.
  useEffect(() => {
    if (ready) saveToStorage(items);
  }, [items, ready]);

  // Cleanup the overflow timer on unmount so we don't fire setState
  // on an unmounted provider during navigation.
  useEffect(() => {
    return () => {
      if (overflowTimerRef.current) {
        clearTimeout(overflowTimerRef.current);
      }
    };
  }, []);

  const flagOverflow = useCallback(() => {
    setOverflowed(true);
    if (overflowTimerRef.current) {
      clearTimeout(overflowTimerRef.current);
    }
    overflowTimerRef.current = setTimeout(() => {
      setOverflowed(false);
      overflowTimerRef.current = null;
    }, OVERFLOW_FLAG_MS);
  }, []);

  // Dedupe key is the BC entity ID — guaranteed unique even when the
  // catalog has duplicate-SKU listings (which previously caused two
  // cards to share a single toggle state).
  const isInCompare = useCallback(
    (id: number) => items.some((i) => i.id === id),
    [items],
  );

  const add = useCallback(
    (item: PmCompareItem) => {
      if (typeof item.id !== 'number') return;
      setItems((prev) => {
        if (prev.some((i) => i.id === item.id)) return prev;
        if (prev.length >= MAX_ITEMS) {
          flagOverflow();
          return prev;
        }
        return [...prev, item];
      });
    },
    [flagOverflow],
  );

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const toggle = useCallback(
    (item: PmCompareItem) => {
      if (typeof item.id !== 'number') return;
      setItems((prev) => {
        const existing = prev.some((i) => i.id === item.id);
        if (existing) return prev.filter((i) => i.id !== item.id);
        if (prev.length >= MAX_ITEMS) {
          flagOverflow();
          return prev;
        }
        return [...prev, item];
      });
    },
    [flagOverflow],
  );

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<PmCompareContextValue>(
    () => ({
      items,
      ready,
      MAX: MAX_ITEMS,
      overflowed,
      add,
      remove,
      toggle,
      clear,
      isInCompare,
    }),
    [items, ready, overflowed, add, remove, toggle, clear, isInCompare],
  );

  return (
    <PmCompareContext.Provider value={value}>
      {children}
    </PmCompareContext.Provider>
  );
}

/**
 * Read/write hook for the compare list.
 * Throws if used outside `<PmCompareProvider>` — programming error.
 */
export function usePmCompare(): PmCompareContextValue {
  const ctx = useContext(PmCompareContext);
  if (!ctx) {
    throw new Error('usePmCompare must be used inside <PmCompareProvider>');
  }
  return ctx;
}
