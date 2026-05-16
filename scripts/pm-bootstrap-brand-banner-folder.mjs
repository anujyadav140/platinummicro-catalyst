#!/usr/bin/env node
/**
 * pm-bootstrap-brand-banner-folder.mjs
 * ------------------------------------
 * Creates the dedicated "PM Brand Banners" folder under "PM Page Banners",
 * mirroring the "PM Home Page Banners" pattern. Then creates one child
 * category per brand (initially just HPE, to keep BC admin clean) and
 * moves the HPE banner description into that new category.
 *
 * After this runs, admins find HPE's banner config at:
 *   BC admin → Products → Categories →
 *     PM Page Banners → PM Brand Banners → Hewlett Packard Enterprise
 *
 * The original BRAND > Mega Menu Brands > Hewlett Packard Enterprise
 * (id=291) gets its description CLEARED so there's only one source of
 * truth.
 *
 * The fetcher (`pm-brand-banner-fetcher.ts`) is extended in a separate
 * commit to look in PM Brand Banners first, falling back to the legacy
 * location.
 *
 * Re-runnable: looks up existing categories by name before creating, so
 * a second run won't duplicate.
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

const PM_PAGE_BANNERS_ID = 303;          // existing parent
const LEGACY_HPE_CATEGORY_ID = 291;       // BRAND > Mega Menu Brands > HPE
const BRAND_FOLDER_NAME = 'PM Brand Banners';
const HPE_BANNER_CATEGORY_NAME = 'Hewlett Packard Enterprise';

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

/** Find an existing category by name + parent_id, or return null. */
async function findCategoryByName(name, parentId) {
  const encoded = encodeURIComponent(name);
  const r = await bcGet(
    `/catalog/categories?name=${encoded}&parent_id=${parentId}&include_fields=name,parent_id`,
  );
  const match = (r?.data ?? []).find(
    (c) => c.name === name && c.parent_id === parentId,
  );
  return match ?? null;
}

async function createCategory(name, parentId) {
  // BC `/v3/catalog/categories` POST expects a single object body (NOT
  // an array — that's the batch endpoint, which has different shape
  // requirements). Tree defaults to 1.
  const r = await bcPost('/catalog/categories', {
    name,
    parent_id: parentId,
    tree_id: 1,
  });
  return r.data;
}

async function main() {
  console.log('→ Bootstrapping PM Brand Banners folder…');

  // 1. Read the current HPE banner description from the legacy location.
  const legacy = await bcGet(
    `/catalog/categories/${LEGACY_HPE_CATEGORY_ID}?include_fields=name,description`,
  );
  const legacyDescription = legacy?.data?.description ?? '';
  if (!legacyDescription) {
    console.warn(
      `  ! WARNING: legacy HPE category (id=${LEGACY_HPE_CATEGORY_ID}) has no description — nothing to migrate.`,
    );
  } else {
    console.log(
      `  • read description from legacy HPE category (${legacyDescription.length} chars)`,
    );
  }

  // 2. Find-or-create PM Brand Banners folder.
  let brandFolder = await findCategoryByName(BRAND_FOLDER_NAME, PM_PAGE_BANNERS_ID);
  if (!brandFolder) {
    brandFolder = await createCategory(BRAND_FOLDER_NAME, PM_PAGE_BANNERS_ID);
    console.log(`  • created folder "${BRAND_FOLDER_NAME}" (id=${brandFolder.id})`);
  } else {
    console.log(`  • folder "${BRAND_FOLDER_NAME}" already exists (id=${brandFolder.id})`);
  }

  // 3. Find-or-create the HPE category under PM Brand Banners.
  let hpeCat = await findCategoryByName(HPE_BANNER_CATEGORY_NAME, brandFolder.id);
  if (!hpeCat) {
    hpeCat = await createCategory(HPE_BANNER_CATEGORY_NAME, brandFolder.id);
    console.log(
      `  • created "${HPE_BANNER_CATEGORY_NAME}" (id=${hpeCat.id}) under "${BRAND_FOLDER_NAME}"`,
    );
  } else {
    console.log(
      `  • "${HPE_BANNER_CATEGORY_NAME}" already exists (id=${hpeCat.id})`,
    );
  }

  // 4. Write the description into the new HPE category.
  if (legacyDescription) {
    await bcPut('/catalog/trees/categories', [
      {
        category_id: hpeCat.id,
        tree_id: 1,
        parent_id: brandFolder.id,
        name: HPE_BANNER_CATEGORY_NAME,
        description: legacyDescription,
      },
    ]);
    console.log(`  • migrated description into new HPE category (id=${hpeCat.id})`);
  }

  // 5. Clear the description on the legacy HPE category so there's only
  //    one source of truth. Keep the category itself — it's used for
  //    brand navigation / mega-menu wiring.
  if (legacyDescription) {
    await bcPut('/catalog/trees/categories', [
      {
        category_id: LEGACY_HPE_CATEGORY_ID,
        tree_id: 1,
        parent_id: 290,
        name: 'Hewlett Packard Enterprise',
        description: '',
      },
    ]);
    console.log(`  • cleared description on legacy HPE category (id=${LEGACY_HPE_CATEGORY_ID})`);
  }

  await fs.writeFile(
    'scripts/pm-bootstrap-brand-banner-folder.log.json',
    JSON.stringify(
      {
        brandFolderId: brandFolder.id,
        hpeCategoryId: hpeCat.id,
        legacyHpeCategoryId: LEGACY_HPE_CATEGORY_ID,
        migratedDescriptionLen: legacyDescription.length,
      },
      null,
      2,
    ),
  );

  console.log('\n✓ done.');
  console.log(`  Admin path: BC → Products → Categories →`);
  console.log(`    PM Page Banners → ${BRAND_FOLDER_NAME} → ${HPE_BANNER_CATEGORY_NAME}`);
  console.log(`  Direct: /manage/products/categories/${hpeCat.id}/edit`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
