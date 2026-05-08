'use client';

/**
 * RecentlyViewedGrid (client)
 * ---------------------------
 * Reads from pm-recently-viewed-store and renders the products as a
 * 4-up grid using PmProductCard for visual consistency with the rest of
 * the catalog UI.
 *
 * Header includes a "Clear all" affordance with inline confirm, plus a
 * count of remembered products. Empty state directs the user back to
 * the catalog.
 */
import { useState } from 'react';
import { History, Trash2 } from 'lucide-react';

import { PmProductCard } from '~/components/pm-product-card';
import { usePmRecentlyViewed } from '~/lib/pm-recently-viewed-store';
import type { PmProduct } from '~/lib/pm-products';

export function RecentlyViewedGrid() {
  const { items, ready, clear, count } = usePmRecentlyViewed();
  const [confirmingClear, setConfirmingClear] = useState(false);

  // Map the lean store records onto the shape PmProductCard wants. The
  // numeric `id` field is just a React-key fallback — using a hash of the
  // SKU keeps it stable per product without collisions.
  const products: PmProduct[] = items.map((it) => ({
    id: hashCode(it.sku),
    sku: it.sku,
    name: it.title,
    href: it.href,
    brand: it.brand,
    imageUrl: it.imageUrl,
    imageAlt: it.title,
    priceLabel: it.priceLabel,
    inStock: it.inStock,
  }));

  return (
    <>
      {/* Toolbar — count on the left, clear-all on the right (only when there's data) */}
      {ready && count > 0 && (
        <div className="flex items-center justify-between border-b border-pm-ink-200 pb-4 text-[13px] text-pm-ink-500">
          <span>
            <span className="font-semibold text-pm-ink-700">{count}</span>{' '}
            recent {count === 1 ? 'product' : 'products'}
          </span>
          {confirmingClear ? (
            <span className="flex items-center gap-2 text-pm-danger">
              <span>Clear all browsing history?</span>
              <button
                type="button"
                onClick={() => setConfirmingClear(false)}
                className="rounded-md px-2.5 py-1 font-semibold text-pm-ink-500 hover:bg-pm-ink-100 hover:text-pm-ink-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  clear();
                  setConfirmingClear(false);
                }}
                className="inline-flex items-center gap-1 rounded-md bg-pm-danger px-2.5 py-1 font-semibold text-white transition-colors hover:bg-pm-danger/90"
              >
                <Trash2 size={12} strokeWidth={2} />
                Clear
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingClear(true)}
              className="inline-flex items-center gap-1.5 font-semibold text-pm-danger transition-colors hover:underline"
            >
              <Trash2 size={12} strokeWidth={2} />
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Empty state — only after hydration so we don't flash it */}
      {ready && count === 0 ? (
        <div className="flex flex-col items-center rounded-md border border-dashed border-pm-ink-200 bg-white px-8 py-16 text-center">
          <span
            aria-hidden
            className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-pm-ink-100 text-pm-ink-500"
          >
            <History size={24} strokeWidth={1.5} />
          </span>
          <h2 className="text-[18px] font-bold tracking-tight text-pm-ink-900">
            Your browsing history is empty
          </h2>
          <p className="mt-2 max-w-[420px] text-[14px] leading-[1.55] text-pm-ink-500">
            Open a few products and they&apos;ll appear here automatically —
            most recent first. History is stored only on this browser.
          </p>
          <a
            href="/dev/preview"
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-pm-terracotta px-4 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-pm-terracotta-light"
          >
            Browse the catalog
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <PmProductCard key={product.sku} product={product} />
          ))}
        </div>
      )}
    </>
  );
}

/** Tiny non-cryptographic hash so PmProductCard's `id` field has a stable
 * numeric value derived from SKU. Doesn't need to be unique across all of
 * BC — just within a single user's recently-viewed list (max 24 items). */
function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0; // 32-bit
  }
  return Math.abs(h);
}
