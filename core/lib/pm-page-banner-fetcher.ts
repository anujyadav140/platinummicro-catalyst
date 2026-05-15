/**
 * pm-page-banner-fetcher
 * ----------------------
 * Resolves the hero banner for "page slot" surfaces that aren't tied to a
 * specific category — currently `homepage` and `search`. Both live under a
 * single hidden BC category called `PM Page Banners` whose children are
 * the slot names:
 *
 *   PM Page Banners (hidden parent)
 *   ├── homepage   ← description holds <!--pm-hero ... --> for the homepage
 *   └── search     ← description holds <!--pm-hero ... --> for the search page
 *
 * Admin workflow: BC admin → Products → Categories → "PM Page Banners" →
 * pick the slot → edit Description, drop in the `<!--pm-hero ... -->` block.
 * If the parent category or the slot subcategory doesn't exist yet, run
 * `scripts/bc-bootstrap-page-banners.mjs` (one-time setup).
 *
 * Falls back to `null` (no banner) on every failure — page renders cleanly
 * with no banner.
 */

import { unstable_cache } from 'next/cache';
import { client } from '~/client';
import { graphql } from '~/client/graphql';
import {
  PM_PAGE_BANNERS_PARENT_NAME,
  type PmPageBannerSlot,
} from '~/lib/pm-hero-banner';
import {
  parsePmPageSections,
  type PmPageSection,
} from '~/lib/pm-page-sections';

/**
 * The slot lookup tree query — three levels deep so we can find the
 * page-slot category AND its section children in one roundtrip.
 *
 *   PM Page Banners            ← top level
 *   ├── PM Home Page Banners   ← slot (homepage) — middle level
 *   │   ├── Home Page Banner 1 ← section child — bottom level
 *   │   ├── Authorized Partners
 *   │   └── ...
 *   └── PM Search Page Banners
 */
const PmPageBannerTreeQuery = graphql(`
  query PmPageBannerTreeQuery {
    site {
      categoryTree {
        entityId
        name
        children {
          entityId
          name
          children {
            entityId
            name
          }
        }
      }
    }
  }
`);

const PmPageBannerCategoryQuery = graphql(`
  query PmPageBannerCategoryQuery($entityId: Int!) {
    site {
      category(entityId: $entityId) {
        description
        defaultImage {
          url: urlTemplate(lossy: true)
        }
      }
    }
  }
`);

/**
 * Each BC slot can match by ONE of these names. The user-friendly names
 * are preferred; the original technical names ("homepage"/"search")
 * stay as fallbacks so the existing categories keep working after the
 * rename.
 */
const SLOT_NAME_ALIASES: Record<PmPageBannerSlot, string[]> = {
  homepage: ['pm home page banners', 'home page', 'homepage'],
  search: ['pm search page banners', 'search page', 'search'],
};

interface SlotResolution {
  /** The slot category's own entityId (its description still parsed for backward compat). */
  slotId: number;
  /** Section-child entityIds in BC's admin sort order (top → bottom). */
  childIds: number[];
}

/**
 * Resolve the slot category AND its section children for a given slot.
 *
 * Walks the BC category tree under "PM Page Banners" (the parent), finds
 * the child whose name matches one of `SLOT_NAME_ALIASES[slot]`, and
 * collects that child's children as section IDs (in BC's sort order).
 *
 * Cached so concurrent renders share one BC roundtrip.
 */
const cachedResolveSlot = unstable_cache(
  async (slot: PmPageBannerSlot): Promise<SlotResolution | null> => {
    try {
      const { data } = await client.fetch({
        document: PmPageBannerTreeQuery,
        fetchOptions: { next: { revalidate: 120 } },
      });
      const tree = data?.site?.categoryTree ?? [];
      const wantedParent = PM_PAGE_BANNERS_PARENT_NAME.toLowerCase();
      const aliases = SLOT_NAME_ALIASES[slot].map((s) => s.toLowerCase());

      for (const top of tree) {
        if (top.name.toLowerCase() !== wantedParent) continue;
        for (const slotCat of top.children ?? []) {
          if (!aliases.includes(slotCat.name.toLowerCase())) continue;
          // Collect the slot's children (sections), preserving BC's
          // returned order (which mirrors admin's sort_order).
          const childIds =
            slotCat.children
              ?.map((c) => c.entityId)
              .filter((id): id is number => typeof id === 'number') ?? [];
          return { slotId: slotCat.entityId, childIds };
        }
      }
      return null;
    } catch {
      return null;
    }
  },
  ['pm-page-banner-slot-resolution-v7'],
  { revalidate: 120, tags: ['pm-page-banners'] },
);

interface SlotCategoryFields {
  description: string;
  imageUrl?: string;
}

/**
 * Cached description + built-in BC Category Image fetch. Both come back
 * in one roundtrip; the Category Image feeds the banner background when
 * the description block doesn't override it.
 */
const cachedSlotFields = unstable_cache(
  async (entityId: number): Promise<SlotCategoryFields> => {
    try {
      const { data } = await client.fetch({
        document: PmPageBannerCategoryQuery,
        variables: { entityId },
        fetchOptions: { next: { revalidate: 120 } },
      });
      return {
        description: data?.site?.category?.description ?? '',
        imageUrl: data?.site?.category?.defaultImage?.url ?? undefined,
      };
    } catch {
      return { description: '' };
    }
  },
  ['pm-page-banner-fields-v20'],
  { revalidate: 120, tags: ['pm-page-banners'] },
);

/**
 * Read the hero banner for a given page slot. The BC category's
 * built-in "Category Image" (admin drag-drop in BC admin) feeds the
 * banner background; the description block's `image:` key, if present,
 * overrides it.
 *
 * Returns null when the slot category doesn't exist, doesn't have a
 * `<!--pm-hero ... -->` block, and has no category image to fall back
 * onto.
 */
/**
 * Read all page sections (hero banners + card grids, in document order)
 * for a given slot. Each section is configured as ONE BC child category
 * under the slot — admins drop a single `<!--pm-hero ... -->` or
 * `<!--pm-cards ... -->` block into each child's description and BC's
 * sort_order determines render order.
 *
 * For backwards compat: any blocks still living in the SLOT's own
 * description are parsed first (so existing stacked-block setups keep
 * working). Sections from children then append after.
 */
export async function fetchPmPageBanner(
  slot: PmPageBannerSlot,
): Promise<PmPageSection[]> {
  const resolution = await cachedResolveSlot(slot);
  if (!resolution) return [];

  // Fetch the slot's own description AND every child's description in
  // parallel — one BC roundtrip per category, but they all run together.
  const ids = [resolution.slotId, ...resolution.childIds];
  const allFields = await Promise.all(ids.map((id) => cachedSlotFields(id)));

  // Each section comes back fully-hydrated from its parser — including
  // pm-brands sections, whose brand list is now inline in the same
  // description (no per-brand BC subcategory fetching needed).
  const sections: PmPageSection[] = [];
  for (let i = 0; i < allFields.length; i++) {
    const { description, imageUrl } = allFields[i];
    if (!description) continue;
    const parsed = parsePmPageSections(description, imageUrl);
    sections.push(...parsed);
  }
  return sections;
}
