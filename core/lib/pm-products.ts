/**
 * pm-products
 * -----------
 * Server-side product fetcher for Platinum Micro components.
 *
 * Returns a small, flat, serializable shape (`PmProduct`) that our PM
 * components consume. Insulates the components from BigCommerce's GraphQL
 * response shape so we can:
 *   - swap stores (sandbox → production) without touching components
 *   - mock for tests / Storybook
 *   - eventually expose to Makeswift via the same flat shape
 */

import { client } from '~/client';
import { graphql } from '~/client/graphql';
import { revalidate } from '~/client/revalidate-target';

export interface PmProduct {
  /** BC entityId — stable across syncs */
  id: number;
  /** Product top-level SKU — used as the PmBomLine sku key when added to BOM */
  sku: string;
  /** Display name */
  name: string;
  /** PDP path on the storefront */
  href: string;
  /** Brand/manufacturer name */
  brand?: string;
  /** Hero image URL (lossy CDN variant) */
  imageUrl?: string;
  imageAlt?: string;
  /** Localized formatted price string, e.g. "$8,420" */
  priceLabel?: string;
  /** Whether the product is in stock right now */
  inStock: boolean;
  /** True when inventory is at or below warning level, or product is a top seller */
  sellingFast?: boolean;
}

const PmFeaturedProductsQuery = graphql(`
  query PmFeaturedProductsQuery {
    site {
      newestProducts(first: 8) {
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
 * Fetch the 8 newest products on the connected channel.
 * Cached per Catalyst's revalidate target — same caching surface as the
 * stock homepage's product carousels.
 */
export async function fetchPmFeaturedProducts(): Promise<PmProduct[]> {
  const { data } = await client.fetch({
    document: PmFeaturedProductsQuery,
    fetchOptions: { next: { revalidate } },
  });

  const edges = data?.site?.newestProducts?.edges ?? [];

  return edges
    .map((edge) => edge?.node)
    .filter((node): node is NonNullable<typeof node> => node != null)
    .map((node) => ({
      id: node.entityId,
      sku: node.sku ?? `bc-${node.entityId}`,
      name: node.name,
      // BC's `path` is like "/cyberforge-alpha/" — re-route to OUR PDP at
      // /dev/preview/product/* instead of letting BC's route proxy handle it
      // (which would fall through to Catalyst's stock pages).
      href: `/dev/preview/product${node.path}`,
      brand: node.brand?.name ?? undefined,
      imageUrl: node.defaultImage?.url ?? undefined,
      imageAlt: node.defaultImage?.altText ?? node.name,
      priceLabel: formatPrice(node.prices?.price),
      inStock: node.inventory?.isInStock ?? false,
    }));
}
