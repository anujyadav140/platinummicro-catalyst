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
 * Image URLs use BC's `urlTemplate(lossy: true)` aliased to `url` (per the
 * Catalyst CDN/images guide). The returned URL has a `{:size}` placeholder
 * that the wrapped `<Image>` component (~/components/image) substitutes per
 * device width via its CDN loader, so consumers don't need to know the
 * resize at query time.
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

/**
 * Adjustment BC's pricing engine applies to the BASE product price when
 * a bundle option is selected. Sourced verbatim from BC v3 REST
 * `/v3/catalog/products/{id}/modifiers` → each value's
 * `adjusters.price` field. We mirror BC's two adjuster types:
 *
 *   percentage — multiplier; value `-3` means take 3% off the base
 *   relative   — flat amount in BC's base currency; value `-50` means
 *                "$50 off" (negative discounts, positive surcharges)
 *
 * `null` / undefined means the admin left the adjuster empty in BC —
 * picking that option doesn't change the base price. This is BC data,
 * not parsed from labels or guessed from display names.
 */
export interface PmBundleBasePriceAdjuster {
  type: 'percentage' | 'relative';
  value: number;
}

/**
 * A single bundleable option — sourced from a BC ProductPickList modifier
 * value, hydrated with the linked product's price + image + stock + any
 * BC-configured base-price adjuster.
 *
 * Example: the AS6706T NAS bundle exposes one bundle option that links
 * to the WD 4TB SSD (sku CCWDS400T4B0E). The user picks a quantity in
 * the PDP and the Add-to-Cart action pushes (NAS qty=1) + (SSD qty=N)
 * as two separate cart lines. If BC's modifier value has a `-3%` price
 * adjuster, the PDP preview reflects that on the base price too.
 */
export interface PmBundleOption {
  /** BC modifier-value entityId — opaque, used as the React key */
  valueId: number;
  /** Display label set by the admin in BC (e.g. "WD 4TB Blue SSD") */
  label: string;
  /** Linked product — what gets added to the cart at the chosen quantity */
  productId: number;
  productSku: string;
  productName: string;
  productHref: string;
  productPriceValue: number;
  productPriceLabel: string;
  productImageUrl?: string;
  productInStock: boolean;
  /** What BC says picking this option does to the BASE price. See above. */
  basePriceAdjuster?: PmBundleBasePriceAdjuster;
}

export interface PmBundleModifier {
  /** BC modifier entityId */
  modifierId: number;
  /** Section heading shown in the PDP (e.g. "Bundle and get 3% off") */
  displayName: string;
  /** When true, "None" can NOT be picked — user must select an option */
  isRequired: boolean;
  /** All admin-configured option values for this modifier */
  values: PmBundleOption[];
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
  /** Raw price value (numeric USD) — kept alongside the formatted label so
   *  the PDP can compute a live bundle total without re-parsing. */
  priceValue?: number;
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
  /**
   * Bundleable modifiers (BC ProductPickList type). Empty when the admin
   * hasn't configured any modifiers in BC for this product. The PDP
   * renders a "Bundle and get N% off" block per modifier with a single
   * quantity stepper that multiplies the chosen option.
   */
  bundleModifiers: PmBundleModifier[];
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
              url: urlTemplate(lossy: true)
            }
            images(first: 8) {
              edges {
                node {
                  altText
                  url: urlTemplate(lossy: true)
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
            productOptions(first: 10) {
              edges {
                node {
                  entityId
                  displayName
                  isRequired
                  __typename
                  ... on MultipleChoiceOption {
                    displayStyle
                    values(first: 25) {
                      edges {
                        node {
                          entityId
                          label
                          isDefault
                          __typename
                          ... on ProductPickListOptionValue {
                            productId
                          }
                        }
                      }
                    }
                  }
                }
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

/**
 * Second-pass query: fetch the small set of bundle-linked products by ID
 * (price, image, sku, stock) in one round-trip. Run AFTER the main product
 * query returns so we know which IDs to ask for.
 */
const PmBundleLinkedProductsQuery = graphql(`
  query PmBundleLinkedProductsQuery($entityIds: [Int!]!) {
    site {
      products(entityIds: $entityIds, first: 25) {
        edges {
          node {
            entityId
            sku
            name
            path
            inventory {
              isInStock
            }
            prices {
              price {
                value
                currencyCode
              }
            }
            defaultImage {
              altText
              url: urlTemplate(lossy: true)
            }
          }
        }
      }
    }
  }
`);

/**
 * Pulls modifier-value price adjusters straight off BC v3 REST. The
 * Storefront GraphQL doesn't expose `adjusters.price` for
 * `product_list_with_images` values, so we fetch them as a side car
 * here using the admin access token. Cached per-request via Next's
 * `revalidate`, so this is one extra REST call per cold PDP render.
 *
 * Returns a Map keyed by modifier-value entityId. Empty map (with a
 * warn-not-throw) when env is missing or BC is unreachable — the PDP
 * still renders, just without the adjuster math.
 */
async function fetchModifierAdjustersByValueId(
  productId: number,
  revalidate: number,
): Promise<Map<number, PmBundleBasePriceAdjuster>> {
  const storeHash = process.env.BIGCOMMERCE_STORE_HASH;
  const accessToken = process.env.BIGCOMMERCE_ACCESS_TOKEN;
  const out = new Map<number, PmBundleBasePriceAdjuster>();
  if (!storeHash || !accessToken) {
    // eslint-disable-next-line no-console
    console.warn(
      '[pm-product-by-slug] missing BIGCOMMERCE_STORE_HASH or BIGCOMMERCE_ACCESS_TOKEN — bundle adjusters disabled',
    );
    return out;
  }
  try {
    const url = `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products/${productId}/modifiers?include_fields=option_values`;
    const res = await fetch(url, {
      headers: {
        'X-Auth-Token': accessToken,
        Accept: 'application/json',
      },
      next: { revalidate },
    });
    if (!res.ok) return out;
    const json = (await res.json()) as {
      data?: Array<{
        option_values?: Array<{
          id?: number;
          adjusters?: {
            price?: { adjuster?: string; adjuster_value?: number | string };
          };
        }>;
      }>;
    };
    for (const mod of json.data ?? []) {
      for (const v of mod.option_values ?? []) {
        if (typeof v.id !== 'number') continue;
        const p = v.adjusters?.price;
        if (!p?.adjuster) continue;
        const raw =
          typeof p.adjuster_value === 'string'
            ? Number.parseFloat(p.adjuster_value)
            : p.adjuster_value;
        if (typeof raw !== 'number' || !Number.isFinite(raw)) continue;
        if (p.adjuster === 'percentage' || p.adjuster === 'relative') {
          out.set(v.id, { type: p.adjuster, value: raw });
        }
      }
    }
    return out;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      '[pm-product-by-slug] modifier adjuster fetch failed:',
      err,
    );
    return out;
  }
}

function formatPrice(price?: { value: number; currencyCode: string } | null): string | undefined {
  if (!price) return undefined;
  // Intl currency defaults to 2 fraction digits — preserves $X.99 endings the
  // BC admin enters. The legacy stripped-cents look ("$530") was a bug, not a
  // brand choice.
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: price.currencyCode,
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
 * Repair UTF-8 bytes that were mistakenly decoded as Latin-1 ("mojibake").
 * BC's customField data sometimes round-trips through a Latin-1 layer in
 * the merchant's source-of-truth, so symbols like `®` arrive as `Â®`. We
 * detect the telltale `Â` marker and re-decode the string's char codes as
 * UTF-8 bytes; if the input wasn't actually mojibake'd this is a no-op.
 */
function fixMojibake(s: string): string {
  if (!s || !/Â/.test(s)) return s;
  try {
    const bytes = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i) & 0xff;
    // `fatal: true` so genuinely binary input throws and we fall back to
    // the raw value rather than emitting � replacement chars.
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return s;
  }
}

/**
 * Some BC stores stuff a whole spec sheet into a single customField value
 * as `"key1=val1";"key2=val2";…`. When we detect at least two such quoted
 * "key=value" pairs we explode the blob into individual specs so the PDP
 * spec table can render each row separately. Returns null when the value
 * doesn't match — caller falls back to the raw single-row spec.
 */
function parseStructuredSpecBlob(value: string): PmProductSpec[] | null {
  if (!value) return null;
  const re = /"([^"=]+)=([^"]*)"/g;
  const segments: PmProductSpec[] = [];
  for (const match of value.matchAll(re)) {
    segments.push({
      name: fixMojibake(match[1].trim()),
      value: fixMojibake(match[2].trim()),
    });
  }
  return segments.length >= 2 ? segments : null;
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
  // Defensive guards — empty or whitespace-only slugs can land here when
  // a card upstream had a malformed `node.path` from BC. Bail early so we
  // don't pay for a BC GraphQL roundtrip just to be told "no, that's not
  // a product."
  const trimmed = slug?.trim();
  if (!trimmed) return null;

  // Normalize to the leading/trailing-slash form BC expects.
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}/`;

  const { data } = await client.fetch({
    document: PmProductBySlugQuery,
    variables: { path },
    fetchOptions: { next: { revalidate } },
  });

  const node = data?.site?.route?.node;
  if (!node || node.__typename !== 'Product') {
    // Surface what BC actually returned so we can tell whether the link
    // is genuinely dead vs. the slug pointed at a different node type
    // (Category, Brand, BlogPost) — that's a real upstream bug worth
    // catching in dev. Quiet in production to avoid log noise.
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn(
        `[pm-product-by-slug] BC.site.route('${path}') resolved to ${
          node?.__typename ?? 'null'
        } — returning notFound()`,
      );
    }
    return null;
  }

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
    .flatMap((n) => {
      // If the merchant packed multiple specs into a single field as
      // `"k1=v1";"k2=v2";…`, expand it into individual rows. Otherwise
      // keep the field as-is.
      const blob = parseStructuredSpecBlob(n.value);
      if (blob) return blob;
      return [{ name: fixMojibake(n.name), value: fixMojibake(n.value) }];
    });

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

  // Bundle modifiers — gather every productId referenced across all option
  // values, then fetch their details in a single follow-up query. When
  // there are no modifiers (admin hasn't configured any), this whole
  // block short-circuits and `bundleModifiers` is `[]`.
  const bundleModifiers: PmBundleModifier[] = [];
  const optionEdges = node.productOptions?.edges ?? [];
  const linkedIds = new Set<number>();
  for (const edge of optionEdges) {
    const opt = edge?.node;
    if (!opt || opt.__typename !== 'MultipleChoiceOption') continue;
    for (const vEdge of opt.values?.edges ?? []) {
      const v = vEdge?.node;
      if (v && v.__typename === 'ProductPickListOptionValue' && typeof v.productId === 'number') {
        linkedIds.add(v.productId);
      }
    }
  }

  if (linkedIds.size > 0) {
    try {
      // Fetch (a) the linked product details from GraphQL and (b) the
      // modifier-value adjusters from REST in parallel. Adjusters aren't
      // exposed in the Storefront GraphQL for product_list_with_images
      // modifier values, so we have to side-channel them in.
      const [{ data: linkedData }, adjustersByValueId] = await Promise.all([
        client.fetch({
          document: PmBundleLinkedProductsQuery,
          variables: { entityIds: Array.from(linkedIds) },
          fetchOptions: { next: { revalidate } },
        }),
        fetchModifierAdjustersByValueId(node.entityId, revalidate),
      ]);

      // Map BC entityId → linked product details for fast option-by-option lookup.
      const productById = new Map<number, PmBundleOption>();
      for (const edge of linkedData?.site?.products?.edges ?? []) {
        const p = edge?.node;
        if (!p) continue;
        productById.set(p.entityId, {
          valueId: 0, // filled in per-option below
          label: '', // filled in per-option below
          productId: p.entityId,
          productSku: p.sku ?? `bc-${p.entityId}`,
          productName: p.name,
          productHref: `/dev/preview/product${p.path}`,
          productPriceValue: p.prices?.price?.value ?? 0,
          productPriceLabel:
            formatPrice(p.prices?.price) ?? '',
          productImageUrl: p.defaultImage?.url ?? undefined,
          productInStock: p.inventory?.isInStock ?? false,
        });
      }

      for (const edge of optionEdges) {
        const opt = edge?.node;
        if (!opt || opt.__typename !== 'MultipleChoiceOption') continue;
        const values: PmBundleOption[] = [];
        for (const vEdge of opt.values?.edges ?? []) {
          const v = vEdge?.node;
          if (!v || v.__typename !== 'ProductPickListOptionValue') continue;
          if (typeof v.productId !== 'number') continue;
          const linkedTemplate = productById.get(v.productId);
          if (!linkedTemplate) continue;
          values.push({
            ...linkedTemplate,
            valueId: v.entityId,
            // Prefer the admin-set label from BC; fall back to the
            // linked product's own name if the admin left it blank.
            label: v.label?.trim() || linkedTemplate.productName,
            // Whatever BC says picking this option does to the base price.
            // Undefined when the admin didn't set an adjuster.
            basePriceAdjuster: adjustersByValueId.get(v.entityId),
          });
        }
        if (values.length > 0) {
          bundleModifiers.push({
            modifierId: opt.entityId,
            displayName: opt.displayName,
            isRequired: opt.isRequired,
            values,
          });
        }
      }
    } catch (err) {
      // Bundle data is non-essential — log and continue with the rest
      // of the PDP. Without this safety net, a transient BC hiccup on
      // the linked-products query would 500 the whole PDP.
      // eslint-disable-next-line no-console
      console.warn('[pm-product-by-slug] linked-products query failed:', err);
    }
  }

  return {
    id: node.entityId,
    sku: node.sku ?? `bc-${node.entityId}`,
    name: node.name,
    href: `/dev/preview/product${node.path}`,
    brand: node.brand?.name ?? undefined,
    upc: node.upc ?? undefined,
    galleryImages,
    priceLabel: formatPrice(node.prices?.price),
    priceValue: node.prices?.price?.value ?? undefined,
    inStock: node.inventory?.isInStock ?? false,
    stockQuantity: node.inventory?.aggregated?.availableToSell ?? undefined,
    shortDescription: node.plainTextDescription ?? undefined,
    categoryTrail,
    specs,
    related,
    bundleModifiers,
  };
}
