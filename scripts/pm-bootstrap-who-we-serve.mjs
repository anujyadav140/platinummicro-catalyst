#!/usr/bin/env node
/**
 * pm-bootstrap-who-we-serve.mjs
 * -----------------------------
 * Seeds the "Industries we serve" / "Who we serve" homepage section
 * with the poster-card visual — full-bleed image with a top-left
 * ribbon label and a maroon border accent.
 *
 * Targets the existing BC category "Home Page Banner 3" (id=308) which
 * is where this section already lives. Re-running just overwrites its
 * description with the fresh fence block.
 *
 * Card images are pulled from Unsplash for the initial seed — admins
 * can swap in their own BC-hosted media URLs by editing the
 * card_N_image keys in the BC admin UI.
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

// "Home Page Banner 3" — confirmed via BC tree query as the slot that
// holds the current "Industries we serve" fence block.
const TARGET_CATEGORY_ID = 308;
const SLOT_PARENT_ID = 304;
const TARGET_NAME = 'Home Page Banner 3';

// Stable Unsplash photo IDs (cropped for 600x300 landscape). Admin can
// swap to BC-hosted assets at any time by editing card_N_image keys.
const FENCE_BLOCK = `<!--pm-cards
eyebrow: Who we serve
title: Industries we serve
subtitle: Hardware, software, and services tailored to the verticals we know best.
columns: 3
columns_md: 2
columns_sm: 1
gap: 24px
padding_y: 88px
align: left
bg: #ffffff

card_style: poster
card_aspect: 2 / 1
card_border: 3px solid #5e1a1a
card_radius: 0
ribbon_bg: #8a2929
ribbon_text: #ffffff

card_1_title: System Integrators
card_1_subtitle: Channel pricing, white-label logistics, BOM-driven rollouts
card_1_image: https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=70
card_1_href: /dev/preview/category/components

card_2_title: Education
card_2_subtitle: E-rate-aware procurement, classroom kitting, lifecycle takeback
card_2_image: https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=900&q=70
card_2_href: /dev/preview/category/computers

card_3_title: SMB
card_3_subtitle: Right-sized configurations and named account managers
card_3_image: https://images.unsplash.com/photo-1552581234-26160f608093?auto=format&fit=crop&w=900&q=70
card_3_href: /dev/preview/category/servers

card_4_title: Public Sector
card_4_subtitle: GSA-aligned procurement and cooperative contract vehicles
card_4_image: https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=900&q=70
card_4_href: /dev/preview/category/servers

card_5_title: Healthcare
card_5_subtitle: HIPAA-aware sourcing and asset tagging for clinical sites
card_5_image: https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=900&q=70
card_5_href: /dev/preview/category/storage

card_6_title: Enterprise
card_6_subtitle: Dedicated account managers and global drop-ship
card_6_image: https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&w=900&q=70
card_6_href: /dev/preview/category/servers
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
const bcPut = (p, b) => bcReq('PUT', p, b);

async function main() {
  console.log(`→ Seeding "Industries we serve" (category id=${TARGET_CATEGORY_ID})…`);
  if (DRY_RUN) {
    console.log('  (dry run — no writes will happen)');
    console.log('\n' + FENCE_BLOCK);
    return;
  }
  await bcPut('/catalog/trees/categories', [
    {
      category_id: TARGET_CATEGORY_ID,
      tree_id: 1,
      parent_id: SLOT_PARENT_ID,
      name: TARGET_NAME,
      description: FENCE_BLOCK,
    },
  ]);
  console.log(`  • description set on category id=${TARGET_CATEGORY_ID}`);

  await fs.writeFile(
    'scripts/pm-bootstrap-who-we-serve.log.json',
    JSON.stringify({ targetId: TARGET_CATEGORY_ID, fence: FENCE_BLOCK }, null, 2),
  );
  console.log('\n✓ done. Admin: BC → Products → Categories → PM Page');
  console.log('  Banners → PM Home Page Banners → Home Page Banner 3 →');
  console.log('  Description to customize.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
