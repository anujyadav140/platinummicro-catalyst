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

// BC-hosted CDN URLs — uploaded via pm-upload-industry-images.mjs to a
// hidden PM-INDUSTRIES product (id=6011). Admin can swap any of these
// to a different URL by editing the card_N_image lines in BC admin.
// Source: scripts/pm-upload-industry-images.log.json
const IMG = {
  systemIntegrators:
    'https://cdn11.bigcommerce.com/s-1dedrz66md/products/6011/images/25209/system-integrators__48007.1778867727.1280.1280.jpg?c=1',
  education:
    'https://cdn11.bigcommerce.com/s-1dedrz66md/products/6011/images/25204/education__05056.1778867322.1280.1280.png?c=1',
  smb:
    'https://cdn11.bigcommerce.com/s-1dedrz66md/products/6011/images/25205/smb__79692.1778867322.1280.1280.png?c=1',
  publicSector:
    'https://cdn11.bigcommerce.com/s-1dedrz66md/products/6011/images/25206/public-sector__76128.1778867323.1280.1280.jpg?c=1',
  healthcare:
    'https://cdn11.bigcommerce.com/s-1dedrz66md/products/6011/images/25207/healthcare__55732.1778867323.1280.1280.jpg?c=1',
  enterprise:
    'https://cdn11.bigcommerce.com/s-1dedrz66md/products/6011/images/25208/enterprise__86862.1778867323.1280.1280.jpg?c=1',
};

const FENCE_BLOCK = `<!--pm-cards
eyebrow: Who we serve
title: Industries we serve
subtitle: Hardware, software, and services tailored to the verticals we know best.
columns: 3
columns_md: 2
columns_sm: 1
gap: 28px
padding_y: 96px
align: left
bg: #ffffff

card_style: poster
card_aspect: 16 / 9
card_border: none
card_radius: 12px
ribbon_bg: #8a2929
ribbon_text: #ffffff

card_1_title: System Integrators
card_1_image: ${IMG.systemIntegrators}

card_2_title: Education
card_2_image: ${IMG.education}

card_3_title: SMB
card_3_image: ${IMG.smb}

card_4_title: Public Sector
card_4_image: ${IMG.publicSector}

card_5_title: Healthcare
card_5_image: ${IMG.healthcare}

card_6_title: Enterprise
card_6_image: ${IMG.enterprise}
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
