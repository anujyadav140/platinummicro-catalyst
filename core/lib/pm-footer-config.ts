/**
 * pm-footer-config
 * ================
 * Admin-managed footer styling. Same fenced-comment pattern as the
 * banner / card-section parsers, but for site-wide footer chrome.
 *
 * Admin drops a single `<!--pm-footer ... -->` block into the BC
 * "PM Footer" category's description. The fetcher reads it once per
 * layout render and threads it through PmNavContext so PmFooter can
 * apply overrides without per-page wiring.
 *
 * Scope: STYLING + the brand-block fields (tagline / logo / copyright).
 * Column structure (auto Catalog column + static Programs/About) stays
 * intact for now — extending to admin-editable columns is a later
 * iteration.
 *
 * ──────────────────────────────────────────────────────────────────
 * SCHEMA REFERENCE — keys recognized inside the <!--pm-footer ... -->
 * ──────────────────────────────────────────────────────────────────
 *
 *  == BACKGROUND (layered bottom → top, same as banners) ==
 *    bg:                Solid color base (e.g. #050d1c)
 *    bg_gradient:       CSS gradient (e.g. linear-gradient(180deg, #050d1c, #0a1430))
 *    bg_image:          Background image URL
 *    bg_image_size:     cover (default) | contain | auto | "100% auto"
 *    bg_image_position: center (default) | top | bottom | ...
 *    bg_image_repeat:   no-repeat (default) | repeat | repeat-x | repeat-y
 *    bg_overlay:        Color/gradient overlay for legibility
 *
 *  == TYPOGRAPHY ==
 *    text:              light (default) | dark — overall text theme
 *    text_color:        Override the body text color directly
 *    heading_color:     Color of column heading labels
 *    link_color:        Default link color
 *    link_hover_color:  Link color on hover
 *    legal_color:       Color of the bottom legal-row text
 *
 *  == BRAND BLOCK ==
 *    logo:              Logo image URL (replaces /pm/logo.png)
 *    logo_height:       Logo render height (e.g. 72px)
 *    tagline:           Brand tagline paragraph
 *
 *  == BOTTOM ROW ==
 *    copyright:         Copyright text
 *    border_top:        CSS border above the legal row
 *                       (e.g. "1px solid rgba(255,255,255,0.08)")
 *
 *  == SIZING ==
 *    padding_top:       Footer top padding (e.g. 64px)
 *    padding_bottom:    Footer bottom padding (e.g. 32px)
 *    max_width:         Inner container max width (e.g. 1280px)
 */

import {
  KEY_VALUE_RE,
  normalizeBcDescription,
} from '~/lib/pm-banner-parser-internal';

export type PmFooterTextTheme = 'light' | 'dark';

export interface PmFooterLink {
  label: string;
  href: string;
}

export interface PmFooterColumnConfig {
  title: string;
  links: PmFooterLink[];
  /** Optional per-column visual overrides. Default to footer-level
   *  colors (`headingColor`, `linkColor`) when unset. */
  headingColor?: string;
  linkColor?: string;
}

export interface PmFooterConfig {
  // Background layers
  bgColor?: string;
  bgGradient?: string;
  bgImageUrl?: string;
  bgImageSize?: string;
  bgImagePosition?: string;
  bgImageRepeat?: string;
  bgOverlay?: string;

  // Typography
  textTheme?: PmFooterTextTheme;
  textColor?: string;
  headingColor?: string;
  linkColor?: string;
  linkHoverColor?: string;
  legalColor?: string;

  // Brand block
  logoUrl?: string;
  logoHeight?: string;
  tagline?: string;

  // Bottom row
  copyright?: string;
  borderTop?: string;

  // Sizing
  paddingTop?: string;
  paddingBottom?: string;
  maxWidth?: string;

  // Layout
  /** Grid template for the columns row. Default `2fr_1fr_1fr_1.2fr`. */
  columnsLayout?: string;

  // Auto-Catalog column (drawn from BC top-level categories)
  /** Whether to render the auto-generated Catalog column. Default true. */
  showCatalogColumn?: boolean;
  /** Heading shown above the auto-Catalog column. Default "Catalog". */
  catalogColumnTitle?: string;

  // Custom columns — when non-empty, REPLACE the hardcoded Programs/About
  // columns (the auto-Catalog column is separate, controlled above).
  // Empty array = fall back to hardcoded defaults.
  columns?: PmFooterColumnConfig[];

  // Legal row — when non-empty, REPLACE the hardcoded 3 legal links.
  legalLinks?: PmFooterLink[];
}

const FOOTER_BLOCK_RE = /<!--\s*pm-footer\b\s*([\s\S]*?)-->/i;

function parseKeyValues(block: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of block.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    const m = line.match(KEY_VALUE_RE);
    if (m) out[m[1].toLowerCase()] = m[2];
  }
  return out;
}

function coerceTheme(v: string | undefined): PmFooterTextTheme | undefined {
  if (!v) return undefined;
  const lower = v.toLowerCase();
  if (lower === 'light' || lower === 'dark') return lower;
  return undefined;
}

function coerceBool(v: string | undefined): boolean | undefined {
  if (!v) return undefined;
  const lower = v.toLowerCase();
  if (['true', 'yes', '1', 'on'].includes(lower)) return true;
  if (['false', 'no', '0', 'off'].includes(lower)) return false;
  return undefined;
}

/**
 * Collect numbered column configs from the kv map. Walks `column_1`,
 * `column_2`, … and stops at the first gap (missing `column_N_title`).
 * Each column collects its own numbered links (`column_N_link_M_*`).
 * Cap: 16 columns × 24 links/col — plenty for any footer.
 */
function collectColumns(kv: Record<string, string>): PmFooterColumnConfig[] {
  const out: PmFooterColumnConfig[] = [];
  for (let n = 1; n <= 16; n++) {
    const title = kv[`column_${n}_title`];
    if (!title) break;
    const links: PmFooterLink[] = [];
    for (let m = 1; m <= 24; m++) {
      const label = kv[`column_${n}_link_${m}_label`];
      const href = kv[`column_${n}_link_${m}_href`];
      if (!label || !href) break;
      links.push({ label, href });
    }
    out.push({
      title,
      links,
      headingColor: kv[`column_${n}_heading_color`] || undefined,
      linkColor: kv[`column_${n}_link_color`] || undefined,
    });
  }
  return out;
}

/**
 * Collect numbered legal links (`legal_1_label/href`, `legal_2_*`, etc.)
 * Stops at first gap. Cap: 8 legal entries.
 */
function collectLegalLinks(kv: Record<string, string>): PmFooterLink[] {
  const out: PmFooterLink[] = [];
  for (let n = 1; n <= 8; n++) {
    const label = kv[`legal_${n}_label`];
    const href = kv[`legal_${n}_href`];
    if (!label || !href) break;
    out.push({ label, href });
  }
  return out;
}

/**
 * Parse the first `<!--pm-footer ... -->` block out of a description.
 * Returns null when no block is found — the footer then renders with
 * its hardcoded defaults.
 */
export function parsePmFooterConfig(
  description: string | undefined | null,
): PmFooterConfig | null {
  if (!description) return null;
  const normalized = normalizeBcDescription(description);
  const match = normalized.match(FOOTER_BLOCK_RE);
  if (!match) return null;

  const kv = parseKeyValues(match[1]);

  // Reject empty/whitespace-only fences so stray instruction text never
  // produces a default-styled override.
  if (Object.keys(kv).length === 0) return null;

  const columns = collectColumns(kv);
  const legalLinks = collectLegalLinks(kv);

  return {
    bgColor: kv.bg || undefined,
    bgGradient: kv.bg_gradient || undefined,
    bgImageUrl: kv.bg_image || undefined,
    bgImageSize: kv.bg_image_size || undefined,
    bgImagePosition: kv.bg_image_position || undefined,
    bgImageRepeat: kv.bg_image_repeat || undefined,
    bgOverlay: kv.bg_overlay || undefined,

    textTheme: coerceTheme(kv.text),
    textColor: kv.text_color || undefined,
    headingColor: kv.heading_color || undefined,
    linkColor: kv.link_color || undefined,
    linkHoverColor: kv.link_hover_color || undefined,
    legalColor: kv.legal_color || undefined,

    logoUrl: kv.logo || undefined,
    logoHeight: kv.logo_height || undefined,
    tagline: kv.tagline || undefined,

    copyright: kv.copyright || undefined,
    borderTop: kv.border_top || undefined,

    paddingTop: kv.padding_top || undefined,
    paddingBottom: kv.padding_bottom || undefined,
    maxWidth: kv.max_width || undefined,

    columnsLayout: kv.columns_layout || undefined,
    showCatalogColumn: coerceBool(kv.show_catalog_column),
    catalogColumnTitle: kv.catalog_column_title || undefined,
    columns: columns.length > 0 ? columns : undefined,
    legalLinks: legalLinks.length > 0 ? legalLinks : undefined,
  };
}

/** Name of the BC top-level slot category that holds the footer config. */
export const PM_FOOTER_SLOT_NAME = 'PM Footer';
