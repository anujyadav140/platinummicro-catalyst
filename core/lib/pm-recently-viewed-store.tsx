'use client';

/**
 * pm-recently-viewed-store
 * ------------------------
 * Tracks the products the user has opened. Backed by localStorage under
 * `pm-recently-viewed-v1`. Mirrors the API of pm-lists-store.tsx — same
 * hydration guard, same atomic state updates.
 *
 * Behavior:
 *   - `trackView()` is called from PmProductDetail's mount effect.
 *   - Items dedupe by SKU. Re-viewing a product moves it back to the top
 *     of the list (most-recent first).
 *   - Capped at MAX_ITEMS (24) so storage doesn't grow unbounded.
 *   - `clear()` empties the store; `removeItem(sku)` removes one entry.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const STORAGE_KEY = 'pm-recently-viewed-v1';
const MAX_ITEMS = 24;

export interface PmRecentlyViewedItem {
  sku: string;
  title: string;
  href: string;
  imageUrl?: string;
  brand?: string;
  priceLabel?: string;
  inStock: boolean;
  /** ms timestamp the product was last viewed */
  viewedAt: number;
}

interface PmRecentlyViewedState {
  items: PmRecentlyViewedItem[];
  ready: boolean;
  count: number;
  trackView: (item: Omit<PmRecentlyViewedItem, 'viewedAt'>) => void;
  removeItem: (sku: string) => void;
  clear: () => void;
}

const PmRecentlyViewedContext = createContext<PmRecentlyViewedState | null>(
  null,
);

function loadFromStorage(): PmRecentlyViewedItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (i): i is PmRecentlyViewedItem =>
          i != null &&
          typeof i === 'object' &&
          typeof (i as PmRecentlyViewedItem).sku === 'string' &&
          typeof (i as PmRecentlyViewedItem).title === 'string' &&
          typeof (i as PmRecentlyViewedItem).viewedAt === 'number',
      )
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

function saveToStorage(items: PmRecentlyViewedItem[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // quota exceeded — non-fatal
  }
}

export function PmRecentlyViewedProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<PmRecentlyViewedItem[]>([]);
  const [ready, setReady] = useState(false);

  // Hydrate from localStorage. CRITICAL: use a functional updater that
  // MERGES with `current` instead of replacing it.
  //
  // Why: the PDP's PmProductDetail calls `trackView()` from its own
  // useEffect, which fires BEFORE the provider's hydration effect (React
  // runs child effects before parent effects). If we used
  // `setItems(loadFromStorage())` here, the load would overwrite the
  // trackView call queued moments earlier on the same render cycle, and
  // every PDP visit would be silently lost.
  //
  // With the functional merge: if `current` has items, those are
  // already-tracked PDPs we want to keep. Loaded items get appended,
  // de-duped by SKU so we don't end up with two entries for the same
  // product.
  useEffect(() => {
    setItems((current) => {
      const loaded = loadFromStorage();
      if (current.length === 0) return loaded;
      const seen = new Set(current.map((i) => i.sku));
      const merged = [...current, ...loaded.filter((l) => !seen.has(l.sku))];
      return merged.slice(0, MAX_ITEMS);
    });
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) saveToStorage(items);
  }, [items, ready]);

  const trackView = useCallback(
    (item: Omit<PmRecentlyViewedItem, 'viewedAt'>) => {
      setItems((prev) => {
        const now = Date.now();
        const filtered = prev.filter((i) => i.sku !== item.sku);
        const next = [{ ...item, viewedAt: now }, ...filtered];
        return next.slice(0, MAX_ITEMS);
      });
    },
    [],
  );

  const removeItem = useCallback((sku: string) => {
    setItems((prev) => prev.filter((i) => i.sku !== sku));
  }, []);

  const clear = useCallback(() => {
    setItems([]);
  }, []);

  const value = useMemo<PmRecentlyViewedState>(
    () => ({
      items,
      ready,
      count: items.length,
      trackView,
      removeItem,
      clear,
    }),
    [items, ready, trackView, removeItem, clear],
  );

  return (
    <PmRecentlyViewedContext.Provider value={value}>
      {children}
    </PmRecentlyViewedContext.Provider>
  );
}

export function usePmRecentlyViewed(): PmRecentlyViewedState {
  const ctx = useContext(PmRecentlyViewedContext);
  if (!ctx) {
    throw new Error(
      'usePmRecentlyViewed must be used within <PmRecentlyViewedProvider>',
    );
  }
  return ctx;
}
