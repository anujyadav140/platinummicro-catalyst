/**
 * pm-categories-fetcher (server-only)
 * -----------------------------------
 * Builds the navy nav rail / homepage tiles / footer Catalog column / facet
 * sidebar / sitemap from BC's live top-level categories so the team can
 * add/remove/rename top-level categories in BC admin without code changes.
 *
 * Editorial overlays (icon glyph, tile label, marketing count, hide flags)
 * still live in code as `PM_CATEGORIES` keyed by slug — when a BC top-level
 * matches one of those slugs, we splice in the editorial bits. Any new BC
 * category the team adds shows up immediately with default rendering; if
 * the team wants an icon for it on the homepage tile strip, that's a small
 * code-side follow-up.
 *
 * Order respects whatever the team configured in BC admin (BC's category
 * tree returns categories in their stored sort order). Brand tree
 * (`/brand/...`) is filtered out — same as the mega-menu fetcher.
 *
 * Falls back to the full static PM_CATEGORIES list on any failure so the
 * nav never collapses to nothing.
 */

import { client } from '~/client';
import { graphql } from '~/client/graphql';
import { PM_CATEGORIES, type PmCategory } from '~/lib/pm-categories';

const PmCategoriesQuery = graphql(`
  query PmCategoriesQuery {
    site {
      categoryTree {
        entityId
        name
        path
      }
    }
  }
`);

function leafSlug(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  const parts = path.split('/').filter((s) => s.length > 0);
  return parts.at(-1);
}

function softTitleCase(name: string): string {
  if (!name) return name;
  if (/[a-z]/.test(name)) return name;
  return name
    .split(/(\s+)/)
    .map((part) =>
      /^\s+$/.test(part)
        ? part
        : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
    )
    .join('');
}

function isBrandTree(top: { name: string; path: string }): boolean {
  const n = top.name.toLowerCase();
  if (n === 'brand' || n === 'brands') return true;
  return top.path.toLowerCase().startsWith('/brand');
}

/**
 * Hide admin-only BC categories from the customer-facing nav.
 *
 * Convention: top-level BC categories whose name starts with `"PM "`
 * (capital P-M-space) are treated as admin storage folders — they hold
 * configuration content (banner copy, footer settings, etc.) and must
 * never surface in the nav rail, mega menu, homepage strip, footer, or
 * sitemap.
 *
 * Examples currently in BC:
 *   - "PM Page Banners" (parent for hero banner copy)
 *   - "PM Home Page Banners"
 *   - "PM Search Page Banners"
 *   - "PM Footer" (parsed for footer config overrides)
 *
 * The filter is intentionally exact-prefix ("PM " with the trailing space)
 * so legitimate names that happen to begin with "PM" (e.g. "PMP devices")
 * won't be accidentally hidden.
 */
function isAdminFolder(top: { name: string }): boolean {
  return top.name.startsWith('PM ');
}

export async function fetchPmCategories(): Promise<PmCategory[]> {
  try {
    const { data } = await client.fetch({
      document: PmCategoriesQuery,
      fetchOptions: { next: { revalidate: 60 } },
    });

    const tree = data?.site?.categoryTree ?? [];
    const result: PmCategory[] = [];

    for (const top of tree) {
      if (isBrandTree(top)) continue;
      if (isAdminFolder(top)) continue;
      const slug = leafSlug(top.path);
      if (!slug) continue;

      // Editorial overrides keyed by slug — icon, marketing tile label, SKU
      // count string, and hide flags. The team owns the BC label and the
      // category's existence; we own the homepage-tile chrome.
      const editorial = PM_CATEGORIES.find((c) => c.key === slug);

      result.push({
        key: slug,
        label: softTitleCase(top.name),
        href: `/dev/preview/category/${slug}/`,
        icon: editorial?.icon,
        tileLabel: editorial?.tileLabel,
        count: editorial?.count,
        hideFromCategoryStrip: editorial?.hideFromCategoryStrip,
        hideFromFooter: editorial?.hideFromFooter,
      });
    }

    // Empty BC response → fall back to static so the nav doesn't disappear.
    if (result.length === 0) return PM_CATEGORIES;
    return result;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[pm-categories-fetcher] failed, falling back to static:', err);
    return PM_CATEGORIES;
  }
}
