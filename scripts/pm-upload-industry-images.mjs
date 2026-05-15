#!/usr/bin/env node
/**
 * pm-upload-industry-images.mjs
 * -----------------------------
 * Uploads the 6 "Industries we serve" poster images to BC's CDN by
 * attaching them to a hidden "PM-INDUSTRIES" product's image gallery
 * (same hosting pattern PM-LOGOS uses for brand logos). Once uploaded,
 * each image's cdn11.bigcommerce.com URL is stable forever — admin can
 * paste it into the "Industries we serve" fence in BC anytime.
 *
 * Idempotent:
 *   - If PM-INDUSTRIES doesn't exist, create it (hidden product).
 *   - If an image with the matching `description` field already exists
 *     in the gallery, skip (don't re-upload duplicates on re-runs).
 *
 * After running, scripts/pm-upload-industry-images.log.json holds the
 * final {label → url_zoom} map. pm-bootstrap-who-we-serve.mjs reads
 * that map to seed the BC fence with the right CDN URLs.
 *
 * Run:
 *   node scripts/pm-upload-industry-images.mjs
 */

import fs from 'node:fs/promises';
import path from 'node:path';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const STORE_HASH = '1dedrz66md';
const ACCESS_TOKEN = 'bhjmal6xz743bqbhtdck1qnme9tm6m4';
const BC_BASE = `https://api.bigcommerce.com/stores/${STORE_HASH}/v3`;
const HEADERS_JSON = {
  'X-Auth-Token': ACCESS_TOKEN,
  Accept: 'application/json',
  'Content-Type': 'application/json',
};
const HEADERS_MULTIPART = {
  'X-Auth-Token': ACCESS_TOKEN,
  Accept: 'application/json',
};

// Local Downloads folder where the admin saved the assets.
const DOWNLOADS = 'C:/Users/anuj/Downloads';

// Source file name → admin-facing label. The label maps 1:1 with the
// industries section labels and becomes the BC image `description` so
// we can de-dupe on rerun.
//
// Each entry can also carry `replace: true` to force re-upload even
// when an image with the same label already exists in BC. Used when
// the admin sends a refreshed version of the same image.
const SOURCES = [
  { file: 'system-integrators.jpg', label: 'System Integrators' },
  { file: 'education.png', label: 'Education' },
  { file: 'smb.png', label: 'SMB' },
  { file: 'public-sector.jpg', label: 'Public Sector' },
  { file: 'healthcare.jpg', label: 'Healthcare' },
  { file: 'enterprise.jpg', label: 'Enterprise' },
];

const HIDDEN_PRODUCT_SKU = 'PM-INDUSTRIES';
const HIDDEN_PRODUCT_NAME = 'PM Industries Imagery';

async function bcJson(method, path, body) {
  const res = await fetch(`${BC_BASE}${path}`, {
    method,
    headers: HEADERS_JSON,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`BC ${res.status} ${method} ${path}: ${text}`);
  return text ? JSON.parse(text) : null;
}

async function bcDelete(path) {
  const res = await fetch(`${BC_BASE}${path}`, {
    method: 'DELETE',
    headers: HEADERS_JSON,
  });
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`BC ${res.status} DELETE ${path}: ${text}`);
  }
}

async function findOrCreateHiddenProduct() {
  // Look for an existing hidden product with our SKU
  const list = await bcJson(
    'GET',
    `/catalog/products?sku=${encodeURIComponent(HIDDEN_PRODUCT_SKU)}&include_fields=name,sku,is_visible`,
  );
  if (list.data && list.data.length > 0) {
    const existing = list.data[0];
    console.log(`  • found existing hidden product id=${existing.id} sku=${existing.sku}`);
    return existing.id;
  }

  // Create one. BC requires a price + weight + product type even for
  // image-hosting products — set them but mark is_visible=false so
  // shoppers never see it.
  console.log(`  • creating hidden product "${HIDDEN_PRODUCT_NAME}"…`);
  const created = await bcJson('POST', '/catalog/products', {
    name: HIDDEN_PRODUCT_NAME,
    type: 'physical',
    sku: HIDDEN_PRODUCT_SKU,
    description:
      '(Internal) Hosts the "Industries we serve" homepage images. Hidden ' +
      'from storefront. Each gallery entry maps to one industry label in ' +
      'scripts/pm-upload-industry-images.mjs.',
    weight: 0,
    price: 0,
    categories: [],
    is_visible: false,
    is_featured: false,
    availability: 'disabled',
  });
  return created.data.id;
}

async function existingImagesByDescription(productId) {
  // BC paginates at 50; we have 6 entries so one page is enough.
  const j = await bcJson(
    'GET',
    `/catalog/products/${productId}/images?limit=50`,
  );
  const map = new Map();
  for (const img of j.data ?? []) {
    if (img.description) map.set(img.description, img);
  }
  return map;
}

async function uploadOne(productId, label, filePath) {
  const buf = await fs.readFile(filePath);
  const filename = path.basename(filePath);
  const mime = filename.toLowerCase().endsWith('.png')
    ? 'image/png'
    : filename.toLowerCase().endsWith('.webp')
      ? 'image/webp'
      : filename.toLowerCase().endsWith('.jpg') ||
          filename.toLowerCase().endsWith('.jpeg')
        ? 'image/jpeg'
        : 'application/octet-stream';

  const form = new FormData();
  form.append('image_file', new Blob([buf], { type: mime }), filename);
  // BC accepts description on multipart-create which we use as a stable
  // de-dupe key on rerun.
  form.append('description', label);
  form.append('is_thumbnail', 'false');

  const res = await fetch(
    `${BC_BASE}/catalog/products/${productId}/images`,
    {
      method: 'POST',
      headers: HEADERS_MULTIPART,
      body: form,
    },
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`BC ${res.status} upload ${filename}: ${text}`);
  return JSON.parse(text).data;
}

async function main() {
  console.log('→ Uploading "Industries we serve" imagery to BC CDN…');
  const productId = await findOrCreateHiddenProduct();

  // De-dupe map by description label
  const existing = await existingImagesByDescription(productId);

  const result = {};
  for (const src of SOURCES) {
    const local = path.join(DOWNLOADS, src.file);
    try {
      await fs.access(local);
    } catch {
      console.log(`  ! ${src.label.padEnd(20)} skipped — ${local} missing`);
      continue;
    }
    const prev = existing.get(src.label);
    if (prev && !src.replace) {
      console.log(`  ✓ ${src.label.padEnd(20)} already in BC (id=${prev.id})`);
      result[src.label] = prev.url_zoom || prev.url_standard;
      continue;
    }
    if (prev && src.replace) {
      // Replace mode: delete the prior image so re-upload doesn't
      // create a duplicate gallery entry under the same description.
      console.log(`  - ${src.label.padEnd(20)} deleting prior id=${prev.id}…`);
      await bcDelete(`/catalog/products/${productId}/images/${prev.id}`);
    }
    console.log(`  ↑ ${src.label.padEnd(20)} uploading ${src.file}…`);
    const img = await uploadOne(productId, src.label, local);
    result[src.label] = img.url_zoom || img.url_standard;
    console.log(`     → ${result[src.label]}`);
  }

  await fs.writeFile(
    'scripts/pm-upload-industry-images.log.json',
    JSON.stringify({ productId, images: result }, null, 2),
  );
  console.log(`\n✓ done. ${Object.keys(result).length} images on BC CDN.`);
  console.log('  Map written to scripts/pm-upload-industry-images.log.json');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
