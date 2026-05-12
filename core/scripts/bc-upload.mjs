#!/usr/bin/env node
/**
 * bc-upload.mjs
 * =============
 * Uploads products from the Platinum Micro CSV export into the BigCommerce
 * sandbox store via the V3 Catalog REST API.
 *
 * Usage:
 *   node scripts/bc-upload.mjs [--test N]  # upload first N products only
 *   node scripts/bc-upload.mjs             # upload ALL products
 *
 * Env vars read from ../.env.local (or override via env):
 *   BIGCOMMERCE_STORE_HASH
 *   BIGCOMMERCE_ACCESS_TOKEN
 *
 * The script is idempotent — it skips products whose SKU already exists.
 */

import { createReadStream, writeFileSync, readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ── Config ──────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = resolve(__dirname, '../.env.local');
const CSV_PATH = resolve('C:/Users/anuj/Downloads/products-2026-05-11.csv');
const LOG_PATH = resolve(__dirname, '../bc-upload-log.json');

// Parse .env.local
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
const STORE_HASH = process.env.BIGCOMMERCE_STORE_HASH || env.BIGCOMMERCE_STORE_HASH;
const ACCESS_TOKEN = process.env.BIGCOMMERCE_ACCESS_TOKEN || env.BIGCOMMERCE_ACCESS_TOKEN;
const BASE = `https://api.bigcommerce.com/stores/${STORE_HASH}/v3`;

const TEST_LIMIT = (() => {
  const idx = process.argv.indexOf('--test');
  return idx !== -1 ? parseInt(process.argv[idx + 1], 10) : Infinity;
})();

// ── HTTP helpers ────────────────────────────────────────────────────────────

const HEADERS = {
  'X-Auth-Token': ACCESS_TOKEN,
  'Accept': 'application/json',
  'Content-Type': 'application/json',
};

let requestCount = 0;
let windowStart = Date.now();

/** Simple rate limiter: max 140 requests per 30s window. */
async function throttle() {
  requestCount++;
  if (requestCount >= 140) {
    const elapsed = Date.now() - windowStart;
    if (elapsed < 30_000) {
      const wait = 30_000 - elapsed + 500;
      console.log(`  ⏳ Rate-limit pause ${(wait / 1000).toFixed(1)}s…`);
      await sleep(wait);
    }
    requestCount = 0;
    windowStart = Date.now();
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function bcGet(path) {
  await throttle();
  const res = await fetch(`${BASE}${path}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

async function bcPost(path, body) {
  await throttle();
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(`POST ${path} → ${res.status}: ${text}`);
    err.status = res.status;
    err.body = text;
    throw err;
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

// ── CSV Parser (no external deps) ──────────────────────────────────────────

function parseCSV(text) {
  const rows = [];
  let i = 0;
  const len = text.length;

  function parseField() {
    if (i >= len || text[i] === '\n' || text[i] === '\r') return '';
    if (text[i] === '"') {
      i++; // skip opening quote
      let val = '';
      while (i < len) {
        if (text[i] === '"') {
          if (i + 1 < len && text[i + 1] === '"') {
            val += '"';
            i += 2;
          } else {
            i++; // skip closing quote
            break;
          }
        } else {
          val += text[i];
          i++;
        }
      }
      return val;
    } else {
      let val = '';
      while (i < len && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') {
        val += text[i];
        i++;
      }
      return val;
    }
  }

  function parseRow() {
    const fields = [];
    while (i < len && text[i] !== '\n' && text[i] !== '\r') {
      fields.push(parseField());
      if (i < len && text[i] === ',') i++; // skip comma
    }
    // skip line endings
    while (i < len && (text[i] === '\r' || text[i] === '\n')) i++;
    return fields;
  }

  const headers = parseRow();
  while (i < len) {
    const fields = parseRow();
    if (fields.length === 0 || (fields.length === 1 && fields[0] === '')) continue;
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = fields[j] || '';
    }
    rows.push(obj);
  }
  return rows;
}

// ── Data transformers ───────────────────────────────────────────────────────

/**
 * Parse the "Category Details" column.
 * Format: "Category Name: X, Category Path: A/B|Category Name: Y, Category Path: C/D"
 * Returns array of path strings like ["A/B", "C/D"]
 */
function parseCategoryPaths(raw) {
  if (!raw) return [];
  const paths = [];
  for (const seg of raw.split('|')) {
    const m = seg.match(/Category Path:\s*(.+)/);
    if (m) paths.push(m[1].trim());
  }
  return paths;
}

/**
 * Parse the "Images" column.
 * Format: "Product Image File: X, Product Image URL: http://...|..."
 * Returns array of URL strings.
 */
function parseImageUrls(raw) {
  if (!raw) return [];
  const urls = [];
  for (const seg of raw.split('|')) {
    const m = seg.match(/Product Image URL:\s*(https?:\/\/\S+)/);
    if (m) {
      // Prefer HTTPS
      urls.push(m[1].replace(/^http:/, 'https:'));
    }
  }
  return urls;
}

/**
 * Parse "Product Custom Fields" column.
 * Format: Brand=Logitech;Model=920-002555;"Keyboard Interface=USB";...
 * Returns array of { name, value } objects.
 */
function parseCustomFields(raw) {
  if (!raw) return [];
  const fields = [];
  // Split by semicolons but handle quoted segments
  let i = 0;
  const len = raw.length;
  while (i < len) {
    // Skip leading whitespace
    while (i < len && raw[i] === ' ') i++;
    if (i >= len) break;

    let entry = '';
    if (raw[i] === '"') {
      // Quoted entry — find matching close quote
      i++; // skip opening "
      while (i < len) {
        if (raw[i] === '"' && i + 1 < len && raw[i + 1] === '"') {
          entry += '"';
          i += 2;
        } else if (raw[i] === '"') {
          i++; // skip closing "
          break;
        } else {
          entry += raw[i];
          i++;
        }
      }
      // Skip trailing semicolon
      if (i < len && raw[i] === ';') i++;
    } else {
      // Unquoted — read until semicolon
      while (i < len && raw[i] !== ';') {
        entry += raw[i];
        i++;
      }
      if (i < len && raw[i] === ';') i++;
    }

    entry = entry.trim();
    if (!entry) continue;

    const eqIdx = entry.indexOf('=');
    if (eqIdx > 0) {
      const name = entry.slice(0, eqIdx).trim();
      const value = entry.slice(eqIdx + 1).trim();
      if (name && value) {
        // BC custom field limits: name ≤ 250 chars, value ≤ 250 chars
        fields.push({
          name: name.slice(0, 250),
          value: value.slice(0, 250),
        });
      }
    }
  }
  return fields;
}

function mapCondition(raw) {
  const lower = (raw || '').toLowerCase();
  if (lower === 'used') return 'Used';
  if (lower === 'refurbished') return 'Refurbished';
  return 'New';
}

function mapAvailability(raw) {
  const lower = (raw || '').toLowerCase();
  if (lower === 'preorder') return 'preorder';
  if (lower === 'disabled') return 'disabled';
  return 'available';
}

// ── Main pipeline ───────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  Platinum Micro → BigCommerce V3 Uploader   ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`Store: ${STORE_HASH}`);
  console.log(`CSV:   ${CSV_PATH}`);
  console.log(`Limit: ${TEST_LIMIT === Infinity ? 'ALL' : TEST_LIMIT}`);
  console.log();

  // ── 1. Parse CSV ──────────────────────────────────────────────────────
  console.log('📄 Parsing CSV…');
  const csvText = readFileSync(CSV_PATH, 'utf8');
  let rows = parseCSV(csvText);
  console.log(`   ${rows.length} products found.`);

  if (TEST_LIMIT < rows.length) {
    rows = rows.slice(0, TEST_LIMIT);
    console.log(`   ⚠ Test mode: processing first ${rows.length} only.`);
  }

  // ── 2. Brands ─────────────────────────────────────────────────────────
  console.log('\n🏷️  Syncing brands…');
  const existingBrands = await bcGetAll('/catalog/brands');
  const brandMap = new Map(); // name (lowercase) → id
  for (const b of existingBrands) brandMap.set(b.name.toLowerCase(), b.id);
  console.log(`   ${brandMap.size} existing brands in store.`);

  const uniqueBrands = [...new Set(rows.map(r => r.Brand).filter(Boolean))];
  let brandsCreated = 0;
  for (const name of uniqueBrands) {
    if (brandMap.has(name.toLowerCase())) continue;
    try {
      const { data } = await bcPost('/catalog/brands', { name });
      brandMap.set(name.toLowerCase(), data.id);
      brandsCreated++;
    } catch (e) {
      console.log(`   ⚠ Brand "${name}": ${e.message.slice(0, 120)}`);
    }
  }
  console.log(`   ✅ ${brandsCreated} new brands created. Total: ${brandMap.size}`);

  // ── 3. Categories ─────────────────────────────────────────────────────
  console.log('\n📂 Syncing categories…');
  const existingCats = await bcGetAll('/catalog/categories');
  // Build path → id map from existing categories
  // We need to reconstruct paths from the tree
  const catById = new Map();
  for (const c of existingCats) catById.set(c.id, c);

  function catPath(cat) {
    const parts = [cat.name];
    let current = cat;
    while (current.parent_id && catById.has(current.parent_id)) {
      current = catById.get(current.parent_id);
      parts.unshift(current.name);
    }
    return parts.join('/');
  }

  const catPathMap = new Map(); // "SERVERS/ACCESSORIES" → id
  for (const c of existingCats) {
    catPathMap.set(catPath(c).toUpperCase(), c.id);
  }
  console.log(`   ${catPathMap.size} existing categories in store.`);

  // Collect all category paths from the CSV
  const allCatPaths = new Set();
  for (const row of rows) {
    for (const p of parseCategoryPaths(row['Category Details'])) {
      // Ensure all ancestor paths are also included
      const parts = p.split('/');
      for (let depth = 1; depth <= parts.length; depth++) {
        allCatPaths.add(parts.slice(0, depth).join('/'));
      }
    }
  }

  // Sort by depth (create parents before children)
  const sortedPaths = [...allCatPaths].sort((a, b) => {
    const da = a.split('/').length;
    const db = b.split('/').length;
    return da - db || a.localeCompare(b);
  });

  let catsCreated = 0;
  for (const path of sortedPaths) {
    if (catPathMap.has(path.toUpperCase())) continue;
    const parts = path.split('/');
    const name = parts[parts.length - 1];
    const parentPath = parts.slice(0, -1).join('/');
    const parentId = parentPath ? (catPathMap.get(parentPath.toUpperCase()) || 0) : 0;

    try {
      const { data } = await bcPost('/catalog/categories', {
        name,
        parent_id: parentId,
        is_visible: true,
      });
      catPathMap.set(path.toUpperCase(), data.id);
      catsCreated++;
    } catch (e) {
      console.log(`   ⚠ Category "${path}": ${e.message.slice(0, 120)}`);
    }
  }
  console.log(`   ✅ ${catsCreated} new categories. Total: ${catPathMap.size}`);

  // ── 4. Fetch existing SKUs to skip duplicates ─────────────────────────
  console.log('\n🔍 Fetching existing products (for dedup)…');
  const existingProducts = await bcGetAll('/catalog/products?include_fields=sku');
  const existingSkus = new Set(existingProducts.map(p => p.sku));
  console.log(`   ${existingSkus.size} existing products.`);

  // ── 5. Upload products ────────────────────────────────────────────────
  console.log('\n🚀 Uploading products…');
  const log = { success: [], failed: [], skipped: [] };
  let done = 0;

  for (const row of rows) {
    done++;
    const sku = row.Code || '';
    const name = row.Name || '';

    if (!sku || !name) {
      log.skipped.push({ row: done, sku, reason: 'Missing SKU or name' });
      continue;
    }

    if (existingSkus.has(sku)) {
      log.skipped.push({ row: done, sku, reason: 'SKU already exists' });
      if (done % 100 === 0) console.log(`   ${done}/${rows.length} … (skipped: dup)`);
      continue;
    }

    // Build category IDs for this product
    const catPaths = parseCategoryPaths(row['Category Details']);
    const categoryIds = catPaths
      .map(p => catPathMap.get(p.toUpperCase()))
      .filter(Boolean);

    // Build image objects
    const imageUrls = parseImageUrls(row.Images);
    const images = imageUrls.map((url, idx) => ({
      image_url: url,
      is_thumbnail: idx === 0,
      sort_order: idx,
    }));

    // Build custom fields
    const customFields = parseCustomFields(row['Product Custom Fields']);

    // Product price — use Calculated Price (the actual selling price)
    const price = parseFloat(row['Calculated Price']) || 0;
    const costPrice = parseFloat(row['Cost Price']) || undefined;
    const retailPrice = parseFloat(row['Retail Price']) || undefined;
    const salePrice = parseFloat(row['Sale Price']) || undefined;
    const weight = parseFloat(row.Weight) || 0.1; // BC requires weight > 0
    const width = parseFloat(row.Width) || undefined;
    const height = parseFloat(row.Height) || undefined;
    const depth = parseFloat(row.Depth) || undefined;

    // Brand
    const brandId = row.Brand ? brandMap.get(row.Brand.toLowerCase()) : undefined;

    // Visibility & availability
    const isVisible = row['Product Visible'] === 'Y';
    const condition = mapCondition(row['Product Condition']);
    const availability = row['Allow Purchases'] === 'Y' ? 'available' : 'disabled';

    const body = {
      name,
      sku,
      type: 'physical',
      weight,
      price,
      categories: categoryIds,
      is_visible: isVisible,
      condition,
      availability,
      description: row.Description || '',
      page_title: row['Page Title'] || '',
      meta_keywords: row['META Keywords']
        ? row['META Keywords'].split(',').map(k => k.trim()).filter(Boolean)
        : [],
      meta_description: row['META Description'] || '',
      is_free_shipping: row['Free Shipping'] === 'Y',
      inventory_tracking: row['Product Inventoried'] === 'Y' ? 'product' : 'none',
    };

    // Optional numeric fields
    if (costPrice) body.cost_price = costPrice;
    if (retailPrice) body.retail_price = retailPrice;
    if (salePrice) body.sale_price = salePrice;
    if (width) body.width = width;
    if (height) body.height = height;
    if (depth) body.depth = depth;
    if (brandId) body.brand_id = brandId;

    // Custom URL
    if (row['Product URL']) {
      body.custom_url = { url: row['Product URL'], is_customized: true };
    }

    // Stock level
    if (row['Product Inventoried'] === 'Y') {
      const stock = parseInt(row['Stock Level'], 10);
      if (!isNaN(stock)) body.inventory_level = stock;
      const lowStock = parseInt(row['Low Stock Level'], 10);
      if (!isNaN(lowStock)) body.inventory_warning_level = lowStock;
    }

    // Images (embedded in product creation)
    if (images.length > 0) body.images = images;

    // Custom fields (embedded in product creation)
    if (customFields.length > 0) body.custom_fields = customFields;

    try {
      const { data } = await bcPost('/catalog/products', body);
      log.success.push({ row: done, sku, id: data.id, name: name.slice(0, 60) });
      existingSkus.add(sku);

      if (done % 25 === 0 || done === rows.length) {
        const pct = ((done / rows.length) * 100).toFixed(1);
        console.log(`   ✅ ${done}/${rows.length} (${pct}%) — last: ${name.slice(0, 50)}`);
      }
    } catch (e) {
      const errMsg = e.body || e.message;
      log.failed.push({ row: done, sku, name: name.slice(0, 60), error: errMsg.slice(0, 300) });
      if (done % 25 === 0) {
        console.log(`   ❌ ${done}/${rows.length} — ${sku}: ${errMsg.slice(0, 80)}`);
      }
      // Small delay on error (might be rate limit)
      if (e.status === 429) {
        console.log('   ⏳ Rate limited — waiting 30s…');
        await sleep(30_000);
        requestCount = 0;
        windowStart = Date.now();
      }
    }

    // Periodic save
    if (done % 100 === 0) {
      writeFileSync(LOG_PATH, JSON.stringify(log, null, 2));
    }
  }

  // ── 6. Final report ───────────────────────────────────────────────────
  writeFileSync(LOG_PATH, JSON.stringify(log, null, 2));
  console.log('\n═══════════════════════════════════════');
  console.log(`  ✅ Success:  ${log.success.length}`);
  console.log(`  ❌ Failed:   ${log.failed.length}`);
  console.log(`  ⏭️  Skipped:  ${log.skipped.length}`);
  console.log(`  📋 Log:      ${LOG_PATH}`);
  console.log('═══════════════════════════════════════\n');

  if (log.failed.length > 0) {
    console.log('Top failures:');
    for (const f of log.failed.slice(0, 10)) {
      console.log(`  Row ${f.row} [${f.sku}]: ${f.error.slice(0, 100)}`);
    }
  }
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
