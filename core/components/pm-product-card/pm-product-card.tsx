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
import { Image } from '~/components/image';
import { usePmCompare } from '~/lib/pm-compare-store';
import { usePmQuote } from '~/lib/pm-quote-store';
import type { PmProduct } from '~/lib/pm-products';

export interface PmProductCardProps {
  product: PmProduct;
}

export function PmProductCard({ product }: PmProductCardProps) {
  const { addLines, open } = usePmQuote();
  const { toggle: toggleCompare, isInCompare } = usePmCompare();
  // Use BC entity ID (always unique) for compare lookup — keying by SKU
  // breaks when the catalog has duplicate-SKU listings (both cards then
  // share one toggle state).
  const checked = isInCompare(product.id);

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

  const handleCompareToggle = (e: React.MouseEvent) => {
    // Same propagation kill as Add — the card surface is a <Link>.
    e.preventDefault();
    e.stopPropagation();
    toggleCompare({
      id: product.id,
      sku: product.sku,
      name: product.name,
      imageUrl: product.imageUrl,
      brand: product.brand,
      priceLabel: product.priceLabel,
      href: product.href,
      inStock: product.inStock,
    });
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
          // BC CDN image — uses Catalyst <Image> wrapper which applies
          // `bcCdnImageLoader` to substitute `{:size}` in the BC urlTemplate
          // with the per-device-width param. Sizes hint matches the 4-col
          // grid at desktop (25vw), 3-col tablet (33vw), 2-col mobile (50vw).
          <Image
            src={product.imageUrl}
            alt={product.imageAlt ?? product.name}
            width={500}
            height={500}
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <span className="rounded-sm border border-dashed border-pm-ink-300 bg-white px-2.5 py-1.5 text-[11px] text-pm-ink-400">
            {product.sku}
          </span>
        )}
        {product.sellingFast ? (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full bg-pm-terracotta/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-pm-terracotta">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-pm-terracotta" />
            Selling fast
          </span>
        ) : product.inStock ? (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full bg-pm-success-bg px-2 py-0.5 text-[11px] font-semibold text-pm-success">
            <span className="h-1.5 w-1.5 rounded-full bg-pm-success" />
            In stock
          </span>
        ) : null}
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

      {/* Compare toggle — bottom-left affordance. Uses role=checkbox on a
          <span> wrapper so the parent <Link> doesn't nest interactive
          elements; the actual click handler kills propagation. */}
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={
          checked
            ? `Remove ${product.name} from compare`
            : `Add ${product.name} to compare`
        }
        onClick={handleCompareToggle}
        className="-mt-1 inline-flex w-fit items-center gap-1.5 self-start rounded-sm py-0.5 text-[11px] font-medium text-pm-ink-500 transition-colors hover:text-pm-navy-deep"
      >
        <span
          aria-hidden
          className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-sm border transition-colors ${
            checked
              ? 'border-pm-navy-deep bg-pm-navy-deep text-white'
              : 'border-pm-ink-300 bg-white'
          }`}
        >
          {checked ? (
            <svg
              viewBox="0 0 12 12"
              className="h-2.5 w-2.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="2.5 6.5 5 9 9.5 3.5" />
            </svg>
          ) : null}
        </span>
        Compare
      </button>
    </Link>
  );
}
