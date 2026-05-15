# Admin Content Syntax — PMI Fence Blocks

Last updated: 2026-05-15

This is the **single reference** for everything an admin can configure
from the BigCommerce console without a code change: hero banners, card
grids ("Browse by category", "Industries we serve"), the brand wall,
and the homepage / search / category pages they live on.

We use a small, deliberately readable syntax called a **fence block** —
a comment-style box that lives inside any BC category's *Description*
field. The frontend reads the description, parses the fence, and
renders the section. Anything outside the fence is treated as regular
description text (and ignored on pages where description doesn't
display).

```text
<!--pm-cards
title: Browse by category
columns: 5
card_1_title: Components
card_1_icon: Cpu
card_1_href: /dev/preview/category/components/
...
-->
```

Three fence types exist today:

| Tag             | Purpose                                          | File              |
| --------------- | ------------------------------------------------ | ----------------- |
| `<!--pm-hero -->` | Promotional banner — single image, headline, CTA | `lib/pm-hero-banner.ts` |
| `<!--pm-cards -->`| Grid of small tiles (categories, industries, etc.) | `lib/pm-card-section.ts` |
| `<!--pm-brands -->`| Authorized-partners logo wall                   | `lib/pm-brands-section.ts` |

You can stack multiple fences inside ONE description — they render in
document order. You can also split them across **child categories** of
a "page slot" (see ["Where to put the fence"](#where-to-put-the-fence)).

---

## Table of contents

1. [Where to put the fence](#where-to-put-the-fence)
2. [Common syntax rules](#common-syntax-rules)
3. [`pm-hero` — promotional banner](#pm-hero--promotional-banner)
4. [`pm-cards` — tile grid](#pm-cards--tile-grid)
5. [`pm-brands` — partner logo wall](#pm-brands--partner-logo-wall)
6. [How the homepage is assembled](#how-the-homepage-is-assembled)
7. [Caching & "my edit didn't show up"](#caching--my-edit-didnt-show-up)
8. [Cheat sheet](#cheat-sheet)

---

## Where to put the fence

The frontend reads the *Description* field on specific BC categories
and looks for fence blocks. Where you put the description controls
where the section appears on the public site.

### Page-level slots (homepage / search)

These live under a hidden parent category called **"PM Page Banners"**.
Each child is a *slot*; each grandchild is a *section*.

```text
PM Page Banners
├── PM Home Page Banners              ← slot
│   ├── Home Page Banner 1            ← section (one fence each)
│   ├── Home Page Browse by Category  ← section
│   ├── Home Page Banner 2
│   └── ...
├── PM Search Page Banners            ← slot
│   └── ...
└── PM Footer                         ← slot
```

To edit the homepage:
**BC admin → Products → Categories → PM Page Banners → PM Home Page
Banners → [pick a section] → Description.** The fence block lives in
that section's Description. To **reorder** sections, change the
section's `sort_order` in BC. To **add** one, create a new child of
the slot and write a fence in its description. To **remove**, delete
the child (or set `is_visible: false` — but visibility false hides it
from GraphQL too, so prefer delete).

### Category-level banners

Banners that should appear on a *real* product category (e.g. a hero
on `/category/servers/`) go on **that category's own description**:

> BC admin → Products → Categories → SERVERS → Description.

The category page renders any fence blocks found there above the
product grid.

### Brand banners

Same idea — drop a `<!--pm-hero -->` into the brand category's
description and it shows up on the brand landing page.

---

## Common syntax rules

The parser is forgiving but a few things will trip you up if you
ignore them:

1. **The whole block must be inside an HTML comment.** Open with
   `<!--pm-hero` (no space between `<!--` and the tag), close with
   `-->`. The BC admin's WYSIWYG sometimes auto-wraps comments — paste
   into the **HTML view** of the description, not the rich-text view.
2. **One key per line**, in `key: value` form. Whitespace around the
   colon is fine. The key is case-insensitive (`Headline:` and
   `headline:` are equivalent).
3. **Keys are listed in any order.** The numbered ones (`card_1_*`,
   `brand_3_*`) just have to *exist* — the parser collects them
   contiguously starting at 1 and stops at the first gap.
4. **Blank lines and indentation are ignored.** Group related keys
   for your own sanity.
5. **No quoting needed.** The value runs from the colon to the end of
   the line. Commas, slashes, hex colors are all fine.
6. **Avoid emojis** in keys that get round-tripped through BC's REST
   API (4-byte UTF-8 characters get rejected with a confusing
   `Invalid field(s): category_id` error). Emojis pasted directly in
   the BC admin UI usually survive — try one before relying on it.

---

## `pm-hero` — promotional banner

A single hero unit. Pick from four visual modes:

| `image_fit` | Look                                                         |
| ----------- | ------------------------------------------------------------ |
| `side`      | Text on the left, image rail on the right (default)          |
| `cover`     | Image fills the whole background, text overlaid              |
| `contain`   | Image centered, bg color all around                          |
| `split`     | Hard 50/50 — one half is the image, the other is content     |

### All keys

```text
<!--pm-hero

== IMAGES ==
image: <url>                         Primary image (falls back to BC Category Image)
image_2: <url>                       Extra image — `side` mode shows up to 5 in a rail
image_3, image_4, image_5
logo: <url>                          Optional logo, rendered left of the image rail

== BACKGROUND (layered bottom→top) ==
bg: <color>                          Solid color (#0a2540, rgb(...), brand name)
bg_gradient: <css gradient>          Painted over `bg`. e.g. linear-gradient(135deg, #0a2540, #1e3a5f)
bg_image: <url>                      Image painted over gradient
bg_image_size: cover | contain | auto | "100% auto"
bg_image_position: center | top | bottom | left | right | "25% 75%"
bg_image_repeat: no-repeat | repeat | repeat-x | repeat-y
bg_overlay: <css color or gradient>  Layer on top of bg image (use for darkening / tint)

== TEXT ==
text: light | dark                   Picks copy color + button style
accent: <hex>                        CTA button color (default brand terracotta)
headline: <string>                   Banner heading
body: <string>                       Paragraph below heading
cta_label: <string>                  Button label (needs cta_href to render)
cta_href: <url>                      Button target

== SIZING ==
height: <css length>                 Min height (420px, 60vh, auto, …)
padding_y: <css length>              Vertical padding inside the banner
margin_top: <css length>             Space above the banner
margin_bottom: <css length>          Space below the banner
align: left | center                 Text alignment
image_fit: side | cover | contain | split    See table above

== SPLIT MODE (only when image_fit: split) ==
image_position: left | right         Which half holds the image
image_half_bg: <color>               Visible behind transparent images
image_half_size: <css length>        Image box width/height — e.g. 150% to crop
image_half_position: <css position>  Image alignment inside its half
content_half_bg: <color>             Bg color for the text half
content_padding: <css padding>       Padding inside the content half (default "48px 56px")

== FRAMING ==
full_bleed: true | false             true → edge-to-edge; false (default) → 1280px container w/ gutters
border_radius: <css length>          e.g. 16px, 24px. Works best with `full_bleed: false`.
-->
```

### Examples

**Standard side-rail hero with a CTA**

```text
<!--pm-hero
image: https://cdn.../hero.jpg
bg: #0d9488
bg_gradient: linear-gradient(135deg, #0a2540, #1e3a5f)
text: light
accent: #f97316
headline: HPE Networking Instant On
body: Enterprise networking, simplified.
logo: https://cdn.../hpe-logo.png
cta_label: Shop all
cta_href: /dev/preview/category/networking
height: 420px
padding_y: 64px
align: left
image_fit: side
-->
```

**50/50 split — image left, light copy right**

```text
<!--pm-hero
image: https://cdn.../intel-xeon.jpg
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
margin_top: 48px
margin_bottom: 24px
border_radius: 16px
-->
```

**Full-bleed dark-mode "about" panel — no image, just typography**

```text
<!--pm-hero
bg: #050d1c
text: light
accent: #ed8166
eyebrow: About Platinum Micro
body: For two decades, Platinum Micro has distributed enterprise IT from Southern California to system integrators, public-sector buyers, and healthcare networks worldwide.
align: center
height: auto
padding_y: 80px
full_bleed: true
-->
```

---

## `pm-cards` — tile grid

A grid of small cards. Powers "Browse by category", "Industries we
serve", "Solutions for", and similar lists.

Per card you can show **an emoji, an image, or an icon** (priority in
that order — first one set wins). The card has a title, optional
subtitle, and optional link.

### Section-level keys

```text
<!--pm-cards

== HEADER ==
eyebrow: <string>                    Small uppercase label above the title
title: <string>                      Section heading
subtitle: <string>                   Paragraph below the title

== LAYOUT ==
columns: <int>                       Cards across at lg+ (default 6)
columns_md: <int>                    Cards across at md (default 3)
columns_sm: <int>                    Cards across at sm — mobile (default 2)
gap: <css length>                    Gap between cards (default 12px)
padding_y: <css length>              Section vertical padding (default 80px)
align: left | center                 Card content alignment
bg: <color>                          Section background (default transparent)
text: light | dark                   Header text color theme

== DEFAULT CARD VISUALS ==
card_bg: <color>                     Card background (default white)
card_text: <color>                   Card text color
card_border: <css border>            e.g. "1px solid #e5e5e5" or "none"
card_radius: <css length>            Card border radius (default 8px)
card_padding: <css length>           Card inner padding (default 20px)
card_hover_accent: <color>           Color the icon tile / title flips to on hover

== ICON & IMAGE STYLING ==
icon_size: <int>                     Icon stroke size in px (default 18)
icon_bg: <color>                     Icon tile background (default #eef1f7)
icon_color: <color>                  Icon stroke color (default #2e6db4)
image_size: <int>                    Pixel box for image / emoji glyph (default 48).
                                     Bump to 80–112 for the CDW-style photo-card look.

== BEHAVIOR ==
show_hover_arrow: true | false       Tiny ↗ that appears on hover (default true)

== POSTER STYLE (Industries-we-serve look) ==
card_style: icon-tile | poster       Default `icon-tile`. `poster` makes
                                     each card_N_image fill the card as a
                                     background and renders card_N_title
                                     as a ribbon in the top-left corner.
card_aspect: <css aspect-ratio>      Aspect ratio of each card in poster
                                     mode. Default `"2 / 1"`. Try
                                     `"16 / 9"` for wider, `"3 / 2"` for
                                     a softer landscape.
ribbon_bg: <color>                   Ribbon background color. Default
                                     `#8a2929` (PMI maroon).
ribbon_text: <color>                 Ribbon text color. Default white.
-->
```

### Per-card keys (numbered `card_1`, `card_2`, …)

```text
card_N_title: <string>               Required to count the card
card_N_subtitle: <string>            Optional supporting text
card_N_icon: <Lucide name>           Icon — Cpu, Network, Server, Boxes, ShieldCheck, …
card_N_emoji: <emoji>                Wins over image + icon. e.g. 🛒 📦 🖥️
card_N_image: <url>                  Wins over icon. URL to a product photo / brand mark
card_N_href: <url>                   Whole card becomes clickable when set

== PER-CARD OVERRIDES ==
card_N_bg: <color>                   Override card_bg for this card only
card_N_text: <color>                 Override card_text for this card only
card_N_border: <css border>          Override card_border for this card only
```

Numbering must be contiguous. `card_1`, `card_2`, `card_3` is fine.
`card_1`, `card_3` will stop at the gap and not render `card_3`.

### Available Lucide icons

Add new ones via PR — the renderer's allow-list lives in
`core/components/pm-card-section/pm-card-section.tsx` (`ICON_LIBRARY`).
Current set:

```
Building2, Boxes, Briefcase, Cpu, Globe2, GraduationCap,
HardDrive, HeartPulse, Landmark, Microscope, Monitor, Network,
Package, Rocket, Server, ServerCog, ShieldCheck, ShoppingCart,
Star, Stethoscope, Truck, Wifi, Zap
```

### Examples

**CDW-clean "Browse by category" — current homepage**

```text
<!--pm-cards
eyebrow: Catalog
title: Browse by category
subtitle: Pick a category to dive into 20,000+ enterprise-grade SKUs.
columns: 5
columns_md: 3
columns_sm: 2
gap: 18px
padding_y: 88px
align: center

bg: #fafaf7
card_bg: white
card_border: 1px solid #ece7d8
card_radius: 16px
card_padding: 32px
card_hover_accent: #2a4d72
image_size: 64
icon_bg: #f7f1e3
icon_color: #2a4d72
show_hover_arrow: false

card_1_title: Components
card_1_subtitle: CPUs, RAM, GPUs, drives
card_1_icon: Cpu
card_1_href: /dev/preview/category/components/

card_2_title: Networking
card_2_subtitle: Switches, routers, optics
card_2_icon: Network
card_2_href: /dev/preview/category/networking/

card_3_title: Servers
card_3_subtitle: Rack, tower, blade systems
card_3_icon: Server
card_3_href: /dev/preview/category/servers/

card_4_title: Software
card_4_subtitle: Licenses & subscriptions
card_4_icon: ShieldCheck
card_4_href: /dev/preview/category/software/

card_5_title: Bundles & kits
card_5_subtitle: Pre-configured solutions
card_5_icon: Boxes
card_5_href: /dev/preview/category/bundles/
-->
```

**3×3 layout with emojis instead of icons**

```text
<!--pm-cards
title: Industries we serve
columns: 3
columns_md: 3
columns_sm: 2
gap: 16px
align: center
image_size: 96
card_padding: 24px

card_1_title: Public Sector
card_1_emoji: 🏛️
card_1_href: /dev/preview/category/servers

card_2_title: Education
card_2_emoji: 🎓
card_2_href: /dev/preview/category/computers

card_3_title: Healthcare
card_3_emoji: 🩺
card_3_href: /dev/preview/category/storage

card_4_title: Enterprise
card_4_emoji: 🌐
card_4_href: /dev/preview/category/servers

card_5_title: AI & Research
card_5_emoji: 🧠
card_5_href: /dev/preview/category/components

card_6_title: MSPs
card_6_emoji: 🛠️
card_6_href: /dev/preview/category/networking
-->
```

**Poster cards — "Industries we serve" look**

Image fills the card; the title sits in a maroon ribbon top-left. Add
`card_style: poster` and supply `card_N_image` for each tile. Subtitle
is optional — when present it appears as a faint caption along the
bottom over a soft gradient.

```text
<!--pm-cards
eyebrow: Who we serve
title: Industries we serve
columns: 3
columns_md: 2
columns_sm: 1
gap: 24px
padding_y: 88px

card_style: poster
card_aspect: 2 / 1
card_border: 3px solid #5e1a1a
card_radius: 0
ribbon_bg: #8a2929
ribbon_text: #ffffff

card_1_title: System Integrators
card_1_subtitle: Channel pricing, white-label logistics, BOM-driven rollouts
card_1_image: https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=70
card_1_href: /dev/preview/category/components

card_2_title: Education
card_2_subtitle: E-rate-aware procurement, classroom kitting, lifecycle takeback
card_2_image: https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=900&q=70
card_2_href: /dev/preview/category/computers

card_3_title: SMB
card_3_subtitle: Right-sized configurations and named account managers
card_3_image: https://images.unsplash.com/photo-1552581234-26160f608093?auto=format&fit=crop&w=900&q=70
card_3_href: /dev/preview/category/servers
-->
```

**Photo-card variant — admin uploads product shots and references them**

```text
<!--pm-cards
title: Popular this quarter
columns: 6
gap: 20px
align: center
card_border: none
card_padding: 24px
image_size: 112

card_1_title: Laptops
card_1_image: https://cdn11.bigcommerce.com/.../laptop.png
card_1_href: /dev/preview/category/computers

card_2_title: Printers
card_2_image: https://cdn11.bigcommerce.com/.../printer.png
card_2_href: /dev/preview/category/peripherals
-->
```

---

## `pm-brands` — partner logo wall

A horizontal strip of clickable logos for the "Authorized partners"
section. Brand entries are **inline** in the same fence as the
styling — no separate BC subcategories required.

```text
<!--pm-brands

== HEADER ==
eyebrow: <string>                    Default "Authorized partners"
title: <string>                      Default "Stocked, supported, sourced direct."
cta_label: <string>                  Top-right link label (default "All manufacturers")
cta_href: <url>                      Top-right link URL

== LAYOUT ==
bg: <color>                          Section background (default transparent)
padding_y: <css length>              Section padding (default 80px)
logo_height: <int>                   Max logo height in px (default 64)
columns_lg: <int>                    Logos per row at lg (default 5)
columns_md: <int>                    md (default 3)
columns_sm: <int>                    sm — mobile (default 2)

== BRAND CLICK TARGET ==
brand_href_template: <pattern>       URL pattern with `{name}` placeholder.
                                     Default: /dev/preview/search?heading={name}

== BRANDS (numbered, contiguous) ==
brand_N_name: <string>               Display name (required to count the brand)
brand_N_logo: <url>                  Logo image URL (PNG or SVG)
brand_N_href: <url>                  Optional per-brand override of the template
-->
```

### Example

```text
<!--pm-brands
title: Stocked, supported, sourced direct.
columns_lg: 5
columns_md: 3
columns_sm: 2
logo_height: 64

brand_1_name: Cisco
brand_1_logo: https://cdn11.bigcommerce.com/.../cisco.png

brand_2_name: Intel
brand_2_logo: https://cdn11.bigcommerce.com/.../intel.png

brand_3_name: Microsoft
brand_3_logo: https://cdn11.bigcommerce.com/.../microsoft.png

brand_4_name: HPE
brand_4_logo: https://cdn11.bigcommerce.com/.../hpe.png

brand_5_name: Dell
brand_5_logo: https://cdn11.bigcommerce.com/.../dell.png
-->
```

---

## How the homepage is assembled

When you hit `/dev/preview/`, the server runs `fetchPmPageBanner('homepage')`
which:

1. Walks the BC category tree under **"PM Page Banners"**.
2. Finds the child whose name matches `PM Home Page Banners` (the *slot*).
3. Fetches that slot's description **AND** every child's description
   in parallel.
4. Parses each description for fence blocks (any order, multiple per
   description is fine).
5. Returns the sections in BC's `sort_order` (slot's own description
   first for backwards compat, then children in admin's sort order).

The frontend then renders them top-to-bottom with
`<PmPageSectionsRenderer>` — no code changes between sections.

The same fetcher is reused for `search` (`/dev/preview/search/`) by
swapping `homepage` for `search` so the search results page can have
its own admin-managed hero / cards strip.

The single hardcoded thing that's NOT in the fence system is the
"Recently in stock" product grid at the bottom of the homepage — it
pulls live from BC's product feed and isn't visually configurable.

---

## Caching & "my edit didn't show up"

The page banner fetcher uses Next.js `unstable_cache` with a 120-second
TTL. If you edit a description in BC and the change doesn't appear
within ~2 minutes:

1. **Hard-refresh the page** (Ctrl+Shift+R / Cmd+Shift+R). The
   description is fetched server-side, but the prior HTML may be
   cached client-side.
2. **Wait 120 seconds.** The `unstable_cache` TTL is fixed.
3. **For dev work, bump the cache key.** Open
   `core/lib/pm-page-banner-fetcher.ts` and increment the
   `pm-page-banner-fields-vXX` or `pm-page-banner-slot-resolution-vXX`
   version number. Save → Next.js HMR invalidates immediately.
4. **For prod, redeploy.** A deploy resets every cache.

If the section appears completely blank after an edit, the parser
likely couldn't read the fence — common causes:

- Comment fence wasn't pasted in **HTML view** (BC's rich-text view
  HTML-escapes the `<!--`).
- A required key is missing (e.g. `card_N_title` for cards;
  `headline` for heroes).
- An emoji or other 4-byte UTF-8 char was saved via the REST API and
  got partially mangled — re-edit in BC's admin UI and re-save.

You can test parsing in isolation by hitting the dev server with the
banner URL — server logs will print `[pm-page-banner-fetcher]` lines
on failed parses.

---

## Cheat sheet

| I want to…                                  | Edit this                                       |
| ------------------------------------------- | ----------------------------------------------- |
| Change the homepage's main hero copy        | BC → PM Page Banners → PM Home Page Banners → Home Page Banner 1 → Description |
| Swap an icon for an image on a Browse card  | Change `card_N_icon: Cpu` → `card_N_image: <url>` |
| Make Browse by Category a 3×3 grid          | `columns: 3`, `columns_md: 3` (don't forget mobile) |
| Add a 6th tile to Browse by Category        | Add `card_6_title:`, `card_6_icon:`, `card_6_href:` |
| Move "Browse by category" above the hero    | Lower its `sort_order` in BC vs. the hero       |
| Change the brand wall logos                 | Edit the `brand_N_logo` URLs in the `pm-brands` fence |
| Add a new section to the homepage           | Create a new child under "PM Home Page Banners", drop a fence into its Description |
| Add a search-page hero                      | BC → PM Page Banners → PM Search Page Banners → [section] → Description |
| Re-seed the Browse by Category defaults     | Run `node scripts/pm-bootstrap-browse-by-category.mjs` |
| Re-seed the "Industries we serve" poster strip | Run `node scripts/pm-bootstrap-who-we-serve.mjs` |
| Re-seed the parent banner folders           | Run `node core/scripts/bc-bootstrap-page-banners.mjs` |

---

## Bundle modifiers (PDP "Bundle and get N% off")

Bundles aren't fence blocks — they're BC **product modifiers**. But the
admin workflow is the same idea (edit data in BC, no code change
needed), so it's documented here.

### What you can change as admin

For any product that should offer a bundle on its PDP (e.g. a NAS,
server, or AI box):

- **Add new bundle options** — radio rows like "WD 4TB SSD", "WD 8TB
  SSD", "Samsung 4TB SSD" on the same modifier
- **Change which product is bundled** — point any option at a different
  linked product
- **Change the discount %** on the base product when an option is
  picked (the modifier value's price adjuster)
- **Reorder** options (admin sort order)
- **Remove** options

The Catalyst storefront supports **N options per modifier** out of the
box. The qty stepper appears inline on whichever option the user
selects.

### Where to edit

> **BC admin → Products → [pick the product, e.g. AS6706T v2] →
> Edit → Modifiers tab**

You'll see a `product_list_with_images` modifier named
"Bundle and get 3% off" (or similar). Click into it:

- **Display name** — rename to change the section heading on the PDP
  (e.g. "Bundle and get 5% off"). The number in the name is **purely
  cosmetic** — the actual discount comes from each option's price
  adjuster (next bullet).

- **Each option_value** has:
  - **Label** — the text shown in the radio row
  - **Product** — the linked product (drag-drop picker). This is what
    gets added to the cart at the bundle qty
  - **Adjusters → Price** — the discount on the BASE product when this
    option is picked. Use **Percentage** (e.g. -3 for 3% off) or
    **Fixed amount** (e.g. -$25 off)

Click **Save**. Hard-refresh the PDP within 120 seconds (Next.js cache
TTL) and the new option lands as a radio row in the bundle picker.

### Slot-count cap (`(max N)` in the modifier name)

For products with a finite slot count (NAS with 4 SSD bays, server
with 8 RAM slots, etc.) you can hard-cap the bundle qty stepper. Just
append `(max N)` to the modifier's **Display name** in BC:

| Display name in BC                       | What the user sees on PDP            |
| ---------------------------------------- | ------------------------------------ |
| `Bundle and get 3% off`                  | Heading: "Bundle and get 3% off". Qty stepper has no cap. |
| `Bundle and get 3% off (max 4)`          | Heading: "Bundle and get 3% off". Qty stepper caps at 4, shows "of 4" next to the input, `+` button disables at 4. |
| `Add SSDs [max:12]`                      | Same — `[max:12]` syntax also accepted. |
| `Add RAM (max: 8)`                       | `(max: 8)` syntax also accepted. |

The `(max N)` / `[max:N]` token is stripped from the heading at render
time so the user-facing copy stays clean. Use whichever bracket /
colon variant the WYSIWYG doesn't mangle.

Different modifiers on the SAME product can have different caps (e.g.
a server with `Add RAM (max 8)` AND `Add HDDs (max 4)` works fine —
each modifier reads its own suffix).

#### Per-option overrides

Different options inside the SAME modifier can also have different
caps. Just append `(max N)` to the **option label** (not the modifier
name) and the qty stepper uses THAT cap whenever the option is
selected. The option-level cap takes priority over the modifier-level
cap.

Example — one NAS, one modifier, two options with different fit:

| Modifier name              | Option label                                  | Effective cap when option is selected |
| -------------------------- | --------------------------------------------- | -------------------------------------- |
| `Bundle and get 3% off (max 4)` | `WD 4TB NVMe SSD`                       | 4 (inherits from modifier)            |
| `Bundle and get 3% off (max 4)` | `WD 500GB SATA SSD (max 8)`             | 8 (option override wins)              |
| `Bundle and get 3% off`         | `WD 500GB SATA SSD (max 8)`             | 8 (no modifier cap, option still caps) |
| `Bundle and get 3% off`         | `WD 500GB SATA SSD`                     | unlimited (no caps set)               |

Edit per-option: **BC admin → Products → [the bundle product] →
Modifiers → click the modifier → click the option_value → change the
Label → save.**

The `(max N)` suffix is stripped from the user-facing label at render
time, so customers see clean copy.

### ⚠ Critical gotcha — linked products must be visible

If the linked product has **Visibility: Hidden** in BC, the BC
Storefront GraphQL API silently drops it and the bundle option won't
render. Symptom: you add a 2nd option in BC, save, refresh, and only
the original option still shows.

Fix: open the linked product → set **Visibility: Visible** → save.

(If you want the linked product to NOT show up in nav / search but
still be usable as a bundle item, that's a BC-level limitation — BC
doesn't have a "hidden from browse but accessible via modifier" flag.
Workaround: keep it visible but `is_featured: false` and don't add it
to any nav category.)

### Per-product per-bundle pricing (the legacy "Pack of N" replacement)

If you want **qty 2+ of the linked product to cost a different amount
per unit** (e.g. legacy's "Pack of 2" model where 2 SSDs were
$1,239.99 instead of 2 × $529.99), set a **bulk-pricing tier** on the
LINKED product (not on the bundle product):

> **BC admin → Products → [WD WDS400T4B0E SSD] → Pricing tab →
> Bulk pricing → Add rule**

Set: `Min qty: 2, Max: unlimited, Type: Fixed price, Amount: 619.99`.
The Catalyst bundle stepper reads `Product.prices.bulkPricing` and
applies the right per-unit price at each qty.

### Same fix in JSON (advanced)

If editing in BC admin is fiddly, the same fields are reachable via
`/v3/catalog/products/{id}/modifiers/{mod_id}/values` (POST to add,
PUT to update, DELETE to remove). See
`scripts/pm-bundle-bulk-setup.mjs` and
`scripts/pm-bundle-bulk-adjusters.mjs` for working examples.

---

## See also

- `docs/02-hero-banners.md` — original hero-banner design notes
- `docs/02-folder-conventions.md` — naming conventions for admin folders
- `docs/06-about-banner-migration.md` — migration history for the About panel
- `core/lib/pm-hero-banner.ts` — `pm-hero` parser + types
- `core/lib/pm-card-section.ts` — `pm-cards` parser + types
- `core/lib/pm-brands-section.ts` — `pm-brands` parser + types
- `core/lib/pm-page-banner-fetcher.ts` — homepage / search fetcher
