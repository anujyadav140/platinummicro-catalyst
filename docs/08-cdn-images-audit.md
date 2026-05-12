# 08 — Catalyst CDN & Images Audit

This doc records how our `pm-*` fetchers and components map to the Catalyst CDN/Images guide at https://docs.bigcommerce.com/developer/docs/storefront/catalyst/development/cdn-and-images.

## TL;DR

| Pattern | Catalyst guidance | Our implementation |
|---|---|---|
| Image URL shape from BC GraphQL | Request `urlTemplate(lossy: true)` — returns a templated URL with a `{:size}` placeholder | ✅ Every `defaultImage`/`images` selection in `pm-*` queries now aliases `urlTemplate` to `url` |
| Component to render images | Use the `Image` wrapper from `~/components/image`, which applies `bcCdnImageLoader` to substitute `{:size}` with the per-device-width Next.js requests | ✅ All raw `<img>` consumers of BC URLs swapped to the wrapper |
| CDN preconnect | `next.config.ts` emits `Link: <https://cdn11...>; rel=preconnect` headers | ✅ Stock Catalyst behavior — not touched |

## GraphQL query migration

Before: `url(width: X, height: Y)` (fixed-size CDN URL). After: `url: urlTemplate(lossy: true)` (size-placeholder URL).

Aliasing back to `url` keeps the parsed shape unchanged, so the downstream `PmProduct.imageUrl`/`PmProductImage.url` field surfaces stay the same. Components opt-in to the new behavior by switching from raw `<img>` to the `<Image>` wrapper.

| File | Queries touched |
|---|---|
| `core/lib/pm-products.ts` | `PmFeaturedProductsQuery` |
| `core/lib/pm-search.ts` | 3 queries (typeahead × 2 + paged search) |
| `core/lib/pm-category-by-slug.ts` | Category `defaultImage` (1920×720) + products grid (500×500) |
| `core/lib/pm-mega-menu-fetcher.ts` | Mega-menu category card images |
| `core/lib/pm-page-banner-fetcher.ts` | Slot category `defaultImage` |
| `core/lib/pm-brand-banner-fetcher.ts` | Brand category `defaultImage` |
| `core/lib/pm-product-by-slug.ts` | `defaultImage`, `images` array, `relatedProducts.defaultImage` |

> **NOTE:** the BC graphql template-literal preprocessor does NOT parse inline `#` GraphQL comments. The first migration attempt added `# Catalyst-recommended` annotations inline and broke the build with `Expected ',', got 'ident'`. We rely on JSDoc on the surrounding TS function instead.

## Component migration

All components that consume BC CDN URLs from `pm-*` fetchers now use Catalyst's `<Image>` wrapper. The wrapper internally:

1. Checks if the `src` starts with one of `buildConfig.urls.cdnUrls` (= `cdn11.bigcommerce.com`)
2. If yes → applies `bcCdnImageLoader`, which calls `src.replace('{:size}', `${width}w`)` for every entry in Next's auto-generated `srcSet`
3. If no → falls through to Next's default image loader

| Component | What was changed | Sizes hint |
|---|---|---|
| `pm-product-card` | Card thumb (160px slot in a responsive grid) | `(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw` |
| `pm-product-row` | List-view thumb (fixed 160×160) | `160px` |
| `pm-product-gallery` | Thumbnail rail (62×62) + main image (up to ~405px, hover-zoomed) | `62px` / `(min-width: 768px) 405px, 90vw` |
| `pm-search-typeahead` | Result row thumb (56×56) | `56px` |
| `pm-compare-bar` | Compare strip thumb (56×56) | `56px` |
| `pm-quote-drawer` | Cart line thumb (56×56) | `56px` |
| `pm-hero-banner` | Image rail (1–5 images, max-h 180–280) + brand logo (h-12/14/16) | Per-count derived from image count |
| `pm-header` | Mega-menu category card images + partner-brand logos | `(min-width: 1024px) 280px, 50vw` / `96px` / `120px` |
| `pm-brands-section` | Authorized Partners carousel logos | `240px` |
| `pm-card-section` | Card grid icon/image (48×48) | `48px` |
| `pm-footer` | Footer logo | `320px` |
| `app/.../compare/compare-grid` | Compare grid cell image | `(min-width: 1024px) 240px, 40vw` |
| `app/.../account/lists/[id]/_components/list-detail` | Saved-list row thumb (64×64) | `64px` |

The `<img>` tags we **did not** swap:

- `pm-header.tsx` site logo — local `/pm/logo.svg` path, but used together with the rest of the header; we already use `<Image>` indirectly for everything that pulls from BC.
- `pm-brand-wall.tsx` (legacy) — not imported by the live app; superseded by `pm-brands-section`.
- `app/.../brands/brand-cell.tsx` — uses external favicon CDNs (Clearbit etc.) that aren't in `remotePatterns`. Switching would require domain whitelisting which is out of scope for this pass.

## CSS background-image — the leftover gap

Some hero banners use `background-image: url(...)` instead of `<img>`. CSS can't go through the Next/Image loader, so we added a small inline substitutor in `pm-hero-banner.tsx`:

```ts
function subSize(url: string | undefined, width: number): string | undefined {
  if (!url) return undefined;
  return url.replace('{:size}', `${width}w`);
}
```

Pick a fixed bake-time width per use:
- `bgImageUrl` (full-bleed background): `1920`
- `imageUrl` in cover/contain mode (full-bleed background): `1920`
- `imageUrl` in split mode (half-width tile): `1280`

This trades responsive `srcset` for a single sensible resolution. Acceptable because admin-set heroes are typically high-resolution stock images and the surrounding `background-size: cover/contain` handles fit. If we ever need DPR-correct sourcing here, switch to an absolutely-positioned `<Image fill>` inside the section.

## Verification

After migration, on the dev server:

```
home    HTTP 200, 0 unresolved {:size} in <img> tags, 0 in CSS background-image
search  HTTP 308 → 200
category HTTP 200, 0 unresolved {:size} in <img>, 0 in CSS
PDP     HTTP 200, 0 unresolved {:size} in <img>, 0 in CSS
```

Remaining `{:size}` substrings on the homepage (46) appear ONLY inside the RSC payload (the JSON-ish stream shipped to the client for hydration). They are unsubstituted because the substitution happens in the `<Image>` loader at render time on either side, not in the wire format. This is expected and matches the stock Catalyst behavior.

## Future work

- Switch external favicon hosts (Clearbit etc.) over by adding remote patterns to `next.config.ts` and migrating `brand-cell.tsx` + `pm-brand-wall.tsx`.
- Audit `priority` flags — currently set on `pm-product-gallery` main image and the first hero rail image. Consider promoting any image expected above the fold on common entry pages.
- Consider switching CSS `background-image` cover heroes to a `<Image fill>` strategy if responsive sizing becomes critical.
