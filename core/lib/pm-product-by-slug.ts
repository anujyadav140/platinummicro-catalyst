/**
 * pm-product-by-slug
 * ------------------
 * Server-side BigCommerce fetcher that resolves a product by its storefront
 * `path` slug (e.g. `/aaawave-rgb-fan-pack/`) and returns a flat, serializable
 * shape that the PmProductDetail component can consume directly.
 *
 * Why a separate fetcher (vs. extending pm-products.ts):
 *   - Detail page needs many more fields (gallery images, customFields,
 *     description, related products) than the listing/grid card needs.
 *   - Keeps the listing query small and cache-cheap.
 *
 * Image URLs use the `url(width: N, height: N)` selector (sharp, lossy CDN
 * variant) — same pattern as `lib/pm-products.ts`. We do NOT use
 * `urlTemplate` because we don't need client-side resizing on the detail
 * page; fixed sizes are simpler and play nicely with our placeholder fallback.
 */

import { client } from '~/client';
import { graphql } from '~/client/graphql';
import { revalidate } from '~/client/revalidate-target';
import type { PmProduct } from '~/lib/pm-products';

export interface PmProductImage {
  url: string;
  altText: string;
  isDefault: boolean;
}

export interface PmProductSpec {
  name: string;
  value: string;
}

export interface PmCategoryCrumb {
  /** Display label (BC category name) */
  label: string;
  /** dev/preview-namespaced href (`/dev/preview/category/{leaf-slug}/`) */
  href: string;
}

export interface PmProductDetail {
  id: number;
  sku: string;
  name: string;
  href: string;
  brand?: string;
  /** UPC code from BC (top-level Product field, optional in BC's data model) */
  upc?: string;
  /** Up to 8 large-format gallery images (1000x1000) */
  galleryImages: PmProductImage[];
  /** Localized formatted price string */
  priceLabel?: string;
  /** Whether the product is in stock right now */
  inStock: boolean;
  /** Aggregated stock count from BC (only set if inventory tracking is on) */
  stockQuantity?: number;
  /** Plain-text description from BC, truncated to 1200 chars */
  shortDescription?: string;
  /**
   * Full ancestor chain from BC for the deepest category this product is in
   * (root → leaf, leaf inclusive). Empty when the product has no categories.
   * The PDP renders these as the clickable middle segments of the breadcrumb,
   * between "Home" and the product name.
   */
  categoryTrail: PmCategoryCrumb[];
  /** customFields rows for the Specifications tab */
  specs: PmProductSpec[];
  /** Related products for the strip below — already shaped for PmProductGrid */
  related: PmProduct[];
}

const PmProductBySlugQuery = graphql(`
  query PmProductBySlugQuery($path: String!) {
    site {
      route(path: $path) {
        node {
          __typename
          ... on Product {
            entityId
            sku
            upc
            name
            path
            plainTextDescription(characterLimit: 600)
            brand {
              name
            }
            defaultImage {
              altText
              url(width: 1000, height: 1000)
            }
            images(first: 8) {
              edges {
                node {
                  altText
                  url(width: 1000, height: 1000)
                  isDefault
                }
              }
            }
            categories(first: 5) {
              edges {
                node {
                  name
                  path
                  breadcrumbs(depth: 5) {
                    edges {
                      node {
                        name
                        path
                        entityId
                      }
                    }
                  }
                }
              }
            }
            customFields(first: 24) {
              edges {
                node {
                  name
                  value
                }
              }
            }
            inventory {
              isInStock
              aggregated {
                availableToSell
              }
            }
            prices {
              price {
                value
                currencyCode
              }
            }
            relatedProducts(first: 4) {
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

/**
 * Extract the leaf slug from a BC category `path` (e.g. `/servers/rack/` →
 * `rack`). The dev/preview category route is keyed by leaf slug, not by the
 * full BC path, so this mirrors how the homepage / nav links are built.
 * Returns `undefined` for paths we can't parse so the breadcrumb falls back
 * to a non-clickable segment instead of pointing at a broken URL.
 */
function leafSlugFromPath(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  const segments = path.split('/').filter((s) => s.length > 0);
  return segments.at(-1);
}

/**
 * Normalize an all-caps BC category name to title case for display
 * ("SERVERS" → "Servers"). Leaves mixed-case names alone so genuine product
 * naming like "Cisco Catalyst 9000" or model numbers like "DL360" survive
 * unchanged. Multi-word inputs ("RACK SERVERS" → "Rack Servers") work too.
 */
function softTitleCase(name: string): string {
  if (!name) return name;
  // Heuristic: only normalize if the string contains no lowercase letters
  // at all. Any lowercase character implies the merchant chose this casing
  // intentionally.
  if (/[a-z]/.test(name)) return name;
  return name
    .split(/(\s+)/)
    .map((part) =>
      /^\s+$/.test(part)
        ? part
        : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
    )
    .join('');
}

/**
 * Resolve a product by its storefront slug.
 *
 * Pass either a leading-slash path (`/foo/`) or a bare slug (`foo`) — we
 * normalize internally. BigCommerce's `site.route(path:)` is what powers the
 * stock storefront's URL resolution, so any URL that works on the live store
 * will work here.
 *
 * Returns `null` when the path resolves to anything other than a Product
 * (e.g. a Category, a redirect, a missing slug). Caller decides what to do —
 * the page-level component renders a 404.
 */
export async function fetchPmProductBySlug(slug: string): Promise<PmProductDetail | null> {
  const path = slug.startsWith('/') ? slug : `/${slug}/`;

  const { data } = await client.fetch({
    document: PmProductBySlugQuery,
    variables: { path },
    fetchOptions: { next: { revalidate } },
  });

  const node = data?.site?.route?.node;
  if (!node || node.__typename !== 'Product') return null;

  const galleryImages: PmProductImage[] = (node.images?.edges ?? [])
    .map((edge) => edge?.node)
    .filter((n): n is NonNullable<typeof n> => n != null)
    .map((n) => ({
      url: n.url,
      altText: n.altText ?? node.name,
      isDefault: n.isDefault ?? false,
    }));

  // BC's images list does not always include the default image when the
  // product has only one — fall back to defaultImage so we never render an
  // empty gallery for products that have a hero shot.
  if (galleryImages.length === 0 && node.defaultImage?.url) {
    galleryImages.push({
      url: node.defaultImage.url,
      altText: node.defaultImage.altText ?? node.name,
      isDefault: true,
    });
  }

  const specs: PmProductSpec[] = (node.customFields?.edges ?? [])
    .map((edge) => edge?.node)
    .filter((n): n is NonNullable<typeof n> => n != null)
    .map((n) => ({ name: n.name, value: n.value }));

  // Pick the most user-meaningful category chain for the breadcrumb.
  //
  // BC returns `categories` in unspecified order, and PM's BC store has a
  // hidden "BRAND > {brand name}" tree alongside the user-facing taxonomy
  // ("Servers", "Storage", …). Naively picking the deepest chain surfaces
  // the brand tree, which is wrong: customers navigated from Servers, not
  // from a brand index. So:
  //   1. Drop any chain whose root crumb looks like the brand tree
  //      (name "Brand"/"Brands" or path under `/brand/`).
  //   2. Of the survivors, pick the deepest (most specific) chain.
  //   3. Fall back to the brand chain only if nothing else exists, since
  //      a half-broken breadcrumb is worse than a brand-rooted one.
  const categoryNodes = (node.categories?.edges ?? [])
    .map((edge) => edge?.node)
    .filter((n): n is NonNullable<typeof n> => n != null);

  const isBrandRooted = (cat: (typeof categoryNodes)[number]): boolean => {
    const root = cat.breadcrumbs?.edges?.[0]?.node;
    if (!root) return false;
    const rootName = root.name.toLowerCase();
    if (rootName === 'brand' || rootName === 'brands') return true;
    return root.path?.toLowerCase().startsWith('/brand') ?? false;
  };

  const pickDeepest = (
    pool: typeof categoryNodes,
  ): (typeof categoryNodes)[number] | undefined => {
    if (pool.length === 0) return undefined;
    const depths = pool.map((c) => (c.breadcrumbs?.edges ?? []).length);
    return pool[depths.indexOf(Math.max(...depths))];
  };

  const primaryCandidates = categoryNodes.filter((c) => !isBrandRooted(c));
  const primaryCategory =
    pickDeepest(primaryCandidates) ?? pickDeepest(categoryNodes);

  const categoryTrail: PmCategoryCrumb[] = primaryCategory
    ? (primaryCategory.breadcrumbs?.edges ?? [])
        .map((edge) => edge?.node)
        .filter((n): n is NonNullable<typeof n> => n != null)
        .map((crumb) => {
          const leaf = leafSlugFromPath(crumb.path);
          return {
            label: softTitleCase(crumb.name),
            // Only emit a real href when we can resolve a leaf slug —
            // otherwise the segment becomes non-interactive (still readable).
            href: leaf ? `/dev/preview/category/${leaf}/` : '#',
          };
        })
    : [];

  const related: PmProduct[] = (node.relatedProducts?.edges ?? [])
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

  return {
    id: node.entityId,
    sku: node.sku ?? `bc-${node.entityId}`,
    name: node.name,
    href: `/dev/preview/product${node.path}`,
    brand: node.brand?.name ?? undefined,
    upc: node.upc ?? undefined,
    galleryImages,
    priceLabel: formatPrice(node.prices?.price),
    inStock: node.inventory?.isInStock ?? false,
    stockQuantity: node.inventory?.aggregated?.availableToSell ?? undefined,
    shortDescription: node.plainTextDescription ?? undefined,
    categoryTrail,
    specs,
    related,
  };
}
