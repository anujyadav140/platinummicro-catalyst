# Platinum Micro Catalyst → Hydrogen Shopify 1:1 Port — Reference Brief

> Hand this file (plus a fresh Claude Code session) the source repo and ask it
> to port to Hydrogen Shopify. Everything below is the **reference contract** —
> match the structure, naming, behavior, and visual design exactly.

---

## 1. The artifact you're cloning

| Thing                | Where                                                                  |
|---------------------|-------------------------------------------------------------------------|
| **Source repo**      | `https://github.com/anujyadav140/platinummicro-catalyst` (branch `main`) |
| **Live production**  | `https://platinum-micro-catalyst.vercel.app`                            |
| **Tech stack**       | Next.js 15 (App Router) · React 19 · Tailwind · Catalyst v1.6.2 baseline · BigCommerce Storefront GraphQL · pnpm + turbo monorepo |
| **Monorepo root**    | repo root holds `pnpm-workspace.yaml` + `turbo.json`; the Next.js app lives under `core/` |

**Port target**: Shopify Hydrogen (Remix + Oxygen). Treat the BC Catalyst repo as
the **visual + behavioral source of truth**. Replace BC GraphQL with Shopify
Storefront API; everything else (component names, file paths under the custom
layer, design tokens, breakpoints, copy, admin patterns) should mirror 1:1
where the framework allows it.

---

## 2. Big-picture architecture

The repo is split into two layers — **stock Catalyst** (unmodified vendor code)
and **PM customizations** (everything prefixed `pm-`):

```
core/
├── app/
│   ├── [locale]/(default)/                    # STOCK Catalyst routes
│   │   ├── layout.tsx                         # mounts stock <Header /> + <Footer />
│   │   ├── page.tsx                           # homepage — uses vibes/soul primitives
│   │   ├── (faceted)/category/[slug]/
│   │   ├── (faceted)/brand/[slug]/
│   │   ├── (faceted)/search/
│   │   ├── cart/, account/, compare/, blog/, checkout/
│   │   └── (auth)/                             # login, register, forgot password
│   └── dev/preview/                           # PM CUSTOM routes (mounts PmHeader, PmFooter)
│       ├── layout.tsx
│       ├── preview-shell.tsx                  # the global PM shell
│       ├── category/[slug]/                   # uses PmCategoryListing + PmFacetSidebar
│       ├── brand[s]/                          # brand pages
│       ├── product/[slug]/                    # uses PmProductDetail + PmProductGallery
│       ├── search/, cart/, account/, compare/, about/, contact/
│       └── api/search/                        # JSON typeahead endpoint
├── components/
│   ├── pm-*/                                  # 40 PM custom components (see §3)
│   ├── header/, footer/                       # stock Catalyst Vibes-based
│   └── product-card/, subscribe/, etc.        # stock Catalyst
├── vibes/soul/                                # Catalyst design system — sections + primitives
├── lib/                                       # data fetchers, parsers, contexts (see §4)
├── data-transformers/                         # BC GraphQL → UI shape mappers
├── client/                                    # BC GraphQL client
├── auth/                                      # Auth.js / NextAuth setup
└── next.config.ts, tailwind.config.ts
scripts/                                       # admin/seed scripts (BC API writes)
docs/                                          # admin guides for the fence/banner system
```

**Production redirect**: `/` → `/dev/preview/` (configured in middleware). So
when a user opens the production URL, they land on the PM custom layer, not
the stock Catalyst layer. **For Hydrogen, make the PM custom layer the default
route group.**

---

## 3. PM custom components (40 total) — the heart of the port

All under `core/components/pm-*/`. Each is a focused, mostly-server component
(some are `'use client'`). Tailwind-only styling. No vibes/soul imports — these
are standalone implementations.

### Shell + navigation
| Component                  | Purpose                                                                 |
|----------------------------|--------------------------------------------------------------------------|
| `pm-header`                | Sticky 2-row header: top (logo + search + actions) + nav rail w/ hover mega-menu. Mobile hamburger drawer (left-slide). |
| `pm-top-bar`               | Thin announcement strip above the header.                                |
| `pm-footer`                | Multi-column footer with link groups, social, payment icons.             |
| `pm-search-typeahead`      | Live BC-search dropdown with debounce + abort; falls back to GET form for no-JS / pre-hydration. |
| `pm-quick-order-modal`     | Paste SKUs+qty bulk-add modal. Bottom-sheet on mobile.                   |
| `pm-quote-drawer`          | Right-side cart/quote drawer.                                            |
| `pm-page-sections-renderer`| Dispatches a `PmPageSection[]` through `<PmHeroBanner>` / `<PmCardSection>` / `<PmBrandsSection>` based on `kind`. |

### Hero banners + content blocks (admin-driven)
| Component             | Purpose                                                                     |
|-----------------------|------------------------------------------------------------------------------|
| `pm-hero-banner`      | The big configurable hero. Modes: `side` (default), `cover`, `contain`, `split`. Layered bg (color → gradient → image → overlay). Supports `eyebrow`, `headline`, `body`, `cta`, `logo`, side rail of up to 5 images. |
| `pm-hero`             | Simpler hero variant (used in PDP/category strips).                          |
| `pm-card-section`     | Admin-driven card grid. Modes: `icon-tile` (default) or `poster`. Supports `section_logo_N` (1-4), `section_logo_position: above-eyebrow \| top-right`. Curated Lucide icon library. |
| `pm-brands-section`   | Partner brand-logo strip (uses BC category children as data).                |
| `pm-section-header`   | Eyebrow + title + subtitle, used as a section preamble.                      |
| `pm-banner-strip`     | Thin info banner.                                                            |
| `pm-audience-strip`   | "Who we serve" poster row (linked to vertical pages).                        |
| `pm-category-strip`   | Horizontally-scrollable category chips.                                      |
| `pm-about-banner`     | "About PM" two-column with image.                                            |
| `pm-promotion-card`   | Promo tile used inside mega-menu panels.                                     |
| `pm-brand-wall`       | Brand-logo grid (homepage).                                                  |

### PDP
| Component             | Purpose                                                                     |
|-----------------------|------------------------------------------------------------------------------|
| `pm-product-detail`   | Full PDP layout: gallery on left/top, info column right/below. Stacks on mobile. |
| `pm-product-gallery`  | Main image + thumbnail strip (vertical on desktop, horizontal scroll on mobile). |
| `pm-bundle-options`   | "Bundle and get N% off" UI for BC ProductPickList modifiers. Multi-select via `(multi)` flag on modifier display_name; qty cap via `(max N)` on modifier or option name. One row per linked-product option; inline qty stepper appears on the selected row. |
| `pm-add-to-list-menu` | "Add to wishlist / saved list" popover.                                       |
| `pm-coupon-input`     | Coupon code input + Apply button.                                            |

### PLP
| Component             | Purpose                                                                     |
|-----------------------|------------------------------------------------------------------------------|
| `pm-category-listing` | Server-component layout: breadcrumb, toolbar, 2-col grid (facets / products), pagination. |
| `pm-product-card`     | Grid product tile (image, brand, name, price, badges, in-stock).             |
| `pm-product-row`      | List-view product row.                                                       |
| `pm-product-grid`     | Wraps PmProductCard into a responsive grid.                                  |
| `pm-facet-sidebar`    | Category / brand / price / availability / rating / on-sale / featured filters. URL-driven state. Mobile: hidden `<lg`, replaced by a "Filters" button + right-slide drawer. |
| `pm-sort-dropdown`    | Sort selector.                                                               |
| `pm-page-size`        | Page-size selector (hidden on mobile).                                       |
| `pm-pagination`       | Prev/next on mobile; numbered at `sm:+`.                                     |
| `pm-view-toggle`      | Grid/list toggle.                                                            |
| `pm-compare-bar`      | Sticky "compare selected" bottom bar.                                        |

### Account + forms + misc
| Component                | Purpose                                                                   |
|---------------------------|---------------------------------------------------------------------------|
| `pm-account-sidebar`      | Account navigation. Horizontal scroll tabs on mobile, vertical sidebar at `lg:+`. |
| `pm-account-stat`         | Account dashboard stat tile.                                              |
| `pm-form-field`           | Labeled input wrapper.                                                    |
| `pm-form-select`          | Labeled select.                                                           |
| `pm-range-slider`         | Two-thumb range slider (used in price filter).                            |
| `pm-legal-layout`         | Terms / privacy / etc. content layout.                                    |
| `pm-b2b-ninja`            | B2B-specific affordance (quote / volume pricing).                         |

---

## 4. Key libraries / fetchers / parsers (`core/lib/`)

| File                                | Role                                                                  |
|-------------------------------------|------------------------------------------------------------------------|
| `pm-search.ts`                      | Header typeahead + `/search` page raw fetcher. Implements **strict-first relevance**: multi-word queries narrow to products whose `sku + name` contain EVERY token; falls back to BC's full set when no Tier-1 hits exist. Single-token queries pass through untouched. Fetches up to BC's hard cap of 50 per page. |
| `pm-products.ts`                    | `PmProduct` type + augmenters.                                         |
| `pm-product-by-slug.ts`             | PDP data + bundle modifier parser (`(multi)` and `(max N)` flags).     |
| `pm-category-by-slug.ts`            | Category listing data + facet building + sort/paginate (`buildPmListing`). |
| `pm-hero-banner.ts`                 | **Parser** for `<!--pm-hero ... -->` fence blocks in BC category descriptions. Returns `PmHeroBannerConfig`. |
| `pm-card-section.ts`                | **Parser** for `<!--pm-cards ... -->`. Returns `PmCardSectionConfig`. Supports `section_logo_1..4`. |
| `pm-brands-section.ts`              | **Parser** for `<!--pm-brands ... -->`.                                |
| `pm-banner-parser-internal.ts`      | Shared regex + `normalizeBcDescription` (un-escapes BC's WYSIWYG-mangled HTML before parsing). |
| `pm-page-sections.ts`               | Unified parser: returns an ORDERED `PmPageSection[]` (kind + config) so admins can interleave hero/cards/brands blocks freely. |
| `pm-page-banner-fetcher.ts`         | Resolves homepage / search-page banners by walking BC tree to `PM Page Banners > PM Home Page Banners > Home Page Banner N` (and equivalent slots). |
| `pm-brand-banner-fetcher.ts`        | Brand-page banner lookup. **Lookup order**: (1) `PM Page Banners > PM Brand Banners > {brand}`, (2) legacy fallback `BRAND > Mega Menu Brands > {brand}`. |
| `pm-mega-menu.ts`, `pm-mega-menu-fetcher.ts`, `pm-mega-menu-context.tsx` | Mega-menu data: static fallback + BC-tree fetcher + React context provider. |
| `pm-categories.ts`                  | Top-level category list used by header nav rail (static fallback).      |
| `pm-session.tsx`                    | `PmSessionProvider` — auth-state for the signed-in account dropdown.    |
| `pm-quote-store.tsx`                | Client-side cart/quote draft store.                                     |

---

## 5. Admin-driven content via "fence blocks"

The **single biggest pattern to port faithfully**.

**Idea**: a non-technical admin pastes a fenced HTML comment into a category
description, and the storefront renders it as a styled section. No code deploy
needed to change banners.

**Syntax** — three fence types live inside category descriptions:

```html
<!--pm-hero
image: https://cdn.../hero.jpg
image_fit: split
image_position: right
content_half_bg: #01A982
text: light
accent: #0E3B43
headline: Built for what comes next.
body: From ProLiant servers...
cta_label: Shop HPE ProLiant
cta_href: /dev/preview/search?term=HPE+ProLiant
height: 460px
padding_y: 0
content_padding: 56px 64px
border_radius: 16px
full_bleed: false
-->

<!--pm-cards
eyebrow: The HPE lineup
title: Three product families. One partner.
columns: 3
columns_md: 3
columns_sm: 1
gap: 20px
padding_y: 32px
bg: #ffffff
section_logo_1: data:image/svg+xml;base64,...    # optional partner logos
section_logo_2: https://cdn.../amd.svg
section_logo_position: top-right                 # or above-eyebrow

card_1_title: HPE ProLiant Servers
card_1_subtitle: Gen11 rack and tower servers...
card_1_icon: Server                              # Lucide icon name (curated library)
card_1_href: /dev/preview/search?term=HPE+ProLiant
card_2_title: ...
-->

<!--pm-brands
title: Partner brands
columns: 6
-->
```

**Schemas** — see `core/lib/pm-hero-banner.ts` (lines 19-160) and
`core/lib/pm-card-section.ts` (lines 1-90) for the full reference. Also
`docs/02-hero-banners.md` and `docs/16-admin-content-syntax.md` if present.

**Disable convention** — rename the tag to `pm-off-hero` / `pm-off-cards`
to keep the source in BC admin but stop rendering. The parser only matches
the exact tag names `pm-(hero|cards|brands)`.

**Multiple blocks** — admins can stack any combination in any order; the
page renderer iterates them in document order.

**BC layout** — banner-config categories live under a top-level holder:
```
PM Page Banners                                  (id=303 in this store)
├── PM Home Page Banners                         (id=304)
│   ├── Home Page Banner 1                       (homepage hero slot 1)
│   ├── Home Page Banner 2
│   └── Home Page Banner 3                       (e.g. "Industries we serve")
├── PM Search Page Banners                       (id=305)
├── PM Brand Banners                             (id=328) — NEW pattern
│   └── Hewlett Packard Enterprise               (id=329)
└── PM Footer                                    (id=309)
```

Legacy brand pages also fall back to `BRAND > Mega Menu Brands > {brand}`
(ids 290 → 291-302).

**Hydrogen port mapping**:
- Replace "category description text" with **Shopify Metaobjects**. Define a
  `pm_page_section` metaobject type with fields matching the fence schema
  (image, headline, body, cta_label, cta_href, etc.) — and a `kind` enum field
  (`hero | cards | brands`).
- Each "slot" (homepage banner 1, brand banner for HPE, etc.) is a Metaobject
  entry. Reference them via Shopify product/collection metafields OR via a
  dedicated lookup pattern (e.g. metaobject handles like `homepage-banner-1`,
  `brand-banner-hpe`).
- Keep the SAME parser/renderer split — just the data source changes.

---

## 6. Routing — production URL contract

| URL                                          | What renders                                          |
|---------------------------------------------|--------------------------------------------------------|
| `/` (production)                            | Redirects to `/dev/preview/` (middleware-level).      |
| `/dev/preview/`                             | PM homepage. Hero stack + card sections + brand wall. |
| `/dev/preview/category/[slug]`              | PmCategoryListing.                                    |
| `/dev/preview/product/[slug]`               | PmProductDetail.                                      |
| `/dev/preview/search?q=...`                 | Full search results page (`q` param).                 |
| `/dev/preview/search?bids=39,40&heading=HPE`| **Brand page** — products from one or more BC brand IDs, with PmBrandBanner sections rendered above the grid. Supports merging multiple BC brands under one heading. |
| `/dev/preview/api/search?q=...&limit=8`     | JSON typeahead endpoint (returns `PmSearchResult`).   |
| `/dev/preview/cart`, `/account/*`, `/compare`, `/about`, `/contact`, `/brands` | Stock PM pages. |

Stock Catalyst routes still exist (`/category/[slug]`, `/search`, etc.) but
the production redirect sends everyone to `/dev/preview/`. **For Hydrogen, the
`/dev/preview/` namespace is the production UX — promote it to the root.**

---

## 7. Design system (Tailwind tokens)

Brand tokens — preserve names exactly:

```
--pm-navy-deep     (top nav bg, headlines on light bg)
--pm-navy-mid
--pm-navy-light
--pm-terracotta    (default CTA color)
--pm-terracotta-light
--pm-tan           (eyebrow color on light bg)
--pm-tan-pale      (light tan card backgrounds)
--pm-paper         (page bg)
--pm-ink-900       (body text on light bg)
--pm-ink-700, 500, 300, 200, 100  (text/border/muted tints)
--pm-warning       (stock warning text)
--pm-header-top-h  (CSS var, top-row height)
--pm-header-nav-h  (CSS var, nav-row height)
--pm-container     (max-width-pm-container, default ~1280px)
```

Tailwind breakpoints: `sm=640, md=768, lg=1024, xl=1280` (stock).

Mobile responsive rules used throughout:
- Container padding: `px-4 sm:px-6 md:px-8`
- Tap targets: minimum `h-11` (44px) on every button/link/input
- Form inputs use `text-base` (16px) to prevent iOS auto-zoom on focus
- Big headlines scale: `text-[28px] sm:text-[32px] md:text-[44px]`
- PDP gallery stacks gallery-on-top on `<md`, side-by-side from `md:`
- Filter sidebar hidden `<lg`, replaced by a right-slide drawer
- Hamburger drawer (`md:hidden`) replaces nav rail on phones
- Body scroll lock + Esc-to-close on every drawer; `pointer-events: none`
  on the wrapper when closed so transitions animate without intercepting taps

---

## 8. Search behavior (port carefully)

1. **Typeahead (XHR)**: input change → 200ms debounce → fetch
   `/dev/preview/api/search?q=...&limit=8` → render dropdown panel with
   thumbnail + name + brand + SKU + price + in-stock per hit. AbortController
   cancels stale requests.
2. **Submit (form fallback)**: form has `action="/dev/preview/search"` (the
   real results PAGE — NOT the JSON API). On native submit (Enter or pre-hydration
   tap), browser navigates there with `?q=...`. **DO NOT** point the form
   action at the typeahead JSON endpoint — Chrome pretty-prints it as a JSON
   viewer and the search appears broken on mobile.
3. **Strict-first relevance**: multi-token queries like `"AS6704T v2 Lockerstor"`
   narrow to products whose `sku + name` contains EVERY token. Falls back to
   BC's loose tokenized OR-match when no Tier-1 hits. SKU-shaped queries
   (alphanumeric ≥6 chars) prefer exact-SKU matches and pin them to position 1.
4. **Pagination**: BC's `searchProducts.products(first:)` is hard-capped at 50;
   we fetch 50 and narrow client-side. For broader queries we trust BC's
   `collectionInfo.totalItems`; for narrowed results we report the post-filter
   count.

---

## 9. Bundle PDP modifier flags (BC-specific, mirror in Shopify)

PM extends BC's ProductPickList modifier system with two admin flags **typed
directly into the modifier name in BC admin**:

| Flag           | Where in BC admin              | What it does                                            |
|----------------|--------------------------------|----------------------------------------------------------|
| `(multi)`      | end of modifier `display_name` | Switch from radio (single-pick) to checkbox (multi-pick) |
| `(max N)`      | end of modifier name OR option name | Hard upper bound on quantity stepper                |

Example: a modifier `display_name` of `Add WD SSD (multi) (max 4)` → admin gets
a 4-checkbox grid where each option has its own qty stepper capped at 4.

In Shopify, you don't have ProductPickList. The closest analog is
**bundles** (Shopify Bundles API) or **linked products with a custom UI** —
the BUNDLE PRODUCT IS THE PARENT, and the picks are children with their own
SKUs. Implement the same `(multi)` / `(max N)` flag-on-name convention in
product metafields if Shopify Bundles doesn't natively support it.

---

## 10. What was built / fixed in the most recent session

A snapshot, so the new session knows the current state:

- **Mobile responsive design pass** (40+ files): every `pm-*` component +
  several `vibes/soul/sections` got mobile-first Tailwind classes. 5 commits.
- **Hamburger drawer** in `pm-header`: left-slide, replaces the nav rail on
  `<md`. Same `categories` array, same hrefs. Body scroll lock + Esc to close.
- **Filters drawer** in `pm-facet-sidebar`: right-slide, replaces the sticky
  sidebar on `<lg`. The filter UI was hoisted into a `const` so the SAME
  controls render in both the desktop sticky sidebar and the mobile drawer —
  state, handlers, and URL syncing are unchanged.
- **Search relevance fix**: form action was pointing at the typeahead JSON
  API; mobile Chrome was landing users on a pretty-printed JSON dump on
  submit. Split into `searchAction` (form fallback → `/dev/preview/search`)
  and `typeaheadApi` (XHR → `/dev/preview/api/search`).
- **HPE brand page composition**: hero (HPE green split) + product-family
  cards + "HPE + AMD. Better Together" cover hero + "Why HPE + AMD" card row
  with HPE/AMD wordmark logos top-right at 72px.
- **Dedicated brand banner folder**: BC structure migrated from
  `BRAND > Mega Menu Brands > HPE` to `PM Page Banners > PM Brand Banners > HPE`
  (id=329). Fetcher prefers the new location, falls back to legacy.
- **Vercel deploy**: monorepo config in `core/vercel.json` (cd to parent +
  pnpm + turbo). Project Root Directory set to `core` via Vercel API.
  `robots.txt` + `sitemap.xml` switched to `force-dynamic` with 1h ISR to
  dodge BC's build-time rate limit.

---

## 11. Hydrogen port — recommended file-structure mapping

```
Next.js Catalyst              →   Hydrogen / Remix
─────────────────────────────────────────────────────────────────
core/                         →   app/  (Remix root)
app/[locale]/(default)/       →   app/routes/($locale)._index.tsx etc.
                                  (or single-locale: app/routes/_index.tsx)
app/dev/preview/              →   PROMOTE TO ROOT — these are your prod routes
app/dev/preview/api/search    →   app/routes/api.search.ts (Remix resource route)
components/pm-*/              →   app/components/pm-*/   (rename pkg, keep names)
lib/pm-*.ts                   →   app/lib/pm-*.ts
client/ (BC GraphQL)          →   app/lib/shopify-client.ts (Storefront API)
data-transformers/            →   app/data-transformers/
                                  (BC shape → UI shape becomes
                                   Shopify shape → SAME UI shape)
auth/ (NextAuth)              →   Shopify Customer Account API
                                  (built into Hydrogen)
next.config.ts                →   remix.config.js + vite.config.ts
middleware.ts                 →   app/entry.server.ts hooks (or H2 middleware)
```

**BC concepts → Shopify concepts**:
| BC                                 | Shopify                                       |
|-----------------------------------|------------------------------------------------|
| Channel                            | Storefront / Market                            |
| Category (tree)                    | Collection (flat + nested via tags or metaobject) |
| Brand                              | Vendor (on Product) OR Collection by vendor    |
| Product → modifier → option (PickList) | Product → Bundle (Shopify Bundles) OR linked products |
| Category description (HTML + fences) | Metaobject entries linked from Collection/Product metafields |
| ProductPickList → linked product   | Bundle component                               |
| BC bulk-pricing tiers              | Quantity rules on variants / B2B catalog       |
| BigCommerce GraphQL                | Shopify Storefront API (GraphQL) + Customer Account API |
| Webhooks (catalog tags)            | Shopify Admin webhooks                         |
| BC sandbox URL                     | shop-name.myshopify.com                        |

---

## 12. Build / deploy

- **Local dev**: `cd core && NODE_TLS_REJECT_UNAUTHORIZED=0 npx next dev`
  (the TLS bypass is for the sandbox BC store's cert; remove in real prod).
- **Vercel monorepo config** lives in `core/vercel.json`:
  ```json
  {
    "framework": "nextjs",
    "installCommand": "cd .. && corepack enable && pnpm install --frozen-lockfile",
    "buildCommand": "cd .. && pnpm turbo run build --filter=@bigcommerce/catalyst-core"
  }
  ```
- **Env vars** required: `BIGCOMMERCE_STORE_HASH`, `BIGCOMMERCE_STOREFRONT_TOKEN`,
  `BIGCOMMERCE_CHANNEL_ID`, `BIGCOMMERCE_ACCESS_TOKEN`, `AUTH_SECRET`,
  `AUTH_TRUST_HOST`, `ENABLE_ADMIN_ROUTE`, `DEFAULT_REVALIDATE_TARGET`.
  For Hydrogen, replace with `PUBLIC_STOREFRONT_API_TOKEN`,
  `PUBLIC_STORE_DOMAIN`, `PRIVATE_STOREFRONT_API_TOKEN`,
  `SESSION_SECRET`, `PUBLIC_STOREFRONT_ID`, `PUBLIC_CHECKOUT_DOMAIN`.

---

## 13. What to read first when porting

1. `core/lib/pm-hero-banner.ts` — line 1-160 schema doc. The cornerstone of the
   admin-driven content model. Port the parser unchanged; swap the data source.
2. `core/lib/pm-card-section.ts` — line 1-90 schema doc. Same pattern.
3. `core/components/pm-header/pm-header.tsx` — the shell. Includes the mobile
   hamburger drawer.
4. `core/components/pm-product-detail/pm-product-detail.tsx` — PDP layout.
5. `core/components/pm-category-listing/pm-category-listing.tsx` +
   `core/components/pm-facet-sidebar/pm-facet-sidebar.tsx` — PLP + filters.
6. `core/lib/pm-search.ts` — search relevance + strict-first narrowing.
7. `scripts/pm-bootstrap-hpe-brand.mjs` — example of how an admin content
   block looks in raw text, end-to-end.
8. `docs/` (if present) — additional admin guides.

---

## 14. Visual fidelity checklist

When porting each PM component, the rendered output should be visually
indistinguishable from the production deploy on the same viewport:

- [ ] Tailwind classes copied verbatim (port to Hydrogen's tailwind config
      with the same `pm-*` token names).
- [ ] Lucide icon names + sizes + stroke widths match.
- [ ] All `text-[Npx]` arbitrary-size literals match.
- [ ] All `min-h-[44px]` tap-target constraints preserved.
- [ ] All breakpoint switches (`sm:`, `md:`, `lg:`) preserved.
- [ ] Hover transitions: `transition-colors duration-[120ms]` etc. preserved.
- [ ] Mega-menu hover state machine (open/close delays, mouse-leave grace)
      preserved 1:1 in pm-header.
- [ ] Drawer slide animations + Esc / overlay close + body scroll lock.

---

## 15. Final note

The Catalyst code is the **specification**. When in doubt, match the source.
When the source has a clear architectural choice that doesn't transfer to
Hydrogen (e.g. Server Actions vs Remix actions, Auth.js vs Shopify Customer
Account), pick the Hydrogen-idiomatic equivalent but **keep the user-visible
behavior identical**.

Production reference: **https://platinum-micro-catalyst.vercel.app**
Source: **https://github.com/anujyadav140/platinummicro-catalyst**

Good luck.
