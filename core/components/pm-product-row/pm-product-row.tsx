'use client';

/**
 * PmProductRow
 * ------------
 * Horizontal list-view variant of PmProductCard. Same data shape,
 * different layout:
 *   [image 160x160] [brand eyebrow + title + SKU + meta] [price + actions]
 *
 * Whole-card navigation: an absolutely-positioned <Link> overlay covers
 * the article; the action buttons (Add to BOM / Out of stock, Add to
 * Your List) sit above the overlay via z-index and stay independently
 * clickable without needing nested <a> tags or stopPropagation gymnastics.
 *
 * Action stack (right column):
 *   ┌────────────────────────┐
 *   │  Add to BOM / Out      │  primary — disabled when out of stock
 *   ├────────────────────────┤
 *   │  Add to Your List ★    │  secondary — opens the lists popover
 *   └────────────────────────┘
 *
 * Used by <PmCategoryListing> when the URL has `?view=list`.
 */

import Link from 'next/link';
import { Plus, Star } from 'lucide-react';
import { Image } from '~/components/image';
import { PmAddToListButton } from '~/components/pm-add-to-list-menu';
import { usePmCompare } from '~/lib/pm-compare-store';
import { usePmQuote } from '~/lib/pm-quote-store';
import type { PmProductRowProps } from './pm-product-row.types';

export function PmProductRow({ product }: PmProductRowProps) {
  const { addLines, open } = usePmQuote();
  const { toggle: toggleCompare, isInCompare } = usePmCompare();
  // Use BC entity ID (always unique) for compare lookup — keying by SKU
  // breaks when the catalog has duplicate-SKU listings (both cards then
  // share one toggle state).
  const checked = isInCompare(product.id);

  const handleAddToBom = (e: React.MouseEvent) => {
    // Outer overlay Link could pick up bubbled clicks — kill propagation.
    e.preventDefault();
    e.stopPropagation();
    if (!product.inStock) return;
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

  const listItem = {
    sku: product.sku,
    qty: 1,
    title: product.name,
    imageUrl: product.imageUrl,
    unitPrice: product.priceLabel,
    brand: product.brand,
  };

  return (
    <article className="group relative flex gap-5 rounded-lg border border-pm-ink-200 bg-white p-4 shadow-sm transition-all duration-[180ms] ease-pm-standard hover:-translate-y-0.5 hover:shadow-md">
      {/* Stretched-link overlay: makes the entire card clickable while
          leaving the buttons in the right column independently clickable
          (they sit at z-10, this Link sits at z-0). */}
      <Link
        href={product.href}
        aria-label={`View ${product.name}`}
        className="absolute inset-0 z-0 rounded-lg"
      />

      {/* Image */}
      <div className="relative z-10 flex h-[160px] w-[160px] flex-shrink-0 items-center justify-center overflow-hidden rounded-md bg-pm-ink-100 pointer-events-none">
        {product.imageUrl ? (
          // BC CDN image — Catalyst <Image> wrapper substitutes `{:size}`
          // in the BC urlTemplate per-device-width. Fixed 160px tile so
          // sizes hint is constant (responsive srcset still emitted for DPR).
          <Image
            src={product.imageUrl}
            alt={product.imageAlt ?? product.name}
            width={160}
            height={160}
            sizes="160px"
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

      {/* Middle column — brand / title / SKU / meta */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col gap-1.5 pointer-events-none">
        {product.brand && (
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-pm-tan">
            {product.brand}
          </div>
        )}

        <h3 className="line-clamp-2 text-[18px] font-bold leading-[1.25] tracking-tight text-pm-ink-900 transition-colors group-hover:text-pm-navy-deep">
          {product.name}
        </h3>

        <div className="text-[12px] font-medium text-pm-ink-500">
          SKU {product.sku}
        </div>

        <div className="mt-auto flex items-center gap-3 pt-1 text-[12px] font-medium text-pm-ink-500">
          {product.inStock ? (
            <span className="text-pm-success">Available now</span>
          ) : (
            <span>Available on backorder</span>
          )}

          {/* Compare toggle — bottom-left of the middle column. The wrapper
              div above has pointer-events-none so the Link overlay catches
              hover, but this button re-enables pointer events on itself so
              it stays independently clickable. */}
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
            className="pointer-events-auto inline-flex items-center gap-1.5 rounded-sm py-0.5 text-[11px] font-medium text-pm-ink-500 transition-colors hover:text-pm-navy-deep"
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
        </div>
      </div>

      {/* Right column — price + stacked action buttons */}
      <div className="relative z-10 flex min-w-[200px] flex-shrink-0 flex-col items-stretch justify-between gap-3 border-l border-pm-ink-200 pl-5">
        <div className="text-right pointer-events-none">
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

        <div className="flex flex-col gap-2">
          {product.inStock ? (
            <button
              type="button"
              onClick={handleAddToBom}
              aria-label={`Add ${product.name} to cart`}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-pm-terracotta px-3 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-pm-terracotta-light"
            >
              <Plus size={14} strokeWidth={2.5} />
              Add to BOM
            </button>
          ) : (
            <button
              type="button"
              disabled
              aria-label={`${product.name} is out of stock`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className="inline-flex w-full cursor-default items-center justify-center rounded-md bg-pm-ink-400 px-3 py-2 text-[13px] font-semibold text-white"
            >
              Out of stock
            </button>
          )}

          <PmAddToListButton
            item={listItem}
            label="Add to Your List"
            icon={<Star size={14} strokeWidth={2} />}
            iconPosition="right"
            showChevron={false}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-pm-ink-300 bg-white px-3 py-2 text-[13px] font-semibold text-pm-ink-900 transition-colors hover:border-pm-ink-500 hover:bg-pm-ink-100"
          />
        </div>
      </div>
    </article>
  );
}
