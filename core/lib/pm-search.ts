/**
 * pm-search
 * ---------
 * Server-side typeahead fetcher for the header search bar. Hits BC's
 * `searchProducts` GraphQL with a `searchTerm` filter, returns up to N
 * lightweight hits shaped for the typeahead panel.
 *
 * Kept independent from `pm-products` / `pm-category-by-slug` because:
 *   - It needs `RELEVANCE` sort (not newest / featured)
 *   - It only fetches the small subset of fields the typeahead row renders
 *     (image, name, brand, sku, price) so the round trip stays fast
 *   - It exposes a `totalCount` so the panel can render
 *     "View all 49 results for {q}"
 */

import { unstable_cache } from 'next/cache';
import { client } from '~/client';
import { graphql } from '~/client/graphql';
import { revalidate } from '~/client/revalidate-target';
import type { PmProduct } from '~/lib/pm-products';
import {
  augmentToInternal,
  buildPmListing,
  fetchBestSellingProductIds,
  type PmCategoryListing,
  type PmCategoryQuery,
  type PmInternalProduct,
} from '~/lib/pm-category-by-slug';

export interface PmSearchHit {
  id: number;
  sku: string;
  name: string;
  /** dev/preview-namespaced product URL */
  href: string;
  brand?: string;
  imageUrl?: string;
  imageAlt: string;
  priceLabel?: string;
  inStock: boolean;
}

export interface PmSearchResult {
  hits: PmSearchHit[];
  /** Total products matching `query` server-side, regardless of `limit` */
  totalCount: number;
  /** Echo of the trimmed query so the client can avoid stale-result flashes */
  query: string;
}

const PmSearchQuery = graphql(`
  query PmSearchQuery($searchTerm: String!, $limit: Int!) {
    site {
      search {
        searchProducts(filters: { searchTerm: $searchTerm }, sort: RELEVANCE) {
          products(first: $limit) {
            collectionInfo {
              totalItems
            }
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
                  url(width: 96, height: 96)
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
`);

function formatPrice(price?: { value: number; currencyCode: string } | null): string | undefined {
  if (!price) return undefined;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: price.currencyCode,
    maximumFractionDigits: 0,
  }).format(price.value);
}

// Memoized BC fetch — same (query,limit) pair within the cache window returns
// instantly. Critical for typeahead responsiveness in dev where Next's
// fetch-level `revalidate` doesn't always survive HMR.
const cachedSearchFetch = unstable_cache(
  async (searchTerm: string, limit: number): Promise<PmSearchResult> => {
    const { data } = await client.fetch({
      document: PmSearchQuery,
      variables: { searchTerm, limit },
      fetchOptions: { next: { revalidate } },
    });

    const products = data?.site?.search?.searchProducts?.products;
    const totalCount = products?.collectionInfo?.totalItems ?? 0;
    const edges = products?.edges ?? [];

    const hits: PmSearchHit[] = edges
      .map((edge) => edge?.node)
      .filter((n): n is NonNullable<typeof n> => n != null)
      .map((n) => ({
        id: n.entityId,
        sku: n.sku ?? `bc-${n.entityId}`,
        name: n.name,
        href: `/dev/preview/product${n.path}`,
        brand: n.brand?.name ?? undefined,
        imageUrl: n.defaultImage?.url ?? undefined,
        imageAlt: n.defaultImage?.altText ?? n.name,
        priceLabel: formatPrice(n.prices?.price),
        inStock: n.inventory?.isInStock ?? false,
      }));

    return { hits, totalCount, query: searchTerm };
  },
  ['pm-search-typeahead'],
  { revalidate, tags: ['pm-search'] },
);

export async function searchPmProducts(
  rawQuery: string,
  limit = 8,
): Promise<PmSearchResult> {
  const query = rawQuery.trim();
  if (query.length < 2) {
    return { hits: [], totalCount: 0, query };
  }

  const safeLimit = Math.max(1, Math.min(limit, 50));
  return cachedSearchFetch(query, safeLimit);
}

// ---------------------------------------------------------------------------
// Full search results page
// ---------------------------------------------------------------------------

const PmSearchListingQuery = graphql(`
  query PmSearchListingQuery($searchTerm: String!, $limit: Int!) {
    site {
      search {
        searchProducts(filters: { searchTerm: $searchTerm }, sort: RELEVANCE) {
          products(first: $limit) {
            collectionInfo {
              totalItems
            }
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
                  url(width: 320, height: 320)
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
`);

// We fetch the raw augmented pool (up to 50 hits) once per (query) — the
// page applies filters/sort/pagination on top via `buildPmListing`. Caching
// at the raw layer (not the per-filter layer) means changing a filter
// doesn't trigger another BC roundtrip.
interface PmSearchRawResult {
  rawProducts: PmInternalProduct[];
  totalCount: number;
  query: string;
}

const cachedSearchListingRaw = unstable_cache(
  async (searchTerm: string, limit: number): Promise<PmSearchRawResult> => {
    const { data } = await client.fetch({
      document: PmSearchListingQuery,
      variables: { searchTerm, limit },
      fetchOptions: { next: { revalidate } },
    });

    const searchProducts = data?.site?.search?.searchProducts?.products;
    const totalCount = searchProducts?.collectionInfo?.totalItems ?? 0;
    const edges = searchProducts?.edges ?? [];

    const rawProducts: PmInternalProduct[] = edges
      .map((edge) => edge?.node)
      .filter((n): n is NonNullable<typeof n> => n != null)
      .map((n, index) =>
        augmentToInternal({
          id: n.entityId,
          sku: n.sku,
          name: n.name,
          bcPath: n.path,
          brand: n.brand?.name,
          imageUrl: n.defaultImage?.url ?? undefined,
          imageAlt: n.defaultImage?.altText ?? undefined,
          priceValue: n.prices?.price?.value,
          priceLabel: formatPrice(n.prices?.price),
          inStock: n.inventory?.isInStock ?? false,
          newestIndex: index,
        }),
      );

    return { rawProducts, totalCount, query: searchTerm };
  },
  ['pm-search-listing-raw'],
  { revalidate, tags: ['pm-search'] },
);

// ---------------------------------------------------------------------------
// Multi-brand listing — combines products from several BC brand IDs in one
// pass. Used by the mega-menu partner-brand chips when a single curated brand
// in the storefront represents several BC brand entities (e.g. "Hewlett
// Packard Enterprise" aliases HPE + HPE Networking Instant On).
// ---------------------------------------------------------------------------

const PmBrandListingQuery = graphql(`
  query PmBrandListingQuery($brandIds: [Int!]!, $limit: Int!) {
    site {
      search {
        searchProducts(filters: { brandEntityIds: $brandIds }, sort: FEATURED) {
          products(first: $limit) {
            collectionInfo {
              totalItems
            }
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
                  url(width: 320, height: 320)
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
`);

const cachedBrandListingRaw = unstable_cache(
  async (
    brandIds: number[],
    limit: number,
  ): Promise<{ rawProducts: PmInternalProduct[]; totalCount: number }> => {
    if (brandIds.length === 0) return { rawProducts: [], totalCount: 0 };

    const { data } = await client.fetch({
      document: PmBrandListingQuery,
      variables: { brandIds, limit },
      fetchOptions: { next: { revalidate } },
    });

    const products = data?.site?.search?.searchProducts?.products;
    const totalCount = products?.collectionInfo?.totalItems ?? 0;
    const edges = products?.edges ?? [];

    const rawProducts: PmInternalProduct[] = edges
      .map((edge) => edge?.node)
      .filter((n): n is NonNullable<typeof n> => n != null)
      .map((n, index) =>
        augmentToInternal({
          id: n.entityId,
          sku: n.sku,
          name: n.name,
          bcPath: n.path,
          brand: n.brand?.name,
          imageUrl: n.defaultImage?.url ?? undefined,
          imageAlt: n.defaultImage?.altText ?? undefined,
          priceValue: n.prices?.price?.value,
          priceLabel: formatPrice(n.prices?.price),
          inStock: n.inventory?.isInStock ?? false,
          newestIndex: index,
        }),
      );

    return { rawProducts, totalCount };
  },
  ['pm-brand-listing-raw'],
  { revalidate, tags: ['pm-search'] },
);

/**
 * Apply BC's best-seller data to an already-fetched list of products.
 * The raw fetch is cached on (query, limit) so we can't fold the
 * best-seller lookup inside it without polluting that cache key —
 * instead we post-process here using the separately-cached set.
 *
 * Preserves the `isFeatured`-driven `sellingFast` already set by
 * `augmentToInternal` (either signal triggers the badge).
 */
function applyBestSelling(
  products: PmInternalProduct[],
  bestSellingIds: Set<number>,
): PmInternalProduct[] {
  if (bestSellingIds.size === 0) return products;
  return products.map((p) => ({
    ...p,
    sellingFast: p.inStock && (p.sellingFast || bestSellingIds.has(p.id)),
  }));
}

/**
 * Fetch a product listing across one or more BC brand IDs. Mirrors the shape
 * of `fetchPmSearchListing` so the UI can render it via `PmCategoryListing`.
 *
 * @param brandIds  BC brand entity IDs to combine.
 * @param label     Display label for the listing heading (e.g. "HPE").
 * @param query     Sort / pagination / filter overrides.
 */
export async function fetchPmBrandListing(
  brandIds: number[],
  label: string,
  query: PmCategoryQuery = {},
): Promise<PmSearchListing> {
  if (brandIds.length === 0) {
    return {
      query: label,
      totalMatched: 0,
      category: { slug: 'brand', name: label || 'Brand' },
      allProducts: [],
      pageProducts: [],
      totalAfterFilters: 0,
      totalPages: 1,
      currentPage: 1,
      pageSize: 24,
      priceSliderMax: 10000,
    };
  }

  const [{ rawProducts, totalCount }, bestSellingIds] = await Promise.all([
    cachedBrandListingRaw(brandIds, 50),
    fetchBestSellingProductIds(),
  ]);
  const listing = buildPmListing(
    applyBestSelling(rawProducts, bestSellingIds),
    query,
  );

  return {
    query: label,
    totalMatched: totalCount,
    category: { slug: 'brand', name: label },
    ...listing,
  };
}

export interface PmSearchListing extends PmCategoryListing {
  /** The trimmed query string the listing was built for. */
  query: string;
  /** Total products matched by BC server-side (pre-filter), for the heading. */
  totalMatched: number;
}

/**
 * Full search results listing — same `PmCategoryListing` shape as the
 * category page so we can reuse the `<PmCategoryListing>` component
 * (facet sidebar, sort dropdown, view toggle, pagination, etc).
 */
export async function fetchPmSearchListing(
  rawQuery: string,
  query: PmCategoryQuery = {},
): Promise<PmSearchListing> {
  const trimmed = rawQuery.trim();
  if (trimmed.length < 2) {
    return {
      query: trimmed,
      totalMatched: 0,
      category: { slug: 'search', name: trimmed || 'Search' },
      allProducts: [],
      pageProducts: [],
      totalAfterFilters: 0,
      totalPages: 1,
      currentPage: 1,
      pageSize: 24,
      priceSliderMax: 10000,
    };
  }

  const [{ rawProducts, totalCount }, bestSellingIds] = await Promise.all([
    cachedSearchListingRaw(trimmed, 50),
    fetchBestSellingProductIds(),
  ]);

  const listing = buildPmListing(
    applyBestSelling(rawProducts, bestSellingIds),
    query,
  );

  return {
    query: trimmed,
    totalMatched: totalCount,
    category: { slug: 'search', name: `Results for "${trimmed}"` },
    ...listing,
  };
}
