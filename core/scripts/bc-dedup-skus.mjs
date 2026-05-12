#!/usr/bin/env node
/**
 * bc-dedup-skus.mjs
 * =================
 * Scan the BC catalog for products that share a SKU, keep the OLDEST
 * (lowest entity ID — first one created), and delete the duplicates.
 *
 * Why oldest: the first upload was the canonical row. Later collisions
 * happened when the bulk-upload script raced or when admin re-imported
 * a row that BC then created as a NEW product instead of updating the
 * existing SKU.
 *
 * Safety:
 *   - First pass scans only (no writes) and prints the duplicate map
 *   - Pass `--execute` to actually delete. Without it the script is
 *     dry-run.
 *   - Each delete is logged with the kept ID + deleted IDs so we can
 *     trace what happened
 *   - Rate-limited at 140 req / 30s window (same as bc-upload.mjs)
 *
 * Usage:
 *   node scripts/bc-dedup-skus.mjs            # dry-run report
 *   node scripts/bc-dedup-skus.mjs --execute  # actually delete
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = resolve(__dirname, '../.env.local');
const LOG_PATH = resolve(__dirname, '../bc-dedup-log.json');

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
const STORE = process.env.BIGCOMMERCE_STORE_HASH || env.BIGCOMMERCE_STORE_HASH;
const TOKEN = process.env.BIGCOMMERCE_ACCESS_TOKEN || env.BIGCOMMERCE_ACCESS_TOKEN;
const BASE = `https://api.bigcommerce.com/stores/${STORE}/v3`;
const HEADERS = {
  'X-Auth-Token': TOKEN,
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

const EXECUTE = process.argv.includes('--execute');

// ── Rate limiting (140 requests per 30s window) ───────────────────────────
let reqCount = 0;
let windowStart = Date.now();
async function throttle() {
  reqCount++;
  if (reqCount >= 140) {
    const elapsed = Date.now() - windowStart;
    if (elapsed < 30_000) {
      const wait = 30_000 - elapsed + 500;
      process.stdout.write(`\n  ⏳ Rate-limit pause ${(wait / 1000).toFixed(1)}s…\n`);
      await new Promise((r) => setTimeout(r, wait));
    }
    reqCount = 0;
    windowStart = Date.now();
  }
}

async function bcGet(path) {
  await throttle();
  const res = await fetch(`${BASE}${path}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

async function bcDelete(path) {
  await throttle();
  const res = await fetch(`${BASE}${path}`, { method: 'DELETE', headers: HEADERS });
  if (!res.ok && res.status !== 404) {
    throw new Error(`DELETE ${path} → ${res.status}: ${await res.text()}`);
  }
  return res.status;
}

// Fetch every product (id, sku, name, date_created) across all pages.
async function fetchAllProducts() {
  let page = 1;
  const all = [];
  while (true) {
    const { data, meta } = await bcGet(
      `/catalog/products?include_fields=sku,name,date_created&limit=250&page=${page}`,
    );
    all.push(...data);
    process.stdout.write(
      `\r  Fetched page ${page}/${meta.pagination.total_pages} (${all.length} products so far)`,
    );
    if (page >= meta.pagination.total_pages) break;
    page++;
  }
  process.stdout.write('\n');
  return all;
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  BC SKU dedup                                ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`Store:   ${STORE}`);
  console.log(`Mode:    ${EXECUTE ? '🔴 EXECUTE (will delete)' : '🟢 DRY-RUN (no writes)'}`);
  console.log();

  console.log('📄 Fetching products…');
  const products = await fetchAllProducts();
  console.log(`   ${products.length} products total.\n`);

  console.log('🔍 Grouping by SKU…');
  const bySku = new Map();
  for (const p of products) {
    const sku = (p.sku || '').trim();
    if (!sku) continue;
    if (!bySku.has(sku)) bySku.set(sku, []);
    bySku.get(sku).push(p);
  }

  const duplicates = [...bySku.entries()]
    .filter(([, list]) => list.length > 1)
    .sort((a, b) => b[1].length - a[1].length);

  if (duplicates.length === 0) {
    console.log('   ✅ No duplicate SKUs found.');
    return;
  }

  const totalExtra = duplicates.reduce((s, [, list]) => s + (list.length - 1), 0);
  console.log(`   Found ${duplicates.length} duplicated SKUs.`);
  console.log(`   Total duplicate rows to delete: ${totalExtra}\n`);

  console.log('📋 Plan (sorted by duplicate count):');
  for (const [sku, list] of duplicates.slice(0, 25)) {
    // Sort by entityId ascending — keep the oldest (lowest id)
    list.sort((a, b) => a.id - b.id);
    const keep = list[0];
    const remove = list.slice(1);
    console.log(
      `   ${sku.padEnd(28)} keep id=${String(keep.id).padStart(5)} (${(keep.name || '').slice(0, 40)}…), delete [${remove.map((p) => p.id).join(', ')}]`,
    );
  }
  if (duplicates.length > 25) {
    console.log(`   … and ${duplicates.length - 25} more`);
  }
  console.log();

  if (!EXECUTE) {
    console.log('🟢 Dry-run complete. Re-run with `--execute` to perform the deletes.');
    return;
  }

  console.log(`🔴 EXECUTING — deleting ${totalExtra} duplicate products…\n`);
  const log = { kept: [], deleted: [], failed: [] };
  let done = 0;
  for (const [sku, list] of duplicates) {
    list.sort((a, b) => a.id - b.id);
    const keep = list[0];
    log.kept.push({ sku, id: keep.id, name: keep.name });
    for (const p of list.slice(1)) {
      try {
        const status = await bcDelete(`/catalog/products/${p.id}`);
        log.deleted.push({ sku, id: p.id, status, name: p.name });
        done++;
        process.stdout.write(
          `\r  Deleted ${done}/${totalExtra} (last: ${sku} id=${p.id})`,
        );
      } catch (e) {
        log.failed.push({ sku, id: p.id, error: e.message.slice(0, 200) });
        console.log(`\n  ❌ id=${p.id} (${sku}): ${e.message.slice(0, 120)}`);
      }
    }
  }
  process.stdout.write('\n');

  writeFileSync(LOG_PATH, JSON.stringify(log, null, 2));
  console.log('\n══════════════════════════════════════════════════');
  console.log(`  Kept:    ${log.kept.length}  (canonical row per SKU)`);
  console.log(`  Deleted: ${log.deleted.length}`);
  console.log(`  Failed:  ${log.failed.length}`);
  console.log(`  Log:     ${LOG_PATH}`);
  console.log('══════════════════════════════════════════════════');
}

main().catch((err) => {
  console.error('\n❌ Crashed:', err.message);
  process.exit(1);
});
