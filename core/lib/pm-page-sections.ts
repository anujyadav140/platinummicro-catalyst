/**
 * pm-page-sections
 * ================
 * Unified parser that reads a BC category description and produces an
 * ORDERED list of page sections — preserving the order the admin used
 * in the description. Supports two section types today (banners + card
 * grids) and is structured to be extended with more types later (e.g.
 * `pm-text`, `pm-cta`, `pm-video`).
 *
 * Why ordered: an admin should be able to put a card grid ABOVE a hero,
 * or interleave heroes with card grids, just by reordering their fence
 * blocks. This module preserves that order so the rendering shell can
 * map() over the sections without caring about types.
 *
 * Usage:
 *   const sections = parsePmPageSections(description, fallbackImageUrl);
 *   // sections = [
 *   //   { kind: 'hero',  config: ... },
 *   //   { kind: 'cards', config: ... },
 *   //   { kind: 'hero',  config: ... },
 *   // ]
 *
 * Render in the shell with a `switch (section.kind)` dispatcher.
 */

import { normalizeBcDescription } from '~/lib/pm-banner-parser-internal';
import {
  parsePmHeroBanner,
  type PmHeroBannerConfig,
} from '~/lib/pm-hero-banner';
import {
  parsePmCardSection,
  type PmCardSectionConfig,
} from '~/lib/pm-card-section';
import {
  parsePmBrandsSection,
  type PmBrandsSectionConfig,
} from '~/lib/pm-brands-section';

export type PmPageSection =
  | { kind: 'hero'; config: PmHeroBannerConfig }
  | { kind: 'cards'; config: PmCardSectionConfig }
  | { kind: 'brands'; config: PmBrandsSectionConfig };

/**
 * Matches ANY supported fence type. Captures the type name (hero/cards)
 * and the body, in document order, with the `g` flag.
 */
const ANY_SECTION_RE = /<!--\s*pm-(hero|cards|brands)\b\s*([\s\S]*?)-->/gi;

/**
 * Parse a description into an ordered list of typed sections. The
 * `fallbackImageUrl` (typically the BC Category Image) feeds the FIRST
 * hero section only — additional heroes or card grids ignore it.
 */
export function parsePmPageSections(
  description: string | undefined | null,
  fallbackImageUrl?: string | null,
): PmPageSection[] {
  if (!description) return [];
  const normalized = normalizeBcDescription(description);
  const sections: PmPageSection[] = [];
  let isFirstHero = true;

  for (const match of normalized.matchAll(ANY_SECTION_RE)) {
    const type = match[1].toLowerCase();
    const body = match[2];

    // Defensive: skip empty / whitespace-only fences. They can show up
    // when admin instruction text accidentally contains the literal
    // string `<!--pm-hero ... -->`. A genuinely configured banner has
    // at least one `key: value` line.
    if (!/\w+\s*:/.test(body)) continue;

    // Wrap the body back into a single-fence string so we can reuse the
    // existing single-block parsers (they accept a description containing
    // exactly one fence). Cheap, no duplicate parsing logic.
    const wrapped = `<!--pm-${type}\n${body}\n-->`;

    if (type === 'hero') {
      const config = parsePmHeroBanner(
        wrapped,
        isFirstHero ? fallbackImageUrl : undefined,
      );
      if (config) {
        sections.push({ kind: 'hero', config });
        isFirstHero = false;
      }
    } else if (type === 'cards') {
      const config = parsePmCardSection(wrapped);
      // A card grid with no cards still rendered nothing useful — skip.
      if (config && config.cards.length > 0) {
        sections.push({ kind: 'cards', config });
      }
    } else if (type === 'brands') {
      // Parsed config starts with brands: [] — the fetcher attaches
      // real brand entries (one per BC child) after this pass.
      const config = parsePmBrandsSection(wrapped);
      if (config) sections.push({ kind: 'brands', config });
    }
  }

  return sections;
}
