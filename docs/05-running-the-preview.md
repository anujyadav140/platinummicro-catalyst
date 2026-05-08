# 05 — Running the Design Preview

Until the Storefront API token is wired up, the entire BigCommerce GraphQL
client errors at boot when you run `pnpm dev` from the repo root — the
homepage and product routes try to fetch real data and crash without creds.

To iterate on the visual design without that blocker, we ship a **standalone
preview route** at `/dev/preview` that renders every Platinum Micro component
on a single page using mock data.

## How to run it

From the repo root:

```bash
pnpm install                # already done; only re-run after dep changes
cd core
pnpm exec next dev          # bypasses turbo + dotenv requirement
```

Then open: **http://localhost:3000/dev/preview**

(Once the token is wired, you'll be able to use plain `pnpm dev` from the
root and visit `/` for the real homepage. The preview route stays available
either way.)

## What you'll see

In order from top to bottom:

1. `PmTopBar` — navy-deepest trust bar with Net-30 + freight + Quick order link
2. `PmHeader` — white top row (logo, search, actions) + navy nav row
3. `PmHero` — split navy / warm layout with featured product card
4. `PmAudienceStrip` — six "Who we serve" tiles
5. `PmCategoryStrip` — six "Browse by category" tiles on a sunken background
6. `PmBrandWall` — 16 manufacturer cells in an 8-column grid
7. `PmFooter` — navy-deepest footer with link columns

Click **Quick order** in either the top bar or the header to open the modal.
Add SKUs + quantities, then "Add to BOM" — the badge count on the Quote
button updates and the rows print to the browser console (the Quote drawer
will catch them once we build it).

## Iterating on a component

The folder convention (see `02-folder-conventions.md`):

```
core/components/pm-{name}/
├── pm-{name}.tsx          ← edit me
├── pm-{name}.types.ts     ← prop interface
└── index.ts               ← named exports
```

Save → Next.js fast-refreshes → the preview page updates in place. No need
to restart the dev server.

## What's NOT in the preview

- Mega-menu hover panels — wired into `PmHeader` later
- `PmQuoteDrawer` — slide-in BOM/quote pane (next component to build)
- Real product cards — will pull from BC GraphQL after the token lands
- i18n locale segment — preview is rendered in English at the root

## When you're ready for the real homepage

Once the token is in `.env.local`:

```bash
# from repo root
pnpm dev
```

Open: **http://localhost:3000/en** (or whatever your default locale is)

Catalyst's homepage at `app/[locale]/(default)/page.tsx` will be rebuilt
to compose these same Pm* components with live BigCommerce data.
