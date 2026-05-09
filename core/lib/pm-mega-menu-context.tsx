'use client';

/**
 * pm-nav-context (was pm-mega-menu-context)
 * ------------------------------------------
 * Carries BC-fetched navigation data (categories + mega menu) from the
 * server-rendered layout down to the client `PmHeader` and friends. We
 * wrap both pieces in a single context so the layout only spawns one
 * provider and consumers don't have to nest hooks.
 *
 * Defaults are empty arrays/objects; consumers should fall back to static
 * code-config (PM_CATEGORIES, PM_MEGA_MENU) when the context is empty
 * (e.g., a route rendered outside the dev/preview layout).
 */

import { createContext, useContext, type ReactNode } from 'react';
import type { PmCategory } from '~/lib/pm-categories';
import type { PmMegaMenu } from '~/lib/pm-mega-menu';

export type PmMegaMenuMap = Record<string, PmMegaMenu>;

interface PmNavValue {
  categories: PmCategory[];
  megaMenu: PmMegaMenuMap;
  /** Read from a cookie server-side so the bar's initial visibility matches
   *  user state on first paint — no flash, no hydration mismatch. */
  topBarDismissed: boolean;
  /** HTML for the navy trust bar (left text), sourced from a BC banner
   *  whose name starts with "Trust". Null when no such banner is active —
   *  the top bar then falls back to its hardcoded copy. */
  trustBarHtml: string | null;
}

const EMPTY: PmNavValue = {
  categories: [],
  megaMenu: {},
  topBarDismissed: false,
  trustBarHtml: null,
};

const PmNavContext = createContext<PmNavValue>(EMPTY);

export function PmNavProvider({
  value,
  children,
}: {
  value: PmNavValue;
  children: ReactNode;
}) {
  return (
    <PmNavContext.Provider value={value}>{children}</PmNavContext.Provider>
  );
}

/** BC-driven top-level categories. Empty array when no provider is up. */
export function usePmCategories(): PmCategory[] {
  return useContext(PmNavContext).categories;
}

/** BC-driven mega-menu map keyed by slug. Empty object when no provider is up. */
export function usePmMegaMenu(): PmMegaMenuMap {
  return useContext(PmNavContext).megaMenu;
}

/** Whether the top promotion bar has been dismissed (read from cookie). */
export function usePmTopBarDismissed(): boolean {
  return useContext(PmNavContext).topBarDismissed;
}

/** BC-driven HTML for the navy trust bar's left text, or null to fall back. */
export function usePmTrustBarHtml(): string | null {
  return useContext(PmNavContext).trustBarHtml;
}
