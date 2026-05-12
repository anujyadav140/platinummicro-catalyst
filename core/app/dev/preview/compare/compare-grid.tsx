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
import { useEffect, useMemo, useState } from 'react';
import { ArrowUp, Plus, X } from 'lucide-react';
import { usePmCompare, type PmCompareItem } from '~/lib/pm-compare-store';
import { usePmQuote } from '~/lib/pm-quote-store';

const CATALOG_HREF = '/dev/preview/category/servers/';

interface CompareSpec {
  name: string;
  value: string;
}

/**
 * BC compare items store `/dev/preview/product/<slug>/` as the href.
 * Strip the route prefix so the API only needs the BC path slug.
 */
function hrefToSlug(href: string | undefined): string | null {
  if (!href) return null;
  const prefix = '/dev/preview/product';
  if (!href.startsWith(prefix)) return null;
  const rest = href.slice(prefix.length);
  return rest.length > 0 ? rest : null;
}

/**
 * Normalize a cell value for diff detection: collapse whitespace, lowercase,
 * and treat empty/undefined as a special token so a missing value differs
 * from an empty string (both contribute to "this row differs across products").
 */
function normalizeForDiff(value: string | undefined | null): string {
  if (value == null) return '\0MISSING';
  const trimmed = value.trim().replace(/\s+/g, ' ').toLowerCase();
  return trimmed.length === 0 ? '\0MISSING' : trimmed;
}

/**
 * A row is "different" if its values aren't all the same across products.
 * Single-product compare lists never trigger highlighting (nothing to differ
 * from). With 2+ products we look at the unique value count.
 */
function rowDiffers(values: Array<string | undefined | null>): boolean {
  if (values.length < 2) return false;
  const first = normalizeForDiff(values[0]);
  for (let i = 1; i < values.length; i++) {
    if (normalizeForDiff(values[i]) !== first) return true;
  }
  return false;
}

/**
 * Top-of-column product card. Consolidates what used to be six separate
 * rows (Image / Brand / Name / SKU / Price / Stock) into one tile per
 * compared product — matches the CDW comparison layout while staying on
 * the PM design system (tan eyebrow, navy-deep price, terracotta CTA).
 */
function CompareProductCard({
  item,
  onRemove,
  onAddToCart,
}: {
  item: PmCompareItem;
  onRemove: () => void;
  onAddToCart: () => void;
}) {
  return (
    <div className="relative flex h-full flex-col rounded-lg border border-pm-ink-200 bg-white p-3.5 shadow-sm">
      {/* Close (remove from compare) */}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${item.name} from compare`}
        className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full text-pm-ink-500 transition-colors hover:bg-pm-ink-100 hover:text-pm-ink-900"
      >
        <X size={14} strokeWidth={2.25} />
      </button>

      {/* Brand eyebrow */}
      <div className="mb-1 min-h-[14px] pr-7 text-[11px] font-bold uppercase tracking-[0.14em] text-pm-tan">
        {item.brand ?? ''}
      </div>

      {/* Image */}
      <Link
        href={item.href ?? '#'}
        className="flex h-[140px] items-center justify-center overflow-hidden rounded-md bg-pm-ink-100"
        aria-label={`View ${item.name}`}
      >
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- BC CDN images
          <img
            src={item.imageUrl}
            alt={item.name}
            className="max-h-full max-w-full object-contain"
            loading="lazy"
          />
        ) : (
          <span className="rounded-sm border border-dashed border-pm-ink-300 bg-white px-2.5 py-1.5 text-[11px] text-pm-ink-400">
            No image
          </span>
        )}
      </Link>

      {/* Title */}
      <h3 className="mt-3 line-clamp-3 text-[14px] font-semibold leading-[1.35] text-pm-ink-900">
        {item.href ? (
          <Link href={item.href} className="hover:text-pm-navy-deep">
            {item.name}
          </Link>
        ) : (
          item.name
        )}
      </h3>

      {/* SKU / part number */}
      <div className="mt-2 text-[12px] text-pm-ink-500">
        SKU{' '}
        <span className="font-medium text-pm-ink-700">{item.sku}</span>
      </div>

      {/* Price + availability. Mirrors CDW's pattern: a one-line status
          ("In Stock" / "Available to Order") followed by a soft lead-time
          subtitle — much friendlier than the bare "Backorder" label. */}
      <div className="mt-3 flex flex-col gap-1.5 border-t border-pm-ink-200 pt-3">
        {item.priceLabel ? (
          <span className="text-[20px] font-bold leading-none text-pm-navy-deep">
            {item.priceLabel}
          </span>
        ) : (
          <span className="text-[13px] font-medium text-pm-ink-500">
            Quote pricing
          </span>
        )}
        {item.inStock ? (
          <div>
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-pm-success">
              <span className="h-1.5 w-1.5 rounded-full bg-pm-success" />
              In Stock
            </span>
            <div className="mt-0.5 text-[11px] leading-snug text-pm-ink-500">
              Ships next business day from Industry, CA
            </div>
          </div>
        ) : (
          <div>
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-pm-tan">
              <span className="h-1.5 w-1.5 rounded-full bg-pm-tan" />
              Available to Order
            </span>
            <div className="mt-0.5 text-[11px] leading-snug text-pm-ink-500">
              7&ndash;10 business day lead time
            </div>
          </div>
        )}
      </div>

      {/* Push the CTA to the bottom so cards line up across columns even
          when names wrap to different line counts. */}
      <div className="mt-auto pt-3">
        <button
          type="button"
          onClick={onAddToCart}
          aria-label={`Add ${item.name} to cart`}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-pm-terracotta px-3 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-pm-terracotta-light"
        >
          <Plus size={14} strokeWidth={2.5} />
          Add to Cart
        </button>
      </div>
    </div>
  );
}

function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-1.5 rounded-full border border-pm-ink-300 bg-white px-4 py-2.5 text-[13px] font-semibold text-pm-ink-700 shadow-md transition-all hover:border-pm-ink-500 hover:text-pm-ink-900 hover:shadow-lg"
    >
      <ArrowUp size={14} strokeWidth={2.25} />
      Back to Top
    </button>
  );
}

export function CompareGrid() {
  const { items, ready, remove } = usePmCompare();
  const { addLines, open: openQuote } = usePmQuote();
  const [specsBySlug, setSpecsBySlug] = useState<Record<string, CompareSpec[]>>({});
  const [specsLoading, setSpecsLoading] = useState(false);
  const [highlightDiffs, setHighlightDiffs] = useState(true);

  /**
   * Push a compared product into the quote drawer (PM's cart equivalent)
   * and open the drawer so the user sees confirmation. Mirrors the same
   * shape the catalog cards use so quantities collapse correctly.
   */
  const handleAddToCart = (item: PmCompareItem) => {
    addLines([
      {
        sku: item.sku,
        qty: 1,
        title: item.name,
        imageUrl: item.imageUrl,
        unitPrice: item.priceLabel,
        brand: item.brand,
      },
    ]);
    openQuote();
  };

  /**
   * Single source of truth for the "this row differs" check. When the toggle
   * is off it always returns false — keeping the call sites declarative.
   */
  const diffClass = (values: Array<string | undefined | null>): string =>
    highlightDiffs && rowDiffers(values) ? 'bg-pm-tan-pale' : '';

  // Stable, comma-joined slug list — used as the effect's dependency so we
  // only refetch when the actual compared products change (not on every
  // unrelated re-render).
  const slugKey = useMemo(
    () =>
      items
        .map((i) => hrefToSlug(i.href))
        .filter((s): s is string => s != null)
        .join('|'),
    [items],
  );

  useEffect(() => {
    if (!ready || slugKey.length === 0) {
      setSpecsBySlug({});
      return;
    }
    const slugs = slugKey.split('|');
    let cancelled = false;
    setSpecsLoading(true);
    fetch('/dev/preview/api/compare/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slugs }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: { specsBySlug?: Record<string, CompareSpec[]> }) => {
        if (cancelled) return;
        setSpecsBySlug(data.specsBySlug ?? {});
      })
      .catch(() => {
        if (cancelled) return;
        setSpecsBySlug({});
      })
      .finally(() => {
        if (!cancelled) setSpecsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, slugKey]);

  // Union of every spec name that appears in any compared product, in the
  // order they first appear (stable across renders so rows don't reshuffle).
  const specRows = useMemo(() => {
    const order: string[] = [];
    const seen = new Set<string>();
    for (const item of items) {
      const slug = hrefToSlug(item.href);
      if (!slug) continue;
      const specs = specsBySlug[slug] ?? [];
      for (const spec of specs) {
        const key = spec.name.trim();
        if (!key || seen.has(key.toLowerCase())) continue;
        seen.add(key.toLowerCase());
        order.push(key);
      }
    }
    return order;
  }, [items, specsBySlug]);

  /** Look up a product's value for a given spec name (case-insensitive). */
  const valueFor = (slug: string | null, specName: string): string | undefined => {
    if (!slug) return undefined;
    const specs = specsBySlug[slug] ?? [];
    const hit = specs.find(
      (s) => s.name.trim().toLowerCase() === specName.trim().toLowerCase(),
    );
    return hit?.value;
  };

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

  // Highlight is only meaningful with 2+ products; disable the toggle
  // (visually + functionally) for single-product compares.
  const highlightAvailable = items.length >= 2;

  // Shared grid template — used by BOTH the cards row at the top AND every
  // spec row below. That's the only way to guarantee each card sits directly
  // above its corresponding spec column. 140px attribute rail + N × 240px
  // product columns with a 24px gutter between every adjacent pair.
  const gridTemplate = `140px repeat(${items.length}, 240px)`;
  // Cap the wrapper width so 2-product compares don't sprawl across the full
  // page. 140 attribute + N×240 cards + N×24 gutters (1 per card slot).
  const compareWidth = 140 + items.length * (240 + 24);

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
        <div className="flex flex-wrap items-center gap-3">
          {/* Highlight Differences toggle — pill-style switch. Disabled (and
              forced off visually) when there's only one product, since there
              are no other values to differ from. */}
          <label
            className={`inline-flex items-center gap-2.5 text-[13px] font-semibold ${
              highlightAvailable
                ? 'cursor-pointer text-pm-ink-700'
                : 'cursor-not-allowed text-pm-ink-400'
            }`}
          >
            <span>Highlight Differences</span>
            <button
              type="button"
              role="switch"
              aria-checked={highlightAvailable && highlightDiffs}
              aria-label="Toggle highlight differences"
              disabled={!highlightAvailable}
              onClick={() =>
                highlightAvailable && setHighlightDiffs((prev) => !prev)
              }
              className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full border transition-colors ${
                highlightAvailable && highlightDiffs
                  ? 'border-pm-success bg-pm-success'
                  : 'border-pm-ink-300 bg-pm-ink-200'
              } ${highlightAvailable ? '' : 'opacity-50'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  highlightAvailable && highlightDiffs
                    ? 'translate-x-6'
                    : 'translate-x-1'
                }`}
              />
            </button>
          </label>
        </div>
      </div>

      {/* Cards row — width-constrained so 2-product compares don't sprawl.
          Wrapped in an overflow-x-auto for the 4-product case on narrow
          viewports. */}
      <div className="overflow-x-auto">
        <div
          className="grid items-stretch gap-x-6"
          style={{
            gridTemplateColumns: gridTemplate,
            width: `${compareWidth}px`,
            minWidth: 'min-content',
          }}
          role="presentation"
        >
          {/* Spacer aligned with the spec table's attribute rail below. */}
          <div aria-hidden />
          {items.map((item) => (
            <CompareProductCard
              key={`card-${item.id}`}
              item={item}
              onRemove={() => remove(item.id)}
              onAddToCart={() => handleAddToCart(item)}
            />
          ))}
        </div>
      </div>

      {/* Specifications "table" — full-width airy layout like CDW. No outer
          container box; each row gets a horizontal divider that extends the
          full page width, so the right side never feels "closed off" when
          there are only 2 products. Columns still share the same grid
          template as the cards above, so they align perfectly. */}
      <div
        role="table"
        aria-label="Product specifications comparison"
        className="mt-10"
      >
        {(specsLoading || specRows.length > 0) && (
          <div
            role="row"
            className="border-b-2 border-pm-ink-300 pb-2.5"
          >
            <div
              role="columnheader"
              className="text-[13px] font-bold uppercase tracking-[0.14em] text-pm-ink-900"
            >
              Specifications
              {specsLoading && (
                <span className="ml-2 text-[11px] font-medium normal-case tracking-normal text-pm-ink-500">
                  loading…
                </span>
              )}
            </div>
          </div>
        )}

        {/* One row per unique spec name, union'd across all compared
            products. Empty values fall back to em-dash. Differing rows
            take a tan-pale background when the toggle is on. */}
        {specRows.map((specName) => {
          const rowValues = items.map((item) =>
            valueFor(hrefToSlug(item.href), specName),
          );
          const rowDiff = diffClass(rowValues);
          return (
            <div
              role="row"
              key={`spec-${specName}`}
              className={`grid items-start gap-x-6 border-b border-pm-ink-200 ${rowDiff}`}
              style={{ gridTemplateColumns: gridTemplate }}
            >
              <div
                role="rowheader"
                className="py-4 pr-4 text-[13px] font-bold leading-snug text-pm-ink-900"
              >
                {specName}
              </div>
              {rowValues.map((value, colIdx) => (
                <div
                  role="cell"
                  key={`spec-${specName}-${items[colIdx]?.id ?? colIdx}`}
                  className="py-4 pr-4 text-[13px] leading-relaxed text-pm-ink-700"
                >
                  {value ? (
                    value
                  ) : (
                    <span className="text-pm-ink-400">&mdash;</span>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <BackToTopButton />
    </div>
  );
}
