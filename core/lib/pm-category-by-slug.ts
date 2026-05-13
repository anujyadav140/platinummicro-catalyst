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

import { unstable_cache } from 'next/cache';
import { client } from '~/client';
import { graphql } from '~/client/graphql';
import { revalidate } from '~/client/revalidate-target';
import { PM_CATEGORIES } from '~/lib/pm-categories';
import { stripPmHeroBlock } from '~/lib/pm-hero-banner';
import {
  parsePmPageSections,
  type PmPageSection,
} from '~/lib/pm-page-sections';
import type { PmProduct } from '~/lib/pm-products';

// ─── "Selling fast" data sources ────────────────────────────────────────────
// Two real BC signals drive the badge — neither is a per-product field in
// the Storefront API, so we fetch each as a separate list of entity IDs:
//
//   1. `featuredProducts` — the products the admin marked "Featured" in
//      BC admin → Edit Product → "Featured Product". Mirrors the same
//      checkbox the legacy Platinum Micro site used.
//   2. `bestSellingProducts` — BC's automatic top-sellers ranked by
//      actual order volume.
//
// Each list is fetched once per 5-min window and shared via unstable_cache,
// so every PLP/PDP/search render reuses the same lookup.
const PmFeaturedAndBestSellingIdsQuery = graphql(`
  query PmFeaturedAndBestSellingIdsQuery {
    site {
      featuredProducts(first: 50) {
        edges {
          node {
            entityId
          }
        }
      }
      bestSellingProducts(first: 50) {
        edges {
          node {
            entityId
          }
        }
      }
    }
  }
`);

const cachedSellingFastIds = unstable_cache(
  async (): Promise<{ featured: number[]; bestSelling: number[] }> => {
    try {
      const { data } = await client.fetch({
        document: PmFeaturedAndBestSellingIdsQuery,
        fetchOptions: { next: { revalidate: 300 } },
      });
      const extract = (edges: ReadonlyArray<{ node?: { entityId: number } | null } | null>) =>
        edges
          .map((edge) => edge?.node?.entityId)
          .filter((id): id is number => typeof id === 'number');
      return {
        featured: extract(data?.site?.featuredProducts?.edges ?? []),
        bestSelling: extract(data?.site?.bestSellingProducts?.edges ?? []),
      };
    } catch {
      // Don't fail the whole listing if these lookups fail — just no badge.
      return { featured: [], bestSelling: [] };
    }
  },
  ['pm-selling-fast-ids'],
  { revalidate: 300, tags: ['pm-selling-fast'] },
);

/**
 * Returns a Set of BC product entity IDs that should display the
 * "Selling fast" badge — the union of admin-flagged featured products
 * and BC's auto-ranked top sellers.
 */
export async function fetchBestSellingProductIds(): Promise<Set<number>> {
  const { featured, bestSelling } = await cachedSellingFastIds();
  return new Set([...featured, ...bestSelling]);
}

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
  /** Admin-managed page sections (hero banners + card grids, in
   *  document order) parsed from the BC category description. Empty
   *  array when nothing is configured. The shell renders each entry
   *  by dispatching on `section.kind`. */
  pageSections?: PmPageSection[];
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
// `site.route()`, then read products from that Category node AND from
// each direct child category. This makes "hub" categories like BUNDLES
// (which has zero direct products, but 20 across its `AI Solutions` and
// `NAS Server` children) render correctly without hard-coding any child
// IDs in app code — when admin adds a 4th child under BUNDLES tomorrow,
// its products show up automatically.
//
// Why one level of `children`, not recursive: BC's GraphQL Storefront
// API doesn't support arbitrary descendant traversal in a single query,
// and our category tree is two levels deep in practice. If a future
// admin adds a 3rd level, refactor this to `searchProducts` with
// `categoryEntityIds: [parent, ...all_descendants]` and a tree walk.
// BC caps `first` at 50 — that's fine here, each child gets its own 50.
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
            defaultImage {
              url: urlTemplate(lossy: true)
              altText
            }
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
                    url: urlTemplate(lossy: true)
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
  /** Built-in BC "Category Image" URL — falls into the hero banner as the
   *  background image when the description block doesn't override it. */
  bcCategoryImageUrl?: string;
}

/**
 * Walk BC's categoryTree to find the direct children of a given entityId.
 * Returns each child's storefront path so we can re-use the same
 * PmCategoryProductsQuery to pull their products.
 *
 * Used when a "hub" category (e.g. BUNDLES with id=73) has 0 direct
 * products but has children that hold the actual products. The query
 * is cached for 120s by the surrounding `unstable_cache` in the parent
 * fetcher, so the cost of this extra trip is amortized across renders.
 */
const PmCategoryChildrenQuery = graphql(`
  query PmCategoryChildrenQuery {
    site {
      categoryTree {
        entityId
        path
        children {
          entityId
          path
          children {
            entityId
            path
          }
        }
      }
    }
  }
`);

interface CategoryTreeNode {
  entityId: number;
  path: string;
  children?: CategoryTreeNode[];
}

function findDescendants(
  tree: CategoryTreeNode[],
  targetEntityId: number,
): CategoryTreeNode[] {
  for (const top of tree) {
    if (top.entityId === targetEntityId) {
      return collectAll(top.children ?? []);
    }
    if (top.children?.length) {
      const found = findDescendants(top.children, targetEntityId);
      if (found.length > 0) return found;
    }
  }
  return [];
}

/**
 * Find the parent of `targetEntityId` in the tree, plus the parent's
 * other children (i.e., siblings of the target). Used as a last-resort
 * fallback for empty-leaf categories: BC admins sometimes create
 * placeholder aggregates like "All Bundles" intending them to surface
 * everything under a parent, but never populate them with the actual
 * products. Rather than render an empty page, we climb up and pull from
 * the siblings. Returns `null` when the target is a top-level node.
 */
function findSiblings(
  tree: CategoryTreeNode[],
  targetEntityId: number,
): CategoryTreeNode[] | null {
  for (const top of tree) {
    if (top.children?.some((c) => c.entityId === targetEntityId)) {
      return top.children.filter((c) => c.entityId !== targetEntityId);
    }
    if (top.children?.length) {
      const found = findSiblings(top.children, targetEntityId);
      if (found !== null) return found;
    }
  }
  return null;
}

function collectAll(nodes: CategoryTreeNode[]): CategoryTreeNode[] {
  const out: CategoryTreeNode[] = [];
  for (const n of nodes) {
    out.push(n);
    if (n.children?.length) out.push(...collectAll(n.children));
  }
  return out;
}

async function fetchPmCategoryRawProducts(slug: string): Promise<PmCategoryFetchResult> {
  // BC nests brand subcategories under `/brand/` (e.g.
  // `/brand/hewlett-packard-enterprise/`). Try the slug at root first;
  // if BC doesn't find a category there, retry under `/brand/`. This
  // makes the mega-menu's partner-brand chips link straight to the
  // right BC category without needing a separate /brand/ route.
  const candidatePaths = [`/${slug}/`, `/brand/${slug}/`];

  const fetchAtPath = async (path: string) => {
    const { data } = await client.fetch({
      document: PmCategoryProductsQuery,
      variables: { path },
      fetchOptions: { next: { revalidate } },
    });
    return data?.site?.route?.node ?? null;
  };

  let node: Awaited<ReturnType<typeof fetchAtPath>> = null;
  for (const path of candidatePaths) {
    const candidate = await fetchAtPath(path);
    if (candidate && candidate.__typename === 'Category') {
      node = candidate;
      break;
    }
  }

  // Fallback: if neither `/slug/` nor `/brand/slug/` resolves, walk the
  // categoryTree to find any category whose canonical storefront path
  // ENDS in `/${slug}/`. This handles nested categories whose BC path
  // is e.g. `/bundles/all-bundles/` — our routes are flat
  // (`/dev/preview/category/all-bundles/`) but the BC node sits inside
  // a parent. Without this, sub-category mega-menu links 404.
  if (!node) {
    try {
      const { data: treeData } = await client.fetch({
        document: PmCategoryChildrenQuery,
        fetchOptions: { next: { revalidate } },
      });
      const tree = (treeData?.site?.categoryTree ?? []) as CategoryTreeNode[];
      const allNodes = collectAll(tree);
      const slugSuffix = `/${slug}/`;
      const matched = allNodes.find((n) => n.path.endsWith(slugSuffix));
      if (matched) {
        const candidate = await fetchAtPath(matched.path);
        if (candidate && candidate.__typename === 'Category') {
          node = candidate;
        }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(
        '[pm-category-by-slug] tree-lookup fallback failed:',
        err,
      );
    }
  }

  if (!node || node.__typename !== 'Category') {
    return { products: [] };
  }

  // Pull BC's best-seller list once so the "Selling fast" badge on each
  // card reflects real sales velocity (cached for 5 min).
  const bestSellingIds = await fetchBestSellingProductIds();

  const directEdges = node.products?.edges ?? [];

  // Mapper shared by direct-children and descendant-cascade paths so the
  // shape is identical regardless of where the product was sourced.
  //
  // Drops products whose BC `path` is empty. BC's GraphQL returns "" for
  // path when the admin hasn't set / hasn't generated a custom URL for
  // the product — rendering a card whose `href` is "/dev/preview/product/"
  // would just bounce the user to a 404. Better to hide it AND log a
  // clear signal so the admin can fix the BC record. The sandbox has at
  // least one of these today: the Nvidia DGX Spark bundle (entityId 5979).
  const mapEdge = (edge: (typeof directEdges)[number], index: number) => {
    const n = edge?.node;
    if (!n) return null;
    if (!n.path || n.path.trim() === '') {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn(
          `[pm-category-by-slug] skipping product entityId=${n.entityId} sku=${n.sku} name="${n.name}" — empty path from BC. Fix: BC admin → Products → "${n.name}" → set a Custom URL.`,
        );
      }
      return null;
    }
    return augmentToInternal({
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
      bestSellingIds,
    });
  };

  // Track BC's RAW edge count separately from our post-filter result.
  // If BC said "this category has products" but we dropped them all
  // (e.g., every product in here has an empty path), we should report
  // "0 products" honestly — NOT cascade into siblings, because that
  // would show a different category's content under the wrong heading
  // (user clicks "AI Solutions" → sees NAS bundles → confused).
  const bcSaidEmpty = directEdges.length === 0;
  let products = directEdges
    .map(mapEdge)
    .filter((p): p is PmInternalProduct => p !== null);

  // Empty-category cascade. Two-step fallback:
  //
  //   1. HUB CASCADE — the resolved category has 0 direct products but
  //      has child categories of its own (e.g. BUNDLES → AI Solutions,
  //      NAS Server). Pull every descendant's products and merge.
  //
  //   2. SIBLING CASCADE — the resolved category is empty AND has no
  //      children (e.g. "All Bundles", a placeholder aggregate the BC
  //      admin never populated). Climb to the parent and pull from the
  //      target's siblings. This is the "user landed on /bundles/
  //      all-bundles/ expecting to see all bundles" case.
  //
  // Both paths dedup by BC entityId — the same product is often in
  // multiple categories (Asustor NAS shows up in both "NAS Server" and
  // the legacy "NAS Bundle" parent), and BC's tree happily lists it
  // twice.
  const pullProductsForNodes = async (nodes: CategoryTreeNode[]) => {
    const childResults = await Promise.all(
      nodes.map((child) => fetchAtPath(child.path).catch(() => null)),
    );
    const seen = new Set<number>();
    const merged: PmInternalProduct[] = [];
    for (const child of childResults) {
      if (!child || child.__typename !== 'Category') continue;
      for (const [i, edge] of (child.products?.edges ?? []).entries()) {
        const mapped = mapEdge(edge, merged.length + i);
        if (mapped && !seen.has(mapped.id)) {
          seen.add(mapped.id);
          merged.push(mapped);
        }
      }
    }
    return merged;
  };

  if (products.length === 0 && bcSaidEmpty && node.entityId) {
    try {
      const { data: treeData } = await client.fetch({
        document: PmCategoryChildrenQuery,
        fetchOptions: { next: { revalidate } },
      });
      const tree = (treeData?.site?.categoryTree ?? []) as CategoryTreeNode[];

      // Step 1 — hub cascade
      const descendants = findDescendants(tree, node.entityId);
      if (descendants.length > 0) {
        products = await pullProductsForNodes(descendants);
      }

      // Step 2 — sibling cascade. Only runs if step 1 produced nothing
      // (either no descendants, or descendants also had no products).
      if (products.length === 0) {
        const siblings = findSiblings(tree, node.entityId);
        if (siblings && siblings.length > 0) {
          // For each sibling, also walk INTO its descendants — that's
          // how the "All Bundles" → AI Solutions / NAS Server case
          // resolves: All Bundles' siblings are AI Solutions and NAS
          // Server, both of which carry their own products directly.
          const siblingsAndTheirDescendants = collectAll(siblings);
          products = await pullProductsForNodes(siblingsAndTheirDescendants);
        }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(
        '[pm-category-by-slug] descendant cascade failed:',
        err,
      );
    }
  }

  return {
    products,
    bcCategoryName: node.name,
    bcCategoryDescription: node.description ?? undefined,
    bcCategoryImageUrl: node.defaultImage?.url ?? undefined,
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
 * (rating, sale, featured) stay consistent across pages — a product looks
 * the same on a category grid and on a search results page.
 *
 * The `sellingFast` flag is BC-data-driven: pass the result of
 * `fetchBestSellingProductIds()` as `bestSellingIds` and any product whose
 * entityId appears in BC's top-sellers list gets the badge (gated by stock).
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
  /** Union of BC's `featuredProducts` + `bestSellingProducts` IDs
   *  (see `fetchBestSellingProductIds`). Drives the "Selling fast"
   *  badge: products in this set get the badge when in stock. */
  bestSellingIds?: Set<number>;
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
    // "Selling fast" — gated by stock, then a hit in `bestSellingIds`
    // (which already unions BC's admin-flagged featured products with
    // BC's auto-ranked top sellers — see `fetchBestSellingProductIds`).
    sellingFast: input.inStock && (input.bestSellingIds?.has(id) ?? false),
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
  let bcCategoryImageUrl: string | undefined;
  try {
    const result = await fetchPmCategoryRawProducts(slug);
    raw = result.products;
    bcCategoryName = result.bcCategoryName;
    bcCategoryDescription = result.bcCategoryDescription;
    bcCategoryImageUrl = result.bcCategoryImageUrl;
  } catch (err) {
    // Don't throw — the category page should always render the chrome even
    // when BC is down or the slug doesn't resolve. Log so 4xx/5xx isn't
    // hidden during dev.
    // eslint-disable-next-line no-console
    console.warn('[pm-category-by-slug] fetch failed:', err);
    raw = [];
  }

  const baseDescriptor = descriptorFor(slug);
  // Parse all admin-managed sections (heroes + card grids) out of the
  // BC description in document order. Then strip the config fences
  // from the displayed description so they never leak into the UI.
  // The BC "Category Image" feeds in as the fallback background image
  // for the FIRST hero — admins set it via BC's drag-drop image
  // uploader, no URL typing needed.
  const pageSections = parsePmPageSections(
    bcCategoryDescription,
    bcCategoryImageUrl,
  );
  const cleanedBcDescription = stripPmHeroBlock(bcCategoryDescription);
  const category: PmCategoryDescriptor = {
    ...baseDescriptor,
    name:
      PM_CATEGORY_DESCRIPTORS[slug]?.name ??
      bcCategoryName ??
      baseDescriptor.name,
    description:
      baseDescriptor.description ?? (cleanedBcDescription || undefined),
    pageSections,
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
