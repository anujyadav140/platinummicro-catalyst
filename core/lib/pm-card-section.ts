/**
 * pm-card-section
 * ===============
 * Parser + types for admin-managed card grids. Same fenced-comment
 * pattern as `<!--pm-hero ... -->`, but with a `<!--pm-cards ... -->`
 * tag and card-specific keys.
 *
 * Admins drop a block like this into any banner-bearing category
 * description (typically the homepage slot) to render a grid of cards:
 *
 *   <!--pm-cards
 *   eyebrow: Who we serve
 *   title: Industries we serve
 *   columns: 6
 *   columns_md: 3
 *   columns_sm: 2
 *   gap: 12px
 *   padding_y: 80px
 *
 *   card_1_title: Public Sector
 *   card_1_subtitle: GSA-aligned procurement
 *   card_1_icon: Landmark
 *   card_1_href: /dev/preview/category/servers
 *
 *   card_2_title: Education
 *   card_2_subtitle: E-rate aware
 *   card_2_icon: GraduationCap
 *   card_2_href: /dev/preview/category/storage
 *   ...
 *   -->
 *
 * Card numbering is contiguous from `card_1` upward; we stop when a
 * `card_N_title` is missing (so deleting an entry from the middle leaves
 * a gap — fix by renumbering or just delete the trailing keys).
 *
 * Card content options (any subset):
 *   card_N_title:     Required to count the card
 *   card_N_subtitle:  Optional supporting text
 *   card_N_icon:      Lucide icon name (Landmark, GraduationCap, etc.)
 *   card_N_emoji:     Single emoji char (🖥️, 🛒, 📦) — takes precedence
 *                     over image and icon when set
 *   card_N_image:     Image URL (takes precedence over icon when both set)
 *   card_N_href:      Link URL (whole card becomes clickable)
 *
 * Per-card visual overrides (any subset):
 *   card_N_bg:        Card background color
 *   card_N_text:      Card text color
 *   card_N_border:    Card border CSS (e.g. "1px solid #e5e5e5")
 *
 * Section-level layout knobs (all optional):
 *   eyebrow:          Small uppercase label above title
 *   title:            Section heading
 *   subtitle:         Paragraph below title
 *   columns:          Desktop columns (default 6)
 *   columns_md:       Tablet (>= 768px) columns (default 3)
 *   columns_sm:       Mobile columns (default 2)
 *   gap:              Grid gap between cards (default 12px)
 *   padding_y:        Section vertical padding (default 80px)
 *   bg:               Section background color (default transparent)
 *   text:             Text color theme — light | dark (default dark)
 *   align:            Card content alignment — left (default) | center
 *
 *   card_bg:          Default card background (default white)
 *   card_text:        Default card text color (default dark)
 *   card_border:      Default card border (default "1px solid #e5e5e5")
 *   card_radius:      Card border radius (default "8px")
 *   card_padding:     Card inner padding (default "20px")
 *   card_hover_accent: Accent color on hover (default brand terracotta)
 *   icon_size:        Icon size in px (default 18)
 *   icon_bg:          Icon tile background (default #eef1f7)
 *   icon_color:       Icon stroke color (default #2e6db4)
 *   image_size:       Pixel box for image/emoji glyph (default 48; bump
 *                     to 96 or 112 for the CDW-style "photo card" look)
 *   show_hover_arrow: "true" | "false" — small ↗ on hover (default true)
 */

import {
  KEY_VALUE_RE,
  normalizeBcDescription,
} from '~/lib/pm-banner-parser-internal';

export type PmCardTextColor = 'light' | 'dark';
export type PmCardAlign = 'left' | 'center';

export interface PmCardConfig {
  title: string;
  subtitle?: string;
  /** Lucide icon name (resolved by the renderer). Falls back when missing. */
  iconName?: string;
  /**
   * Single emoji or short text glyph (e.g. "🖥️", "🛒"). When set, takes
   * precedence over imageUrl + iconName — rendered as a large character
   * centered above the title, no background tile. Lets admins skin a
   * card grid without uploading images or memorizing Lucide names.
   */
  emoji?: string;
  /** Image URL — used when no emoji. Takes precedence over iconName. */
  imageUrl?: string;
  /** Optional link URL. When set, the whole card becomes clickable. */
  href?: string;
  /** Per-card overrides */
  bgColor?: string;
  textColor?: string;
  border?: string;
}

export interface PmCardSectionConfig {
  /** Section heading and decoration */
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  /** Section background */
  bgColor?: string;
  textColor?: PmCardTextColor;
  /** Grid layout */
  columns?: number;
  columnsMd?: number;
  columnsSm?: number;
  gap?: string;
  paddingY?: string;
  align?: PmCardAlign;
  /** Default card visuals (each card can override via card_N_bg etc.) */
  cardBg?: string;
  cardText?: string;
  cardBorder?: string;
  cardRadius?: string;
  cardPadding?: string;
  cardHoverAccent?: string;
  /** Icon-tile visuals */
  iconSize?: number;
  iconBg?: string;
  iconColor?: string;
  /**
   * Pixel size for the per-card image / emoji glyph. Defaults to 48 to
   * match the original tight "icon tile" look; larger values (96/112)
   * give the CDW-style "photo card" look the admin can opt into per
   * section.
   */
  imageSize?: number;
  /** Whether to show the ↗ hover arrow on the cards */
  showHoverArrow?: boolean;
  /** The cards themselves, in order */
  cards: PmCardConfig[];
}

/** Pulled-out global regex for matching <!--pm-cards ... --> blocks. */
const CARDS_BLOCK_RE = /<!--\s*pm-cards\b\s*([\s\S]*?)-->/i;
const CARDS_BLOCK_RE_GLOBAL = /<!--\s*pm-cards\b\s*([\s\S]*?)-->/gi;

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

function coerceEnum<T extends string>(
  value: string | undefined,
  allowed: ReadonlyArray<T>,
): T | undefined {
  if (!value) return undefined;
  const lower = value.toLowerCase() as T;
  return allowed.includes(lower) ? lower : undefined;
}

function coerceNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function coerceBool(value: string | undefined): boolean | undefined {
  if (!value) return undefined;
  const lower = value.toLowerCase();
  if (['true', 'yes', '1', 'on'].includes(lower)) return true;
  if (['false', 'no', '0', 'off'].includes(lower)) return false;
  return undefined;
}

/**
 * Collect contiguous card_1..card_N entries from the key/value map.
 * Stops at the first gap (missing card_N_title); admins should keep
 * numbering contiguous to add/remove cards.
 */
function collectCards(kv: Record<string, string>): PmCardConfig[] {
  const cards: PmCardConfig[] = [];
  // Reasonable upper bound — protects against runaway loops if someone
  // typos a card_999_title key. 48 cards is more than any homepage grid
  // could reasonably want.
  for (let n = 1; n <= 48; n++) {
    const prefix = `card_${n}_`;
    const title = kv[`${prefix}title`];
    if (!title) break;
    cards.push({
      title,
      subtitle: kv[`${prefix}subtitle`] || undefined,
      iconName: kv[`${prefix}icon`] || undefined,
      emoji: kv[`${prefix}emoji`] || undefined,
      imageUrl: kv[`${prefix}image`] || undefined,
      href: kv[`${prefix}href`] || undefined,
      bgColor: kv[`${prefix}bg`] || undefined,
      textColor: kv[`${prefix}text`] || undefined,
      border: kv[`${prefix}border`] || undefined,
    });
  }
  return cards;
}

function buildConfigFromBlock(block: string): PmCardSectionConfig {
  const kv = parseKeyValues(block);
  return {
    eyebrow: kv.eyebrow || undefined,
    title: kv.title || undefined,
    subtitle: kv.subtitle || undefined,
    bgColor: kv.bg || undefined,
    textColor: coerceEnum(kv.text, ['light', 'dark']),
    columns: coerceNumber(kv.columns),
    columnsMd: coerceNumber(kv.columns_md),
    columnsSm: coerceNumber(kv.columns_sm),
    gap: kv.gap || undefined,
    paddingY: kv.padding_y || undefined,
    align: coerceEnum(kv.align, ['left', 'center']),
    cardBg: kv.card_bg || undefined,
    cardText: kv.card_text || undefined,
    cardBorder: kv.card_border || undefined,
    cardRadius: kv.card_radius || undefined,
    cardPadding: kv.card_padding || undefined,
    cardHoverAccent: kv.card_hover_accent || undefined,
    iconSize: coerceNumber(kv.icon_size),
    iconBg: kv.icon_bg || undefined,
    iconColor: kv.icon_color || undefined,
    imageSize: coerceNumber(kv.image_size),
    showHoverArrow: coerceBool(kv.show_hover_arrow),
    cards: collectCards(kv),
  };
}

/** Parse the FIRST `<!--pm-cards ... -->` block. Returns null when no block. */
export function parsePmCardSection(
  description: string | undefined | null,
): PmCardSectionConfig | null {
  if (!description) return null;
  const normalized = normalizeBcDescription(description);
  const match = normalized.match(CARDS_BLOCK_RE);
  if (!match) return null;
  return buildConfigFromBlock(match[1]);
}

/** Parse EVERY `<!--pm-cards ... -->` block in order. */
export function parsePmCardSections(
  description: string | undefined | null,
): PmCardSectionConfig[] {
  if (!description) return [];
  const normalized = normalizeBcDescription(description);
  const out: PmCardSectionConfig[] = [];
  for (const match of normalized.matchAll(CARDS_BLOCK_RE_GLOBAL)) {
    out.push(buildConfigFromBlock(match[1]));
  }
  return out;
}

/** Strip all <!--pm-cards--> blocks from a description (used by stripPmHeroBlock). */
export function stripPmCardBlocks(description: string): string {
  return description.replace(CARDS_BLOCK_RE_GLOBAL, '');
}
