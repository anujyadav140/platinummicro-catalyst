'use client';

/**
 * PmFacetSidebar
 * --------------
 * Left rail for the category listing page. Filter groups:
 *   - Category (multi-select; hidden when a category is already pinned by URL)
 *   - Brand (checkbox list, top N by count)
 *   - Price range (Min / Max number inputs + Apply button)
 *   - Availability (two-option checkboxes: in stock now / on backorder)
 *   - Rating (radio: 4★ / 3★ / 2★ / 1★ / Any)
 *   - On sale (toggle)
 *   - Featured (toggle)
 *
 * State lives in the URL — every input call router.replace with the
 * updated query string. Price range uses local state until user clicks
 * Apply (otherwise we'd refetch on every keystroke).
 *
 * Each group is collapsible (default open) with a chevron toggle. Sticky
 * on lg breakpoint via `lg:sticky` so filters stay visible while the user
 * scrolls the product grid.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { PM_CATEGORIES } from '~/lib/pm-categories';
import { PmRangeSlider } from '~/components/pm-range-slider';

// Slider lower bound is fixed; upper bound now comes from the live data
// (highest price in the current category). Step scales with magnitude so a
// $12k category and a $500 category both feel sensible to drag.
const PRICE_SLIDER_MIN = 0;
const PRICE_SLIDER_FALLBACK_MAX = 10000;

function pickSliderStep(max: number): number {
  if (max >= 10000) return 100;
  if (max >= 1000) return 25;
  if (max >= 100) return 5;
  return 1;
}

export interface PmFacetSidebarProps {
  brands: Array<{ brand: string; count: number }>;
  /** When set, the URL already pins a category — we hide the Category filter group */
  pinnedCategorySlug?: string;
  /** Upper bound for the price slider — comes from the live max price. */
  priceMax?: number;
}

function readArrayParam(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

const ALL_FILTER_KEYS = [
  'brand',
  'category',
  'inStock',
  'availability',
  'minPrice',
  'maxPrice',
  'onSale',
  'featured',
];

export function PmFacetSidebar({
  brands,
  pinnedCategorySlug,
  priceMax,
}: PmFacetSidebarProps) {
  const router = useRouter();
  const params = useSearchParams();
  const sliderMax =
    priceMax && priceMax > 0 ? priceMax : PRICE_SLIDER_FALLBACK_MAX;
  const sliderStep = pickSliderStep(sliderMax);

  const selectedBrands = readArrayParam(params?.get('brand') ?? null);
  const selectedCategories = readArrayParam(params?.get('category') ?? null);
  const availability = readArrayParam(params?.get('availability') ?? null);
  const minPriceParam = params?.get('minPrice') ?? '';
  const maxPriceParam = params?.get('maxPrice') ?? '';
  const onSale = (params?.get('onSale') ?? '') === 'true';
  const featured = (params?.get('featured') ?? '') === 'true';

  // Slider state mirrors the URL. We commit local edits back to the URL on a
  // short debounce (no Apply button) so the grid refilters as soon as the
  // user lets the thumb settle, without slamming the server on every drag
  // frame.
  const initialLow = minPriceParam ? Number(minPriceParam) : PRICE_SLIDER_MIN;
  const initialHigh = maxPriceParam ? Number(maxPriceParam) : sliderMax;
  const [priceRange, setPriceRange] = useState<[number, number]>([
    initialLow,
    initialHigh,
  ]);

  useEffect(() => {
    setPriceRange([
      minPriceParam ? Number(minPriceParam) : PRICE_SLIDER_MIN,
      maxPriceParam ? Number(maxPriceParam) : sliderMax,
    ]);
  }, [minPriceParam, maxPriceParam, sliderMax]);

  const updateParams = (mutator: (next: URLSearchParams) => void) => {
    const next = new URLSearchParams(params?.toString() ?? '');
    mutator(next);
    next.delete('page');
    const qs = next.toString();
    router.replace(qs ? `?${qs}` : '?', { scroll: false });
  };

  const toggleBrand = (brand: string) => {
    updateParams((next) => {
      const current = readArrayParam(next.get('brand'));
      const exists = current.includes(brand);
      const updated = exists
        ? current.filter((b) => b !== brand)
        : [...current, brand];
      if (updated.length === 0) {
        next.delete('brand');
      } else {
        next.set('brand', updated.join(','));
      }
    });
  };

  const toggleCategory = (key: string) => {
    updateParams((next) => {
      const current = readArrayParam(next.get('category'));
      const exists = current.includes(key);
      const updated = exists
        ? current.filter((c) => c !== key)
        : [...current, key];
      if (updated.length === 0) {
        next.delete('category');
      } else {
        next.set('category', updated.join(','));
      }
    });
  };

  const toggleAvailability = (mode: 'in-stock' | 'backorder') => {
    updateParams((next) => {
      const current = readArrayParam(next.get('availability'));
      const exists = current.includes(mode);
      const updated = exists
        ? current.filter((m) => m !== mode)
        : [...current, mode];
      if (updated.length === 0) {
        next.delete('availability');
      } else {
        next.set('availability', updated.join(','));
      }
    });
  };

  const toggleOnSale = (checked: boolean) => {
    updateParams((next) => {
      if (checked) next.set('onSale', 'true');
      else next.delete('onSale');
    });
  };

  const toggleFeatured = (checked: boolean) => {
    updateParams((next) => {
      if (checked) next.set('featured', 'true');
      else next.delete('featured');
    });
  };

  // Auto-commit the slider position to the URL on a short debounce. Skipping
  // the write when the slider already matches the URL avoids a feedback loop
  // (URL → state via the sync effect above → state → URL via this one).
  useEffect(() => {
    const [low, high] = priceRange;
    const urlLow = minPriceParam ? Number(minPriceParam) : PRICE_SLIDER_MIN;
    const urlHigh = maxPriceParam ? Number(maxPriceParam) : sliderMax;
    if (low === urlLow && high === urlHigh) return;

    const handle = setTimeout(() => {
      updateParams((next) => {
        if (low > PRICE_SLIDER_MIN) {
          next.set('minPrice', String(low));
        } else {
          next.delete('minPrice');
        }
        if (high < sliderMax) {
          next.set('maxPrice', String(high));
        } else {
          next.delete('maxPrice');
        }
      });
    }, 250);

    return () => clearTimeout(handle);
    // `updateParams` reads `params` and `router` directly — re-deriving them
    // each render is fine, we don't want to retrigger the debounce just
    // because the router changed identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceRange, minPriceParam, maxPriceParam, sliderMax]);

  const hasActiveFilters =
    selectedBrands.length > 0 ||
    selectedCategories.length > 0 ||
    availability.length > 0 ||
    Boolean(minPriceParam) ||
    Boolean(maxPriceParam) ||
    onSale ||
    featured;

  const clearAllHref = (() => {
    const next = new URLSearchParams(params?.toString() ?? '');
    for (const key of ALL_FILTER_KEYS) next.delete(key);
    next.delete('page');
    const qs = next.toString();
    return qs ? `?${qs}` : '?';
  })();

  // Top-level categories from PM_CATEGORIES, excluding "bulk" (a route, not a category)
  const categoryOptions = PM_CATEGORIES.filter((c) => c.key !== 'bulk');

  return (
    <aside className="lg:sticky lg:top-[calc(var(--pm-header-top-h)+var(--pm-header-nav-h)+24px)] lg:self-start">
      <div className="flex flex-col gap-2 divide-y divide-pm-ink-200">
        {!pinnedCategorySlug && (
          <FacetGroup title="Category">
            <ul className="flex flex-col gap-2">
              {categoryOptions.map((cat) => {
                const checked = selectedCategories.includes(cat.key);
                return (
                  <li key={cat.key}>
                    <label className="flex cursor-pointer items-center gap-2.5 text-[14px] text-pm-ink-700 hover:text-pm-ink-900">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCategory(cat.key)}
                        className="h-4 w-4 rounded-sm border-pm-ink-300 text-pm-terracotta accent-pm-terracotta focus:ring-2 focus:ring-pm-navy-light/30 focus:ring-offset-0"
                      />
                      <span className="flex-1">{cat.label}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </FacetGroup>
        )}

        <FacetGroup title="Brand">
          {brands.length === 0 ? (
            <p className="text-[14px] text-pm-ink-500">No brands yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {brands.map(({ brand, count }) => {
                const checked = selectedBrands.includes(brand);
                return (
                  <li key={brand}>
                    <label className="flex cursor-pointer items-center gap-2.5 text-[14px] text-pm-ink-700 hover:text-pm-ink-900">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleBrand(brand)}
                        className="h-4 w-4 rounded-sm border-pm-ink-300 text-pm-terracotta accent-pm-terracotta focus:ring-2 focus:ring-pm-navy-light/30 focus:ring-offset-0"
                      />
                      <span className="flex-1">{brand}</span>
                      <span className="text-[12px] font-medium text-pm-ink-500">
                        {count}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </FacetGroup>

        <FacetGroup title="Price">
          <PmRangeSlider
            min={PRICE_SLIDER_MIN}
            max={sliderMax}
            step={sliderStep}
            value={priceRange}
            onChange={setPriceRange}
            ariaPrefix="price"
          />
        </FacetGroup>

        <FacetGroup title="Availability">
          <div className="flex flex-col gap-2">
            <label className="flex cursor-pointer items-center gap-2.5 text-[14px] text-pm-ink-700 hover:text-pm-ink-900">
              <input
                type="checkbox"
                checked={availability.includes('in-stock')}
                onChange={() => toggleAvailability('in-stock')}
                className="h-4 w-4 rounded-sm border-pm-ink-300 text-pm-terracotta accent-pm-terracotta focus:ring-2 focus:ring-pm-navy-light/30 focus:ring-offset-0"
              />
              In stock now
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 text-[14px] text-pm-ink-700 hover:text-pm-ink-900">
              <input
                type="checkbox"
                checked={availability.includes('backorder')}
                onChange={() => toggleAvailability('backorder')}
                className="h-4 w-4 rounded-sm border-pm-ink-300 text-pm-terracotta accent-pm-terracotta focus:ring-2 focus:ring-pm-navy-light/30 focus:ring-offset-0"
              />
              Available on backorder
            </label>
          </div>
        </FacetGroup>

        <FacetGroup title="Promotions">
          <div className="flex flex-col gap-2">
            <label className="flex cursor-pointer items-center gap-2.5 text-[14px] text-pm-ink-700 hover:text-pm-ink-900">
              <input
                type="checkbox"
                checked={onSale}
                onChange={(e) => toggleOnSale(e.target.checked)}
                className="h-4 w-4 rounded-sm border-pm-ink-300 text-pm-terracotta accent-pm-terracotta focus:ring-2 focus:ring-pm-navy-light/30 focus:ring-offset-0"
              />
              On sale
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 text-[14px] text-pm-ink-700 hover:text-pm-ink-900">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => toggleFeatured(e.target.checked)}
                className="h-4 w-4 rounded-sm border-pm-ink-300 text-pm-terracotta accent-pm-terracotta focus:ring-2 focus:ring-pm-navy-light/30 focus:ring-offset-0"
              />
              Featured
            </label>
          </div>
        </FacetGroup>

        {hasActiveFilters && (
          <div className="pt-4">
            <Link
              href={clearAllHref}
              scroll={false}
              className="text-[14px] font-semibold text-pm-navy-mid underline-offset-2 transition-colors hover:text-pm-navy-light hover:underline"
            >
              Clear all filters
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}

function FacetGroup({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="py-4 first:pt-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mb-3 flex w-full items-center justify-between gap-2 text-left outline-none focus-visible:text-pm-navy-deep"
      >
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-pm-tan">
          {title}
        </span>
        <ChevronDown
          size={14}
          strokeWidth={2}
          className={`text-pm-ink-400 transition-transform duration-[180ms] ${open ? '' : '-rotate-90'}`}
        />
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}
