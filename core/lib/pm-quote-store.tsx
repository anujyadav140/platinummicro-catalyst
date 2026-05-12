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

import type { PmCouponValidation } from '~/lib/pm-coupons';

/**
 * localStorage key for cart-line persistence. Bumping the version ('-v1',
 * '-v2' etc) will safely invalidate older shapes if PmBomLine ever changes
 * incompatibly — old data is dropped on read, not migrated.
 */
const STORAGE_KEY = 'pm-quote-v1';

/**
 * Separate localStorage key for the applied coupon so its lifecycle is
 * decoupled from the line items — e.g., clearing the cart doesn't lose
 * the validated coupon, and changing a coupon doesn't rewrite the lines
 * blob.
 */
const COUPON_KEY = 'pm-quote-coupon-v1';

function loadCouponFromStorage(): PmCouponValidation | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(COUPON_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as PmCouponValidation).code === 'string' &&
      (parsed as PmCouponValidation).valid === true
    ) {
      return parsed as PmCouponValidation;
    }
    return null;
  } catch {
    return null;
  }
}

function saveCouponToStorage(coupon: PmCouponValidation | null) {
  if (typeof window === 'undefined') return;
  try {
    if (coupon && coupon.valid) {
      window.localStorage.setItem(COUPON_KEY, JSON.stringify(coupon));
    } else {
      window.localStorage.removeItem(COUPON_KEY);
    }
  } catch {
    // quota / disabled — drop silently
  }
}

/**
 * sessionStorage key for drawer open/closed state.
 *
 * Why session (not local) storage: the open/closed flag should survive
 * intra-tab navigation (so the drawer doesn't blink shut when the user
 * clicks from PDP → category) but NOT survive a browser/tab restart —
 * users coming back tomorrow shouldn't land into an unexpectedly open
 * drawer. sessionStorage clears on tab close, which matches that exactly.
 */
const DRAWER_OPEN_KEY = 'pm-quote-drawer-open-v1';

function loadDrawerOpenFromSession(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(DRAWER_OPEN_KEY) === '1';
  } catch {
    return false;
  }
}

function saveDrawerOpenToSession(isOpen: boolean) {
  if (typeof window === 'undefined') return;
  try {
    if (isOpen) {
      window.sessionStorage.setItem(DRAWER_OPEN_KEY, '1');
    } else {
      window.sessionStorage.removeItem(DRAWER_OPEN_KEY);
    }
  } catch {
    // sessionStorage disabled — non-fatal, drop silently.
  }
}

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

  /**
   * Applied coupon (validated against BC's coupons API). Null when no
   * coupon is applied. Persisted to localStorage so it survives page
   * navigation and is available at checkout-start time for the
   * server-side `applyCheckoutCoupon` mutation.
   */
  appliedCoupon: PmCouponValidation | null;
  setAppliedCoupon: (coupon: PmCouponValidation | null) => void;
}

const PmQuoteContext = createContext<PmQuoteContextValue | null>(null);

export function PmQuoteProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<PmBomLine[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [appliedCoupon, setAppliedCouponState] =
    useState<PmCouponValidation | null>(null);
  // Hydration flag. Until we've read from storage, suppress the
  // persistence effects — otherwise the empty initial state would clobber
  // saved data on the first render right after mount.
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from storage AFTER mount. Doing this in a useEffect (not
  // useState initializer) keeps SSR markup deterministic — the server
  // always emits `[]` + `isOpen=false`, then the client swaps in saved
  // state on hydration. Same pattern PmListsProvider uses; without it,
  // navigating between PreviewShell / CartShell / etc. would reset both
  // the cart contents AND the drawer-open flag because each shell mounts
  // its own PmQuoteProvider instance.
  useEffect(() => {
    setLines(loadFromStorage());
    setIsOpen(loadDrawerOpenFromSession());
    setAppliedCouponState(loadCouponFromStorage());
    setHydrated(true);
  }, []);

  // Persist line changes once hydrated. The guard prevents a write of `[]`
  // on the very first render before the load completes, which would wipe
  // saved cart contents on every page navigation.
  useEffect(() => {
    if (hydrated) saveToStorage(lines);
  }, [lines, hydrated]);

  // Persist drawer open/closed state to sessionStorage. Same hydration
  // guard reasoning — don't overwrite a session-saved `true` with the
  // initial `false` before the load completes.
  useEffect(() => {
    if (hydrated) saveDrawerOpenToSession(isOpen);
  }, [isOpen, hydrated]);

  // Persist applied coupon (localStorage so it survives refresh, same
  // as the cart contents themselves).
  useEffect(() => {
    if (hydrated) saveCouponToStorage(appliedCoupon);
  }, [appliedCoupon, hydrated]);

  const setAppliedCoupon = useCallback(
    (coupon: PmCouponValidation | null) => {
      setAppliedCouponState(coupon);
    },
    [],
  );

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
      appliedCoupon,
      setAppliedCoupon,
    }),
    [
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
      appliedCoupon,
      setAppliedCoupon,
    ],
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
