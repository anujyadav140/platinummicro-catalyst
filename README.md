# Platinum Micro Catalyst Storefront

Next.js 15 (App Router) replacement for the legacy `platinummicro.com`
BigCommerce Stencil site, built on BigCommerce's
[Catalyst](https://catalyst.dev) framework.

- **Live preview routes:** `/dev/preview/...` (homepage, category, PDP,
  search, cart, account, etc.)
- **BigCommerce sandbox:** `store-1dedrz66md`
- **Production BC store:** `store-v57yvx1djr` (target at cutover)

---

## Quick start

```bash
# From the repo root
cd core
cp .env.example .env.local         # fill in BC store hash + tokens
pnpm install
pnpm dev                            # http://localhost:3000
```

Open `http://localhost:3000/dev/preview/` for the homepage preview.

> **Windows TLS quirk:** if `pnpm dev` errors with
> `unable to verify the first certificate` on BC requests, prefix with
> `NODE_TLS_REJECT_UNAUTHORIZED=0 pnpm dev` (or set the env var in
> `.claude/launch.json`).

---

## Documentation

Everything written specifically for this fork lives in `docs/`. Read in
this order if you're new to the codebase:

| Order | File | What it covers |
|------:|------|----------------|
| 1 | `docs/00-overview.md` | High-level architecture, key directories, brand tokens, B2B feature inventory |
| 2 | `docs/05-running-the-preview.md` | How to run the local dev server and what `/dev/preview/` is |
| 3 | `docs/01-bc-token-setup.md` | How to mint the BC Storefront token + V3 admin token |
| 4 | `docs/02-folder-conventions.md` | Hidden BC categories used as admin folders ("PM Page Banners", etc.) |
| 5 | **`docs/16-admin-content-syntax.md`** | **Fence-block syntax** (`pm-hero`, `pm-cards`, `pm-brands`) — how admins customize banners, card grids, the brand wall from BC without a code change |
| 6 | `docs/04-design-system.md` | Color tokens, typography, spacing scale |
| 7 | `docs/15-bundles-feature-spec.md` | Bundle PDP feature spec (modifiers, qty stepper, bulk-pricing tiers) |

The remaining numbered files cover narrower topics (mega menu,
caching, checkout state of play, compare feature, etc.) — browse
`docs/` for the full list.

### Admins: where to start

If you're a content admin and you only want to know how to change the
homepage banners, the "Browse by category" tiles, the brand wall, or
the search-page hero, jump straight to:

> **[`docs/16-admin-content-syntax.md`](docs/16-admin-content-syntax.md)**

That document is the single reference for our custom fence-block
syntax (`<!--pm-hero -->`, `<!--pm-cards -->`, `<!--pm-brands -->`),
the keys you can set inside each, and what they do visually. Worked
examples for every layout mode are included.

---

## Repository layout

```
platinummicro-catalyst/
├── core/                          # The Next.js storefront app
│   ├── app/dev/preview/           # PM-customized preview routes
│   ├── components/                # PM-prefixed components (Pm*)
│   ├── lib/                       # Data fetchers + parsers + stores
│   │   ├── pm-hero-banner.ts      # <!--pm-hero --> parser
│   │   ├── pm-card-section.ts     # <!--pm-cards --> parser
│   │   ├── pm-brands-section.ts   # <!--pm-brands --> parser
│   │   ├── pm-page-banner-fetcher.ts  # Reads homepage/search slots from BC
│   │   ├── pm-quote-store.tsx     # Client-side BoM / cart context
│   │   └── ...
│   └── scripts/                   # Build-time BC bootstrap scripts
│
├── scripts/                       # Ad-hoc BC admin scripts
│   ├── pm-bootstrap-browse-by-category.mjs
│   ├── pm-bundle-bulk-setup.mjs
│   ├── pm-bundle-bulk-adjusters.mjs
│   ├── pm-bundle-bulk-tiers.mjs
│   └── pm-bundle-discovery.mjs
│
└── docs/                          # Project documentation
    └── upstream/                  # Preserved upstream Catalyst docs
```

---

## Custom features in this fork

Beyond stock Catalyst, this codebase adds:

| Feature | Where it lives |
|---------|----------------|
| **Admin-managed page sections** (heroes, card grids, brand wall, all driven by BC category descriptions) | `lib/pm-page-sections.ts`, `lib/pm-page-banner-fetcher.ts`, parsers in `lib/pm-*-section.ts`, renderers in `components/pm-*` |
| **PM mega menu** synced from BC categories | `lib/pm-mega-menu-fetcher.ts`, `components/pm-mega-menu/` |
| **Quote drawer / BoM cart** with B2B Ninja handoff | `lib/pm-quote-store.tsx`, `components/pm-quote-drawer/` |
| **Quick Order modal** with SKU → BC entityId resolver so paste flows reach Stencil checkout | `components/pm-quick-order-modal/`, `lib/pm-quick-order-handler.tsx`, `app/dev/preview/_actions/resolve-quick-order-skus.ts` |
| **Bundle PDP** — replaces legacy "Pack of N" workaround with `qty × tiered-price` math read from BC modifier adjusters + bulk-pricing tiers | `components/pm-bundle-options/`, `components/pm-product-detail/`, `lib/pm-product-by-slug.ts` |
| **Compare drawer** | `components/pm-compare-*`, `lib/pm-compare-store.tsx` |
| **Coupon input** with live BC validation | `components/pm-coupon-input/`, `lib/pm-coupons.ts` |
| **Promotional banners** with admin-managed dismissal | `lib/pm-banners.ts`, `lib/pm-promotions.ts` |
| **Cart → Stencil OPC** handoff via the `startCheckoutAction` server action | `app/dev/preview/_actions/start-checkout.ts` |

---

## Catalyst upstream

This repo is a fork of [`bigcommerce/catalyst`](https://github.com/bigcommerce/catalyst).
The original upstream README is preserved under
[`docs/upstream/CATALYST_README.md`](docs/upstream/CATALYST_README.md)
for attribution and reference. All PMI-specific code sits under
`core/app/dev/preview/`, `core/components/pm-*`, `core/lib/pm-*`, and
`scripts/`.

When pulling upstream Catalyst updates, prefer rebasing onto
upstream/main and reviewing conflicts in non-`pm-*` files — anything
prefixed `Pm` / `pm-` is intentionally ours.

---

## License

MIT — see [LICENSE.md](LICENSE.md).
