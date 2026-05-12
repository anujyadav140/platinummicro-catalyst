/**
 * pm-footer-fetcher
 * -----------------
 * Resolves the site-wide footer config from a single BC category
 * called "PM Footer" (sibling to "PM Page Banners" — both live under
 * the parent "PM Page Banners" so admins find everything in one
 * place).
 *
 * Footer config is fetched ONCE in dev/preview/layout.tsx and threaded
 * through PmNavContext, so every page within the layout shares the
 * lookup. unstable_cache keeps repeat reads cheap across requests.
 *
 * Falls back to `null` (footer uses hardcoded defaults) on any failure
 * — the layout should never break because an admin hasn't set a footer
 * config yet.
 */

import { unstable_cache } from 'next/cache';
import { client } from '~/client';
import { graphql } from '~/client/graphql';
import {
  parsePmFooterConfig,
  PM_FOOTER_SLOT_NAME,
  type PmFooterConfig,
} from '~/lib/pm-footer-config';
import { PM_PAGE_BANNERS_PARENT_NAME } from '~/lib/pm-hero-banner';

const PmFooterTreeQuery = graphql(`
  query PmFooterTreeQuery {
    site {
      categoryTree {
        entityId
        name
        children {
          entityId
          name
        }
      }
    }
  }
`);

const PmFooterCategoryQuery = graphql(`
  query PmFooterCategoryQuery($entityId: Int!) {
    site {
      category(entityId: $entityId) {
        description
      }
    }
  }
`);

/**
 * Find the BC "PM Footer" category's entityId. It can live either as a
 * top-level category OR as a child of "PM Page Banners" (we accept both
 * placements so the admin can organize however makes sense).
 *
 * Returns null when the category doesn't exist — caller falls back to
 * the footer's hardcoded defaults.
 */
const cachedFindFooterCategoryId = unstable_cache(
  async (): Promise<number | null> => {
    try {
      const { data } = await client.fetch({
        document: PmFooterTreeQuery,
        fetchOptions: { next: { revalidate: 120 } },
      });
      const tree = data?.site?.categoryTree ?? [];
      const wantedSlot = PM_FOOTER_SLOT_NAME.toLowerCase();
      const wantedParent = PM_PAGE_BANNERS_PARENT_NAME.toLowerCase();

      // Check top-level first.
      for (const top of tree) {
        if (top.name.toLowerCase() === wantedSlot) return top.entityId;
      }
      // Then check under "PM Page Banners".
      for (const top of tree) {
        if (top.name.toLowerCase() !== wantedParent) continue;
        for (const child of top.children ?? []) {
          if (child.name.toLowerCase() === wantedSlot) return child.entityId;
        }
      }
      return null;
    } catch {
      return null;
    }
  },
  ['pm-footer-category-id-v1'],
  { revalidate: 120, tags: ['pm-footer'] },
);

// TTL is intentionally short (30s) — the footer is admin-controllable
// styling that changes often during iteration. The category-id lookup
// above keeps the 120s TTL since the category itself rarely moves.
const cachedFooterDescription = unstable_cache(
  async (entityId: number): Promise<string> => {
    try {
      const { data } = await client.fetch({
        document: PmFooterCategoryQuery,
        variables: { entityId },
        fetchOptions: { next: { revalidate: 30 } },
      });
      return data?.site?.category?.description ?? '';
    } catch {
      return '';
    }
  },
  ['pm-footer-description-v4'],
  { revalidate: 30, tags: ['pm-footer'] },
);

/**
 * Read the admin-managed footer config. Returns null when the "PM
 * Footer" category doesn't exist OR has no `<!--pm-footer ... -->`
 * block in its description.
 */
export async function fetchPmFooterConfig(): Promise<PmFooterConfig | null> {
  const id = await cachedFindFooterCategoryId();
  if (id == null) return null;
  const description = await cachedFooterDescription(id);
  return parsePmFooterConfig(description);
}
