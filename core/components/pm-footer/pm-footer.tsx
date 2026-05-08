/**
 * PmFooter
 * --------
 * Site-wide footer on navy-deepest background. 5-column grid:
 *   col 1 — brand block (logo + tagline)
 *   col 2-5 — link sections
 * Bottom: legal row with copyright + legal links.
 *
 * The Catalog column is derived from `PM_CATEGORIES` so it stays in sync
 * with the nav rail and the homepage CategoryStrip — see pm-categories.ts.
 * Categories flagged `hideFromFooter` are filtered out (e.g. the
 * "Bulk pricing" alias).
 */

import Link from 'next/link';
import { PM_CATEGORIES } from '~/lib/pm-categories';

interface PmFooterColumn {
  title: string;
  links: { label: string; href: string }[];
}

// Catalog column links are derived from PM_CATEGORIES — single source of
// truth shared with the nav rail and homepage CategoryStrip.
const CATALOG_LINKS = PM_CATEGORIES.filter((c) => !c.hideFromFooter).map(
  (c) => ({ label: c.label, href: c.href }),
);

const DEFAULT_COLUMNS: PmFooterColumn[] = [
  {
    title: 'Catalog',
    links: CATALOG_LINKS,
  },
  {
    title: 'Programs',
    links: [
      { label: 'Bulk pricing', href: '/dev/preview/category/bundles' },
      { label: 'Bundles', href: '/dev/preview/category/bundles' },
      // TODO(prod): wire to real /quote, /contracts/omnia, /contracts/naspo routes when they exist.
      { label: 'Request a quote', href: '#' },
      { label: 'OMNIA Partners', href: '#' },
      { label: 'NASPO ValuePoint', href: '#' },
    ],
  },
  {
    title: 'About',
    links: [
      { label: 'About Us', href: '/dev/preview/about' },
      { label: 'Authorized brands', href: '/dev/preview/brands' },
      { label: 'Contact Us', href: '/dev/preview/contact' },
      { label: 'Shipping & Returns', href: '/dev/preview/shipping-returns' },
      { label: 'Site Map', href: '/dev/preview/sitemap' },
      { label: 'Social Responsibility', href: '/dev/preview/social-responsibility' },
    ],
  },
];

export interface PmFooterProps {
  columns?: PmFooterColumn[];
  tagline?: string;
  copyright?: string;
}

export function PmFooter({
  columns = DEFAULT_COLUMNS,
  tagline = 'Two decades stocking servers, storage, and networking for system integrators, public sector, and healthcare buyers worldwide.',
  copyright = `© ${new Date().getFullYear()} Platinum Micro, Inc. — Southern California`,
}: PmFooterProps) {
  return (
    <footer className="bg-pm-navy-deepest pb-8 pt-16 text-white/70">
      <div className="mx-auto max-w-pm-container px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1.2fr]">
          {/* Brand block */}
          <div>
            <span className="mb-3.5 inline-block rounded-md bg-white px-2.5 py-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/pm/logo.png"
                alt="Platinum Micro"
                width="100"
                height="32"
                className="block h-8 w-auto"
              />
            </span>
            <p className="max-w-[280px] text-[13px] leading-[1.55] text-white/60">
              {tagline}
            </p>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <h6 className="mb-3.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white/50">
                {col.title}
              </h6>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <li key={`${col.title}-${link.label}`}>
                    <Link
                      href={link.href}
                      className="text-[14px] transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Legal */}
        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-white/[0.08] pt-6 text-xs text-white/45 md:flex-row md:items-center">
          <span>{copyright}</span>
          <div className="flex gap-5">
            <Link href="/dev/preview/legal/privacy-policy" className="transition-colors hover:text-white/70">
              Privacy
            </Link>
            <Link href="/dev/preview/legal/terms-conditions" className="transition-colors hover:text-white/70">
              Terms
            </Link>
            <Link href="/dev/preview/legal/order-verification" className="transition-colors hover:text-white/70">
              Order verification
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
