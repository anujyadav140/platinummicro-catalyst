/**
 * pm-mega-menu-fetcher (server-only)
 * ----------------------------------
 * Builds the header mega-menu from BigCommerce's live category tree so the
 * team can edit the nav from BC admin without touching code.
 *
 * Mapping rule:
 *   Top-level category    →  mega-menu entry (keyed by slug)
 *     ↳ direct child      →  column heading
 *         ↳ grandchild    →  link in that column
 *
 * Columns with zero children are dropped (an empty column looks broken).
 * Top-level categories with no children render as plain nav links (the
 * existing fallback behavior — no chevron, no panel).
 *
 * Promo cards still come from the code-config in `pm-mega-menu.ts`. BC
 * doesn't have a clean built-in field to hold a promo card, and we
 * intentionally kept v1 small. Phase 2 (metafields) can move them to BC.
 *
 * The "BRAND" subtree is filtered out for the same reason it's filtered
 * out of PDP breadcrumbs — it's an internal taxonomy, not customer-facing
 * navigation. Top-level categories named "Brand" / "Brands" or whose path
 * starts with `/brand` are excluded from the menu.
 */

import { client } from '~/client';
import { graphql } from '~/client/graphql';
import {
  PM_MEGA_MENU,
  type PmMegaBrand,
  type PmMegaCard,
  type PmMegaColumn,
  type PmMegaMenu,
} from '~/lib/pm-mega-menu';

// First pass: pulls the category tree (3 levels) AND the top brands. BC's
// `CategoryTreeItem` is a slim type — it doesn't expose `description` or
// `defaultImage`. Those come from the full `Category` type, fetched per
// child entityId in `fetchCategoryDetails` below.
const PmMegaMenuQuery = graphql(`
  query PmMegaMenuQuery {
    site {
      categoryTree {
        entityId
        name
        path
        children {
          entityId
          name
          path
          children {
            entityId
            name
            path
          }
        }
      }
      brands(first: 8) {
        edges {
          node {
            entityId
            name
            path
            defaultImage {
              altText
              url(width: 160, height: 80)
            }
          }
        }
      }
    }
  }
`);

// Second pass: per child entityId, fetch the rich Category fields BC
// hides on the slim tree. Issued in parallel via Promise.all.
const PmCategoryDetailsQuery = graphql(`
  query PmCategoryDetailsQuery($entityId: Int!) {
    site {
      category(entityId: $entityId) {
        entityId
        description
        defaultImage {
          altText
          url(width: 240, height: 180)
        }
      }
    }
  }
`);

interface CategoryDetails {
  description: string;
  imageUrl?: string;
  imageAlt?: string;
}

async function fetchCategoryDetails(
  entityIds: number[],
): Promise<Map<number, CategoryDetails>> {
  const map = new Map<number, CategoryDetails>();
  if (entityIds.length === 0) return map;

  // Dedupe — a child shouldn't appear under two top-levels normally,
  // but cheap insurance against duplicate fetches.
  const unique = Array.from(new Set(entityIds));

  const results = await Promise.all(
    unique.map(async (id) => {
      try {
        const { data } = await client.fetch({
          document: PmCategoryDetailsQuery,
          variables: { entityId: id },
          fetchOptions: { next: { revalidate: 60 } },
        });
        return { id, cat: data?.site?.category };
      } catch {
        // One failed lookup shouldn't sink the whole menu — the card
        // just falls back to badge + title.
        return { id, cat: null };
      }
    }),
  );

  for (const { id, cat } of results) {
    if (!cat) continue;
    map.set(id, {
      description: cat.description ?? '',
      imageUrl: cat.defaultImage?.url ?? undefined,
      imageAlt: cat.defaultImage?.altText ?? undefined,
    });
  }
  return map;
}

/** "/servers/" → "servers"; "/foo/bar/" → "bar". Returns undefined if unparsable. */
function leafSlug(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  const parts = path.split('/').filter((s) => s.length > 0);
  return parts.at(-1);
}

/**
 * "SERVERS" → "Servers", "RACK SERVERS" → "Rack Servers". Mixed-case input
 * is left alone so model numbers like "DL360" or "Wi-Fi 6" survive intact.
 * Lifted from pm-product-by-slug.ts where the same heuristic powers the PDP
 * breadcrumb — duplicated here to keep the fetcher self-contained.
 */
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

/** Hide the auto-managed brand tree — it's not customer-facing navigation. */
function isBrandTree(top: { name: string; path: string }): boolean {
  const n = top.name.toLowerCase();
  if (n === 'brand' || n === 'brands') return true;
  return top.path.toLowerCase().startsWith('/brand');
}

/**
 * Strip HTML tags + entities, collapse whitespace, truncate to a card-
 * friendly length. BC stores descriptions as HTML; cards want one line.
 */
function stripAndTruncate(html: string | null | undefined, max = 120): string {
  if (!html) return '';
  const plain = html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  if (plain.length <= max) return plain;
  // Cut on a word boundary just before the cap so we don't slice mid-word.
  const cut = plain.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…';
}

/**
 * Editorial badge overrides keyed by category slug. The auto-derive
 * heuristic below produces fine-but-bland 3-letter codes ("RAC" for
 * Rackmount, "PED" for Pedestal). These slug-keyed entries let us match
 * a curated naming convention without needing a BC custom field.
 *
 * Add a slug here when you want a non-alphabetic code for a category.
 */
const BADGE_OVERRIDES: Record<string, string> = {
  'rackmount-servers': 'RAX',
  'gpu-servers': 'GPX',
  'high-density-servers': 'HDX',
  'pedestal-servers': 'TWX',
  'blade-servers': 'BLD',
  'ampere-servers': 'ARM',
  'nas-solutions': 'NAS',
  'cph-solutions': 'CPH',
  'hps-solutions': 'HPS',
  'nearline-servers': 'NLN',
  'jbod-expansion': 'JBD',
  'virtually-silent': 'VSX',
  'high-performance': 'HPX',
  'gpu-optimized': 'GPW',
  'threadripper-pro': 'TRX',
  'dgx-spark': 'DGX',
  'all-software': 'ALL',
  'operating-systems': 'OSX',
  'productivity': 'PRD',
  'antivirus-internet-security': 'AVS',
  'storage-devices': 'SSD',
  'cooling-devices': 'CLG',
  'cpu-processors': 'CPU',
  'graphics-cards': 'GPU',
  'motherboards': 'MBD',
  'desktop-memory': 'RAM',
  'capture-cards': 'CAP',
  'development-boards': 'DEV',
  'power-supplies': 'PSU',
  'cases-chassis': 'CAS',
  'all-bundles': 'ALL',
  'ai-solutions': 'AIX',
  'nas-server': 'NAS',
  'all-bulk-options': 'ALL',
  'ai-box': 'AIB',
  'mem': 'MEM',
  'ssd': 'SSD',
  'hdd': 'HDD',
  'cpu': 'CPU',
  'external-storage': 'EXT',
};

/**
 * Auto-derive the 3-letter card badge from a category name. First 3 chars
 * of the first word; if too short, pad with the first letter of subsequent
 * words. Example: "GPU Servers" → "GPU", "Rackmount Servers" → "RAC",
 * "1U" → "1U", "AI / ML" → "AIM". Team can later override by setting a
 * BC custom field on the category (phase 2).
 */
function autoBadge(name: string): string {
  const words = name.replace(/[^A-Za-z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  let badge = words[0].slice(0, 3).toUpperCase();
  for (let i = 1; i < words.length && badge.length < 3; i++) {
    badge += words[i][0]?.toUpperCase() ?? '';
  }
  return badge.slice(0, 3);
}


export type PmMegaMenuMap = Record<string, PmMegaMenu>;

/**
 * Read the BC category tree and assemble per-top-level mega-menu blocks.
 * On any failure (network, parse, etc.) returns the static code-config
 * map from pm-mega-menu.ts so the header keeps rendering.
 */
export async function fetchPmMegaMenu(): Promise<PmMegaMenuMap> {
  try {
    const { data } = await client.fetch({
      document: PmMegaMenuQuery,
      fetchOptions: { next: { revalidate: 60 } },
    });

    const tree = data?.site?.categoryTree ?? [];
    const menu: PmMegaMenuMap = {};

    // Brand rail — BC's top-level Brands collection. Used as the right
    // rail across all category panels; if the team wants per-category
    // brand filtering later, swap to `category.products.collectionInfo
    // .productResults.brands` or similar (phase 2).
    const brandEdges = data?.site?.brands?.edges ?? [];
    const brands: PmMegaBrand[] = brandEdges
      .map((edge) => edge?.node)
      .filter((n): n is NonNullable<typeof n> => n != null)
      .map((n) => ({
        name: n.name,
        href: n.path ?? '#',
        logoUrl: n.defaultImage?.url,
      }));

    // Collect every direct-child entityId across all (non-brand) top-levels
    // so we can fetch the full Category data (description + defaultImage)
    // in a single Promise.all batch. ~10-30 calls in practice; cached 60s.
    const childEntityIds: number[] = [];
    for (const top of tree) {
      if (isBrandTree(top)) continue;
      for (const child of top.children ?? []) {
        childEntityIds.push(child.entityId);
      }
    }
    const detailsMap = await fetchCategoryDetails(childEntityIds);

    for (const top of tree) {
      if (isBrandTree(top)) continue;
      const slug = leafSlug(top.path);
      if (!slug) continue;

      // Skip top-levels with no children — those render as plain nav links
      // already, no mega panel needed.
      if (!top.children || top.children.length === 0) continue;

      const childToHref = (item: { path: string }): string => {
        const itemSlug = leafSlug(item.path);
        return itemSlug ? `/dev/preview/category/${itemSlug}/` : '#';
      };

      // Card grid — every direct child becomes a card with badge + title +
      // (when set in BC) description blurb + category image. Description
      // and image come from `detailsMap` (filled by per-id fetches above).
      // Cards still render cleanly when those fields are missing — the
      // image area + paragraph collapse.
      const cards: PmMegaCard[] = top.children.map((child) => {
        const details = detailsMap.get(child.entityId);
        const childSlug = leafSlug(child.path);
        return {
          badge: BADGE_OVERRIDES[childSlug ?? ''] ?? autoBadge(child.name),
          title: softTitleCase(child.name),
          blurb: stripAndTruncate(details?.description, 120),
          href: childToHref(child),
          imageUrl: details?.imageUrl,
          imageAlt: details?.imageAlt ?? child.name,
        };
      });

      // Per-child rendering rule for the LEGACY columns (kept for safety
      // and for surfaces that haven't migrated to the card layout):
      //   - "Branch" child (has grandchildren) → its own column, items =
      //     grandchildren. This is the canonical mega-menu shape.
      //   - "Leaf" child (no grandchildren) → goes into a shared
      //     "Categories" column at the start.
      const branchCols: PmMegaColumn[] = [];
      const leafItems: { label: string; href: string }[] = [];

      for (const child of top.children) {
        const grandchildren = child.children ?? [];
        if (grandchildren.length > 0) {
          branchCols.push({
            title: softTitleCase(child.name),
            items: grandchildren.map((g) => ({
              label: softTitleCase(g.name),
              href: childToHref(g),
            })),
          });
        } else {
          leafItems.push({
            label: softTitleCase(child.name),
            href: childToHref(child),
          });
        }
      }

      const cols: PmMegaColumn[] = [
        ...(leafItems.length > 0
          ? [{ title: 'Categories', items: leafItems }]
          : []),
        ...branchCols,
      ];

      // Carry over the editorial promo card from code-config — BC doesn't
      // have a native promo-card field. The team can update column items
      // by adding/renaming sub-categories in BC; promos stay in code for
      // now (phase 2 moves these to category metafields).
      const existing = PM_MEGA_MENU[slug];

      if (cards.length > 0 || cols.length > 0) {
        menu[slug] = {
          cols,
          cards: cards.length > 0 ? cards : undefined,
          brands: brands.length > 0 ? brands : undefined,
          promo: existing?.promo,
        };
      } else if (existing) {
        // BC returned children but they all turned into empty layouts —
        // pure paranoia branch, but keep the fallback so the menu never
        // collapses to nothing.
        menu[slug] = existing;
      }
    }

    return menu;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[pm-mega-menu-fetcher] failed, falling back to static config:', err);
    return PM_MEGA_MENU;
  }
}
