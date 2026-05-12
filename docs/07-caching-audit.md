# 07 — Catalyst Caching Audit

This doc records how our `pm-*` server fetchers map to the Catalyst caching guide at https://docs.bigcommerce.com/developer/docs/storefront/catalyst/development/caching, and where (and why) we deliberately deviate.

## TL;DR

| Pattern | Catalyst guidance | Our implementation |
|---|---|---|
| Cross-request fetch cache | `fetchOptions: { next: { revalidate } }` using the env-driven `revalidate` constant from `~/client/revalidate-target` | ✅ All catalog fetchers now import and use this constant |
| Customer-scoped data | Pass `customerAccessToken` AND set `fetchOptions.cache = 'no-store'` | ✅ Done in `pm-customer-profile.ts` + `pm-customer-addresses.ts` |
| Anonymous vs. logged-in mixed | Conditionally swap fetchOptions per request | N/A in pm-* fetchers (we don't have catalog fetchers that branch on customer yet) |
| Anti-pattern: very low TTLs | Avoid — drives BC API rate-limiting and cost | We keep low TTLs ONLY on admin-managed content (banners, footer) where the admin edit-preview cycle dominates; catalog data uses the global TTL |

## Per-fetcher status

| File | Cache strategy | TTL | Notes |
|---|---|---|---|
| `pm-products.ts` | `fetch.next.revalidate` (no outer `unstable_cache`) | `revalidate` env | Featured-products list — already correct |
| `pm-product-by-slug.ts` | `fetch.next.revalidate` | `revalidate` env | PDP query — already correct |
| `pm-category-by-slug.ts` (route fetch) | `fetch.next.revalidate` | `revalidate` env | PLP query — already correct |
| `pm-category-by-slug.ts` (sellingFast IDs) | `unstable_cache` + `fetch.next.revalidate` | **300s** (intentional) | Featured-products + best-selling IDs change faster than the global TTL; 5 min keeps the "selling fast" badge fresh without thrashing BC |
| `pm-search.ts` (×3) | `unstable_cache` + `fetch.next.revalidate` | `revalidate` env | Fixed: was hardcoded 120s |
| `pm-categories-fetcher.ts` | `fetch.next.revalidate` | `revalidate` env | Fixed: was hardcoded 60s |
| `pm-mega-menu-fetcher.ts` (×3) | `unstable_cache` + `fetch.next.revalidate` | `revalidate` env | Fixed: was hardcoded 60s |
| `pm-customer-profile.ts` | `cache: 'no-store'` + customerAccessToken | n/a | Customer-scoped, never cached — matches Catalyst pattern exactly |
| `pm-customer-addresses.ts` | `cache: 'no-store'` + customerAccessToken | n/a | Same |
| `pm-page-banner-fetcher.ts` | `unstable_cache` + `fetch.next.revalidate` | **120s (intentional)** | Admin-managed homepage / search sections. 2-min TTL keeps the admin-edit → preview cycle fast |
| `pm-brand-banner-fetcher.ts` | `unstable_cache` + `fetch.next.revalidate` | **120s (intentional)** | Same — admin-managed brand pages |
| `pm-footer-fetcher.ts` | `unstable_cache` + `fetch.next.revalidate` | **30s (intentional, slot description)** / **120s (tree)** | Footer styling is the most-edited admin surface during initial tuning; 30s lets edits show within seconds |

## Why we intentionally diverge for admin content

The Catalyst doc warns: "The lower the `DEFAULT_REVALIDATE_TARGET`, the more requests your store will make to the BigCommerce API, leading to rate limiting and increased costs."

That's correct for **catalog data** (every product page can hit BC). For our **admin-managed sections** (homepage banner sections, footer config, brand-page heroes), the request volume is **per-slot, not per-product**:

- Whole site has ~10 slot categories total
- Each slot's `unstable_cache` is shared across all renders
- Even at 30 s TTL, a slot category fetches ≤2 times/minute, regardless of catalog traffic

So short TTLs on admin slots don't impact BC API quota meaningfully, but they give us a much better admin iteration loop. Production deployments can dial these up by adding short-TTL overrides in the fetcher files (search for `revalidate: 30` / `revalidate: 120`).

## Cache layer architecture

For pm-* fetchers we generally compose **two** cache layers:

1. **Outer `unstable_cache`** — caches the entire async function's return value (post-processed: parsed JSON, derived facets, computed `priceSliderMax`, etc.). Keyed by function args, so two requests with the same slug share work.
2. **Inner `fetch.next.revalidate`** — caches the raw BC GraphQL response. Survives across cache-key changes in the outer layer.

The Catalyst doc only mentions the inner layer (`fetch.next.revalidate`) and React's `cache()` for within-render memoization. Our outer `unstable_cache` is additive: it avoids re-parsing the same data on every request. Removing it would be simpler but slower for derived shape transforms.

We do NOT use React's `cache()` because our fetchers are already called from cached server components (Next's automatic memoization) and most are wrapped in `unstable_cache`, which already deduplicates within a request.

## Tuning at deploy time

Set `DEFAULT_REVALIDATE_TARGET` in `.env.local` (or your deploy env) to override the global TTL. Default is `3600` (1 hour).

- High-traffic, infrequent updates: `28800` (8 hr) – follows Catalyst's "high traffic, infrequent updates" recommendation
- Active catalog churn: `1800` (30 min) – more API calls but fresher results
- Local dev iteration: `60` (1 min) – never run this in production

Admin-content TTLs (30 s / 120 s) are still hardcoded; they should not be lowered further without batching multiple sections into a single BC roundtrip.

## What we are NOT doing (and why)

- **React `cache()` for request-level memoization** — not needed; `unstable_cache` already dedupes within a request via its internal cache, and most of our fetchers are server-component-only.
- **`revalidatePath()` / `revalidateTag()`** — not wired yet. The `tags: ['pm-...']` on each `unstable_cache` is there so a future webhook handler (e.g. BC catalog-updated webhook) can call `revalidateTag('pm-search')` to bust the cache instantly instead of waiting for TTL.
- **Shopper IP forwarding** — Catalyst's client library already adds the shopper IP to `no-store` / `no-cache` requests; we don't need to touch this. Our customer-scoped fetchers correctly use `cache: 'no-store'` so they get the IP forwarding automatically.
