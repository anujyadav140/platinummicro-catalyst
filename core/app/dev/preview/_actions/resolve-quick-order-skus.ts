'use server';

/**
 * resolve-quick-order-skus
 * ------------------------
 * Bridges typed Quick-Order SKUs to full BC product records so the
 * resulting BoM lines have every field the cart + Stencil checkout
 * need: `productEntityId`, `title`, `unitPrice`, `imageUrl`, `inStock`.
 *
 * Without this, paste-flow lines (which only carry `{sku, qty}`) get
 * filtered out by `start-checkout.ts` because BC's createCart mutation
 * keys on entityId, not SKU — so the user can only ever "Send for
 * quote", never check out directly.
 *
 * Strategy:
 *   - Run one `searchProducts(searchTerm: <sku>)` query per typed SKU
 *     in parallel. BC's searchTerm matches against SKU + name, so for
 *     a specific SKU we get the exact-match product back on the first
 *     edge (when it exists in the catalog).
 *   - We then re-filter the results to the exact SKU (case-insensitive)
 *     so an out-of-channel match doesn't sneak through.
 *   - Lines that don't resolve are returned in `missing` so the modal
 *     can flag them for the user without silently dropping them.
 *
 * Why not v3 REST `?sku=...`: that's also valid, but the storefront
 * GraphQL is what's already wired + cached in this app and returns the
 * same fields shape the catalog code uses elsewhere.
 */

import { client } from '~/client';
import { graphql } from '~/client/graphql';

const QuickOrderSkuLookupQuery = graphql(`
  query QuickOrderSkuLookupQuery($searchTerm: String!) {
    site {
      search {
        searchProducts(filters: { searchTerm: $searchTerm }) {
          products(first: 5) {
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
`);

export interface PmResolvedQuickOrderLine {
  sku: string;
  qty: number;
  productEntityId: number;
  title: string;
  brand?: string;
  imageUrl?: string;
  /** Display unit price (e.g. "$902.00"); undefined when BC has no price */
  unitPrice?: string;
  inStock: boolean;
}

export interface PmResolveQuickOrderInput {
  sku: string;
  qty: number;
}

export interface PmResolveQuickOrderResult {
  resolved: PmResolvedQuickOrderLine[];
  missing: string[];
}

function formatPrice(
  price?: { value: number; currencyCode: string } | null,
): string | undefined {
  if (!price) return undefined;
  // Match the rest of the app — full cents, no rounding.
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: price.currencyCode,
  }).format(price.value);
}

async function resolveOne(
  input: PmResolveQuickOrderInput,
): Promise<{ line?: PmResolvedQuickOrderLine; missing?: string }> {
  const trimmed = input.sku.trim();
  if (!trimmed) return {};
  const qty = Math.max(1, Math.floor(Number(input.qty) || 1));

  try {
    const { data } = await client.fetch({
      document: QuickOrderSkuLookupQuery,
      variables: { searchTerm: trimmed },
      fetchOptions: { next: { revalidate: 60 } },
    });
    const edges = data?.site?.search?.searchProducts?.products?.edges ?? [];
    const wanted = trimmed.toLowerCase();
    // BC's searchTerm also matches names — re-filter to the exact SKU
    // (case-insensitive) so a paste of "AS6706T" doesn't accidentally
    // resolve to a NAS whose NAME contains "AS6706T".
    const exact = edges
      .map((e) => e?.node)
      .find((n) => n?.sku && n.sku.toLowerCase() === wanted);
    if (!exact) return { missing: trimmed };

    return {
      line: {
        sku: exact.sku ?? trimmed,
        qty,
        productEntityId: exact.entityId,
        title: exact.name,
        brand: exact.brand?.name ?? undefined,
        imageUrl: exact.defaultImage?.url ?? undefined,
        unitPrice: formatPrice(exact.prices?.price),
        inStock: exact.inventory?.isInStock ?? false,
      },
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(
      '[resolve-quick-order-skus] BC lookup failed for sku',
      trimmed,
      err,
    );
    return { missing: trimmed };
  }
}

export async function resolveQuickOrderSkus(
  inputs: PmResolveQuickOrderInput[],
): Promise<PmResolveQuickOrderResult> {
  // De-dupe by SKU (case-sensitive — BC SKUs are case-sensitive in the
  // catalog) while preserving the first qty entered. The drawer's
  // addLines already merges duplicates, but resolving each SKU once
  // saves a BC roundtrip per duplicate.
  const seen = new Set<string>();
  const unique: PmResolveQuickOrderInput[] = [];
  for (const i of inputs) {
    const key = i.sku.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push({ sku: key, qty: i.qty });
  }

  const settled = await Promise.all(unique.map(resolveOne));

  const resolved: PmResolvedQuickOrderLine[] = [];
  const missing: string[] = [];
  for (const s of settled) {
    if (s.line) resolved.push(s.line);
    else if (s.missing) missing.push(s.missing);
  }
  return { resolved, missing };
}
