'use client';

/**
 * PmProductRow
 * ------------
 * Horizontal list-view variant of PmProductCard. Same data shape,
 * different layout:
 *   [image 160x160] [brand eyebrow + title + SKU + meta] [price + Add to BOM]
 *
 * Used by <PmCategoryListing> when the URL has `?view=list`. Reuses the same
 * usePmQuote() dispatch pattern as PmProductCard.
 */

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { usePmQuote } from '~/lib/pm-quote-store';
import type { PmProductRowProps } from './pm-product-row.types';

export function PmProductRow({ product }: PmProductRowProps) {
  const { addLines, open } = usePmQuote();

  const handleAddToBom = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addLines([
      {
        sku: product.sku,
        qty: 1,
        title: product.name,
        imageUrl: product.imageUrl,
        unitPrice: product.priceLabel,
        brand: product.brand,
      },
    ]);
    open();
  };

  return (
    <article className="group flex gap-5 rounded-lg border border-pm-ink-200 bg-white p-4 shadow-sm transition-all duration-[180ms] ease-pm-standard hover:-translate-y-0.5 hover:shadow-md">
      {/* Image */}
      <Link
        href={product.href}
        aria-label={product.name}
        className="relative flex h-[160px] w-[160px] flex-shrink-0 items-center justify-center overflow-hidden rounded-md bg-pm-ink-100"
      >
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- BC CDN images, no remote-domain config yet
          <img
            src={product.imageUrl}
            alt={product.imageAlt ?? product.name}
            className="max-h-full max-w-full object-contain"
            loading="lazy"
          />
        ) : (
          <span className="rounded-sm border border-dashed border-pm-ink-300 bg-white px-2.5 py-1.5 text-[11px] text-pm-ink-400">
            {product.sku}
          </span>
        )}
        {product.inStock && (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full bg-pm-success-bg px-2 py-0.5 text-[11px] font-semibold text-pm-success">
            <span className="h-1.5 w-1.5 rounded-full bg-pm-success" />
            In stock
          </span>
        )}
      </Link>

      {/* Middle column — brand / title / SKU / meta */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {product.brand && (
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-pm-tan">
            {product.brand}
          </div>
        )}

        <Link href={product.href} className="block">
          <h3 className="line-clamp-2 text-[18px] font-bold leading-[1.25] tracking-tight text-pm-ink-900 transition-colors group-hover:text-pm-navy-deep">
            {product.name}
          </h3>
        </Link>

        <div className="text-[12px] font-medium text-pm-ink-500">
          SKU {product.sku}
        </div>

        <div className="mt-auto flex items-center gap-3 pt-1 text-[12px] font-medium text-pm-ink-500">
          {product.inStock ? (
            <span className="text-pm-success">Available now</span>
          ) : (
            <span>Available on backorder</span>
          )}
        </div>
      </div>

      {/* Right column — price + add */}
      <div className="flex min-w-[180px] flex-shrink-0 flex-col items-end justify-between gap-3 border-l border-pm-ink-200 pl-5">
        <div className="text-right">
          {product.priceLabel ? (
            <span className="text-[20px] font-bold text-pm-navy-deep">
              {product.priceLabel}
            </span>
          ) : (
            <span className="text-[14px] font-medium text-pm-ink-500">
              Quote pricing
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleAddToBom}
          aria-label={`Add ${product.name} to cart`}
          className="inline-flex items-center gap-1.5 rounded-md bg-pm-terracotta px-3 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-pm-terracotta-light"
        >
          <Plus size={14} strokeWidth={2.5} />
          Add to BOM
        </button>
      </div>
    </article>
  );
}
