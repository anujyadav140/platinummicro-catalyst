#!/usr/bin/env node
/**
 * pm-bootstrap-hpe-amd-category.mjs
 * ---------------------------------
 * Creates (or refreshes) a curated BC category called
 * "HPE ProLiant Gen11 — AMD EPYC" and assigns every HPE ProLiant
 * DL{145,325,345,365,385} Gen11 product to it. The HPE hero banner
 * CTA links to this category page so users land on a clean,
 * AMD-only list — no Intel ProLiants, no AMD-brand CPUs, no
 * unrelated noise.
 *
 * Idempotent:
 *   - If the category exists, just refresh the product assignments.
 *   - If a product is already assigned, BC's add-to-category is a
 *     no-op (it just deduplicates).
 *
 * Run:
 *   node scripts/pm-bootstrap-hpe-amd-category.mjs
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

// We want this category to live UNDER an existing top-level category
// so the breadcrumbs read naturally. SERVERS (id=29) is the right
// parent — ProLiant rack servers belong there.
const PARENT_CATEGORY_ID = 29; // SERVERS
const NEW_CATEGORY_NAME = 'HPE ProLiant Gen11 — AMD EPYC';
const NEW_CATEGORY_DESCRIPTION =
  'HPE ProLiant Gen11 rack servers powered by AMD EPYC processors. ' +
  'DL145, DL325, DL345, DL365, and DL385 models — sourced direct, ' +
  'racked and burned in by our team, freighted from Southern California.';

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

async function findOrCreateCategory() {
  const list = await bcGet(
    `/catalog/categories?parent_id=${PARENT_CATEGORY_ID}&limit=250`,
  );
  const existing = list.data.find(
    (c) => c.name.toLowerCase() === NEW_CATEGORY_NAME.toLowerCase(),
  );
  if (existing) {
    console.log(`  • category "${NEW_CATEGORY_NAME}" exists (id=${existing.id})`);
    return existing.id;
  }
  console.log(`  • creating category "${NEW_CATEGORY_NAME}"…`);
  const created = await bcPost('/catalog/categories', {
    parent_id: PARENT_CATEGORY_ID,
    name: NEW_CATEGORY_NAME,
    is_visible: true,
    sort_order: 1,
    description: NEW_CATEGORY_DESCRIPTION,
  });
  return created.data.id;
}

async function findAmdProliantGen11Products() {
  // BC's catalog search returns 88 ProLiant-matching products; we
  // filter client-side to the DL models known to ship with AMD EPYC.
  // The regex tracks: DL145, DL325, DL345, DL365, DL385 + "Gen11".
  // Intel-based Gen11s (DL320, DL360, DL380) are intentionally
  // excluded because they ship with Xeon, not EPYC.
  let page = 1;
  const all = [];
  while (true) {
    const j = await bcGet(
      `/catalog/products?keyword=ProLiant&limit=100&page=${page}&include_fields=name,sku,categories`,
    );
    all.push(...j.data);
    if (!j.meta?.pagination || j.meta.pagination.current_page >= j.meta.pagination.total_pages) break;
    page += 1;
  }
  return all.filter(
    (p) => /ProLiant DL(145|325|345|365|385)\b/i.test(p.name) && /Gen11/i.test(p.name),
  );
}

async function assignToCategory(productId, currentCategories, categoryId) {
  const next = Array.from(new Set([...(currentCategories || []), categoryId]));
  if (next.length === currentCategories.length) return false; // already in
  await bcPut(`/catalog/products/${productId}`, { categories: next });
  return true;
}

async function main() {
  console.log('→ Setting up "HPE ProLiant Gen11 — AMD EPYC" curated category…');
  const categoryId = await findOrCreateCategory();

  const products = await findAmdProliantGen11Products();
  console.log(`\n→ Assigning ${products.length} products to the category…`);
  let added = 0;
  let skipped = 0;
  for (const p of products) {
    const wasAdded = await assignToCategory(p.id, p.categories || [], categoryId);
    if (wasAdded) {
      console.log(`  + ${p.sku.padEnd(15)} ${p.name.slice(0, 60)}`);
      added += 1;
    } else {
      skipped += 1;
    }
  }

  // Fetch back the slug so the CTA URL works.
  const cat = await bcGet(`/catalog/categories/${categoryId}`);
  const slug = cat.data.custom_url?.url ?? '';
  const leafSlug = slug.replace(/^\//, '').replace(/\/$/, '').split('/').pop();
  const cmsPath = `/dev/preview/category/${leafSlug}/`;

  console.log(`\n→ Added ${added}, skipped ${skipped} (already in category)`);
  console.log(`→ Storefront URL:  ${cmsPath}`);
  console.log(`→ Raw BC slug:     ${slug}`);

  await fs.writeFile(
    'scripts/pm-bootstrap-hpe-amd-category.log.json',
    JSON.stringify(
      { categoryId, slug, leafSlug, cmsPath, productCount: products.length },
      null,
      2,
    ),
  );
  console.log('\n✓ done. Wire the CTA href to ' + cmsPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
