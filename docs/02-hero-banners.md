# 02 — Hero Banners & Page Sections (admin guide)

Admin-managed page sections (hero banners + card grids) on the storefront. Editable from BC admin without a code deploy.

## Where sections can appear

| Page type | Where the section config lives in BC |
|---|---|
| **Category page** (e.g. `/category/servers/`) | The BC category itself ("Servers") — paste blocks into its Description |
| **Brand page** (e.g. `/search?bids=39&heading=HPE`) | BC category at `BRAND → Mega Menu Brands → [Brand]` |
| **Homepage** (`/dev/preview/`) | `PM Page Banners → PM Home Page Banners → [N child folders, one per section]` |
| **Search page** (`/dev/preview/search/`) | `PM Page Banners → PM Search Page Banners → [N child folders]` |
| **Footer** (site-wide) | `PM Page Banners → PM Footer` — single category with a `<!--pm-footer ... -->` block |

The homepage and search slots were created by `scripts/bc-bootstrap-page-banners.mjs` and live under "PM Page Banners". They're internal folders — they don't appear in the customer-facing nav.

## Homepage / search structure — one BC subcategory per section

For homepage and search, each visual section (hero, announcement strip, card grid, etc.) lives in its OWN BC subcategory under the slot folder. This way the admin can:

- Edit one section without touching others
- Reorder sections by changing BC's **Sort Order** field on each subcategory
- Add a new section by creating a new subcategory + dropping ONE block into its description
- Remove a section by deleting (or hiding) the subcategory

Example layout in BC admin:
```
PM Page Banners
├── PM Home Page Banners                     ← slot folder
│   ├── Home Page Banner 1  (sort 1)  ← contains one <!--pm-hero ... --> block
│   ├── Home Page Banner 2  (sort 2)  ← contains another <!--pm-hero ... --> block
│   └── Home Page Banner 3  (sort 3)  ← contains a <!--pm-cards ... --> block
└── PM Search Page Banners
    └── Search Banner 1     (sort 1)  ← contains one block
```

For **category** and **brand** pages, you still paste all blocks into the category's own Description field (stack them with one fence per block) — those pages don't use the subcategory pattern.

## How to configure a section (homepage / search)

1. **BC admin → Products → Categories** → expand **PM Page Banners**
2. Expand the slot folder (e.g. **PM Home Page Banners**)
3. **To add a new section:** click **Add Category**, name it (e.g. "Home Page Banner 4"), set **Parent category** to the slot folder, set **Sort Order** to where you want it
4. **To edit an existing section:** click the section subcategory you want to change
5. Scroll to **Description** field
6. **Click the `</>` source-view button** in the toolbar (top-right of the editor)
7. Paste ONE `<!--pm-hero ... -->` or `<!--pm-cards ... -->` block (see schema below)
8. Save

**Without source view**, BC's WYSIWYG mangles the `<!--` into `&lt;!--` and breaks the block. The parser tolerates this most of the time, but source view is bulletproof.

**One block per subcategory.** If you stack multiple blocks in one subcategory's description, they'll all render but won't be reorderable in BC admin — splitting them into separate subcategories gives you that control.

Cache TTL is **120s** — edits go live within ~2 minutes.

## How to configure a section (category / brand pages)

Category pages and brand pages still use the all-in-one description (no subcategories). Just paste multiple blocks into the category's Description field — they render in document order.

## The schema

Every banner is a single `<!--pm-hero ... -->` block with `key: value` lines inside. Every key is optional. Order doesn't matter.

```
<!--pm-hero
image: https://cdn.../hero.jpg
bg: #0a2540
bg_gradient: linear-gradient(135deg, #0a2540, #1e3a5f)
bg_image: https://cdn.../texture.png
bg_image_size: cover
bg_image_position: center
bg_image_repeat: no-repeat
bg_overlay: rgba(10,37,64,0.55)
text: light
accent: #f97316
headline: Enterprise IT, sourced.
body: Two decades of servers, storage, and networking.
logo: https://cdn.../hpe-logo.png
cta_label: Browse the catalog
cta_href: /dev/preview/category/servers
height: 420px
padding_y: 64px
margin_top: 0
margin_bottom: 0
align: left
image_fit: side
-->
```

### Key reference

#### Images

| Key | Effect |
|---|---|
| `image` | Primary image URL. In `side` mode, first image in the right-column rail. In `cover`/`contain` mode, painted as the bg. If empty, falls back to BC's built-in **Category Image** (drag-drop upload field on the category edit page). |
| `image_2` … `image_5` | Extra images joining `image` in the right-column rail (side mode only). |
| `logo` | Optional logo image, rendered left of the image rail. |

#### Background (layered, painted bottom → top)

| Key | Effect |
|---|---|
| `bg` | Solid color base. Hex / rgb / named. Default `#0d9488`. |
| `bg_gradient` | CSS gradient painted over `bg`. e.g. `linear-gradient(135deg, #0a2540, #1e3a5f)` |
| `bg_image` | Background image URL, painted over the gradient. Independent of `image`. |
| `bg_image_size` | `cover` (default) / `contain` / `auto` / `"100% auto"` |
| `bg_image_position` | `center` (default) / `top` / `bottom` / `left` / `right` / `"25% 75%"` |
| `bg_image_repeat` | `no-repeat` (default) / `repeat` / `repeat-x` / `repeat-y`. Useful for textures/patterns. |
| `bg_overlay` | Color/gradient painted ON TOP of `bg_image` (for legibility). e.g. `rgba(0,0,0,0.4)` or `linear-gradient(120deg, rgba(10,37,64,0.85), transparent)`. |

#### Text

| Key | Effect |
|---|---|
| `text` | `light` (default — white text) / `dark` (dark text) |
| `accent` | CTA button background color (hex). Default brand terracotta. |
| `headline` | Main heading |
| `body` | Supporting paragraph |
| `cta_label` | Button label |
| `cta_href` | Button URL. Both `cta_label` AND `cta_href` required for the button to render. |

#### Sizing

| Key | Effect |
|---|---|
| `height` | Banner min-height. Any CSS length (e.g. `420px`, `60vh`, `auto`). Default `320px`. |
| `padding_y` | Vertical padding inside the banner. Default `48px`. |
| `margin_top` | Space above the banner. Default `0`. |
| `margin_bottom` | Space below the banner. Default `0`. |
| `align` | `left` (default) / `center` |
| `image_fit` | `side` (default — text + right-side image rail) / `cover` (image fills bg) / `contain` (image centered) / `split` (50/50 split — see below) |
| `image_position` | In `split` mode: `left` (default) / `right` — which half has the image |
| `image_half_bg` | In `split` mode: bg color for the image half |
| `content_half_bg` | In `split` mode: bg color for the content half |
| `content_padding` | In `split` mode: padding inside the content half (default `48px 56px`) |
| `image_half_size` | In `split` mode: CSS `background-size` for the image filling its half. Default `cover`. Use values > 100% to zoom INTO the source photo and crop out built-in whitespace. E.g. `150%` (zoom 50%), `200%` (zoom 2×), `contain` (fit without cropping), `100% 100%` (stretch — distorts aspect). |
| `image_half_position` | In `split` mode: CSS `background-position` for the image. Default `center`. Useful when zooming in — shifts the focal point. E.g. `center`, `top`, `"50% 30%"`. |
| `full_bleed` | `true` = banner stretches edge-to-edge of the viewport (no max-width frame, no horizontal gutters). `false` (default) = banner sits inside the 1280px container with `px-8` gutters, with the page background visible on both sides. Works in any `image_fit` mode. |
| `border_radius` | CSS border-radius on the whole banner (with `overflow: hidden` so child layers stay clipped). E.g. `16px`, `24px`, `9999px`. Default `0`. **In contained mode** (`full_bleed: false`), the card itself carries the bg + radius and floats on the page background — no color bleed to the screen edges. **In full-bleed mode**, the rounded corners would be cut off by the screen edges so `border_radius` is typically left at 0. |

## Ready-to-use recipes

### Gradient-only banner (no image)

```
<!--pm-hero
bg_gradient: linear-gradient(135deg, #0a2540 0%, #1e3a5f 50%, #b91c1c 100%)
text: light
accent: #f97316
headline: Enterprise IT, sourced.
body: Two decades of servers, storage, and networking.
cta_label: Browse the catalog
cta_href: /dev/preview/category/servers
height: 420px
padding_y: 64px
-->
```

### Photo background with tinted overlay

```
<!--pm-hero
bg: #0a2540
bg_image: https://cdn.../data-center-photo.jpg
bg_image_size: cover
bg_image_position: center
bg_overlay: linear-gradient(120deg, rgba(10,37,64,0.85) 0%, rgba(10,37,64,0.5) 60%, transparent 100%)
text: light
headline: Built for the data center.
body: Servers, switches, and storage delivered this week.
cta_label: Shop servers
cta_href: /dev/preview/category/servers
height: 480px
-->
```

### Repeating pattern texture

```
<!--pm-hero
bg: #f5f5f0
bg_image: https://cdn.../noise-pattern.png
bg_image_size: 200px
bg_image_repeat: repeat
text: dark
headline: Configured for SoCal freight.
cta_label: View catalog
cta_href: /dev/preview/sitemap
-->
```

### Full-bleed cover photo

```
<!--pm-hero
image: https://cdn.../hero-photo.jpg
image_fit: cover
text: light
headline: Sourced from the floor.
cta_label: Shop now
cta_href: /dev/preview/category/servers
height: 520px
-->
```

### Split layout — image left, content right

```
<!--pm-hero
image: https://cdn.../intel-xeon-product.jpg
image_fit: split
image_position: left
image_half_bg: #0a1430
content_half_bg: #f5f5f0
text: dark
accent: #ea580c
headline: Discover the new Intel Xeon 6 processor.
body: Drive high throughput, power efficiency, and help improve sustainability for network and edge workloads.
cta_label: View Xeon servers
cta_href: /dev/preview/category/servers
height: 380px
padding_y: 0
content_padding: 56px 64px
-->
```

### Split layout — contained + rounded corners

The "card-in-frame" look: banner sits inside the 1280px container with rounded corners and visible margins.

```
<!--pm-hero
image: https://cdn.../product.jpg
image_fit: split
image_position: left
image_half_bg: #0a1430
content_half_bg: #f5f5f0
text: dark
accent: #ea580c
headline: Discover the new Intel Xeon 6 processor.
body: Drive high throughput, power efficiency, and help improve sustainability.
cta_label: View Xeon servers
cta_href: /dev/preview/category/servers
height: 380px
padding_y: 0
content_padding: 56px 64px
margin_top: 48px
margin_bottom: 24px
border_radius: 16px
full_bleed: false
-->
```

### Split layout — full-bleed (hugs both screen edges)

Edge-to-edge hero strip with no max-width frame. Image stretches across half the entire viewport. Skip `border_radius` because the corners would get cut off by the screen edge anyway.

```
<!--pm-hero
image: https://cdn.../warehouse.jpg
image_fit: split
image_position: right
content_half_bg: #0a1430
text: light
accent: #f97316
headline: Racked, stacked, and ready to ship.
body: Configured by our team, validated against your BOM, freighted from Southern California.
cta_label: Request a build
cta_href: /dev/preview/account/register
height: 380px
padding_y: 0
content_padding: 56px 64px
margin_top: 24px
margin_bottom: 24px
full_bleed: true
-->
```

### Split layout — image right, content left (mirror)

```
<!--pm-hero
image: https://cdn.../datacenter-photo.jpg
image_fit: split
image_position: right
content_half_bg: #0a1430
text: light
accent: #f97316
headline: Racked, stacked, and ready to ship.
body: Configured by our team, validated against your BOM, freighted from Southern California within the week.
cta_label: Request a build
cta_href: /dev/preview/account/register
height: 380px
padding_y: 0
content_padding: 56px 64px
-->
```

### Side layout with multiple product images

```
<!--pm-hero
image:   https://cdn.../product-1.jpg
image_2: https://cdn.../product-2.jpg
image_3: https://cdn.../product-3.jpg
bg: #0a2540
text: light
headline: New: HPE ProLiant Gen11
body: 312 units in stock and ready to ship.
cta_label: View all Gen11 servers
cta_href: /dev/preview/search/?q=ProLiant+Gen11
height: 400px
image_fit: side
-->
```

## Troubleshooting

**My change doesn't show up.**
- Cache TTL is 120s — wait 2 minutes after saving in BC.
- Make sure you edited the **correct category**. The homepage banner is on `PM Page Banners → homepage` (BC category id=304), NOT on the parent `PM Page Banners` (id=303).
- Hard-refresh the browser (Ctrl+F5) to skip browser-level cache.

**The banner shows OLD content, not what I just pasted.**
- You probably **appended** instead of replacing. Check BC's description field — there may be multiple `<!--pm-hero ... -->` blocks stacked. Delete the old ones, keep only one.
- Use Ctrl+A → Delete in the description editor before pasting fresh content.

**The banner doesn't render at all (page looks like before).**
- The fence (`<!--pm-hero ... -->`) must be present and properly closed.
- If you typed it in WYSIWYG mode and the parser can't recover, try the `</>` source view and paste again.

**The text is unreadable over my background image.**
- Add a `bg_overlay` to tint the image. Common pattern:
  ```
  bg_overlay: linear-gradient(120deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 70%, transparent 100%)
  ```

## How banner data flows through the code

1. **BC stores** the banner config in a category's `description` field
2. **The fetcher** for each page type pulls the description:
   - `lib/pm-category-by-slug.ts` → category pages
   - `lib/pm-brand-banner-fetcher.ts` → brand listing pages
   - `lib/pm-page-banner-fetcher.ts` → homepage + search
3. **`parsePmHeroBanner()`** in `lib/pm-hero-banner.ts` extracts the `<!--pm-hero ... -->` block and parses the key/value lines into a typed config
4. **`<PmHeroBanner>`** in `components/pm-hero-banner/` renders the config visually

To support a new key, add it to `PmHeroBannerConfig` (the type), wire it through `parsePmHeroBanner()`, and read it in `pm-hero-banner.tsx`. The schema reference in this file and the code's JSDoc should both be updated when adding new keys.

---

# Footer styling

Same admin pattern, different fence: drop a `<!--pm-footer ... -->` block into the **PM Footer** category's description (BC admin → Products → Categories → PM Page Banners → PM Footer). The fetcher reads it once per layout render and threads it through the nav context so the footer applies the overrides on every page.

**Only ONE footer config is read** (no stacking, no children). Column structure (auto Catalog + static Programs/About) stays in the code for now — what's editable from BC is the styling + brand-block fields.

## Footer schema

### Background — layered, painted bottom → top

| Key | Effect |
|---|---|
| `bg` | Solid color base (e.g. `#050d1c`) |
| `bg_gradient` | CSS gradient over `bg` (e.g. `linear-gradient(180deg, #050d1c, #0a1430)`) |
| `bg_image` | Background image URL, painted over gradient |
| `bg_image_size` | `cover` (default) / `contain` / `auto` / `"100% auto"` |
| `bg_image_position` | `center` (default) / `top` / `bottom` / `left` / `right` / `"25% 75%"` |
| `bg_image_repeat` | `no-repeat` (default) / `repeat` / `repeat-x` / `repeat-y` |
| `bg_overlay` | Color/gradient overlay for text legibility |

### Typography

| Key | Effect |
|---|---|
| `text` | `light` (default) / `dark` — overall theme |
| `text_color` | Direct override of body text color |
| `heading_color` | Color of column heading labels |
| `link_color` | Default link color |
| `link_hover_color` | Link color on hover |
| `legal_color` | Color of the bottom legal-row text |

### Brand block

| Key | Effect |
|---|---|
| `logo` | Logo image URL (replaces `/pm/logo.png`) |
| `logo_height` | Logo render height (e.g. `72px`) |
| `tagline` | Brand tagline paragraph |

### Bottom row

| Key | Effect |
|---|---|
| `copyright` | Copyright text |
| `border_top` | CSS border above the legal row (e.g. `1px solid rgba(255,255,255,0.1)`) |

### Sizing

| Key | Effect |
|---|---|
| `padding_top` | Footer top padding (e.g. `64px`) |
| `padding_bottom` | Footer bottom padding (e.g. `32px`) |
| `max_width` | Inner container max width (e.g. `1280px`) |
| `columns_layout` | CSS grid-template-columns for the columns row. Use underscores instead of spaces (parser swaps them back). Default `2fr_1fr_1fr_1.2fr`. Example: `2fr_1fr_1fr_1fr_1.2fr` for 4 link columns. |

### Auto-Catalog column

The first link column is auto-generated from BC top-level categories. Toggle and rename:

| Key | Effect |
|---|---|
| `show_catalog_column` | `true` (default) / `false` — hide the auto-Catalog column entirely |
| `catalog_column_title` | Heading shown above it (default `Catalog`) |

### Custom columns (admin-managed)

Numbered `column_1`, `column_2`, `column_3`, … up to 16. When set, they **replace** the hardcoded Programs/About defaults (the auto-Catalog column above is separate). Each column collects links numbered `link_1`, `link_2`, … up to 24.

| Key | Effect |
|---|---|
| `column_N_title` | Column heading (required — stops counting when missing) |
| `column_N_link_M_label` | Link label |
| `column_N_link_M_href` | Link URL |
| `column_N_heading_color` | Optional per-column heading color override |
| `column_N_link_color` | Optional per-column link color override |

### Legal row links (admin-managed)

Numbered `legal_1`, `legal_2`, … up to 8. When set, they **replace** the hardcoded Privacy/Terms/Order-verification trio.

| Key | Effect |
|---|---|
| `legal_N_label` | Link label |
| `legal_N_href` | Link URL |

## Footer recipes

### Subtle navy gradient (current default)

```
<!--pm-footer
bg_gradient: linear-gradient(180deg, #050d1c 0%, #0a1430 100%)
text: light
text_color: rgba(255,255,255,0.72)
heading_color: rgba(255,255,255,0.55)
link_color: rgba(255,255,255,0.72)
link_hover_color: #ffffff
legal_color: rgba(255,255,255,0.45)
border_top: 1px solid rgba(255,255,255,0.08)
padding_top: 64px
padding_bottom: 32px
tagline: Two decades stocking servers, storage, and networking.
copyright: © 2026 Platinum Micro, Inc.
-->
```

### Light footer (inverted theme)

```
<!--pm-footer
bg: #f5f5f0
text: dark
text_color: #475569
heading_color: #0a2540
link_color: #475569
link_hover_color: #0a2540
legal_color: #94a3b8
border_top: 1px solid rgba(10,37,64,0.1)
-->
```

### Photo-backed footer with overlay

```
<!--pm-footer
bg_image: https://cdn11.bigcommerce.com/.../warehouse-photo.jpg
bg_image_size: cover
bg_image_position: center
bg_overlay: linear-gradient(180deg, rgba(5,13,28,0.85), rgba(5,13,28,0.95))
text: light
padding_top: 80px
padding_bottom: 40px
-->
```

### Footer with a 4th custom column

Auto-Catalog + Programs + About + a new "Resources" column.

```
<!--pm-footer
bg_gradient: linear-gradient(180deg, #050d1c, #0a1430)
text: light

column_1_title: Programs
column_1_link_1_label: Bulk pricing
column_1_link_1_href: /bulk-pricing
column_1_link_2_label: Request a quote
column_1_link_2_href: /quote

column_2_title: About
column_2_link_1_label: About Us
column_2_link_1_href: /about
column_2_link_2_label: Contact
column_2_link_2_href: /contact

column_3_title: Resources
column_3_link_1_label: Blog
column_3_link_1_href: /blog
column_3_link_2_label: Knowledge base
column_3_link_2_href: /kb

legal_1_label: Privacy
legal_1_href: /privacy
legal_2_label: Terms
legal_2_href: /terms
-->
```

### Footer with NO catalog column (full custom)

Useful when the catalog list is too long or the admin wants a tighter footer.

```
<!--pm-footer
show_catalog_column: false

column_1_title: Shop
column_1_link_1_label: All products
column_1_link_1_href: /shop-all
column_1_link_2_label: New arrivals
column_1_link_2_href: /search?sort=newest

column_2_title: Support
column_2_link_1_label: Contact
column_2_link_1_href: /contact
column_2_link_2_label: FAQ
column_2_link_2_href: /faq
-->
```
