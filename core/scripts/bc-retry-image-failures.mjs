#!/usr/bin/env node
/**
 * bc-retry-image-failures.mjs
 * ===========================
 * Re-attempts the products that failed during the original CSV upload due to
 * an invalid `image_url` field. Reads `bc-upload-log.json`, finds the rows
 * with image-URL-shaped 422 errors, looks them up in the source CSV, and
 * re-uploads them WITHOUT the image (everything else — name, SKU, price,
 * description, category links — stays the same). The product card just won't
 * have a photo until the admin uploads one.
 *
 * Idempotent — already-existing SKUs are skipped just like the main script.
 * Appends results back into `bc-upload-log.json` (separate `retry_success`
 * and `retry_failed` arrays so the original failure log isn't lost).
 *
 * Usage:
 *   node scripts/bc-retry-image-failures.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = resolve(__dirname, '../.env.local');
const CSV_PATH = resolve('C:/Users/anuj/Downloads/products-2026-05-11.csv');
const LOG_PATH = resolve(__dirname, '../bc-upload-log.json');

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
const STORE_HASH = process.env.BIGCOMMERCE_STORE_HASH || env.BIGCOMMERCE_STORE_HASH;
const ACCESS_TOKEN = process.env.BIGCOMMERCE_ACCESS_TOKEN || env.BIGCOMMERCE_ACCESS_TOKEN;
const BASE = `https://api.bigcommerce.com/stores/${STORE_HASH}/v3`;

const HEADERS = {
  'X-Auth-Token': ACCESS_TOKEN,
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

// ── HTTP helpers (rate-limited) ─────────────────────────────────────────────

let requestCount = 0;
let windowStart = Date.now();
async function throttle() {
  requestCount++;
  if (requestCount >= 140) {
    const elapsed = Date.now() - windowStart;
    if (elapsed < 30_000) await new Promise((r) => setTimeout(r, 30_000 - elapsed + 500));
    requestCount = 0;
    windowStart = Date.now();
  }
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
    throw err;
  }
  return JSON.parse(text);
}

async function bcGetAll(path) {
  let page = 1;
  const all = [];
  while (true) {
    await throttle();
    const sep = path.includes('?') ? '&' : '?';
    const res = await fetch(`${BASE}${path}${sep}page=${page}&limit=250`, { headers: HEADERS });
    if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
    const { data, meta } = await res.json();
    all.push(...data);
    if (page >= meta.pagination.total_pages) break;
    page++;
  }
  return all;
}

// ── CSV Parser (matches main upload script) ────────────────────────────────

function parseCSV(text) {
  const rows = [];
  let i = 0;
  const len = text.length;
  function parseField() {
    if (i >= len || text[i] === '\n' || text[i] === '\r') return '';
    if (text[i] === '"') {
      i++;
      let val = '';
      while (i < len) {
        if (text[i] === '"') {
          if (text[i + 1] === '"') { val += '"'; i += 2; }
          else { i++; return val; }
        } else { val += text[i++]; }
      }
      return val;
    }
    let val = '';
    while (i < len && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') {
      val += text[i++];
    }
    return val;
  }
  function parseRow() {
    const row = [];
    while (true) {
      row.push(parseField());
      if (i >= len || text[i] === '\n' || text[i] === '\r') break;
      if (text[i] === ',') i++;
    }
    while (i < len && (text[i] === '\n' || text[i] === '\r')) i++;
    return row;
  }
  while (i < len) rows.push(parseRow());
  if (rows.length === 0) return [];
  const headers = rows[0];
  return rows.slice(1).filter((r) => r.some((v) => v !== '')).map((r) => {
    const obj = {};
    headers.forEach((h, idx) => (obj[h] = r[idx] ?? ''));
    return obj;
  });
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  Retry image-URL failures (image stripped)   ║');
  console.log('╚══════════════════════════════════════════════╝');

  const log = JSON.parse(readFileSync(LOG_PATH, 'utf8'));
  log.retry_success = log.retry_success || [];
  log.retry_failed = log.retry_failed || [];

  // Pick only the rows whose original error mentioned the image_url field.
  const imageFailures = (log.failed || []).filter((f) =>
    /'image_url'\s+is\s+invalid/i.test(f.error || ''),
  );
  console.log(`Image-URL failures to retry: ${imageFailures.length}`);
  if (imageFailures.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  console.log('\n📄 Loading CSV…');
  const csvText = readFileSync(CSV_PATH, 'utf8');
  const rows = parseCSV(csvText);
  console.log(`   ${rows.length} rows`);

  // Index by row number (1-based in the log; rows[0] is the header excluded
  // by parseCSV, so log.row N corresponds to rows[N-2] — same as the main
  // script: rows[i] = product on CSV line i+2).
  const rowByNumber = new Map();
  rows.forEach((r, idx) => rowByNumber.set(idx + 2, r));

  console.log('\n🔍 Fetching existing SKUs for dedup…');
  const existingProducts = await bcGetAll('/catalog/products?include_fields=sku');
  const existingSkus = new Set(existingProducts.map((p) => p.sku));
  console.log(`   ${existingSkus.size} existing products in BC.`);

  // Need brand + category maps too. Cheaper: just fetch brands and categories
  // and look up by name. (Both small lists.)
  console.log('\n🔍 Fetching brand + category maps…');
  const [brands, cats] = await Promise.all([
    bcGetAll('/catalog/brands?include_fields=name'),
    bcGetAll('/catalog/categories?include_fields=name,parent_id'),
  ]);
  const brandIdByName = new Map(brands.map((b) => [b.name.toUpperCase(), b.id]));
  const catIdByName = new Map(cats.map((c) => [c.name.toUpperCase(), c.id]));
  console.log(`   ${brandIdByName.size} brands · ${catIdByName.size} categories.`);

  console.log('\n🚀 Retrying without image_url…');
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  for (const f of imageFailures) {
    const row = rowByNumber.get(f.row);
    if (!row) {
      log.retry_failed.push({ ...f, retry_error: 'row not found in CSV' });
      failed++;
      continue;
    }

    const sku = row.Code || '';
    const name = row.Name || '';
    if (!sku || !name) {
      log.retry_failed.push({ ...f, retry_error: 'missing SKU or name' });
      failed++;
      continue;
    }

    if (existingSkus.has(sku)) {
      log.retry_success.push({ row: f.row, sku, status: 'already existed' });
      skipped++;
      continue;
    }

    // Build body matching the main script's shape, minus images.
    const brandId = brandIdByName.get((row.Brand || '').toUpperCase());
    const categoryName = (row.Category || row['Product Type'] || '').toUpperCase();
    const categoryId = catIdByName.get(categoryName);
    const price = parseFloat(row.Price || row['MSRP'] || '0') || 0;
    const weight = parseFloat(row.Weight || '0') || 1;

    const body = {
      name: name.slice(0, 250),
      type: 'physical',
      sku: sku.slice(0, 250),
      weight,
      price,
      categories: categoryId ? [categoryId] : [],
      brand_id: brandId,
      inventory_level: parseInt(row['Stock Level'] || '0', 10) || 0,
      is_visible: true,
      description: row.Description || '',
      // Intentionally omitted: images (this was the failing field).
    };

    try {
      const { data } = await bcPost('/catalog/products', body);
      log.retry_success.push({ row: f.row, sku, id: data.id, name: name.slice(0, 60) });
      succeeded++;
      process.stdout.write(`  ✅ ${sku.padEnd(20)} → id=${data.id}\n`);
    } catch (e) {
      log.retry_failed.push({ row: f.row, sku, retry_error: e.message.slice(0, 200) });
      failed++;
      process.stdout.write(`  ❌ ${sku.padEnd(20)} → ${e.message.slice(0, 100)}\n`);
    }

    // Persist progress every 5 successes so a crash mid-run doesn't lose data.
    if ((succeeded + failed) % 5 === 0) {
      writeFileSync(LOG_PATH, JSON.stringify(log, null, 2));
    }
  }

  writeFileSync(LOG_PATH, JSON.stringify(log, null, 2));
  console.log('\n══════════════════════════════════════════════════');
  console.log(`  Retry succeeded: ${succeeded}`);
  console.log(`  Already existed: ${skipped}`);
  console.log(`  Retry failed:    ${failed}`);
  console.log(`  Total processed: ${imageFailures.length}`);
  console.log('══════════════════════════════════════════════════');
}

main().catch((err) => {
  console.error('\n❌ Retry script crashed:', err.message);
  process.exit(1);
});
