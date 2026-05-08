'use client';

/**
 * PmProductCard
 * -------------
 * Catalog product tile. Sans-only typography (no mono in subtext) per the
 * design feedback we got during the design package iteration.
 *
 * The entire card surface is a single `<Link>` to the PDP, so clicking
 * anywhere — image, brand, title, SKU, even whitespace — navigates. The
 * Add-to-cart button stops propagation so it dispatches into the quote
 * store instead of triggering navigation.
 *
 * Marked client because the Add button needs `usePmQuote()`.
 */

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { usePmQuote } from '~/lib/pm-quote-store';
import type { PmProduct } from '~/lib/pm-products';

export interface PmProductCardProps {
  product: PmProduct;
}

export function PmProductCard({ product }: PmProductCardProps) {
  const { addLines, open } = usePmQuote();

  const handleAddToCart = (e: React.MouseEvent) => {
    // Stop the click from bubbling up to the parent <Link> (whole-card nav)
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
    <Link
      href={product.href}
      aria-label={`View ${product.name}`}
      className="group flex flex-col gap-2.5 rounded-lg border border-pm-ink-200 bg-white p-4 shadow-sm transition-all duration-[180ms] ease-pm-standard hover:-translate-y-0.5 hover:shadow-md"
    >
      {/* Image */}
      <div className="relative flex h-[160px] items-center justify-center overflow-hidden rounded-md bg-pm-ink-100">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- BC CDN images, no remote-domain config yet
          <img
            src={product.imageUrl}
            alt={product.imageAlt ?? product.name}
            width={160}
            height={160}
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
      </div>

      {/* Brand eyebrow */}
      {product.brand && (
        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-pm-tan">
          {product.brand}
        </div>
      )}

      {/* Title */}
      <h3 className="line-clamp-2 min-h-[38px] text-[14px] font-semibold leading-[1.35] text-pm-ink-900 transition-colors group-hover:text-pm-navy-deep">
        {product.name}
      </h3>

      {/* SKU line — sans, NOT mono per design feedback */}
      <div className="text-[12px] text-pm-ink-400">SKU {product.sku}</div>

      {/* Footer */}
      <div className="mt-1 flex items-center justify-between gap-2 border-t border-pm-ink-200 pt-3">
        <div>
          {product.priceLabel ? (
            <span className="text-[17px] font-bold text-pm-navy-deep">
              {product.priceLabel}
            </span>
          ) : (
            <span className="text-[12px] text-pm-ink-500">Quote pricing</span>
          )}
        </div>
        <button
          type="button"
          onClick={handleAddToCart}
          aria-label={`Add ${product.name} to cart`}
          className="inline-flex items-center gap-1 rounded-md bg-pm-terracotta px-3 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-pm-terracotta-light"
        >
          <Plus size={12} strokeWidth={2.5} />
          Add
        </button>
      </div>
    </Link>
  );
}
