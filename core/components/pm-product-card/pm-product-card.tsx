'use client';

/**
 * PmProductCard
 * -------------
 * Catalog product tile. Sans-only typography (no mono in subtext) per the
 * design feedback we got during the design package iteration.
 *
 * **Click-anywhere navigation** is done via the "stretched link" pattern,
 * NOT by wrapping the whole tile in `<Link>`:
 *
 *   - The outer `<article>` has `position: relative`.
 *   - A single absolutely-positioned `<Link>` overlay (`absolute inset-0`)
 *     catches clicks on any bare card surface.
 *   - The interactive children that LIVE inside the card (Add-to-cart
 *     button, Compare toggle) sit ABOVE that overlay via `relative z-10`
 *     so they remain independently clickable without nesting an
 *     interactive element inside an `<a>`.
 *
 * The previous implementation wrapped everything (including those two
 * buttons) inside `<Link>`, which is invalid HTML and produced a real
 * bug: clicks near the buttons (their padding, their SVG icons, their
 * label text) resolved inconsistently — sometimes navigation fired,
 * sometimes the button's onClick fired with preventDefault, sometimes
 * neither. Symptom: "I click on the card and nothing happens." The
 * stretched-link layout makes the navigation surface a single explicit
 * element so the failure mode goes away.
 *
 * Marked client because the Add and Compare buttons need
 * `usePmQuote()` / `usePmCompare()`.
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
    // Independent button — no propagation kill needed (the Link is a
    // sibling overlay, not a parent), but keep stopPropagation to be
    // defensive against future wrapping changes.
    e.stopPropagation();
    addLines([
      {
        sku: product.sku,
        qty: 1,
        title: product.name,
        imageUrl: product.imageUrl,
        unitPrice: product.priceLabel,
        brand: product.brand,
        inStock: product.inStock,
        productEntityId: product.id,
      },
    ]);
    open();
  };

  const handleCompareToggle = (e: React.MouseEvent) => {
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
    <article className="group relative flex flex-col gap-2 rounded-lg border border-pm-ink-200 bg-white p-3 shadow-sm transition-all duration-[180ms] ease-pm-standard hover:-translate-y-0.5 hover:shadow-md sm:gap-2.5 sm:p-4">
      {/* Stretched-link overlay — catches clicks on every bare surface of
          the card (image, brand eyebrow, title, sku, whitespace, even
          padding). Sits at z-0 so the buttons below can z-10 themselves
          ABOVE this overlay to stay independently clickable. */}
      <Link
        href={product.href}
        aria-label={`View ${product.name}`}
        className="absolute inset-0 z-0 rounded-lg"
      />

      {/* Image */}
      <div className="pointer-events-none relative z-10 flex h-[120px] items-center justify-center overflow-hidden rounded-md bg-pm-ink-100 sm:h-[160px]">
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

      {/* Brand eyebrow — pointer-events-none so the Link overlay below
          gets the click. (The text remains selectable on long-press /
          drag because pointer-events: none doesn't block selection.) */}
      {product.brand && (
        <div className="pointer-events-none relative z-10 text-[11px] font-bold uppercase tracking-[0.14em] text-pm-tan">
          {product.brand}
        </div>
      )}

      {/* Title */}
      <h3 className="pointer-events-none relative z-10 line-clamp-2 min-h-[36px] text-[13px] font-semibold leading-[1.35] text-pm-ink-900 transition-colors group-hover:text-pm-navy-deep sm:min-h-[38px] sm:text-[14px]">
        {product.name}
      </h3>

      {/* SKU line — sans, NOT mono per design feedback */}
      <div className="pointer-events-none relative z-10 text-[12px] text-pm-ink-400">
        SKU {product.sku}
      </div>

      {/* Footer — re-enables pointer-events on itself (so the Add button
          inside is clickable), but the price half is still p-none so the
          Link overlay catches taps there. */}
      <div className="relative z-10 mt-1 flex flex-wrap items-center justify-between gap-2 border-t border-pm-ink-200 pt-3">
        <div className="pointer-events-none">
          {product.priceLabel ? (
            <span className="text-[16px] font-bold text-pm-navy-deep sm:text-[17px]">
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
          className="pointer-events-auto inline-flex min-h-[36px] items-center gap-1 rounded-md bg-pm-terracotta px-3 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-pm-terracotta-light sm:min-h-0 sm:py-1.5"
        >
          <Plus size={12} strokeWidth={2.5} />
          Add
        </button>
      </div>

      {/* Compare toggle — bottom-left affordance. Sits ABOVE the link
          overlay (z-10) and re-enables pointer events so it's
          independently clickable. */}
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
        className="pointer-events-auto relative z-10 -mt-1 inline-flex w-fit items-center gap-1.5 self-start rounded-sm py-0.5 text-[11px] font-medium text-pm-ink-500 transition-colors hover:text-pm-navy-deep"
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
    </article>
  );
}
