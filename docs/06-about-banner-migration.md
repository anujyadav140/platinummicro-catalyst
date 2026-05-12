# 06 — About Platinum Micro banner: hardcoded → admin-managed

A migration note for the "About Platinum Micro" beat that used to sit between the product grid and the brand wall on the homepage.

## What changed

Before, the dark-navy "About Platinum Micro" strip was a hardcoded React component (`<PmAboutBanner />`) rendered from `core/app/dev/preview/preview-shell.tsx`. The copy was baked into the component file, which meant any wording tweak required a code change and a deploy.

After this migration, that strip is rendered by the generic `<PmHeroBanner>` system, fed from a new BC category. It now lives in the same admin-managed `<!--pm-hero ... -->` fence pipeline as the other five homepage banners — so admins can edit copy, swap colors, add a CTA, or take it down entirely without touching code. The component file (`core/components/pm-about-banner/`) is still in the codebase but unreferenced, so the old version can be re-mounted later if needed.

## The new BC category

| Field | Value |
|---|---|
| **Category ID** | `312` |
| **Name** | Home Page Banner 6 — About Platinum Micro |
| **Parent** | `PM Home Page Banners` (id=304) |
| **Sort order** | `6` (renders AFTER the existing 5 homepage banners) |
| **Visible** | `true` |

Because the `fetchPmPageBanner('homepage')` resolver walks the children of id=304 in admin sort order, this new section appends to the end of the existing five — matching where the old hardcoded `<PmAboutBanner />` lived in the page flow (between the product grid and the brand wall).

## The seed `<!--pm-hero ... -->` block

```
<!--pm-hero
bg: #050d1c
bg_gradient: linear-gradient(180deg, #050d1c 0%, #0a1430 100%)
text: light
accent: #f97316
align: center
headline: About Platinum Micro
body: For two decades, Platinum Micro has distributed enterprise IT from Southern California to system integrators, public-sector buyers, and healthcare networks worldwide. Forty-plus manufacturer partnerships, real lead times, named account managers — sourced direct, with trade credit available on approved application.
height: auto
padding_y: 80px
margin_top: 0
margin_bottom: 0
full_bleed: true
-->
```

Why these values:
- `bg` + `bg_gradient` reproduce the deep-navy ceiling from the original component (`bg-pm-navy-deepest`), with a subtle vertical gradient borrowed from the footer recipe so the banner reads as a "trust + provenance" beat between the catalog and the brand wall.
- `text: light` keeps the white type from the original.
- `align: center` mirrors the original `text-center` block.
- `full_bleed: true` matches the original's edge-to-edge `<section>` (no container framing).
- `padding_y: 80px` and `height: auto` reproduce the original's `py-20` vertical breathing room without forcing a fixed banner height.
- `headline: About Platinum Micro` carries the original "eyebrow" copy as the heading, since the hero-banner schema doesn't have a dedicated eyebrow field.
- `body` is the exact copy from the original `DEFAULT_BODY` constant.
- No `cta_label` / `cta_href` — the original banner had no CTA.

## How the admin edits it

1. BC admin → **Products → Categories**
2. Expand **PM Page Banners** → **PM Home Page Banners**
3. Click **Home Page Banner 6 — About Platinum Micro**
4. Scroll to the **Description** field
5. Click the `</>` source-view button (top-right of the editor)
6. Edit the `<!--pm-hero ... -->` block — change wording, colors, add a CTA, swap to a split layout with an image, whatever
7. Save

Cache TTL is 120s — the change goes live within ~2 minutes.

To take the section down entirely, set the category's **Visible** toggle to off, or delete the category.

## Code changes that shipped with this migration

| File | Change |
|---|---|
| `core/app/dev/preview/preview-shell.tsx` | Removed `<PmAboutBanner />` JSX line and the matching `import { PmAboutBanner } from '~/components/pm-about-banner';` line. |
| `core/lib/pm-page-banner-fetcher.ts` | Bumped both cache keys so the new id=312 child is picked up on the next homepage render without waiting for the 120s TTL: `pm-page-banner-fields-v10` → `pm-page-banner-fields-v11` (per-category description cache), and `pm-page-banner-slot-resolution-v2` → `pm-page-banner-slot-resolution-v3` (the slot-tree cache that lists the slot's children). The second bump is the one that actually discovers id=312 — the first one only matters once a category's description changes later. |

`core/components/pm-about-banner/pm-about-banner.tsx` is intentionally left in the repo, unreferenced, so the hardcoded version can be re-mounted quickly if the BC-managed variant doesn't work out.
