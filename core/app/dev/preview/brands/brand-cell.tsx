'use client';

/**
 * Static brand cell for the /dev/preview/brands directory grid.
 * Mirrors the visual language of pm-brand-wall's BrandCell — favicon image
 * with an onError handler that swaps in a typeset wordmark fallback when
 * the favicon URL 404s. Marked 'use client' because onError runs only on
 * the client side.
 */

import Link from 'next/link';
import type { PmBrand } from '~/lib/pm-brands';

export function BrandCell({ brand }: { brand: PmBrand }) {
  const baseClasses =
    'group flex aspect-[2/1] items-center justify-center rounded-md border border-pm-ink-200 bg-white px-3 py-4 transition-transform duration-pm-base ease-pm-standard hover:scale-105 hover:border-pm-terracotta';

  const inner = brand.logoSrc ? (
    // eslint-disable-next-line @next/next/no-img-element -- external CDN
    <img
      src={brand.logoSrc}
      alt={brand.name}
      loading="lazy"
      draggable={false}
      className="h-10 w-auto max-w-full object-contain opacity-90 transition-opacity duration-pm-base group-hover:opacity-100"
      onError={(e) => {
        const img = e.currentTarget;
        const fallback = document.createElement('span');
        fallback.className =
          'text-[14px] font-bold tracking-[0.04em] text-pm-ink-700 transition-colors group-hover:text-pm-navy-deep';
        fallback.textContent = brand.name;
        img.replaceWith(fallback);
      }}
    />
  ) : (
    <span className="text-[14px] font-bold tracking-[0.04em] text-pm-ink-700 transition-colors group-hover:text-pm-navy-deep">
      {brand.name}
    </span>
  );

  return brand.href ? (
    <Link href={brand.href} aria-label={brand.name} className={baseClasses}>
      {inner}
    </Link>
  ) : (
    <div aria-label={brand.name} className={baseClasses}>
      {inner}
    </div>
  );
}
