/**
 * PmCategoryListing
 * -----------------
 * Server component layout for the category page body. Renders:
 *   - breadcrumb
 *   - thin control bar with the result-range readout on the left and
 *     view toggle / page size / sort dropdown on the right
 *   - two-column grid: left facet sidebar (260px), right product grid/list
 *   - pagination
 *
 * No big page header / category h1 / description block — the breadcrumb's
 * "Home > {category}" provides enough page identity, and the controls bar
 * gets the user to the products faster.
 *
 * Children components handle their own client interactivity (sort, facets,
 * view toggle, pagination). This wrapper stays a server component so the
 * heavy product list renders on the server.
 */

import Link from 'next/link';
import { ChevronRight, House } from 'lucide-react';
import { PmProductCard } from '~/components/pm-product-card';
import { PmProductRow } from '~/components/pm-product-row';
import { PmFacetSidebar } from '~/components/pm-facet-sidebar';
import { PmSortDropdown } from '~/components/pm-sort-dropdown';
import { PmViewToggle } from '~/components/pm-view-toggle';
import { PmPageSize } from '~/components/pm-page-size';
import { PmPagination } from '~/components/pm-pagination';
import type { PmCategoryListingProps } from './pm-category-listing.types';

export function PmCategoryListing({
  category,
  products,
  brands,
  totalCount,
  currentPage,
  totalPages,
  pageSize,
  viewMode,
  priceSliderMax,
}: PmCategoryListingProps) {
  // Visible product range for the header readout, e.g. "1 - 17 of 17"
  const firstIndex = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastIndex =
    totalCount === 0 ? 0 : Math.min(currentPage * pageSize, totalCount);

  return (
    <main className="bg-pm-paper">
      {/* Single top row — breadcrumb (+ optional count) on the LEFT, controls
          on the RIGHT. Tight `pt-4` so this row sits close to the navy nav
          above instead of floating in dead space. */}
      <div className="mx-auto max-w-pm-container px-4 pb-6 pt-4 sm:px-6 md:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <nav
              aria-label="Breadcrumb"
              className="flex flex-wrap items-center gap-2 text-sm text-pm-ink-500"
            >
              <Link
                href="/dev/preview"
                className="inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-pm-ink-500 transition-colors hover:text-pm-navy-deep"
              >
                <House size={14} strokeWidth={1.75} />
                <span>Home</span>
              </Link>
              <ChevronRight
                size={14}
                strokeWidth={2}
                className="text-pm-ink-300"
              />
              <span className="font-semibold text-pm-ink-900">
                {category.name}
              </span>
            </nav>
            {totalCount > 0 && (
              <div className="text-[13px] text-pm-ink-500 sm:text-[12px]">
                Showing{' '}
                <span className="font-semibold text-pm-ink-700">
                  {firstIndex}–{lastIndex}
                </span>{' '}
                of{' '}
                <span className="font-semibold text-pm-ink-700">
                  {totalCount}
                </span>{' '}
                {totalCount === 1 ? 'product' : 'products'}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
            <PmViewToggle />
            <PmPageSize />
            <PmSortDropdown />
          </div>
        </div>
      </div>

      {/* Two-column main */}
      <div className="mx-auto max-w-pm-container px-4 pb-16 sm:px-6 md:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr] lg:gap-10">
          <PmFacetSidebar
            brands={brands}
            pinnedCategorySlug={category.slug}
            priceMax={priceSliderMax}
          />

          <section>
            {products.length === 0 ? (
              <div className="rounded-lg border border-dashed border-pm-ink-200 bg-white px-8 py-16 text-center">
                <p className="text-[15px] font-semibold text-pm-ink-700">
                  No products match these filters.
                </p>
                <p className="mt-2 text-[14px] text-pm-ink-500">
                  Try clearing a filter or broadening the price range.
                </p>
              </div>
            ) : viewMode === 'list' ? (
              <div className="flex flex-col gap-4">
                {products.map((product) => (
                  <PmProductRow key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
                {products.map((product) => (
                  <PmProductCard key={product.id} product={product} />
                ))}
              </div>
            )}

            <PmPagination currentPage={currentPage} totalPages={totalPages} />
          </section>
        </div>
      </div>
    </main>
  );
}
