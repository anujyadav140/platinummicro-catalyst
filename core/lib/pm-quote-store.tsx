'use client';

/**
 * PmQuoteStore
 * ------------
 * Cross-cutting React Context for the BOM/Quote drawer state.
 *
 * Consumers:
 *   - `PmTopBar`'s "Quick order" link → opens the modal (modal is a separate
 *     piece; this store is only for the drawer + line items)
 *   - `PmHeader`'s Quote button → opens the drawer + reads the badge count
 *   - `PmQuickOrderModal`'s "Add to BOM" → pushes rows + opens the drawer
 *   - Future PDP "Add to BOM" buttons → push a single line + open drawer
 *
 * Why Context (not Zustand): keeps the dependency footprint tight, and the
 * state shape is simple. If state grows (line-level edits, optimistic updates,
 * server sync) we swap implementation without changing the consumer surface.
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

/**
 * localStorage key for cart persistence. Bumping the version ('-v1', '-v2'
 * etc) will safely invalidate older shapes if PmBomLine ever changes
 * incompatibly — old data is dropped on read, not migrated.
 */
const STORAGE_KEY = 'pm-quote-v1';

function loadFromStorage(): PmBomLine[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (l): l is PmBomLine =>
        typeof l === 'object' &&
        l !== null &&
        typeof (l as PmBomLine).sku === 'string' &&
        typeof (l as PmBomLine).qty === 'number' &&
        (l as PmBomLine).qty > 0,
    );
  } catch {
    return [];
  }
}

function saveToStorage(lines: PmBomLine[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // quota exceeded / storage disabled — non-fatal, drop silently.
  }
}

export interface PmBomLine {
  /** Stable identifier — usually the SKU/MPN */
  sku: string;
  qty: number;
  /** Display title once we resolve from BC, optional in early stages */
  title?: string;
  /** Optional image URL from BC product data */
  imageUrl?: string;
  /** Display unit price string (e.g. "$8,420") */
  unitPrice?: string;
  /** Optional brand/manufacturer */
  brand?: string;
  /**
   * Whether the line is purchasable RIGHT NOW.
   *
   *   true        — in stock, drawer offers a direct "Checkout" path
   *   false       — out of stock, drawer falls back to "Send for quote"
   *   undefined   — caller didn't say. Treated as IN-STOCK to keep older
   *                 add-to-cart callsites working without changes; UPDATE
   *                 those callsites to pass the real flag as you wire
   *                 them through.
   */
  inStock?: boolean;
  /**
   * BC product entityId (NOT the SKU). Required to push the line into
   * BC's actual cart at checkout-start time — BC's GraphQL `createCart`
   * mutation keys on entityId, not SKU. PmProduct surfaces this as `id`.
   *
   * Optional because Quick Order (SKU-paste) callsites can't resolve an
   * entityId without an extra BC roundtrip. Lines missing this field
   * fall back to the "Send for quote" path even when in stock.
   */
  productEntityId?: number;
}

interface PmQuoteContextValue {
  /** Current BOM lines, in insertion order */
  lines: PmBomLine[];

  /** Total quantity across all lines */
  totalUnits: number;

  /** Drawer visibility */
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;

  /** Push one or many lines. Same SKU is merged (qty added) rather than duplicated. */
  addLines: (lines: PmBomLine[]) => void;

  /** Remove a single line by SKU */
  removeLine: (sku: string) => void;

  /** Set qty on an existing line (clamps to 1+) */
  setQty: (sku: string, qty: number) => void;

  /** Empty the BOM */
  clear: () => void;
}

const PmQuoteContext = createContext<PmQuoteContextValue | null>(null);

export function PmQuoteProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<PmBomLine[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  // Hydration flag. Until we've read from localStorage, suppress the
  // persistence effect — otherwise the empty initial state would clobber
  // saved data on the first render right after mount.
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage AFTER mount. Doing this in a useEffect (not
  // useState initializer) keeps SSR markup deterministic — the server
  // always emits `[]`, then the client swaps in saved lines on hydration.
  // This is the same pattern PmListsProvider uses; without it, navigating
  // between PreviewShell / CartShell / etc. would reset the cart because
  // each shell mounts its own PmQuoteProvider instance.
  useEffect(() => {
    setLines(loadFromStorage());
    setHydrated(true);
  }, []);

  // Persist every change once hydrated. The guard prevents a write of `[]`
  // on the very first render before the load completes, which would wipe
  // saved cart contents on every page navigation.
  useEffect(() => {
    if (hydrated) saveToStorage(lines);
  }, [lines, hydrated]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  const addLines = useCallback((incoming: PmBomLine[]) => {
    setLines((current) => {
      const map = new Map(current.map((l) => [l.sku, l]));
      for (const line of incoming) {
        const key = line.sku.trim();
        if (!key) continue;
        const existing = map.get(key);
        if (existing) {
          map.set(key, {
            ...existing,
            ...line,
            qty: existing.qty + (Number(line.qty) || 0),
          });
        } else {
          map.set(key, { ...line, sku: key, qty: Math.max(1, Number(line.qty) || 1) });
        }
      }
      return Array.from(map.values());
    });
  }, []);

  const removeLine = useCallback((sku: string) => {
    setLines((current) => current.filter((l) => l.sku !== sku));
  }, []);

  const setQty = useCallback((sku: string, qty: number) => {
    const clamped = Math.max(1, Math.floor(Number(qty) || 1));
    setLines((current) =>
      current.map((l) => (l.sku === sku ? { ...l, qty: clamped } : l)),
    );
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const totalUnits = useMemo(
    () => lines.reduce((sum, l) => sum + l.qty, 0),
    [lines],
  );

  const value = useMemo<PmQuoteContextValue>(
    () => ({
      lines,
      totalUnits,
      isOpen,
      open,
      close,
      toggle,
      addLines,
      removeLine,
      setQty,
      clear,
    }),
    [lines, totalUnits, isOpen, open, close, toggle, addLines, removeLine, setQty, clear],
  );

  return <PmQuoteContext.Provider value={value}>{children}</PmQuoteContext.Provider>;
}

/**
 * Read/write hook for the BOM/Quote drawer.
 * Throws if called outside `<PmQuoteProvider>` — that's a programming error.
 */
export function usePmQuote(): PmQuoteContextValue {
  const ctx = useContext(PmQuoteContext);
  if (!ctx) {
    throw new Error('usePmQuote must be used inside <PmQuoteProvider>');
  }
  return ctx;
}
