'use client';

/**
 * PmFooter
 * --------
 * Site-wide footer on navy-deepest background. 5-column grid:
 *   col 1 — brand block (logo + tagline)
 *   col 2-5 — link sections
 * Bottom: legal row with copyright + legal links.
 *
 * Client component so it can read the BC-fetched category list AND the
 * admin-managed footer-styling config from `PmNavContext` (the same
 * provider the header uses). The shells that mount this component are
 * themselves client; making the footer client keeps the composition
 * simple. Categories flagged `hideFromFooter` are filtered out via the
 * editorial overlay.
 *
 * Falls back to PM_CATEGORIES static when no provider is up (e.g. story-
 * book or a route mounted outside the dev/preview layout). When no
 * footer-styling config is set in BC, the visual defaults below render
 * (matches the previous hardcoded look).
 */

import Link from 'next/link';
import { Image } from '~/components/image';
import { PM_CATEGORIES } from '~/lib/pm-categories';
import {
  usePmCategories,
  usePmFooterConfig,
} from '~/lib/pm-mega-menu-context';

interface PmFooterColumn {
  title: string;
  links: { label: string; href: string }[];
}

const STATIC_COLUMNS: PmFooterColumn[] = [
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

/**
 * Legal-row links shown when the admin hasn't overridden them via
 * `legal_N_label` / `legal_N_href` in the BC footer config. Edits here
 * change the SHIPPED defaults; admins can replace per-deployment.
 */
const DEFAULT_LEGAL_LINKS = [
  { label: 'Privacy', href: '/dev/preview/legal/privacy-policy' },
  { label: 'Terms', href: '/dev/preview/legal/terms-conditions' },
  { label: 'Order verification', href: '/dev/preview/legal/order-verification' },
];

// Visual defaults — used when the admin hasn't overridden them.
const FOOTER_DEFAULTS = {
  bgColor: 'var(--pm-navy-deepest, #050d1c)',
  textColor: 'rgba(255,255,255,0.7)',
  headingColor: 'rgba(255,255,255,0.5)',
  linkColor: 'rgba(255,255,255,0.7)',
  linkHoverColor: 'rgba(255,255,255,1)',
  legalColor: 'rgba(255,255,255,0.45)',
  paddingTop: '64px',
  paddingBottom: '32px',
  borderTop: '1px solid rgba(255,255,255,0.08)',
  logoUrl: '/pm/logo.png',
  logoHeight: '72px',
};

export function PmFooter({
  columns,
  tagline: taglineProp,
  copyright: copyrightProp,
}: PmFooterProps) {
  const fromContext = usePmCategories();
  const adminConfig = usePmFooterConfig();

  // Source-of-truth precedence for columns:
  //   1. explicit `columns` prop (callers that hand-craft footers)
  //   2. ADMIN-managed columns from BC (the new control surface)
  //   3. hardcoded fallback (auto-Catalog + Programs + About)
  //
  // Auto-Catalog column logic:
  //   - included unless adminConfig?.showCatalogColumn === false
  //   - its title is admin-overridable via catalogColumnTitle
  const catalogSource =
    fromContext.length > 0 ? fromContext : PM_CATEGORIES;
  const showCatalog = adminConfig?.showCatalogColumn !== false;
  const catalogColumn: PmFooterColumn | null = showCatalog
    ? {
        title: adminConfig?.catalogColumnTitle ?? 'Catalog',
        links: catalogSource
          .filter((c) => !c.hideFromFooter)
          .map((c) => ({ label: c.label, href: c.href })),
      }
    : null;

  // Build the rest of the columns. Admin columns from BC replace the
  // hardcoded Programs/About when present. Each admin column may also
  // carry its own heading/link color overrides.
  const adminColumns =
    adminConfig?.columns?.map((c) => ({
      title: c.title,
      links: c.links,
      headingColor: c.headingColor,
      linkColor: c.linkColor,
    })) ?? null;

  const resolvedColumns: Array<
    PmFooterColumn & { headingColor?: string; linkColor?: string }
  > =
    columns ??
    [
      ...(catalogColumn ? [catalogColumn] : []),
      ...(adminColumns ?? STATIC_COLUMNS),
    ];

  // Resolve every styled value with the precedence chain:
  //   1. explicit prop (callers that hardcode something)
  //   2. admin BC config (the new control surface)
  //   3. visual defaults (the look that shipped before)
  const tagline =
    taglineProp ??
    adminConfig?.tagline ??
    'Two decades stocking servers, storage, and networking for system integrators, public sector, and healthcare buyers worldwide.';
  const copyright =
    copyrightProp ??
    adminConfig?.copyright ??
    `© ${new Date().getFullYear()} Platinum Micro, Inc. — Southern California`;

  const logoUrl = adminConfig?.logoUrl ?? FOOTER_DEFAULTS.logoUrl;
  const logoHeight = adminConfig?.logoHeight ?? FOOTER_DEFAULTS.logoHeight;
  const textColor = adminConfig?.textColor ?? FOOTER_DEFAULTS.textColor;
  const headingColor = adminConfig?.headingColor ?? FOOTER_DEFAULTS.headingColor;
  const linkColor = adminConfig?.linkColor ?? FOOTER_DEFAULTS.linkColor;
  const linkHoverColor =
    adminConfig?.linkHoverColor ?? FOOTER_DEFAULTS.linkHoverColor;
  const legalColor = adminConfig?.legalColor ?? FOOTER_DEFAULTS.legalColor;
  const paddingTop = adminConfig?.paddingTop ?? FOOTER_DEFAULTS.paddingTop;
  const paddingBottom = adminConfig?.paddingBottom ?? FOOTER_DEFAULTS.paddingBottom;
  const borderTop = adminConfig?.borderTop ?? FOOTER_DEFAULTS.borderTop;

  // Background stack (matches banner pattern):
  // bgColor (bottom) → bgGradient → bgImage → bgOverlay (top) → content
  const bgColor = adminConfig?.bgColor ?? FOOTER_DEFAULTS.bgColor;
  const hasGradient = Boolean(adminConfig?.bgGradient);
  const hasBgImage = Boolean(adminConfig?.bgImageUrl);
  const hasOverlay = Boolean(adminConfig?.bgOverlay);

  // Stable, scoped class names so per-instance CSS variables flow into
  // child link styles (link hover color etc.).
  const instanceId = 'pm-footer';

  return (
    <footer
      className={`relative overflow-hidden ${instanceId}`}
      style={{
        backgroundColor: bgColor,
        color: textColor,
        paddingTop,
        paddingBottom,
        // Expose hover color via CSS variable so the scoped <style>
        // block below can use it without prop-drilling.
        ['--pm-footer-link-hover' as string]: linkHoverColor,
      }}
    >
      {/* Background layers — same approach as PmHeroBanner so admins can
          gradient/image/overlay the footer just like a banner. */}
      {hasGradient && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: adminConfig!.bgGradient }}
        />
      )}
      {hasBgImage && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `url("${adminConfig!.bgImageUrl}")`,
            backgroundSize: adminConfig?.bgImageSize ?? 'cover',
            backgroundPosition: adminConfig?.bgImagePosition ?? 'center',
            backgroundRepeat: adminConfig?.bgImageRepeat ?? 'no-repeat',
          }}
        />
      )}
      {hasOverlay && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: adminConfig!.bgOverlay }}
        />
      )}

      {/* Inline scoped hover style — Tailwind can't generate hover classes
          for arbitrary admin-set colors at build time, so we inject a tiny
          stylesheet keyed to the footer's own class. */}
      <style
        // eslint-disable-next-line react/no-danger -- static literal, no user input
        dangerouslySetInnerHTML={{
          __html: `
            .${instanceId} a { transition: color 180ms ease; }
            .${instanceId} a:hover { color: var(--pm-footer-link-hover) !important; }
          `,
        }}
      />

      <div
        className="relative mx-auto px-8"
        style={{ maxWidth: adminConfig?.maxWidth ?? 'var(--pm-container, 1280px)' }}
      >
        {/* Top row: brand block + link columns. Admin can override the
            grid template via `columns_layout` (any valid CSS grid-template-
            columns value). The total column count is brand-block + N
            resolved columns; admins should match that in `columns_layout`. */}
        <div
          className="grid grid-cols-1 gap-10 md:grid-cols-2"
          style={{
            gridTemplateColumns:
              adminConfig?.columnsLayout?.replace(/_/g, ' ') ??
              `2fr ${resolvedColumns.map(() => '1fr').join(' ')}`,
          }}
        >
          {/* Brand block */}
          <div>
            <span className="mb-3.5 inline-block">
              <Image
                src={logoUrl}
                alt="Platinum Micro"
                width={320}
                height={96}
                sizes="320px"
                style={{ height: logoHeight, width: 'auto', display: 'block' }}
              />
            </span>
            <p
              className="max-w-[280px] text-[13px] leading-[1.55]"
              style={{ color: textColor }}
            >
              {tagline}
            </p>
          </div>

          {/* Link columns — admin can override heading/link colors per
              column (column_N_heading_color / column_N_link_color);
              otherwise they inherit the footer-level colors. */}
          {resolvedColumns.map((col) => (
            <div key={col.title}>
              <h6
                className="mb-3.5 text-[11px] font-bold uppercase tracking-[0.14em]"
                style={{ color: col.headingColor ?? headingColor }}
              >
                {col.title}
              </h6>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <li key={`${col.title}-${link.label}`}>
                    <Link
                      href={link.href}
                      className="text-[14px]"
                      style={{
                        color: col.linkColor ?? linkColor,
                        textDecoration: 'none',
                      }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Legal row — admin-overridable. When the admin sets any
            `legal_N_label`/`legal_N_href` pairs, they REPLACE the
            hardcoded Privacy/Terms/Order-verification trio. Otherwise
            the defaults below render. */}
        <div
          className="mt-12 flex flex-col items-start justify-between gap-3 pt-6 text-xs md:flex-row md:items-center"
          style={{ borderTop, color: legalColor }}
        >
          <span>{copyright}</span>
          <div className="flex flex-wrap gap-5">
            {(adminConfig?.legalLinks ?? DEFAULT_LEGAL_LINKS).map((link) => (
              <Link
                key={`${link.label}-${link.href}`}
                href={link.href}
                style={{ color: legalColor, textDecoration: 'none' }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
