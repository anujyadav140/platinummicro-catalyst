/**
 * PmCategoryStrip
 * ---------------
 * "Browse by category" — six category tiles on a sunken (ink-100) background.
 *
 * Tiles are derived from `PM_CATEGORIES` in `~/lib/pm-categories` so the
 * homepage, the nav rail, the footer, and the mega menu all stay in sync.
 * Categories flagged `hideFromCategoryStrip` (e.g. the "Bulk pricing" alias)
 * are filtered out automatically.
 *
 * For one-off pages that want to render a different list (e.g. a campaign
 * landing), pass an explicit `tiles` prop.
 */

import Link from 'next/link';
import {
  Server,
  HardDrive,
  Cpu,
  Network,
  Monitor,
  Boxes,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PmSectionHeader } from '~/components/pm-section-header';
import { PM_CATEGORIES, type PmCategory } from '~/lib/pm-categories';

const ICONS: Record<NonNullable<PmCategory['icon']>, LucideIcon> = {
  Server,
  HardDrive,
  Cpu,
  Network,
  Monitor,
  Boxes,
};

/**
 * The tile shape PmCategoryStrip actually renders. Re-exported for callers
 * that want to provide a custom `tiles` prop.
 */
export interface PmCategoryTile {
  key: string;
  label: string;
  count: string;
  href: string;
  icon: NonNullable<PmCategory['icon']>;
}

/**
 * Derive the homepage tiles from PM_CATEGORIES. Filters out:
 *   - entries flagged `hideFromCategoryStrip`
 *   - entries missing `icon` / `count` (incomplete metadata = don't tile it)
 */
function tilesFromCategories(): PmCategoryTile[] {
  return PM_CATEGORIES.filter(
    (c) => !c.hideFromCategoryStrip && c.icon && c.count,
  ).map((c) => ({
    key: c.key,
    label: c.tileLabel ?? c.label,
    count: c.count!,
    href: c.href,
    icon: c.icon!,
  }));
}

const DEFAULT_TILES: PmCategoryTile[] = tilesFromCategories();

export interface PmCategoryStripProps {
  eyebrow?: string;
  title?: string;
  tiles?: PmCategoryTile[];
}

export function PmCategoryStrip({
  eyebrow = 'Catalog',
  title = 'Browse by category',
  tiles = DEFAULT_TILES,
}: PmCategoryStripProps) {
  return (
    <section className="bg-pm-ink-100 py-20">
      <div className="mx-auto max-w-pm-container px-8">
        <PmSectionHeader
          eyebrow={eyebrow}
          title={title}
          linkLabel="View all categories"
          linkHref="/dev/preview/sitemap"
        />

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {tiles.map((tile) => {
            const Icon = ICONS[tile.icon] ?? Server;
            return (
              <Link
                key={tile.key}
                href={tile.href}
                className="group flex flex-col items-center gap-3 rounded-lg border border-pm-ink-200 bg-white px-4 py-6 transition-all duration-[180ms] ease-pm-standard hover:-translate-y-0.5 hover:border-pm-navy-light hover:shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-pm-tan-pale text-pm-navy-deep">
                  <Icon size={26} strokeWidth={1.5} />
                </div>
                <h5 className="text-center text-[13px] font-bold text-pm-ink-900">
                  {tile.label}
                </h5>
                <small className="text-[11px] text-pm-ink-500">
                  {tile.count}
                </small>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
