import { fetchPmSearchListing } from '~/lib/pm-search';
import {
  buildBrandFacet,
  PM_CATEGORY_PAGE_SIZES,
  type PmAvailability,
  type PmCategorySort,
} from '~/lib/pm-category-by-slug';
import { PmCategoryListing } from '~/components/pm-category-listing';
import type { PmViewMode } from '~/components/pm-view-toggle';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const VALID_SORTS: ReadonlySet<PmCategorySort> = new Set([
  'featured',
  'newest',
  'best-selling',
  'a-z',
  'z-a',
  'by-review',
  'price-asc',
  'price-desc',
]);

const VALID_AVAILABILITY: ReadonlySet<PmAvailability> = new Set([
  'in-stock',
  'backorder',
]);

function firstString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function parseSort(raw: string | undefined): PmCategorySort {
  if (raw && VALID_SORTS.has(raw as PmCategorySort)) {
    return raw as PmCategorySort;
  }
  return 'featured';
}

function parseNumber(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function parseStringList(raw: string | undefined): string[] | undefined {
  if (!raw) return undefined;
  const parts = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : undefined;
}

function parseAvailability(raw: string | undefined): PmAvailability[] | undefined {
  const parts = parseStringList(raw);
  if (!parts) return undefined;
  const filtered = parts.filter((p): p is PmAvailability =>
    VALID_AVAILABILITY.has(p as PmAvailability),
  );
  return filtered.length > 0 ? filtered : undefined;
}

function parsePerPage(raw: string | undefined): number | undefined {
  const n = parseNumber(raw);
  if (!n) return undefined;
  return (PM_CATEGORY_PAGE_SIZES as readonly number[]).includes(n) ? n : undefined;
}

function parseView(raw: string | undefined): PmViewMode {
  return raw === 'list' ? 'list' : 'grid';
}

export default async function SearchResultsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const rawQuery = firstString(sp.q)?.trim() ?? '';

  const sort = parseSort(firstString(sp.sort));
  const brands = parseStringList(firstString(sp.brand));
  const categories = parseStringList(firstString(sp.category));
  const availability = parseAvailability(firstString(sp.availability));
  const inStockOnly = firstString(sp.inStock) === 'true';
  const onSale = firstString(sp.onSale) === 'true';
  const featured = firstString(sp.featured) === 'true';
  const minPrice = parseNumber(firstString(sp.minPrice));
  const maxPrice = parseNumber(firstString(sp.maxPrice));
  const minRating = parseNumber(firstString(sp.rating));
  const page = parseNumber(firstString(sp.page)) ?? 1;
  const pageSize = parsePerPage(firstString(sp.perPage));
  const viewMode = parseView(firstString(sp.view));

  const listing = await fetchPmSearchListing(rawQuery, {
    sort,
    brands,
    categories,
    availability,
    inStockOnly,
    onSale,
    featured,
    minPrice,
    maxPrice,
    minRating,
    page,
    pageSize,
  });

  const brandFacet = buildBrandFacet(listing.allProducts);

  return (
    <PmCategoryListing
      category={listing.category}
      products={listing.pageProducts}
      brands={brandFacet}
      totalCount={listing.totalAfterFilters}
      currentPage={listing.currentPage}
      totalPages={listing.totalPages}
      pageSize={listing.pageSize}
      viewMode={viewMode}
      priceSliderMax={listing.priceSliderMax}
    />
  );
}
