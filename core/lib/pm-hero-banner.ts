/**
 * pm-hero-banner
 * ==============
 * Parser + types for admin-managed hero banners.
 *
 * Admins configure a banner by adding a fenced HTML comment block to a BC
 * category description (BC admin → Products → Categories → [pick category]
 * → Description). The block is invisible to BC's default theme and to any
 * downstream description renderer that doesn't know about it. Everything
 * outside the block is regular description text.
 *
 * The SAME format works on every page type — category, brand, homepage,
 * search — by pointing the parser at the appropriate BC category's
 * description. Page-banner slots (homepage, search) live under the
 * dedicated "PM Page Banners" parent (see scripts/bc-bootstrap-page-banners.mjs).
 *
 * ──────────────────────────────────────────────────────────────────────
 * SCHEMA REFERENCE — keys recognized inside the <!--pm-hero ... --> fence
 * ──────────────────────────────────────────────────────────────────────
 *
 * == IMAGES ==
 *   image:              Primary image URL (or falls back to BC Category Image)
 *   image_2, image_3,
 *   image_4, image_5:   Extra images for the right-column rail (side mode)
 *   logo:               Optional logo (renders left of the image rail)
 *
 * == BACKGROUND — layered, painted bottom → top ==
 *   bg:                 Solid color base (hex / rgb / named)
 *                       e.g. #0a2540
 *   bg_gradient:        CSS gradient painted over `bg`
 *                       e.g. linear-gradient(135deg, #0a2540, #1e3a5f)
 *   bg_image:           Background image URL (paints over gradient)
 *   bg_image_size:      cover (default) | contain | auto | "100% auto"
 *   bg_image_position:  center (default) | top | bottom | left | right
 *                       | "25% 75%"
 *   bg_image_repeat:    no-repeat (default) | repeat | repeat-x | repeat-y
 *   bg_overlay:         Overlay on top of bg image — any CSS color/gradient
 *                       e.g. rgba(0,0,0,0.4)
 *                       e.g. linear-gradient(120deg, rgba(10,37,64,0.85),
 *                            transparent)
 *
 * == TEXT ==
 *   text:               light | dark
 *   accent:             CTA button color (hex)
 *   headline:           Heading
 *   body:               Paragraph
 *   cta_label:          Button label
 *   cta_href:           Button URL (both label+href required for button)
 *
 * == SIZING ==
 *   height:             Min height (e.g. 420px, 60vh, auto)
 *   padding_y:          Vertical padding (e.g. 64px)
 *   margin_top:         Space above the banner
 *   margin_bottom:      Space below the banner
 *   align:              left (default) | center
 *   image_fit:          side (default — text + right-side image rail)
 *                       | cover  (image fills full background, text overlaid)
 *                       | contain (image centered, bg color around it)
 *                       | split (hard 50/50 — image fills one half
 *                                edge-to-edge, content fills the other
 *                                with its own bg color)
 *
 * == SPLIT MODE (image_fit: split) ==
 *   image_position:     left (default) | right — which half has the image
 *   image_half_bg:      Bg color for the image half (visible behind
 *                       transparent images; otherwise the image covers it)
 *   content_half_bg:    Bg color for the content half — usually contrasts
 *                       with the image half (e.g. dark image + light
 *                       content)
 *   content_padding:    Padding inside the content half (e.g. "56px 64px").
 *                       Default "48px 56px". Independent of `padding_y`
 *                       (which still controls the section's outer vertical
 *                       padding — set padding_y: 0 in split mode for an
 *                       edge-to-edge look).
 *
 * == FRAMING (works in any image_fit mode) ==
 *   full_bleed:         true → banner hugs both screen edges (no max-width
 *                       frame, no horizontal gutters); false (default) →
 *                       banner sits inside the 1280px container with px-8
 *                       gutters
 *   border_radius:      CSS border-radius on the whole banner with
 *                       overflow:hidden (child layers clipped to the
 *                       curve). E.g. "16px", "24px". Default "0". Looks
 *                       best when combined with margins and `full_bleed:
 *                       false` (a rounded full-bleed banner would have
 *                       its corners cut off by the screen edges).
 *
 * ──────────────────────────────────────────────────────────────────────
 * EXAMPLES
 * ──────────────────────────────────────────────────────────────────────
 *
 * Standard side-rail hero:
 *
 *   <!--pm-hero
 *   image: https://cdn.../hero.jpg
 *   bg: #0d9488
 *   bg_gradient: linear-gradient(135deg, #0a2540, #1e3a5f)
 *   text: light
 *   accent: #f97316
 *   headline: HPE Networking Instant On
 *   body: Enterprise networking, simplified.
 *   logo: https://cdn.../hpe-logo.png
 *   cta_label: Shop all
 *   cta_href: /dev/preview/category/networking
 *   height: 420px
 *   padding_y: 64px
 *   align: left
 *   image_fit: side
 *   -->
 *
 * Split layout — image left, light content right:
 *
 *   <!--pm-hero
 *   image: https://cdn.../intel-xeon.jpg
 *   image_fit: split
 *   image_position: left
 *   image_half_bg: #0a1430
 *   content_half_bg: #f5f5f0
 *   text: dark
 *   accent: #ea580c
 *   headline: Discover the new Intel Xeon 6 processor.
 *   body: Drive high throughput, power efficiency, and help improve
 *         sustainability for network and edge workloads.
 *   cta_label: View Xeon servers
 *   cta_href: /dev/preview/category/servers
 *   height: 380px
 *   padding_y: 0
 *   content_padding: 56px 64px
 *   -->
 *
 * Split layout — content left, image right (mirror):
 *
 *   <!--pm-hero
 *   image: https://cdn.../datacenter-photo.jpg
 *   image_fit: split
 *   image_position: right
 *   content_half_bg: #0a1430
 *   text: light
 *   accent: #f97316
 *   headline: Racked, stacked, and ready to ship.
 *   body: Configured by our team, validated against your BOM, freighted
 *         from Southern California within the week.
 *   cta_label: Request a build
 *   cta_href: /dev/preview/account/register
 *   height: 380px
 *   padding_y: 0
 *   content_padding: 56px 64px
 *   -->
 *
 * EVERY KEY IS OPTIONAL. A fence with just `bg_gradient` and `headline`
 * is a perfectly valid banner. An empty fence (`<!--pm-hero\n-->`) renders
 * with all defaults (teal bg, no text, no image).
 *
 * The fence itself ("<!--pm-hero ... -->") is what triggers banner
 * rendering. Remove the fence (or leave the description empty) to hide
 * the banner entirely.
 *
 * Full admin guide: docs/02-hero-banners.md
 */

/** Where text/CTA sit relative to the image in the banner */
export type PmHeroAlign = 'left' | 'center';

/** How the image fills the banner area */
export type PmHeroImageFit =
  | 'cover'   // image fills full background; text overlaid w/ gradient
  | 'contain' // image centered, bg color fills around it
  | 'side'    // split: text on one side, image on the other (default)
  | 'split';  // hard split — image fills one HALF edge-to-edge, content
              // fills the other half with its own bg color. Use
              // `image_position: left | right` to choose which side.

/** Which side the image occupies in `split` mode. */
export type PmHeroImagePosition = 'left' | 'right';

/** Text color theme — drives the headline/body/eyebrow color */
export type PmHeroTextColor = 'light' | 'dark';

export interface PmHeroBannerConfig {
  /** Primary image URL — OPTIONAL. In `side` mode this is the first image
   *  in the right-hand image rail. If empty, the right-side rail is omitted
   *  and the text expands to fill (great for gradient-only or text-only
   *  banners). In `cover`/`contain` mode, without an image the banner just
   *  renders the bg color/gradient/bg-image. */
  imageUrl?: string;
  /** Extra images that join `imageUrl` in the right-hand rail (side mode
   *  only; in cover/contain mode only `imageUrl` is used as the bg image).
   *  Up to 5 total images supported via keys `image`, `image_2`, …,
   *  `image_5`. Multiple images lay out as a horizontal row. */
  extraImageUrls?: string[];
  /** Solid background color (hex, rgb, named, or `transparent`). Sits at
   *  the BOTTOM of the visual stack — bg image and overlay paint on top
   *  of it. Default `#0d9488`. */
  bgColor?: string;
  /** ── BACKGROUND CONTROLS — let admins paint the whole banner ──────
   *
   *  Visual stack (bottom → top):
   *    1. bgColor              — solid color fill
   *    2. bgGradient           — gradient (paints over bgColor)
   *    3. bgImageUrl           — background image (paints over the above)
   *    4. bgOverlay            — color overlay for text legibility
   *    5. content              — text + right-hand image rail
   *
   *  All five layers are independently optional. Any combination is
   *  valid (e.g. just bg color, OR bg image with overlay, OR gradient
   *  with no image, etc.). */

  /** CSS gradient applied above `bgColor` (e.g.
   *  `linear-gradient(135deg, #0a2540 0%, #1e3a5f 100%)`,
   *  `radial-gradient(circle, #fbbf24, #f97316)`). */
  bgGradient?: string;
  /** Background image URL (independent of the right-column `imageUrl`).
   *  Use this when you want a full-bleed photo OR pattern behind the
   *  text/image rail (still in `side` mode). */
  bgImageUrl?: string;
  /** How the bg image fills — any CSS `background-size` value:
   *  `cover` (default), `contain`, `auto`, `100% auto`, etc. */
  bgImageSize?: string;
  /** Where the bg image anchors — any CSS `background-position` value:
   *  `center` (default), `top`, `bottom`, `left`, `right`, `top right`,
   *  `25% 75%`, etc. */
  bgImagePosition?: string;
  /** How the bg image repeats — `no-repeat` (default), `repeat`,
   *  `repeat-x`, `repeat-y`. Useful for patterns/textures. */
  bgImageRepeat?: string;
  /** Overlay color painted on top of the bg image, before content. Use
   *  for text legibility over busy photos. Any valid CSS color, often
   *  with alpha — `rgba(0,0,0,0.4)`, `rgba(10,37,64,0.6)`, etc. */
  bgOverlay?: string;

  /** Text color theme. Default `light`. */
  textColor?: PmHeroTextColor;
  /** Accent color for the CTA button (default brand terracotta).
   *  Also used as the eyebrow text color when `eyebrow` is set, so the
   *  brand-accent label sits nicely above the headline. */
  accentColor?: string;
  /** Optional eyebrow — short uppercase label rendered above the headline
   *  in the brand accent color (or `accent_color` if set). Use for
   *  "AT A GLANCE", "ABOUT PLATINUM MICRO", section labels, etc. */
  eyebrow?: string;
  /** Main heading text. */
  headline?: string;
  /** Supporting paragraph. */
  body?: string;
  /** Optional logo (rendered alongside the images — typically a brand mark). */
  logoUrl?: string;
  /** CTA button label. Both `cta_label` and `cta_href` required for the button to render. */
  ctaLabel?: string;
  /** CTA button URL. */
  ctaHref?: string;
  /** Banner min-height (any valid CSS value). Default `320px`. */
  height?: string;
  /** Vertical padding inside the banner (top + bottom). Default `48px`. */
  paddingY?: string;
  /** Margin above the banner. Default `0`. */
  marginTop?: string;
  /** Margin below the banner. Default `0`. */
  marginBottom?: string;
  /** Content alignment (left | center). Default `left`. */
  align?: PmHeroAlign;
  /** Image fit mode. Default `side`. */
  imageFit?: PmHeroImageFit;
  /** In `split` mode only: which half the image occupies. Default `left`. */
  imagePosition?: PmHeroImagePosition;
  /** In `split` mode only: bg color for the IMAGE half (sits behind the
   *  image — visible only if the image has transparency or doesn't fill
   *  the half). Default uses the banner-level `bg`. */
  imageHalfBg?: string;
  /** In `split` mode only: CSS `background-size` for the image filling
   *  its half. Defaults to `cover` (fills + crops to maintain aspect).
   *  Use a value > 100% to zoom INTO the image and crop out any
   *  built-in whitespace at the edges of the source photo. Examples:
   *  `cover` (default) / `contain` / `100% 100%` (stretch — distorts) /
   *  `150%` (zoom in 50%) / `auto 120%` (fixed height zoom). */
  imageHalfSize?: string;
  /** In `split` mode only: CSS `background-position` for the image
   *  inside its half. Defaults to `center`. Useful when zooming in
   *  (via `imageHalfSize`) and the product sits off-center in the
   *  source photo. Examples: `center` / `top` / `bottom` / `left` /
   *  `right` / `"50% 30%"`. */
  imageHalfPosition?: string;
  /** In `split` mode only: bg color for the CONTENT half. Overrides the
   *  banner-level `bg` for that half. Useful when you want a contrasting
   *  background on the content side (e.g. dark image half + light
   *  content half). */
  contentHalfBg?: string;
  /** In `split` mode only: padding on the content half (independent of
   *  the banner's `padding_y`, which controls vertical padding of the
   *  whole banner). Default `48px 56px`. */
  contentPadding?: string;
  /** When `true`, the banner stretches edge-to-edge (full viewport width)
   *  by dropping the outer container's `max-width` + horizontal padding.
   *  Useful for hero strips that should hug both sides of the screen.
   *  When `false` (default), the banner sits inside the
   *  `max-w-pm-container` (1280px) frame with `px-8` gutters. */
  fullBleed?: boolean;
  /** CSS border-radius applied to the whole banner (with `overflow: hidden`
   *  so child layers like bg-image and overlays are clipped to the curve).
   *  Any valid CSS length, e.g. `16px`, `24px`, `9999px`. Default `0`. */
  borderRadius?: string;
}

/**
 * Matches `<!--pm-hero ... -->`. Case-insensitive `pm-hero` token; the body
 * (between the token and the closing `-->`) is captured non-greedily so it
 * stops at the FIRST closing comment marker.
 *
 * Two variants: single-match (used by `parsePmHeroBanner`) and global
 * (used by `parsePmHeroBanners` to find every block in the description —
 * supports stacking multiple banners on one page).
 */
const HERO_BLOCK_RE = /<!--\s*pm-hero\b\s*([\s\S]*?)-->/i;
const HERO_BLOCK_RE_GLOBAL = /<!--\s*pm-hero\b\s*([\s\S]*?)-->/gi;

// Shared low-level parser pieces (key/value regex, WYSIWYG normalizer)
// live in pm-banner-parser-internal so the hero and card parsers don't
// drift out of sync.
import {
  KEY_VALUE_RE,
  normalizeBcDescription,
} from '~/lib/pm-banner-parser-internal';
import { stripPmCardBlocks } from '~/lib/pm-card-section';

function extractHeroBlock(description: string | undefined | null): string | null {
  if (!description) return null;
  const normalized = normalizeBcDescription(description);
  const match = normalized.match(HERO_BLOCK_RE);
  return match ? match[1] : null;
}

function parseKeyValues(block: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of block.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    const m = line.match(KEY_VALUE_RE);
    if (m) {
      out[m[1].toLowerCase()] = m[2];
    }
  }
  return out;
}

/** Coerce a freeform string into one of the allowed enum values, else undefined. */
function coerceEnum<T extends string>(
  value: string | undefined,
  allowed: ReadonlyArray<T>,
): T | undefined {
  if (!value) return undefined;
  const lower = value.toLowerCase() as T;
  return allowed.includes(lower) ? lower : undefined;
}

/**
 * Build a PmHeroBannerConfig from the body of ONE `<!--pm-hero ... -->`
 * block (already extracted). The fallback image is only consumed by the
 * FIRST banner on a page — additional banners stacked below typically
 * don't want the category image bleeding in, so callers should pass
 * `undefined` for non-primary blocks (see `parsePmHeroBanners`).
 */
function configFromBlockBody(
  block: string,
  fallbackImageUrl?: string | null,
): PmHeroBannerConfig {
  const kv = parseKeyValues(block);
  const imageUrl = kv.image || fallbackImageUrl || undefined;

  const extraImageUrls: string[] = [];
  for (let n = 2; n <= 5; n++) {
    const v = kv[`image_${n}`];
    if (v) extraImageUrls.push(v);
  }

  return {
    imageUrl,
    extraImageUrls: extraImageUrls.length > 0 ? extraImageUrls : undefined,
    bgColor: kv.bg || undefined,
    bgGradient: kv.bg_gradient || undefined,
    bgImageUrl: kv.bg_image || undefined,
    bgImageSize: kv.bg_image_size || undefined,
    bgImagePosition: kv.bg_image_position || undefined,
    bgImageRepeat: kv.bg_image_repeat || undefined,
    bgOverlay: kv.bg_overlay || undefined,
    textColor: coerceEnum(kv.text, ['light', 'dark']),
    accentColor: kv.accent || undefined,
    eyebrow: kv.eyebrow || undefined,
    headline: kv.headline || undefined,
    body: kv.body || undefined,
    logoUrl: kv.logo || undefined,
    ctaLabel: kv.cta_label || undefined,
    ctaHref: kv.cta_href || undefined,
    height: kv.height || undefined,
    paddingY: kv.padding_y || undefined,
    marginTop: kv.margin_top || undefined,
    marginBottom: kv.margin_bottom || undefined,
    align: coerceEnum(kv.align, ['left', 'center']),
    imageFit: coerceEnum(kv.image_fit, ['cover', 'contain', 'side', 'split']),
    imagePosition: coerceEnum(kv.image_position, ['left', 'right']),
    imageHalfBg: kv.image_half_bg || undefined,
    imageHalfSize: kv.image_half_size || undefined,
    imageHalfPosition: kv.image_half_position || undefined,
    contentHalfBg: kv.content_half_bg || undefined,
    contentPadding: kv.content_padding || undefined,
    fullBleed: coerceBool(kv.full_bleed),
    borderRadius: kv.border_radius || undefined,
  };
}

/** Coerce a "true/false/yes/no/1/0/on/off" string to a boolean. */
function coerceBool(value: string | undefined): boolean | undefined {
  if (!value) return undefined;
  const lower = value.toLowerCase();
  if (['true', 'yes', '1', 'on'].includes(lower)) return true;
  if (['false', 'no', '0', 'off'].includes(lower)) return false;
  return undefined;
}

/**
 * Parse the FIRST `<!--pm-hero ... -->` block out of a description and
 * return its config. Returns `null` only when no fence block is found.
 * When the fence IS present, a config is returned even if no image is
 * set — the banner still renders with whatever the admin DID specify
 * (gradient, text, etc.) and the image rail collapses out.
 *
 * The `fallbackImageUrl` is intended to be the BC category's built-in
 * "Category Image" (`defaultImage.url`).
 *
 * For pages that stack multiple banners (one description, multiple
 * blocks), use `parsePmHeroBanners` instead.
 */
export function parsePmHeroBanner(
  description: string | undefined | null,
  fallbackImageUrl?: string | null,
): PmHeroBannerConfig | null {
  const block = extractHeroBlock(description);
  if (!block) return null;
  return configFromBlockBody(block, fallbackImageUrl);
}

/**
 * Parse EVERY `<!--pm-hero ... -->` block in a description, in document
 * order. Returns one config per block — so admins can stack multiple
 * banners on a single page by repeating the fence in the description:
 *
 *   <!--pm-hero
 *   height: 420px
 *   headline: Main hero
 *   -->
 *
 *   <!--pm-hero
 *   height: 50px
 *   bg: #f97316
 *   headline: Limited-time announcement
 *   -->
 *
 * Returns an empty array when there are no fences (i.e. the description
 * has no banners configured). The `fallbackImageUrl` only feeds the
 * FIRST banner — later banners default to no image when unset, since
 * they're typically smaller info/announcement strips.
 */
export function parsePmHeroBanners(
  description: string | undefined | null,
  fallbackImageUrl?: string | null,
): PmHeroBannerConfig[] {
  if (!description) return [];
  const normalized = normalizeBcDescription(description);
  const banners: PmHeroBannerConfig[] = [];
  let isFirst = true;
  for (const match of normalized.matchAll(HERO_BLOCK_RE_GLOBAL)) {
    banners.push(
      configFromBlockBody(match[1], isFirst ? fallbackImageUrl : undefined),
    );
    isFirst = false;
  }
  return banners;
}

/**
 * Returns the description with ALL `<!--pm-hero ... -->` AND
 * `<!--pm-cards ... -->` blocks removed. Use this anywhere we display
 * the description as user-facing text so config blocks never leak into
 * the UI. Normalizes BC's WYSIWYG-escaped markup first so the strip
 * works whether the admin pasted in source or rich-text mode.
 */
export function stripPmHeroBlock(
  description: string | undefined | null,
): string {
  if (!description) return '';
  return stripPmCardBlocks(
    normalizeBcDescription(description).replace(HERO_BLOCK_RE_GLOBAL, ''),
  ).trim();
}

/**
 * Page-banner slot names. Used for non-category pages (homepage, search)
 * where the banner lives on a dedicated BC category under
 * "PM Page Banners".
 */
export const PM_PAGE_BANNER_SLOTS = ['homepage', 'search'] as const;
export type PmPageBannerSlot = (typeof PM_PAGE_BANNER_SLOTS)[number];

/** Parent BC category name that holds page-banner slots as children. */
export const PM_PAGE_BANNERS_PARENT_NAME = 'PM Page Banners';
