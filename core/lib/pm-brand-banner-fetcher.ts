/**
 * pm-brand-banner-fetcher
 * -----------------------
 * Resolves the hero-banner config for a brand listing page. The brand
 * page lives at `/dev/preview/search?bids=...&heading=HPE`; the banner
 * comes from the corresponding BC "Mega Menu Brands" subcategory's
 * description (parsed by `pm-hero-banner`).
 *
 * We look up the subcategory by walking the same BC category tree the
 * mega-menu fetcher uses, then matching either the raw category name
 * OR its shortHeading (e.g. "HPE" matches both "Hewlett Packard
 * Enterprise" and "HPE Networking Instant On" depending on which one
 * has shortHeadingFor() === "HPE"). All BC reads are cached via
 * unstable_cache so this stays cheap.
 */

import { unstable_cache } from 'next/cache';
import { client } from '~/client';
import { graphql } from '~/client/graphql';
import {
  parsePmPageSections,
  type PmPageSection,
} from '~/lib/pm-page-sections';

// Same short-heading map used in pm-mega-menu-fetcher.ts. Kept duplicated
// (not imported) so this module doesn't reach into the mega-menu fetcher's
// internals — if you add a new short heading there, mirror it here.
const SHORT_HEADINGS: Record<string, string> = {
  'Hewlett Packard Enterprise': 'HPE',
  'HPE Networking Instant On': 'HPE Networking',
  'Western Digital': 'WD',
  'ASRock Rack': 'ASRock Rack',
};

function shortHeadingFor(name: string): string {
  return SHORT_HEADINGS[name] ?? name;
}

const PmBrandBannerTreeQuery = graphql(`
  query PmBrandBannerTreeQuery {
    site {
      categoryTree {
        entityId
        name
        path
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

const PmBrandBannerCategoryQuery = graphql(`
  query PmBrandBannerCategoryQuery($entityId: Int!) {
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
 * Walk the BC category tree to find the "Mega Menu Brands" subcategory
 * whose name (or shortHeading) matches the requested heading. Returns
 * the matched subcategory's entityId, or null if no match exists.
 *
 * Cached under the heading key (per-heading lookups don't bust each
 * other's results).
 */
const cachedFindBrandCategoryId = unstable_cache(
  async (heading: string): Promise<number | null> => {
    try {
      const { data } = await client.fetch({
        document: PmBrandBannerTreeQuery,
        fetchOptions: { next: { revalidate: 120 } },
      });
      const tree = data?.site?.categoryTree ?? [];
      const wanted = heading.toLowerCase();

      for (const top of tree) {
        const topName = top.name.toLowerCase();
        const isBrandTop =
          topName === 'brand' ||
          topName === 'brands' ||
          top.path.toLowerCase().startsWith('/brand');
        if (!isBrandTop) continue;

        for (const mid of top.children ?? []) {
          const midName = mid.name.toLowerCase();
          if (midName !== 'mega menu brands' && midName !== 'mega-menu-brands') {
            continue;
          }
          for (const leaf of mid.children ?? []) {
            const leafName = leaf.name;
            if (
              leafName.toLowerCase() === wanted ||
              shortHeadingFor(leafName).toLowerCase() === wanted
            ) {
              return leaf.entityId;
            }
          }
        }
      }
      return null;
    } catch {
      return null;
    }
  },
  ['pm-brand-banner-category-id'],
  { revalidate: 120, tags: ['pm-mega-menu'] },
);

/** Description + built-in BC Category Image, fetched together so we
 *  share one roundtrip. */
interface BrandCategoryFields {
  description: string;
  imageUrl?: string;
}

/**
 * Fetch a single category's raw description AND built-in Category Image
 * by entityId. Cached so repeated banner lookups for the same brand
 * share one BC roundtrip.
 */
const cachedCategoryFields = unstable_cache(
  async (entityId: number): Promise<BrandCategoryFields> => {
    try {
      const { data } = await client.fetch({
        document: PmBrandBannerCategoryQuery,
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
  ['pm-brand-banner-fields'],
  { revalidate: 120, tags: ['pm-mega-menu'] },
);

/**
 * Resolve hero banners for a brand listing page identified by its
 * heading (e.g. "HPE"). The BC category's built-in "Category Image"
 * feeds into the FIRST banner as the background image when the
 * `<!--pm-hero ... -->` block doesn't override it via `image:`.
 *
 * Returns an array (possibly empty) — admins can stack multiple banners
 * by repeating the fence in the description.
 */
export async function fetchPmBrandBanner(
  heading: string,
): Promise<PmPageSection[]> {
  const trimmed = heading.trim();
  if (!trimmed) return [];

  const categoryId = await cachedFindBrandCategoryId(trimmed);
  if (categoryId == null) return [];

  const { description, imageUrl } = await cachedCategoryFields(categoryId);
  return parsePmPageSections(description, imageUrl);
}
