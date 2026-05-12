#!/usr/bin/env node
/**
 * bc-bootstrap-page-banners.mjs
 * =============================
 * One-time setup script that creates the BC category structure used to
 * store admin-managed page banners for surfaces that aren't tied to a
 * specific category (homepage, search).
 *
 * After running this script the admin can:
 *   BC admin → Products → Categories → "PM Page Banners" → [slot]
 *     → edit Description → drop in a <!--pm-hero ... --> block
 *
 * Usage:
 *   node scripts/bc-bootstrap-page-banners.mjs
 *
 * Env vars read from ../.env.local:
 *   BIGCOMMERCE_STORE_HASH
 *   BIGCOMMERCE_ACCESS_TOKEN
 *
 * Idempotent — re-running does nothing destructive (skips categories
 * that already exist).
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = resolve(__dirname, '../.env.local');

// ── Config ──────────────────────────────────────────────────────────────────

const PARENT_NAME = 'PM Page Banners';
// Slot categories are FOLDERS — admins drop section subcategories under
// each one, and each subcategory holds exactly ONE <!--pm-hero ... -->
// or <!--pm-cards ... --> block in its description. Sections render in
// BC sort_order, so admins can reorder by dragging in BC admin.
//
// The slot category's own description is for instructions only.
// IMPORTANT: do NOT include a `<!--pm-hero ... -->` fence in the
// default description (not even as an example), because the parser
// would match it and render a broken banner.
// IMPORTANT: this description must NOT contain the literal substring
// "<!--pm-hero" or "<!--pm-cards" anywhere — the parser treats those as
// real fence blocks and a stray match would render a default empty
// banner. Keep instructions abstract.
const SLOT_FOLDER_DESCRIPTION =
  '(Internal folder.) Drop section subcategories underneath — each one ' +
  'holds one banner or card-grid config. Sort_order on each subcategory ' +
  'controls render order. See docs/02-hero-banners.md for syntax.';

const SLOTS = [
  { name: 'PM Home Page Banners', description: SLOT_FOLDER_DESCRIPTION },
  { name: 'PM Search Page Banners', description: SLOT_FOLDER_DESCRIPTION },
];

// ── .env loader ─────────────────────────────────────────────────────────────

function loadEnv() {
  const text = readFileSync(ENV_PATH, 'utf8');
  const env = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const env = loadEnv();
const STORE_HASH =
  process.env.BIGCOMMERCE_STORE_HASH || env.BIGCOMMERCE_STORE_HASH;
const ACCESS_TOKEN =
  process.env.BIGCOMMERCE_ACCESS_TOKEN || env.BIGCOMMERCE_ACCESS_TOKEN;

if (!STORE_HASH || !ACCESS_TOKEN) {
  console.error(
    '❌ Missing BIGCOMMERCE_STORE_HASH or BIGCOMMERCE_ACCESS_TOKEN in .env.local',
  );
  process.exit(1);
}

const BASE = `https://api.bigcommerce.com/stores/${STORE_HASH}/v3`;
const HEADERS = {
  'X-Auth-Token': ACCESS_TOKEN,
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

// ── HTTP helpers ────────────────────────────────────────────────────────────

async function bcGet(path) {
  const res = await fetch(`${BASE}${path}`, { headers: HEADERS });
  if (!res.ok) {
    throw new Error(`GET ${path} → ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function bcPost(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`POST ${path} → ${res.status}: ${text}`);
  }
  return JSON.parse(text);
}

async function bcGetAll(path) {
  let page = 1;
  const all = [];
  while (true) {
    const sep = path.includes('?') ? '&' : '?';
    const { data, meta } = await bcGet(`${path}${sep}page=${page}&limit=250`);
    all.push(...data);
    if (page >= meta.pagination.total_pages) break;
    page++;
  }
  return all;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  PM Page Banners — BC bootstrap              ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`Store: ${STORE_HASH}`);
  console.log(`Parent: "${PARENT_NAME}"`);
  console.log(`Slots:  ${SLOTS.map((s) => s.name).join(', ')}\n`);

  // Step 1 — find or create the parent category at the top of the tree.
  console.log('🔍 Looking up existing categories…');
  const all = await bcGetAll('/catalog/categories');
  const lower = (s) => (s ?? '').toLowerCase();

  let parent = all.find(
    (c) => c.parent_id === 0 && lower(c.name) === lower(PARENT_NAME),
  );

  if (parent) {
    console.log(`   ✅ Parent "${PARENT_NAME}" exists (id=${parent.id}).`);
  } else {
    console.log(`   ➕ Creating parent "${PARENT_NAME}"…`);
    const { data } = await bcPost('/catalog/categories', {
      name: PARENT_NAME,
      parent_id: 0,
      // Visible in admin but hidden from storefront nav by not getting linked
      // anywhere in PM_CATEGORIES / mega menu. (BC has no "hidden from
      // storefront only" flag — visibility=false hides it from GraphQL too,
      // which would defeat the purpose; we need GraphQL to read the
      // description.)
      is_visible: true,
      description:
        '(Internal) Holds admin-managed hero banner configs for non-' +
        'category surfaces — homepage, search. Each child category is a ' +
        '"slot"; its description carries the <!--pm-hero ... --> block ' +
        'rendered on that page. See lib/pm-hero-banner.ts for the schema.',
    });
    parent = data;
    console.log(`   ✅ Created (id=${parent.id}).`);
  }

  // Step 2 — find or create each slot child.
  console.log('\n📂 Syncing slot subcategories…');
  for (const slot of SLOTS) {
    const existing = all.find(
      (c) => c.parent_id === parent.id && lower(c.name) === lower(slot.name),
    );
    if (existing) {
      console.log(`   ✅ "${slot.name}" exists (id=${existing.id}).`);
      continue;
    }
    console.log(`   ➕ Creating "${slot.name}"…`);
    const { data } = await bcPost('/catalog/categories', {
      name: slot.name,
      parent_id: parent.id,
      is_visible: true,
      description: slot.description,
    });
    console.log(`   ✅ Created (id=${data.id}).`);
  }

  console.log('\n✨ Done. To configure a banner:');
  console.log('   1. BC admin → Products → Categories → "PM Page Banners"');
  console.log('   2. Expand "PM Home Page Banners" (or PM Search Page Banners)');
  console.log('   3. Click "Add Category" → name it "Home Page Banner 1" etc.');
  console.log('   4. Put ONE <!--pm-hero ... --> or <!--pm-cards ... --> block');
  console.log('      in that subcategory\'s Description field.');
  console.log('   5. Set sort_order to control render order.');
  console.log('   6. Save. The change is live within ~2 min (cache TTL).\n');
}

main().catch((err) => {
  console.error('\n❌ Bootstrap failed:', err.message);
  process.exit(1);
});
