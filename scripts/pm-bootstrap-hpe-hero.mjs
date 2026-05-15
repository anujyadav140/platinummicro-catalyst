#!/usr/bin/env node
/**
 * pm-bootstrap-hpe-hero.mjs
 * -------------------------
 * Updates the "Home Page Banner 4 — Split (image left)" (BC category
 * id=310) so the split-mode hero promotes the **HPE ProLiant DL series**
 * instead of the Intel Xeon placeholder.
 *
 * PMI is an HPE official partner — the CTA links to the HPE brand
 * landing page filtered to ProLiant servers. Visual style (split mode,
 * dark image half, light content half, 16px border-radius, 24px
 * margin) is preserved exactly from the previous Xeon version; only
 * copy, image, and link change.
 *
 * Admin can swap the image to an official HPE asset by editing the
 * `image:` value in BC admin (Category → Description). The renderer
 * will pick up whatever URL is set — HPE's own CDN, BC media library,
 * Unsplash, anywhere.
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

const TARGET_CATEGORY_ID = 310;
const SLOT_PARENT_ID = 304;
const TARGET_NAME = 'Home Page Banner 4 — Split (image left)';

// Real HPE ProLiant DL Gen11 marketing asset — cyan-arrow composition
// with the DL series stack. Uploaded to the hidden PM-INDUSTRIES BC
// product (id=6011) via pm-upload-industry-images.mjs so the URL is
// stable forever. Admin can swap to a different asset by editing
// `image:` in BC admin → Banner 4 → Description.
const HPE_HERO_IMAGE =
  'https://cdn11.bigcommerce.com/s-1dedrz66md/products/6011/images/25203/hpe-proliant-dl-gen11__11323.1778866218.1280.1280.jpg?c=1';

// Copy borrows HPE's "HPE × AMD: Better Together" positioning and the
// ProLiant DL Gen11 messaging that ran at HPE's event — refactored so
// PMI's partner credentials land alongside the product story:
//   1. Eyebrow flags the AMD/HPE partnership
//   2. Headline names the product family and chip
//   3. Body leads with one HPE benchmark, then closes on what PMI
//      does that BC.com / hpe.com don't (rack + burn-in + ship from
//      our Southern California warehouse)
//   4. CTA goes to the HPE brand listing — admin can swap to a deep
//      link (e.g. a custom ProLiant category) anytime.
//
// Accent #00b388 is HPE's brand green — matches the partner-portal
// callouts so the button reads as authentically HPE-branded.
const FENCE_BLOCK = `<!--pm-hero
image: ${HPE_HERO_IMAGE}
image_fit: split
image_position: left
image_half_bg: #f5f5f0
image_half_size: cover
image_half_position: right center
content_half_bg: #f5f5f0
text: dark
accent: #00b388
eyebrow: HPE × AMD · Better together
headline: ProLiant DL Gen11. Built with AMD EPYC.
body: Up to 96 cores per socket, breakthrough AI performance, and silicon-rooted security in every rack. Sourced direct, racked and burned in by our team, freighted from Southern California — your authorized HPE source.
cta_label: Browse HPE ProLiant
cta_href: /dev/preview/category/hpe-proliant-gen11-amd-epyc/
height: 380px
padding_y: 0
content_padding: 56px 64px
margin_top: 48px
margin_bottom: 24px
border_radius: 16px
full_bleed: false
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
  console.log(`→ Updating HPE ProLiant hero (category id=${TARGET_CATEGORY_ID})…`);
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
    'scripts/pm-bootstrap-hpe-hero.log.json',
    JSON.stringify({ targetId: TARGET_CATEGORY_ID, fence: FENCE_BLOCK }, null, 2),
  );
  console.log('\n✓ done. Admin: BC → Products → Categories → PM Page');
  console.log('  Banners → PM Home Page Banners → Home Page Banner 4 →');
  console.log('  Description.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
