'use client';

/**
 * PmB2BNinjaProvider
 * ==================
 * Headless integration with the B2B Ninja BigCommerce quote app. Loads
 * their storefront script once per page tree, exposes a `usePmB2BNinja`
 * hook that any client component (cart page, drawer, PDP, etc.) can use
 * to push the current cart into their hosted quote modal.
 *
 * Script reference: https://docs.b2bninja.com/storefront-api/reference/
 *
 * Why a provider (not just a script tag): the script attaches a global
 * `window.BN` object asynchronously. Components that want to trigger a
 * quote need to know whether `BN` is ready, otherwise they call into a
 * not-yet-loaded object and crash. The provider tracks readiness in a
 * Context value so consumers can render a fallback while the script
 * boots.
 *
 * Configuration:
 *   - NEXT_PUBLIC_B2B_NINJA_STORE_ID  — issued by B2B Ninja after the
 *     app is installed on the BC channel. When unset, the provider
 *     renders a no-op fallback so dev builds don't depend on the third
 *     party being live.
 *
 * What this does NOT do (yet):
 *   - Customer auth bridge — call `BN.log_in_customer(bcV2Customer)`
 *     when the user signs in elsewhere in the app so B2B Ninja can
 *     show their past quotes. Out of scope for the first cut; the
 *     B2B Ninja form collects contact details inline either way.
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
import Script from 'next/script';

/**
 * Shape B2B Ninja's `add_products_to_quote` expects per product.
 *   - `id`    — BC product entityId (NOT the SKU).
 *   - `qty`   — line quantity.
 *   - `options` — variant selections; we don't use variants today, so this
 *                stays an empty array.
 */
export interface PmB2BNinjaProduct {
  id: number;
  qty: number;
  options?: unknown[];
}

interface PmB2BNinjaContextValue {
  /** True once the BN global has booted and methods are callable. */
  ready: boolean;
  /** Whether the integration is configured at all (env var set). */
  configured: boolean;
  /**
   * Open the quote modal pre-loaded with the given products. Replaces the
   * current B2B Ninja quote (we do not "merge" — the cart drawer is
   * authoritative for what should be in the quote). No-op when the
   * integration isn't configured.
   */
  openQuoteWithProducts: (products: PmB2BNinjaProduct[]) => void;
  /** Open B2B Ninja's "my past quotes" view. */
  openMyQuotes: () => void;
}

declare global {
  interface Window {
    BN?: {
      show_quote: (view: 'quote-view' | 'submitted-quotes') => void;
      add_products_to_quote: (
        products: PmB2BNinjaProduct[],
        merge: boolean,
        showDialog: boolean,
      ) => void;
      log_in_customer: (customer: unknown) => Promise<boolean>;
      log_out_customer: () => Promise<boolean>;
      addEventListener: (event: string, cb: (e: unknown) => void) => void;
    };
  }
}

const PmB2BNinjaContext = createContext<PmB2BNinjaContextValue | null>(null);

export interface PmB2BNinjaProviderProps {
  /**
   * The BC store ID issued by B2B Ninja after the app is installed.
   * Falls back to `process.env.NEXT_PUBLIC_B2B_NINJA_STORE_ID` if not
   * supplied as a prop.
   */
  storeId?: string | null;
  children: ReactNode;
}

export function PmB2BNinjaProvider({
  storeId,
  children,
}: PmB2BNinjaProviderProps) {
  const effectiveStoreId =
    storeId ?? process.env.NEXT_PUBLIC_B2B_NINJA_STORE_ID ?? null;
  const configured = Boolean(effectiveStoreId);
  const [ready, setReady] = useState(false);

  // Sanity-check the global after the Script onLoad in case the BN
  // injection happens slightly after `onLoad` fires (their loader does
  // some async work). Polls a small number of times then gives up.
  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    let tries = 0;
    const tick = () => {
      if (cancelled) return;
      if (typeof window !== 'undefined' && window.BN) {
        setReady(true);
        return;
      }
      if (tries++ < 40) {
        setTimeout(tick, 100);
      }
    };
    tick();
    return () => {
      cancelled = true;
    };
  }, [configured]);

  const openQuoteWithProducts = useCallback(
    (products: PmB2BNinjaProduct[]) => {
      if (typeof window === 'undefined' || !window.BN) {
        // eslint-disable-next-line no-console
        console.warn(
          '[pm-b2b-ninja] BN not ready — ignoring openQuoteWithProducts',
        );
        return;
      }
      // Args per https://docs.b2bninja.com/storefront-api/reference/
      //   products, mergeWithExisting, showDialogAfter
      window.BN.add_products_to_quote(products, false, true);
    },
    [],
  );

  const openMyQuotes = useCallback(() => {
    if (typeof window === 'undefined' || !window.BN) {
      // eslint-disable-next-line no-console
      console.warn('[pm-b2b-ninja] BN not ready — ignoring openMyQuotes');
      return;
    }
    window.BN.show_quote('submitted-quotes');
  }, []);

  const value = useMemo<PmB2BNinjaContextValue>(
    () => ({
      ready,
      configured,
      openQuoteWithProducts,
      openMyQuotes,
    }),
    [ready, configured, openQuoteWithProducts, openMyQuotes],
  );

  return (
    <PmB2BNinjaContext.Provider value={value}>
      {configured && (
        // Strategy "afterInteractive": don't block initial paint with a
        // third-party tag the user may never invoke. The modal opens via
        // a button click, so loading slightly later is fine.
        <Script
          id="pm-b2b-ninja-loader"
          src={`https://cdn.quoteninja.com/storefront/quoteninja-headless.js?storeID=${encodeURIComponent(effectiveStoreId!)}`}
          strategy="afterInteractive"
          onLoad={() => {
            // Try immediately; the useEffect poll above covers slow inits.
            if (typeof window !== 'undefined' && window.BN) {
              setReady(true);
            }
          }}
        />
      )}
      {children}
    </PmB2BNinjaContext.Provider>
  );
}

/**
 * Read access to B2B Ninja's storefront API. Safe to call even when the
 * integration isn't configured — the returned methods are no-ops in
 * that case and `configured` will be false so the caller can render an
 * alternative UI (e.g. an email fallback).
 */
export function usePmB2BNinja(): PmB2BNinjaContextValue {
  const ctx = useContext(PmB2BNinjaContext);
  if (!ctx) {
    throw new Error(
      'usePmB2BNinja must be used inside <PmB2BNinjaProvider>',
    );
  }
  return ctx;
}
