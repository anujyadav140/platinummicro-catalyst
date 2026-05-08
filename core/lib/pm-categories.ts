/**
 * Top-level navigation categories — SINGLE SOURCE OF TRUTH.
 *
 * Consumers:
 *   - PmHeader (navy nav rail) reads `PM_CATEGORIES`
 *   - PmCategoryStrip (homepage tiles) reads `PM_CATEGORIES` and uses the
 *     per-entry `icon` + `tileLabel` + `count` fields
 *   - PmFooter (Catalog column) reads `PM_CATEGORIES` and filters out
 *     entries flagged `hideFromFooter` (the "Bulk pricing" duplicate)
 *   - Mega menu reads `PM_CATEGORIES` keys → `PM_MEGA_MENU` lookup
 *
 * If you find yourself duplicating this list anywhere else, derive it from
 * here instead.
 */

export interface PmCategory {
  /** Stable key used by mega-menu lookups, footer dedup, analytics */
  key: string;
  /** Title Case label used in nav rails and footer columns */
  label: string;
  /** Route the entry links to */
  href: string;
  /** Optional BC category id once we wire to backend */
  bcCategoryId?: number;

  // ---- Optional metadata read by PmCategoryStrip ---------------------------
  /**
   * Override label specifically for the homepage CategoryStrip tiles.
   * Defaults to `label` if not set. Used so "Bundles" can become
   * "Bundles & kits" on the tile without changing the nav-rail label.
   */
  tileLabel?: string;
  /** Lucide icon name shown in the CategoryStrip tile */
  icon?: 'Server' | 'HardDrive' | 'Network' | 'Cpu' | 'Monitor' | 'Boxes';
  /** Stylized SKU count shown beneath the tile, e.g. "4,200 SKUs" */
  count?: string;

  // ---- Display flags --------------------------------------------------------
  /** Hide from the homepage CategoryStrip (e.g. "Bulk pricing" alias) */
  hideFromCategoryStrip?: boolean;
  /** Hide from the footer Catalog column (e.g. duplicate aliases) */
  hideFromFooter?: boolean;
}

export const PM_CATEGORIES: PmCategory[] = [
  {
    key: 'servers',
    label: 'Servers',
    href: '/dev/preview/category/servers',
    icon: 'Server',
    tileLabel: 'Servers',
    count: '4,200 SKUs',
  },
  {
    key: 'storage',
    label: 'Storage',
    href: '/dev/preview/category/storage',
    icon: 'HardDrive',
    tileLabel: 'Storage',
    count: '12,800 SKUs',
  },
  {
    key: 'networking',
    label: 'Networking',
    href: '/dev/preview/category/networking',
    icon: 'Network',
    tileLabel: 'Networking',
    count: '6,100 SKUs',
  },
  {
    key: 'components',
    label: 'Components',
    href: '/dev/preview/category/components',
    icon: 'Cpu',
    tileLabel: 'Components',
    count: '8,400 SKUs',
  },
  {
    key: 'software',
    label: 'Software',
    href: '/dev/preview/category/software',
    icon: 'Monitor',
    tileLabel: 'Software',
    count: '1,200 SKUs',
  },
  {
    key: 'bundles',
    label: 'Bundles',
    href: '/dev/preview/category/bundles',
    icon: 'Boxes',
    tileLabel: 'Bundles & kits',
    count: '180 SKUs',
  },
  {
    // "Bulk pricing" doesn't have a dedicated route yet — point it at the
    // bundles PLP for now since bulk + bundles are conceptually adjacent.
    // Hidden from CategoryStrip + Footer because it's an alias of bundles
    // and would render a duplicate tile / footer link.
    key: 'bulk',
    label: 'Bulk pricing',
    href: '/dev/preview/category/bundles',
    hideFromCategoryStrip: true,
    hideFromFooter: true,
  },
];
