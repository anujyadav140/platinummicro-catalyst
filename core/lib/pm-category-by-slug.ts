/**
 * pm-category-by-slug
 * -------------------
 * Server-side category + filtered product fetcher for the Platinum Micro
 * category listing page.
 *
 * Strategy: We tried two paths during the design preview build:
 *   1. BC `searchProducts` GraphQL with a `categoryEntityId` filter — the
 *      "right" path, but it requires us to know the BC entityId for each
 *      slug ("servers" → 23) and we don't yet have a curated mapping wired
 *      to the live sandbox catalog.
 *   2. `newestProducts(first: N)` fall-back — pulls a single broad list of
 *      products and lets us filter brand/price/inStock client-side. Same
 *      product shape used by the homepage grid.
 *
 * For now this file ships path (2). Brand, price, stock, rating, sale, and
 * featured filters are applied in JS over the fetched product list. Once we
 * wire BC categories, swap the inner fetch for a `searchProducts` call —
 * the public function signature is already filter-aware so downstream code
 * won't change.
 *
 * Mock fields (rating, salePrice, featured) are deterministically derived
 * from the entityId so the same product always shows the same values across
 * page loads. Once BC starts returning these we drop the mocks.
 */

import { client } from '~/client';
import { graphql } from '~/client/graphql';
import { revalidate } from '~/client/revalidate-target';
import { PM_CATEGORIES } from '~/lib/pm-categories';
import type { PmProduct } from '~/lib/pm-products';

export type PmCategorySort =
  | 'featured'
  | 'newest'
  | 'best-selling'
  | 'a-z'
  | 'z-a'
  | 'by-review'
  | 'price-asc'
  | 'price-desc';

export type PmAvailability = 'in-stock' | 'backorder';

export interface PmCategoryFilters {
  brands?: string[];
  categories?: string[];
  availability?: PmAvailability[];
  inStockOnly?: boolean;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  onSale?: boolean;
  featured?: boolean;
}

export interface PmCategoryQuery extends PmCategoryFilters {
  sort?: PmCategorySort;
  page?: number;
  pageSize?: number;
}

export interface PmCategoryDescriptor {
  slug: string;
  name: string;
  description?: string;
  bannerImageUrl?: string;
}

export interface PmCategoryListing {
  category: PmCategoryDescriptor;
  /** All products in the (broad) category before facet filters — used to compute facet counts */
  allProducts: PmProduct[];
  /** Products visible on the current page (after filters + sort + pagination) */
  pageProducts: PmProduct[];
  /** Total products after filters but before pagination */
  totalAfterFilters: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  /**
   * Highest product price observed in `allProducts` (rounded up to a tidy
   * value — see roundUpSliderMax). The price-range slider uses this as its
   * upper bound. Falls back to a sensible default when no price data is
   * available so the slider never collapses to width 0.
   */
  priceSliderMax: number;
}

const PM_CATEGORY_DESCRIPTORS: Record<string, PmCategoryDescriptor> = {
  servers: {
    slug: 'servers',
    name: 'Servers',
    description:
      'Tower, rack, and blade servers from HPE, Dell, Lenovo, and Supermicro. Real lead times, configured the way enterprise integrators expect.',
    bannerImageUrl:
      'https://platinummicro.com/product_images/uploaded_images/servers-category.jpg',
  },
  storage: {
    slug: 'storage',
    name: 'Storage',
    description:
      'Enterprise SAS, SATA, and NVMe drives, plus storage arrays and JBOD enclosures.',
    bannerImageUrl:
      'https://platinummicro.com/product_images/uploaded_images/storage-category.jpg',
  },
  networking: {
    slug: 'networking',
    name: 'Networking',
    description:
      'Switches, transceivers, and routers for data center and campus networks.',
  },
  components: {
    slug: 'components',
    name: 'Components',
    description: 'CPUs, memory, GPUs, and chassis components — all OEM-backed.',
  },
  software: {
    slug: 'software',
    name: 'Software',
    description: 'OS, virtualization, and security licenses for enterprise fleets.',
  },
  bundles: {
    slug: 'bundles',
    name: 'Bundles',
    description: 'Pre-configured stacks priced for volume rollouts.',
  },
};

// We resolve the category by its storefront path (`/servers/`) via
// `site.route()`, then read products from that Category node. This avoids
// needing a curated slug → entityId mapping while still giving us real
// per-category filtering. BC caps `first` at 50.
const PmCategoryProductsQuery = graphql(`
  query PmCategoryProductsQuery($path: String!) {
    site {
      route(path: $path) {
        node {
          __typename
          ... on Category {
            entityId
            name
            path
            description
            products(first: 50) {
              edges {
                node {
                  entityId
                  sku
                  name
                  path
                  brand {
                    name
                  }
                  defaultImage {
                    altText
                    url(width: 500, height: 500)
                  }
                  inventory {
                    isInStock
                  }
                  prices {
                    price {
                      value
                      currencyCode
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`);

function formatPrice(price?: { value: number; currencyCode: string } | null): string | undefined {
  if (!price) return undefined;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: price.currencyCode,
    maximumFractionDigits: 0,
  }).format(price.value);
}

function priceValue(p: PmInternalProduct): number | undefined {
  return p._priceValue;
}

export interface PmInternalProduct extends PmProduct {
  _priceValue?: number;
  _rating: number;
  _salePrice?: number;
  _featured: boolean;
  _bestSellingRank: number;
  _newestIndex: number;
}

/**
 * Deterministic pseudo-random number generator from a seed (0..1).
 * BC sandbox doesn't expose review/sale/featured data so we mock these
 * from the entityId so the same product always shows the same values.
 */
export function seedRand(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

interface PmCategoryFetchResult {
  products: PmInternalProduct[];
  /** Live category name from BC ("SERVERS", "Storage", …). Use this when we
   *  want to honor the merchant's casing; the descriptor table holds the
   *  display label we use as the canonical title. */
  bcCategoryName?: string;
  bcCategoryDescription?: string;
}

async function fetchPmCategoryRawProducts(slug: string): Promise<PmCategoryFetchResult> {
  const path = `/${slug}/`;
  const { data } = await client.fetch({
    document: PmCategoryProductsQuery,
    variables: { path },
    fetchOptions: { next: { revalidate } },
  });

  const node = data?.site?.route?.node;
  if (!node || node.__typename !== 'Category') {
    return { products: [] };
  }

  const edges = node.products?.edges ?? [];

  const products = edges
    .map((edge) => edge?.node)
    .filter((node): node is NonNullable<typeof node> => node != null)
    .map((node, index) =>
      augmentToInternal({
        id: node.entityId,
        sku: node.sku,
        name: node.name,
        bcPath: node.path,
        brand: node.brand?.name,
        imageUrl: node.defaultImage?.url ?? undefined,
        imageAlt: node.defaultImage?.altText ?? undefined,
        priceValue: node.prices?.price?.value,
        priceLabel: formatPrice(node.prices?.price),
        inStock: node.inventory?.isInStock ?? false,
        newestIndex: index,
      }),
    );

  return {
    products,
    bcCategoryName: node.name,
    bcCategoryDescription: node.description ?? undefined,
  };
}

export function applyFilters(
  products: PmInternalProduct[],
  filters: PmCategoryFilters,
): PmInternalProduct[] {
  return products.filter((p) => {
    if (filters.brands && filters.brands.length > 0) {
      if (!p.brand || !filters.brands.includes(p.brand)) return false;
    }
    if (filters.inStockOnly && !p.inStock) return false;
    if (filters.availability && filters.availability.length > 0) {
      const matches = filters.availability.some((mode) => {
        if (mode === 'in-stock') return p.inStock;
        if (mode === 'backorder') return !p.inStock;
        return false;
      });
      if (!matches) return false;
    }
    if (typeof filters.minPrice === 'number' && filters.minPrice > 0) {
      const v = priceValue(p);
      if (v == null || v < filters.minPrice) return false;
    }
    if (typeof filters.maxPrice === 'number' && filters.maxPrice > 0) {
      const v = priceValue(p);
      if (v == null || v > filters.maxPrice) return false;
    }
    if (typeof filters.minRating === 'number' && filters.minRating > 0) {
      if (p._rating < filters.minRating) return false;
    }
    if (filters.onSale) {
      const sale = p._salePrice;
      const orig = p._priceValue;
      if (sale == null || orig == null || sale >= orig) return false;
    }
    if (filters.featured && !p._featured) return false;
    return true;
  });
}

export function applySort(products: PmInternalProduct[], sort: PmCategorySort): PmInternalProduct[] {
  const copy = [...products];
  switch (sort) {
    case 'price-asc':
      return copy.sort((a, b) => (priceValue(a) ?? Infinity) - (priceValue(b) ?? Infinity));
    case 'price-desc':
      return copy.sort((a, b) => (priceValue(b) ?? -Infinity) - (priceValue(a) ?? -Infinity));
    case 'newest':
      return copy.sort((a, b) => a._newestIndex - b._newestIndex);
    case 'best-selling':
      return copy.sort((a, b) => a._bestSellingRank - b._bestSellingRank);
    case 'a-z':
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    case 'z-a':
      return copy.sort((a, b) => b.name.localeCompare(a.name));
    case 'by-review':
      return copy.sort((a, b) => b._rating - a._rating);
    case 'featured':
    default:
      return copy.sort((a, b) => {
        if (a._featured === b._featured) return 0;
        return a._featured ? -1 : 1;
      });
  }
}

function descriptorFor(slug: string): PmCategoryDescriptor {
  if (PM_CATEGORY_DESCRIPTORS[slug]) return PM_CATEGORY_DESCRIPTORS[slug];

  const fromList = PM_CATEGORIES.find((c) => c.key === slug);
  if (fromList) return { slug, name: fromList.label };

  // Last resort: title-case the slug
  const name = slug
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
  return { slug, name };
}

export function stripInternal(p: PmInternalProduct): PmProduct {
  const {
    _priceValue: _v,
    _rating: _r,
    _salePrice: _s,
    _featured: _f,
    _bestSellingRank: _bs,
    _newestIndex: _ni,
    ...rest
  } = p;
  void _v;
  void _r;
  void _s;
  void _f;
  void _bs;
  void _ni;
  return rest;
}

export const PM_CATEGORY_PAGE_SIZES = [12, 24, 36, 48, 96] as const;
export const PM_CATEGORY_DEFAULT_PAGE_SIZE = 24;

/** Fallback when no products have a price — keeps the slider usable. */
const PRICE_SLIDER_FALLBACK_MAX = 10000;

/**
 * Round the observed max price up to a tidy value so the slider's upper
 * bound feels intentional (e.g. $11,108 → $12,000, $487 → $500). Step size
 * scales with magnitude so big-ticket categories don't snap to absurdly
 * coarse buckets.
 */
export function roundUpSliderMax(maxPrice: number): number {
  if (!Number.isFinite(maxPrice) || maxPrice <= 0) {
    return PRICE_SLIDER_FALLBACK_MAX;
  }
  const step = maxPrice >= 10000 ? 1000 : maxPrice >= 1000 ? 100 : 10;
  return Math.ceil(maxPrice / step) * step;
}

/**
 * Shared "augment raw BC product into PmInternalProduct" helper. Both the
 * category fetcher and the search fetcher use this so the mock fields
 * (rating, sale, featured, sellingFast) stay consistent across pages — a
 * product looks the same on a category grid and on a search results page.
 */
export function augmentToInternal(input: {
  id: number;
  sku?: string | null;
  name: string;
  /** BC's `path` like "/cyberforge-alpha/" */
  bcPath: string;
  brand?: string | null;
  imageUrl?: string;
  imageAlt?: string;
  priceValue?: number | null;
  priceLabel?: string;
  inStock: boolean;
  newestIndex: number;
}): PmInternalProduct {
  const id = input.id;
  const r1 = seedRand(id);
  const r2 = seedRand(id + 7);
  const r3 = seedRand(id + 13);
  const priceVal = input.priceValue ?? undefined;

  const rating = Math.round((2.5 + r1 * 2.5) * 2) / 2;
  const onSale = r2 < 0.25 && priceVal != null;
  const salePrice = onSale && priceVal ? priceVal * (0.6 + r3 * 0.3) : undefined;
  const featured = r3 < 0.3;

  return {
    id,
    sku: input.sku ?? `bc-${id}`,
    name: input.name,
    href: `/dev/preview/product${input.bcPath}`,
    brand: input.brand ?? undefined,
    imageUrl: input.imageUrl,
    imageAlt: input.imageAlt ?? input.name,
    priceLabel: input.priceLabel,
    inStock: input.inStock,
    sellingFast: Math.floor(r2 * 1000) < 200,
    _priceValue: priceVal,
    _rating: rating,
    _salePrice: salePrice,
    _featured: featured,
    _bestSellingRank: Math.floor(r2 * 1000),
    _newestIndex: input.newestIndex,
  };
}

/**
 * Apply filters + sort + pagination to a raw set of augmented products.
 * Returns the listing shape (minus the category descriptor — caller fills
 * that in). Reused by the category page and the search results page so
 * facets/sort behavior is identical.
 */
export function buildPmListing(
  raw: PmInternalProduct[],
  query: PmCategoryQuery = {},
): Omit<PmCategoryListing, 'category'> {
  const requestedSize = query.pageSize ?? PM_CATEGORY_DEFAULT_PAGE_SIZE;
  const pageSize = (PM_CATEGORY_PAGE_SIZES as readonly number[]).includes(requestedSize)
    ? requestedSize
    : PM_CATEGORY_DEFAULT_PAGE_SIZE;
  const currentPage = Math.max(1, query.page ?? 1);
  const sort = query.sort ?? 'featured';

  const observedMaxPrice = raw.reduce((max, p) => {
    const v = p._priceValue;
    return v != null && v > max ? v : max;
  }, 0);
  const priceSliderMax = roundUpSliderMax(observedMaxPrice);

  const filtered = applyFilters(raw, {
    brands: query.brands,
    categories: query.categories,
    availability: query.availability,
    inStockOnly: query.inStockOnly,
    minPrice: query.minPrice,
    maxPrice: query.maxPrice,
    minRating: query.minRating,
    onSale: query.onSale,
    featured: query.featured,
  });
  const sorted = applySort(filtered, sort);
  const totalAfterFilters = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalAfterFilters / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageSlice = sorted.slice(start, start + pageSize);

  return {
    allProducts: raw.map(stripInternal),
    pageProducts: pageSlice.map(stripInternal),
    totalAfterFilters,
    totalPages,
    currentPage: safePage,
    pageSize,
    priceSliderMax,
  };
}

export async function fetchPmCategoryListing(
  slug: string,
  query: PmCategoryQuery = {},
): Promise<PmCategoryListing> {
  let raw: PmInternalProduct[] = [];
  let bcCategoryName: string | undefined;
  let bcCategoryDescription: string | undefined;
  try {
    const result = await fetchPmCategoryRawProducts(slug);
    raw = result.products;
    bcCategoryName = result.bcCategoryName;
    bcCategoryDescription = result.bcCategoryDescription;
  } catch (err) {
    // Don't throw — the category page should always render the chrome even
    // when BC is down or the slug doesn't resolve. Log so 4xx/5xx isn't
    // hidden during dev.
    // eslint-disable-next-line no-console
    console.error('[pm-category-by-slug] fetch failed:', err);
    raw = [];
  }

  const baseDescriptor = descriptorFor(slug);
  const category: PmCategoryDescriptor = {
    ...baseDescriptor,
    name:
      PM_CATEGORY_DESCRIPTORS[slug]?.name ??
      bcCategoryName ??
      baseDescriptor.name,
    description: baseDescriptor.description ?? bcCategoryDescription,
  };

  return {
    category,
    ...buildPmListing(raw, query),
  };
}

/**
 * Build the brand facet from a list of products. Returns the top N brands
 * (by product count) with their counts.
 */
export function buildBrandFacet(
  products: PmProduct[],
  limit = 8,
): Array<{ brand: string; count: number }> {
  const counts = new Map<string, number>();
  for (const p of products) {
    if (!p.brand) continue;
    counts.set(p.brand, (counts.get(p.brand) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([brand, count]) => ({ brand, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
