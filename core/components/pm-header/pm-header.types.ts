/**
 * PmHeader — main site header.
 *
 * Two rows:
 *   1. White top (84px) — logo, pill search, action buttons
 *   2. Navy bottom (48px) — primary nav rail with mega-menu hooks
 */

import type { PmCategory } from '~/lib/pm-categories';

export interface PmHeaderProps {
  /** Number to show on the Quote/BOM badge. Hidden when 0/undefined. */
  quoteCount?: number;

  /** Categories rendered in the navy nav row. Falls back to PM_CATEGORIES. */
  categories?: PmCategory[];

  /** Callback when the Quick order button is clicked */
  onQuickOrder?: () => void;

  /** Callback when the Quote/BOM button is clicked */
  onOpenQuote?: () => void;

  /**
   * Where to send the search form. Defaults to Catalyst's `/search` route.
   * Form posts as GET with `?q=...`.
   */
  searchAction?: string;

  /** Placeholder text for the search input */
  searchPlaceholder?: string;

  /** Account link target */
  accountHref?: string;

  /** Logo image src — defaults to /pm/logo.png */
  logoSrc?: string;

  /** Where the logo + "home" link points. Defaults to `/`. */
  homeHref?: string;
}
