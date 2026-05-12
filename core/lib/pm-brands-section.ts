/**
 * pm-brands-section
 * =================
 * Parser + types for the admin-managed "Authorized Partners" / brand-wall
 * section. Same fenced-comment pattern as the other section types
 * (`pm-hero`, `pm-cards`) but with a `<!--pm-brands ... -->` tag.
 *
 * Brands are configured INLINE in the same fence as the section
 * styling — admin writes numbered `brand_1_name`, `brand_1_logo`, etc.
 * No separate BC subcategories required. Adding a brand = three new
 * lines in the description; removing = delete those lines; reorder =
 * rearrange the numbering.
 *
 * ──────────────────────────────────────────────────────────────────
 * SCHEMA REFERENCE — keys inside <!--pm-brands ... -->
 * ──────────────────────────────────────────────────────────────────
 *
 *   == SECTION HEADER ==
 *     eyebrow:           Small uppercase label above the title
 *                        (default "Authorized partners")
 *     title:             Section heading
 *                        (default "Stocked, supported, sourced direct.")
 *     cta_label:         Top-right link label (default "All manufacturers")
 *     cta_href:          Top-right link URL
 *
 *   == LAYOUT ==
 *     bg:                Section background color (default transparent)
 *     padding_y:         Vertical section padding (default 80px)
 *     logo_height:       Max height of each logo in px (default 64)
 *     columns_lg:        # of logos visible at lg breakpoint (default 5)
 *     columns_md:        Same at md (default 3)
 *     columns_sm:        Same at sm (default 2)
 *
 *   == DEFAULT HREF FOR EACH BRAND ==
 *     brand_href_template: URL pattern for each brand's click target.
 *                          Use `{name}` as a placeholder for the brand's
 *                          name (URL-encoded automatically). Default:
 *                          `/dev/preview/search?heading={name}`
 *                          which uses the existing brand-listing page.
 *
 *   == BRANDS (inline list) ==
 *   Numbered `brand_1`, `brand_2`, … (stops at the first missing
 *   `brand_N_name`). Cap: 48.
 *     brand_N_name:        Display name (required to count the brand)
 *     brand_N_logo:        Logo image URL
 *     brand_N_href:        Optional per-brand link override; otherwise
 *                          the section's `brand_href_template` applies
 *
 *   Example block:
 *     <!--pm-brands
 *     title: Stocked, supported, sourced direct.
 *     columns_lg: 5
 *
 *     brand_1_name: Cisco
 *     brand_1_logo: https://upload.wikimedia.org/wikipedia/commons/.../Cisco_logo.svg/1280px-Cisco_logo.svg.png
 *
 *     brand_2_name: Intel
 *     brand_2_logo: https://upload.wikimedia.org/wikipedia/commons/.../Intel-logo-2022.svg/1280px-Intel-logo-2022.svg.png
 *     -->
 */

import {
  KEY_VALUE_RE,
  normalizeBcDescription,
} from '~/lib/pm-banner-parser-internal';

export interface PmBrandConfig {
  /** BC entity ID — used as React key + dedup */
  id: number;
  /** Display name (BC category name) */
  name: string;
  /** Brand logo image URL (BC Category Image) */
  logoUrl?: string;
  /** Link URL (whole logo tile is clickable). Defaults to the
   *  brand-listing search URL templated with the brand name. */
  href?: string;
}

export interface PmBrandsSectionConfig {
  // Section header
  eyebrow?: string;
  title?: string;
  ctaLabel?: string;
  ctaHref?: string;

  // Layout
  bgColor?: string;
  paddingY?: string;
  logoHeight?: number;
  columnsLg?: number;
  columnsMd?: number;
  columnsSm?: number;

  // Href template (used by the fetcher when filling in each brand's href)
  brandHrefTemplate?: string;

  /** Populated by the fetcher from the section's BC children. The parser
   *  always sets this to an empty array — the actual brand list is
   *  attached later. */
  brands: PmBrandConfig[];
}

const BRANDS_BLOCK_RE = /<!--\s*pm-brands\b\s*([\s\S]*?)-->/i;

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

function coerceNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/**
 * Walk the inline brand entries (`brand_1_*`, `brand_2_*`, …) and build
 * the brand list. Stops at the first gap (missing `brand_N_name`) so
 * admins keep numbering contiguous. Cap: 48 — more than any reasonable
 * partner wall needs.
 *
 * `id` is the index (1-based), not a BC entity ID — used only as a
 * React key and dedup hint for the compare-store / hover-state.
 */
function collectBrands(
  kv: Record<string, string>,
  template: string | undefined,
): PmBrandConfig[] {
  const brands: PmBrandConfig[] = [];
  for (let n = 1; n <= 48; n++) {
    const name = kv[`brand_${n}_name`];
    if (!name) break;
    const explicitHref = kv[`brand_${n}_href`];
    brands.push({
      id: n,
      name,
      logoUrl: kv[`brand_${n}_logo`] || undefined,
      href: explicitHref || brandHrefFor({ name }, template),
    });
  }
  return brands;
}

/**
 * Parse the first `<!--pm-brands ... -->` block in a description.
 * Returns the config WITHOUT brand data (brands: []) — the fetcher fills
 * those in afterwards. Returns null when no fence is present.
 */
export function parsePmBrandsSection(
  description: string | undefined | null,
): PmBrandsSectionConfig | null {
  if (!description) return null;
  const normalized = normalizeBcDescription(description);
  const match = normalized.match(BRANDS_BLOCK_RE);
  if (!match) return null;
  const kv = parseKeyValues(match[1]);

  const template = kv.brand_href_template || undefined;
  return {
    eyebrow: kv.eyebrow || undefined,
    title: kv.title || undefined,
    ctaLabel: kv.cta_label || undefined,
    ctaHref: kv.cta_href || undefined,
    bgColor: kv.bg || undefined,
    paddingY: kv.padding_y || undefined,
    logoHeight: coerceNumber(kv.logo_height),
    columnsLg: coerceNumber(kv.columns_lg),
    columnsMd: coerceNumber(kv.columns_md),
    columnsSm: coerceNumber(kv.columns_sm),
    brandHrefTemplate: template,
    // Inline brand list — parsed straight from this fence. No more BC
    // subcategory roundtrips per brand.
    brands: collectBrands(kv, template),
  };
}

/**
 * Compose the click-through URL for a single brand. Uses the section's
 * `brand_href_template` (default `/dev/preview/search?heading={name}`)
 * and URL-encodes the brand name into the `{name}` placeholder.
 */
export function brandHrefFor(
  brand: { name: string },
  template: string | undefined,
): string {
  const tpl = template ?? '/dev/preview/search?heading={name}';
  return tpl.replace(/\{name\}/g, encodeURIComponent(brand.name));
}

/** Strip <!--pm-brands--> blocks from a description (for displayed text). */
export function stripPmBrandsBlocks(description: string): string {
  return description.replace(/<!--\s*pm-brands\b[\s\S]*?-->/gi, '');
}

