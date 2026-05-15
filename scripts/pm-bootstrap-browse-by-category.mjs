#!/usr/bin/env node
/**
 * pm-bootstrap-browse-by-category.mjs
 * -----------------------------------
 * One-time seed for the new admin-managed "Browse by Category" section on
 * the homepage. Creates a child category under "PM Home Page Banners"
 * named "Home Page Browse by Category" and drops in a `<!--pm-cards ... -->`
 * fence block that mirrors what the hardcoded PmCategoryStrip used to
 * render — but with the CDW-style clean look (large image/emoji, no
 * borders) as the starting point.
 *
 * Idempotent: re-running it finds the existing child (by name) and
 * overwrites its description with the fresh fence block.
 *
 * After this script:
 *   Admin can edit BC → Products → Categories → "PM Page Banners" →
 *   "PM Home Page Banners" → "Home Page Browse by Category" → Description
 *   to add/remove cards, swap to a 3x3 layout, switch from icons to
 *   emojis/images, etc. — no code change needed.
 */

import fs from 'node:fs/promises';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const STORE_HASH = '1dedrz66md';
const ACCESS_TOKEN = 'bhjmal6xz743bqbhtdck1qnme9tm6m4';
const BC_BASE = `https://api.bigcommerce.com/stores/${STORE_HASH}/v3`;
const HEADERS = {
  'X-Auth-Token': ACCESS_TOKEN,
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

const ARGV = new Set(process.argv.slice(2));
const DRY_RUN = ARGV.has('--dry-run');

// "PM Home Page Banners" — the slot category that pm-page-banner-fetcher
// scans. Confirmed empirically from the BC tree query.
const HOME_SLOT_CATEGORY_ID = 304;

// Name to give the new child category. The fetcher walks ALL children
// under the slot in BC's sort order; the name is admin-facing only.
const CHILD_NAME = 'Home Page Browse by Category';

// Initial seed uses Lucide icons because BC's category-description API
// rejects 4-byte UTF-8 (emoji) chars over the wire. Admins can still
// swap any card_N_icon for card_N_emoji (or card_N_image) directly in
// the BC admin UI — the parser + renderer support all three priorities
// (emoji > image > icon).
//
// Visual: PMI brand-tinted tile background (warm tan-pale) with the
// brand navy stroke icon on top. Centered card content, generous
// padding, no shadows — reads like CDW's "Explore popular products"
// but with a per-card descriptor line so each card carries weight.
const FENCE_BLOCK = `<!--pm-cards
eyebrow: Catalog
title: Browse by category
subtitle: Pick a category to dive into 20,000+ enterprise-grade SKUs.
columns: 5
columns_md: 3
columns_sm: 2
gap: 18px
padding_y: 88px
align: center

bg: #fafaf7
card_bg: white
card_border: 1px solid #ece7d8
card_radius: 16px
card_padding: 32px
card_hover_accent: #2a4d72
image_size: 64
icon_bg: #f7f1e3
icon_color: #2a4d72
show_hover_arrow: false

card_1_title: Components
card_1_subtitle: CPUs, RAM, GPUs, drives
card_1_icon: Cpu
card_1_href: /dev/preview/category/components/

card_2_title: Networking
card_2_subtitle: Switches, routers, optics
card_2_icon: Network
card_2_href: /dev/preview/category/networking/

card_3_title: Servers
card_3_subtitle: Rack, tower, blade systems
card_3_icon: Server
card_3_href: /dev/preview/category/servers/

card_4_title: Software
card_4_subtitle: Licenses & subscriptions
card_4_icon: ShieldCheck
card_4_href: /dev/preview/category/software/

card_5_title: Bundles & kits
card_5_subtitle: Pre-configured solutions
card_5_icon: Boxes
card_5_href: /dev/preview/category/bundles/
-->`;

async function bcReq(method, path, body) {
  const res = await fetch(`${BC_BASE}${path}`, {
    method,
    headers: HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`BC ${res.status} ${method} ${path}: ${text}`);
  return text ? JSON.parse(text) : null;
}
const bcGet = (p) => bcReq('GET', p);
const bcPost = (p, b) => bcReq('POST', p, b);
const bcPut = (p, b) => bcReq('PUT', p, b);

async function findOrCreateChild() {
  // Look up existing children under the slot — match by name.
  const list = await bcGet(
    `/catalog/categories?parent_id=${HOME_SLOT_CATEGORY_ID}&limit=250`,
  );
  const existing = list.data.find(
    (c) => c.name.toLowerCase() === CHILD_NAME.toLowerCase(),
  );
  if (existing) {
    console.log(
      `  • child "${CHILD_NAME}" already exists (id=${existing.id}) — updating description`,
    );
    return existing.id;
  }
  if (DRY_RUN) {
    console.log(`  [dry-run] would create child "${CHILD_NAME}"`);
    return -1;
  }
  // Insert at sort_order=2 so it lands second on the homepage
  // (after Banner 1 which is sort 1). Admin can re-sort in BC UI.
  const created = await bcPost('/catalog/categories', {
    parent_id: HOME_SLOT_CATEGORY_ID,
    name: CHILD_NAME,
    sort_order: 2,
    // Must be visible — Storefront GraphQL returns null for hidden
    // categories, and pm-page-banner-fetcher reads through Storefront
    // GraphQL. The sibling banner categories (306, 307, ...) all use
    // is_visible: true for the same reason.
    is_visible: true,
    description: '',
  });
  const id = created.data?.id;
  console.log(`  • created child "${CHILD_NAME}" (id=${id})`);
  return id;
}

async function setDescription(id) {
  if (DRY_RUN) {
    console.log(`  [dry-run] would PUT description on category id=${id}`);
    console.log(FENCE_BLOCK);
    return;
  }
  // BC's `/catalog/categories/{id}` PUT errors with "Invalid field(s):
  // category_id" for reasons that aren't documented. The bulk endpoint
  // `/v3/catalog/trees/categories` works but requires category_id +
  // tree_id + parent_id + name in every entry, even when you only want
  // to update the description.
  await bcPut('/catalog/trees/categories', [
    {
      category_id: id,
      tree_id: 1,
      parent_id: HOME_SLOT_CATEGORY_ID,
      name: CHILD_NAME,
      description: FENCE_BLOCK,
    },
  ]);
  console.log(`  • description set on category id=${id}`);
}

async function main() {
  console.log(`→ Bootstrapping "Browse by Category" admin section…`);
  if (DRY_RUN) console.log('  (dry run)');
  const childId = await findOrCreateChild();
  if (childId === -1) return;
  await setDescription(childId);

  await fs.writeFile(
    'scripts/pm-bootstrap-browse-by-category.log.json',
    JSON.stringify(
      { childId, slotId: HOME_SLOT_CATEGORY_ID, fence: FENCE_BLOCK },
      null,
      2,
    ),
  );
  console.log('\n✓ done. Admin can now edit BC → Products → Categories →');
  console.log('  PM Page Banners → PM Home Page Banners → Home Page Browse');
  console.log('  by Category → Description to customize this section.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
