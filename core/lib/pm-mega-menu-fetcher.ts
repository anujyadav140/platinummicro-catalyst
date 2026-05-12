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

import { unstable_cache } from 'next/cache';
import { client } from '~/client';
import { graphql } from '~/client/graphql';
import { revalidate } from '~/client/revalidate-target';
import {
  PM_MEGA_MENU,
  type PmMegaBrand,
  type PmMegaCard,
  type PmMegaColumn,
  type PmMegaMenu,
} from '~/lib/pm-mega-menu';

// First pass: pulls the category tree (3 levels). BC's `CategoryTreeItem`
// is a slim type — it doesn't expose `description` or `defaultImage`.
// Those come from the full `Category` type, fetched per child entityId in
// `fetchCategoryDetails` below.
//
// Brands for the mega-menu partner rail are now driven by a curated
// BC category ("Mega Menu Brands" under BRAND). The admin adds/removes/
// reorders subcategories there to control which brands appear in every
// mega-menu panel — no code change required.
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

// Lookup table of BC brand entity IDs by name. Used to resolve the
// alias list stored in each "Mega Menu Brands" child category's
// description (e.g. "Hewlett Packard Enterprise, HPE, HPE Networking
// Instant On") into the integer IDs that `searchProducts(filters:
// { brandEntityIds: ... })` accepts.
//
// BC caps `first` at 50 on the brands collection, so we paginate
// via `after` cursors. Up to a few hundred brands resolve in 2-4
// round-trips. Cached for 60s with the rest of the mega-menu fetch.
const PmBrandsPageQuery = graphql(`
  query PmBrandsPageQuery($after: String) {
    site {
      brands(first: 50, after: $after) {
        pageInfo {
          hasNextPage
          endCursor
        }
        edges {
          node {
            entityId
            name
          }
        }
      }
    }
  }
`);

/**
 * Walk BC's paginated brand collection and return a lowercase
 * name → entityId map. unstable_cache wraps this so the 2-4 round-trip
 * pagination only happens once per cache window across the whole app,
 * regardless of how many pages render the mega-menu.
 *
 * Returns a plain object (not Map) because unstable_cache serialises
 * its return values via JSON.
 */
const cachedAllBrandIdsByName = unstable_cache(
  async (): Promise<Record<string, number>> => {
    const out: Record<string, number> = {};
    let cursor: string | undefined;
    for (let page = 0; page < 10; page++) {
      const { data } = await client.fetch({
        document: PmBrandsPageQuery,
        variables: { after: cursor },
        fetchOptions: { next: { revalidate } },
      });
      const collection = data?.site?.brands;
      for (const edge of collection?.edges ?? []) {
        const node = edge?.node;
        if (node) out[node.name.toLowerCase()] = node.entityId;
      }
      if (!collection?.pageInfo?.hasNextPage) break;
      cursor = collection.pageInfo.endCursor ?? undefined;
      if (!cursor) break;
    }
    return out;
  },
  ['pm-mega-menu-brand-ids'],
  { revalidate: 120, tags: ['pm-mega-menu'] },
);

async function fetchAllBrandIdsByName(): Promise<Map<string, number>> {
  const obj = await cachedAllBrandIdsByName();
  return new Map(Object.entries(obj));
}

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
          fetchOptions: { next: { revalidate } },
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
 * Hide admin-only BC categories from the customer-facing mega menu.
 *
 * Convention: top-level BC categories whose name starts with `"PM "`
 * (capital P-M-space) are admin storage folders for banner / footer
 * config and MUST NOT appear as menu entries. Kept in sync with the
 * matching helper in `pm-categories-fetcher.ts`.
 *
 * Centralizing this rule in the fetcher means every downstream consumer
 * of `fetchPmMegaMenu()` (header dropdown, future facet rails, etc.)
 * automatically gets the same exclusion.
 */
function isAdminFolder(top: { name: string }): boolean {
  return top.name.startsWith('PM ');
}

/**
 * Compact display label for the brand-listing page heading. Maps verbose
 * brand names ("Hewlett Packard Enterprise") to short acronyms ("HPE")
 * the buyer recognises. Unmapped names pass through unchanged.
 *
 * Kept in sync with the BRAND_SHORT_LABEL map in pm-header.tsx — when a
 * brand name needs a friendly short form, add it in both places.
 */
const SHORT_HEADINGS: Record<string, string> = {
  'Hewlett Packard Enterprise': 'HPE',
  'HPE Networking Instant On': 'HPE Networking',
  'Western Digital': 'WD',
  'ASRock Rack': 'ASRock Rack',
};
function shortHeadingFor(name: string): string {
  return SHORT_HEADINGS[name] ?? name;
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
      fetchOptions: { next: { revalidate } },
    });

    const tree = data?.site?.categoryTree ?? [];
    const menu: PmMegaMenuMap = {};

    // ── Partner brands rail (BC-driven) ─────────────────────────────
    // Walk the category tree to find the "Mega Menu Brands" category
    // under the BRAND top-level. Its direct children are the curated
    // enterprise brands the admin chose to feature in the mega-menu.
    //
    // Each curated brand's `description` field stores the comma-
    // separated list of BC brand names that should be combined when
    // the chip is clicked (the "alias list"). Example:
    //   Hewlett Packard Enterprise → "Hewlett Packard Enterprise, HPE,
    //   HPE Networking Instant On"
    //
    // We resolve those names to BC brand entityIds and link the chip
    // to `/dev/preview/search?bids=39,40,41&heading=HPE`, which the
    // search page renders by combining products across all the listed
    // brands.
    //
    // To update brands or aliases: BC admin → Categories → BRAND →
    // Mega Menu Brands → edit a subcategory's name or description.
    const brands: PmMegaBrand[] = [];

    // Step 1: Find every "Mega Menu Brands" subtree node and its
    // children (the curated brands). We do this before fetching
    // details so we can batch the description fetches.
    const curatedBrandTreeItems: Array<{ entityId: number; name: string }> = [];
    for (const top of tree) {
      if (!isBrandTree(top)) continue;
      for (const child of top.children ?? []) {
        const childName = child.name.toLowerCase();
        if (childName !== 'mega menu brands' && childName !== 'mega-menu-brands') continue;
        for (const brand of child.children ?? []) {
          curatedBrandTreeItems.push({ entityId: brand.entityId, name: brand.name });
        }
        break;
      }
      break; // only one BRAND top-level
    }

    if (curatedBrandTreeItems.length > 0) {
      // Step 2: Fetch descriptions for each curated brand (the alias
      // list) AND the global brand catalog (for name → entityId
      // resolution). Both queries are issued in parallel.
      const [curatedDetailsMap, brandIdByName] = await Promise.all([
        fetchCategoryDetails(curatedBrandTreeItems.map((b) => b.entityId)),
        fetchAllBrandIdsByName(),
      ]);

      // Step 3: For each curated brand, parse aliases from the
      // description, resolve to BC brand IDs, build the href.
      for (const item of curatedBrandTreeItems) {
        const desc = curatedDetailsMap.get(item.entityId)?.description ?? '';
        // Strip the <!--pm-hero ... --> banner block before parsing
        // aliases so the banner config keys aren't mistaken for brand
        // alias names. Then strip remaining HTML tags before splitting.
        const cleanDesc = desc
          .replace(/<!--\s*pm-hero\b[\s\S]*?-->/i, ' ')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ');
        // Alias list = comma-separated brand names. Falls back to the
        // category name itself if the description is empty.
        const aliasNames = cleanDesc
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        const effectiveAliases = aliasNames.length > 0 ? aliasNames : [item.name];

        const brandIds = effectiveAliases
          .map((n) => brandIdByName.get(n.toLowerCase()))
          .filter((id): id is number => typeof id === 'number');

        const heading = shortHeadingFor(item.name);
        const href = brandIds.length > 0
          ? `/dev/preview/search?bids=${brandIds.join(',')}&heading=${encodeURIComponent(heading)}`
          : `/dev/preview/search?q=${encodeURIComponent(item.name)}`;

        brands.push({ name: item.name, href });
      }
    }

    // Collect every direct-child entityId across all (non-brand,
    // non-admin) top-levels so we can fetch the full Category data
    // (description + defaultImage) in a single Promise.all batch.
    // ~10-30 calls in practice; cached 60s.
    const childEntityIds: number[] = [];
    for (const top of tree) {
      if (isBrandTree(top)) continue;
      if (isAdminFolder(top)) continue;
      for (const child of top.children ?? []) {
        childEntityIds.push(child.entityId);
      }
    }
    const detailsMap = await fetchCategoryDetails(childEntityIds);

    for (const top of tree) {
      if (isBrandTree(top)) continue;
      if (isAdminFolder(top)) continue;
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
