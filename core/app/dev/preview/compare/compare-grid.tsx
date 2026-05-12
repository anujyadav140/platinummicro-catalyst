'use client';

/**
 * CompareGrid
 * -----------
 * The side-by-side comparison grid for /dev/preview/compare/. Client component
 * because it reads `usePmCompare()` (browser-only state).
 *
 * Layout: an attribute-rows table.
 *   Column 0 = row label ("Image", "Brand", "SKU", "Price", "Stock")
 *   Columns 1..N = one column per selected product (up to 4)
 *
 * Until the store hydrates we render a low-key placeholder rather than an
 * empty state — otherwise a hard refresh on /compare with selected items
 * would flash the empty CTA for a frame.
 *
 * Empty state: friendly headline + a CTA back to the catalog. No "compare
 * bar" appears at the bottom in this state either, since the store is
 * actually empty.
 */

import Link from 'next/link';
import { Trash2, X } from 'lucide-react';
import { usePmCompare } from '~/lib/pm-compare-store';

const CATALOG_HREF = '/dev/preview/category/servers/';

export function CompareGrid() {
  const { items, ready, remove, clear } = usePmCompare();

  if (!ready) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-16 sm:px-6">
        <div className="h-[320px] animate-pulse rounded-lg border border-pm-ink-200 bg-white" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-16 sm:px-6">
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-pm-ink-300 bg-white px-6 py-16 text-center">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-pm-tan">
            Product comparison
          </div>
          <h1 className="mt-2 text-[28px] font-bold tracking-tight text-pm-ink-900">
            No products selected yet
          </h1>
          <p className="mt-2 max-w-[460px] text-[14px] leading-relaxed text-pm-ink-500">
            Tick the &ldquo;Compare&rdquo; checkbox on any product in the
            catalog to add it to a side-by-side view. You can compare up to
            4 products at once.
          </p>
          <Link
            href={CATALOG_HREF}
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-pm-terracotta px-4 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-pm-terracotta-light"
          >
            Browse the catalog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6">
      {/* Page header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-pm-tan">
            Product comparison
          </div>
          <h1 className="mt-1 text-[28px] font-bold tracking-tight text-pm-ink-900">
            Compare {items.length} product{items.length === 1 ? '' : 's'}
          </h1>
        </div>
        <button
          type="button"
          onClick={clear}
          className="inline-flex items-center gap-1.5 rounded-md border border-pm-ink-300 bg-white px-3 py-2 text-[13px] font-semibold text-pm-ink-700 transition-colors hover:border-pm-ink-500 hover:text-pm-ink-900"
        >
          <Trash2 size={13} strokeWidth={2} />
          Clear all
        </button>
      </div>

      {/* Comparison table. Horizontally scrollable on narrow viewports so
          the column-per-product layout never collapses. */}
      <div className="overflow-x-auto rounded-lg border border-pm-ink-200 bg-white">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr className="border-b border-pm-ink-200">
              <th
                scope="col"
                className="w-[140px] bg-pm-ink-100 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.14em] text-pm-ink-500"
              >
                Attribute
              </th>
              {items.map((item) => (
                <th
                  key={`head-${item.id}`}
                  scope="col"
                  className="relative min-w-[200px] px-4 py-3 text-left align-top"
                >
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    aria-label={`Remove ${item.name} from compare`}
                    className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full text-pm-ink-500 transition-colors hover:bg-pm-ink-100 hover:text-pm-ink-900"
                  >
                    <X size={14} strokeWidth={2.25} />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Image row */}
            <tr className="border-b border-pm-ink-200">
              <th
                scope="row"
                className="bg-pm-ink-100 px-4 py-4 text-left align-top text-[12px] font-semibold text-pm-ink-700"
              >
                Image
              </th>
              {items.map((item) => (
                <td
                  key={`img-${item.id}`}
                  className="px-4 py-4 align-top"
                >
                  <Link
                    href={item.href ?? '#'}
                    className="block h-[140px] w-full overflow-hidden rounded-md bg-pm-ink-100"
                    aria-label={`View ${item.name}`}
                  >
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- BC CDN images
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="mx-auto h-full w-auto max-w-full object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[11px] text-pm-ink-400">
                        No image
                      </div>
                    )}
                  </Link>
                </td>
              ))}
            </tr>

            {/* Name row */}
            <tr className="border-b border-pm-ink-200">
              <th
                scope="row"
                className="bg-pm-ink-100 px-4 py-3 text-left align-top text-[12px] font-semibold text-pm-ink-700"
              >
                Name
              </th>
              {items.map((item) => (
                <td
                  key={`name-${item.id}`}
                  className="px-4 py-3 align-top text-[14px] font-semibold leading-snug text-pm-ink-900"
                >
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="hover:text-pm-navy-deep"
                    >
                      {item.name}
                    </Link>
                  ) : (
                    item.name
                  )}
                </td>
              ))}
            </tr>

            {/* Brand row */}
            <tr className="border-b border-pm-ink-200">
              <th
                scope="row"
                className="bg-pm-ink-100 px-4 py-3 text-left align-top text-[12px] font-semibold text-pm-ink-700"
              >
                Brand
              </th>
              {items.map((item) => (
                <td
                  key={`brand-${item.id}`}
                  className="px-4 py-3 align-top text-[13px] text-pm-ink-900"
                >
                  {item.brand ?? (
                    <span className="text-pm-ink-400">&mdash;</span>
                  )}
                </td>
              ))}
            </tr>

            {/* SKU row */}
            <tr className="border-b border-pm-ink-200">
              <th
                scope="row"
                className="bg-pm-ink-100 px-4 py-3 text-left align-top text-[12px] font-semibold text-pm-ink-700"
              >
                SKU
              </th>
              {items.map((item) => (
                <td
                  key={`sku-${item.id}`}
                  className="px-4 py-3 align-top text-[13px] text-pm-ink-900"
                >
                  {item.sku}
                </td>
              ))}
            </tr>

            {/* Price row */}
            <tr className="border-b border-pm-ink-200">
              <th
                scope="row"
                className="bg-pm-ink-100 px-4 py-3 text-left align-top text-[12px] font-semibold text-pm-ink-700"
              >
                Price
              </th>
              {items.map((item) => (
                <td
                  key={`price-${item.id}`}
                  className="px-4 py-3 align-top text-[15px] font-bold text-pm-navy-deep"
                >
                  {item.priceLabel ?? (
                    <span className="text-[13px] font-medium text-pm-ink-500">
                      Quote pricing
                    </span>
                  )}
                </td>
              ))}
            </tr>

            {/* Stock row */}
            <tr>
              <th
                scope="row"
                className="bg-pm-ink-100 px-4 py-3 text-left align-top text-[12px] font-semibold text-pm-ink-700"
              >
                Stock
              </th>
              {items.map((item) => (
                <td
                  key={`stock-${item.id}`}
                  className="px-4 py-3 align-top text-[13px]"
                >
                  {item.inStock ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-pm-success-bg px-2 py-0.5 text-[12px] font-semibold text-pm-success">
                      <span className="h-1.5 w-1.5 rounded-full bg-pm-success" />
                      In stock
                    </span>
                  ) : (
                    <span className="text-pm-ink-500">Backorder</span>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
