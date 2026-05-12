import { fetchPmBrandListing, fetchPmSearchListing } from '~/lib/pm-search';
import {
  buildBrandFacet,
  PM_CATEGORY_PAGE_SIZES,
  type PmAvailability,
  type PmCategorySort,
} from '~/lib/pm-category-by-slug';
import { fetchPmBrandBanner } from '~/lib/pm-brand-banner-fetcher';
import { fetchPmPageBanner } from '~/lib/pm-page-banner-fetcher';
import { PmCategoryListing } from '~/components/pm-category-listing';
import { PmPageSectionsRenderer } from '~/components/pm-page-sections-renderer';
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

/** Parse `?bids=39,40,41` into a deduped array of positive ints. */
function parseBrandIds(raw: string | undefined): number[] {
  if (!raw) return [];
  const ids = raw
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);
  return [...new Set(ids)];
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

  // Brand-listing mode (used by the mega-menu partner-brand chips):
  // when `?bids=` is set, fetch products across the listed BC brand
  // IDs instead of running a search-term query. `heading` controls
  // the page title (e.g. "HPE" instead of `Results for "..."`).
  const brandIds = parseBrandIds(firstString(sp.bids));
  const heading = firstString(sp.heading)?.trim() ?? '';

  const filters = {
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
  };

  // Brand-mode → fetch sections from the matching "Mega Menu Brands"
  // subcategory description. Plain-search mode → fetch sections from
  // the "PM Page Banners → search" config category. Both return an
  // ordered list of sections (heroes + card grids), and the renderer
  // dispatches on section.kind.
  const isBrandMode = brandIds.length > 0;
  const [listing, sections] = await Promise.all([
    isBrandMode
      ? fetchPmBrandListing(brandIds, heading || 'Brand', filters)
      : fetchPmSearchListing(rawQuery, filters),
    isBrandMode
      ? fetchPmBrandBanner(heading || 'Brand')
      : fetchPmPageBanner('search'),
  ]);

  const brandFacet = buildBrandFacet(listing.allProducts);

  return (
    <>
      <PmPageSectionsRenderer sections={sections} />
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
    </>
  );
}
