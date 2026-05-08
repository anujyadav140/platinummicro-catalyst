# 04 — Platinum Micro Design System

> Source of truth: `.design-package/platinum-micro-design-system/project/colors_and_type.css`
>
> The design system was created in Claude Design and exported as a handoff bundle. This doc summarizes the rules; always defer to the CSS file for exact values.

## Brand Vibe

Professional, low-hype, **enterprise-buyer-first**. Navy spine + warm terracotta accent over a warm paper page background. We are pivoting away from consumer-leaning e‑commerce — Platinum Micro is engineering, not editorial.

## Hard Rules

- Page background is **warm paper `#FBFAF7`** — never bright white
- Primary CTA is **terracotta `#A63D2F`** — secondary CTA is navy mid `#1B3A6B`
- Corner radii max out at 12px for cards, 6px for buttons. Don't go consumer-soft
- No gradients (one exception: sticky header backdrop blur)
- No glassmorphism, no emoji, no exclamation points
- SKUs / MPNs always in JetBrains Mono (in tables, line items, drawer thumbnails)
- Verb-first CTAs ("Request a quote", "Add to BOM"), NEVER "Learn more"

## Color Tokens

### Navy stack
| Token | Hex | Use |
|-------|-----|-----|
| `--pm-navy-deepest` | `#071525` | Trust bar bg, footer bg |
| `--pm-navy-deep` | `#0D2340` | Hero bg, primary nav bg |
| `--pm-navy-mid` | `#1B3A6B` | Secondary buttons, segment selectors |
| `--pm-navy-light` | `#2E6DB4` | Links, hover accents, focus ring |
| `--pm-navy-pale` | `#E6EFF8` | Soft callout backgrounds |

### Accent + warm
| Token | Hex | Use |
|-------|-----|-----|
| `--pm-terracotta` | `#A63D2F` | **Primary CTA** |
| `--pm-terracotta-light` | `#C04E3E` | CTA hover |
| `--pm-tan` | `#8B7355` | Eyebrow text, subtle accents |
| `--pm-terracotta-pale` | `#F7EBE9` | Card callouts |
| `--pm-tan-pale` | `#F4EFE8` | Warm right panels |

### Surfaces + ink
| Token | Hex |
|-------|-----|
| `--pm-paper` | `#FBFAF7` |
| `--pm-white` | `#FFFFFF` |
| `--pm-ink-100` | `#F2F4F7` |
| `--pm-ink-200` | `#E4E7EC` |
| `--pm-ink-300` | `#D0D5DD` |
| `--pm-ink-400` | `#98A2B3` |
| `--pm-ink-500` | `#667085` |
| `--pm-ink-600` | `#475467` |
| `--pm-ink-700` | `#344054` |
| `--pm-ink-800` | `#1D2939` |
| `--pm-ink-900` | `#101828` |

### Semantic status (muted, enterprise-friendly)
| Token | Hex |
|-------|-----|
| `--pm-success` | `#2F7D5B` |
| `--pm-warning` | `#B5781F` |
| `--pm-danger` | `#A63D2F` (reuses terracotta) |
| `--pm-info` | `#1B3A6B` |

## Typography

- **Sans:** Google Sans Flex (variable, full TTF in `.design-package/.../fonts/`)
- **Mono:** JetBrains Mono (Google Fonts)
- Type scale: 12 / 13 / 14 / 15 / 16 / 18 / 20 / 22 / 26 / 32 / 40 / 52 / 72
- Display: 700 weight, body: 400/500
- Drop the all-caps nav. Title Case for nav and section headers, sentence case for body

## Layout

- Container: 1280px (1440px for product grids)
- Trust bar: 36px (NOT sticky)
- Header top: 84px (white, sticky w/ blur after scroll past trust bar)
- Header bottom (nav): 48px (navy)
- Section padding: 80px vertical (96px on heroes/key sections)

## Spacing Scale (4px base)

`4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96`

## Radii (restrained)

`2 / 4 / 6 / 8 / 12 / 999`
- Cards: 8px
- Buttons: 6px
- Pills/badges: 999

## Shadows

Three-step elevation, soft, near-black with navy tint. No glows, no inner shadows, no colored shadows.

## Motion

- Durations: 120 / 180 / 280ms
- Easing: `cubic-bezier(0.2, 0, 0, 1)` standard
- Allowed: opacity/translate fades, mega-menu open/close, drawer slide-in
- Disallowed: bouncing, parallax, autoplaying carousels, scroll-jacking

## Hover States

- Buttons darken to their `*-light` variant
- Cards lift `translateY(-2px)`, shadow-1 → shadow-2
- Hero ghost button: inverts to white-fill on hover (not pale-navy)

## Iconography

- **Lucide** at 1.5px stroke, 24×24 box, `currentColor`
- No fills, no two-tone, no rounded blob illustrations
- Manufacturer logos: PNG/SVG from press kits, grayscale at 60% opacity, full-color on hover

## Imagery

- Cool-toned, sharp, technical (server rooms, fiber, hands at workbench)
- NEVER illustrated/hand-drawn art, NEVER AI-generated
- Manufacturer product photos from official asset libraries

## Voice

- Plain, factual, dimensional
- Third person + "you" — *"Platinum Micro stocks…"* / *"You'll have a quote in one business day"*
- Avoid first-person plural "we" except in signatures
- Always full SKUs/MPNs/capacities (`2.4TB SAS 12Gb/s 10K SFF`)
- No emoji, no startup voice, no "best-in-class"

## Reference Files

- `.design-package/platinum-micro-design-system/project/colors_and_type.css` — every CSS variable
- `.design-package/platinum-micro-design-system/project/ui_kits/website/Header.jsx` — header + Quick Order modal final
- `.design-package/platinum-micro-design-system/project/ui_kits/website/Hero.jsx` — hero, AudienceStrip, CategoryStrip
- `.design-package/platinum-micro-design-system/project/ui_kits/website/kit.css` — full prototype CSS
- `.design-package/platinum-micro-design-system/project/assets/platinum-micro-logo-transparent.png`
- `.design-package/platinum-micro-design-system/project/fonts/GoogleSansFlex-VariableFont_GRAD_ROND_opsz_slnt_wdth_wght.ttf`

## How We Translate to Catalyst

We map Catalyst's existing token system to PM's:
- `--background` → paper
- `--foreground` → ink-900
- `--primary` → terracotta
- `--accent` → navy-pale
- All `--pm-*` tokens added alongside (Catalyst components keep working; PM components use the explicit pm-* names)
