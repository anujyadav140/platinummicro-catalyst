// =============================================================================
// pm-replace-products.mjs
// =============================================================================
// Replace ALL products in the BigCommerce sandbox with rows from a BC product
// export CSV. The script:
//
//   1. Reads BIGCOMMERCE_STORE_HASH + BIGCOMMERCE_ACCESS_TOKEN from
//      core/.env.local (or the same env vars from process.env).
//   2. Lists every existing product in the sandbox.
//   3. Writes them out as a JSON backup under scripts/.backups/.
//   4. Deletes them in batches of 250 (BC API max).
//   5. Pre-resolves every brand + category referenced in the CSV (lookup
//      first, create if missing).
//   6. POSTs each CSV row to /v3/catalog/products with embedded
//      custom_fields, mapped categories, and resolved brand_id.
//
// SAFETY:
//   - Defaults to **dry-run** (no destructive ops, no writes).
//   - Pass --execute to actually run.
//   - Pass --no-backup to skip step 3 (NOT recommended).
//   - Images are NOT imported — image columns in BC's CSV reference
//     internal ZIP storage paths, which only resolve through BC admin's
//     ZIP import. We log image counts as TODOs at the end.
//
// USAGE:
//   node scripts/pm-replace-products.mjs <path-to-csv>            # dry-run
//   node scripts/pm-replace-products.mjs <path-to-csv> --execute  # for real
// =============================================================================

import fs from 'node:fs';
import path from 'node:path';

// ---------- Args + env ----------

const [, , csvPathArg, ...flags] = process.argv;
const EXECUTE = flags.includes('--execute');
const SKIP_BACKUP = flags.includes('--no-backup');

if (!csvPathArg) {
  console.error('Usage: node scripts/pm-replace-products.mjs <path-to-csv> [--execute] [--no-backup]');
  process.exit(1);
}

const env = Object.fromEntries(
  fs
    .readFileSync('core/.env.local', 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);

const STORE_HASH = process.env.BIGCOMMERCE_STORE_HASH || env.BIGCOMMERCE_STORE_HASH;
const TOKEN = process.env.BIGCOMMERCE_ACCESS_TOKEN || env.BIGCOMMERCE_ACCESS_TOKEN;

if (!STORE_HASH || !TOKEN) {
  console.error('Missing BIGCOMMERCE_STORE_HASH / BIGCOMMERCE_ACCESS_TOKEN in core/.env.local.');
  process.exit(1);
}

const API_BASE = `https://api.bigcommerce.com/stores/${STORE_HASH}/v3`;

// ---------- BC API helpers ----------

async function bcRequest(method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'X-Auth-Token': TOKEN,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : undefined; } catch { json = undefined; }
  if (!res.ok) {
    const detail = json ? JSON.stringify(json).slice(0, 500) : text.slice(0, 500);
    throw new Error(`${method} ${path} → ${res.status}: ${detail}`);
  }
  return json;
}
const bcGet    = (p)    => bcRequest('GET',    p);
const bcPost   = (p, b) => bcRequest('POST',   p, b);
const bcDelete = (p)    => bcRequest('DELETE', p);

// ---------- CSV parser (state machine; handles quoted fields, escaped quotes, embedded commas/newlines) ----------

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { row.push(field); field = ''; }
      else if (ch === '\r') { /* skip — we handle \n */ }
      else if (ch === '\n') {
        row.push(field); rows.push(row);
        row = []; field = '';
      } else {
        field += ch;
      }
    }
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

function rowsToObjects(rows) {
  const [header, ...body] = rows;
  return body
    .filter((r) => r.length > 1) // skip blank lines
    .map((r) => {
      const obj = {};
      header.forEach((h, i) => { obj[h] = r[i] ?? ''; });
      return obj;
    });
}

// ---------- Custom-fields parser (BC's "name=value;..." format) ----------

function parseCustomFields(raw) {
  if (!raw) return [];
  const segments = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === ';' && !inQuotes) {
      if (cur.trim()) segments.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) segments.push(cur.trim());

  return segments
    .map((seg) => {
      const eq = seg.indexOf('=');
      if (eq < 0) return null;
      const name = seg.slice(0, eq).trim();
      const value = seg.slice(eq + 1).trim();
      if (!name || !value) return null;
      // BC custom-field name+value have soft length caps (~250). Truncate.
      return { name: name.slice(0, 250), value: value.slice(0, 250) };
    })
    .filter(Boolean);
}

// ---------- Brand + category resolvers (with caching + auto-create) ----------

const brandCache = new Map(); // name → id
async function resolveBrand(name) {
  if (!name) return undefined;
  const key = name.trim();
  if (!key) return undefined;
  if (brandCache.has(key)) return brandCache.get(key);

  const { data } = await bcGet(`/catalog/brands?name=${encodeURIComponent(key)}`);
  if (data && data.length > 0) {
    brandCache.set(key, data[0].id);
    return data[0].id;
  }

  if (!EXECUTE) {
    brandCache.set(key, -1); // sentinel for dry-run
    return -1;
  }
  const created = await bcPost('/catalog/brands', { name: key });
  brandCache.set(key, created.data.id);
  return created.data.id;
}

const categoryCache = new Map(); // "BRAND/Hewlett Packard Enterprise" → id
async function resolveCategoryPath(p) {
  const fullPath = p.trim();
  if (!fullPath) return undefined;
  if (categoryCache.has(fullPath)) return categoryCache.get(fullPath);

  const segments = fullPath.split('/').map((s) => s.trim()).filter(Boolean);
  let parentId = 0; // 0 = root in BC's classic categories endpoint

  for (let i = 0; i < segments.length; i++) {
    const partial = segments.slice(0, i + 1).join('/');
    if (categoryCache.has(partial)) { parentId = categoryCache.get(partial); continue; }

    const seg = segments[i];
    const { data } = await bcGet(
      `/catalog/categories?parent_id=${parentId}&name=${encodeURIComponent(seg)}`,
    );
    if (data && data.length > 0) {
      parentId = data[0].id;
    } else if (!EXECUTE) {
      parentId = -1;
    } else {
      const created = await bcPost('/catalog/categories', {
        name: seg,
        parent_id: parentId,
      });
      parentId = created.data.id;
    }
    categoryCache.set(partial, parentId);
  }
  return parentId;
}

async function resolveCategories(catColumn) {
  // BC export uses ';' to separate multiple category paths.
  if (!catColumn) return [];
  const paths = catColumn.split(';').map((s) => s.trim()).filter(Boolean);
  const ids = [];
  for (const p of paths) {
    const id = await resolveCategoryPath(p);
    if (id && id > 0) ids.push(id);
  }
  return [...new Set(ids)];
}

// ---------- Build a product POST body from a CSV row ----------

function num(v, fallback = 0) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}
function int(v, fallback = 0) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

async function buildProductBody(row) {
  const brandId = await resolveBrand(row['Brand Name']);
  const categoryIds = await resolveCategories(row['Category']);
  const customFields = parseCustomFields(row['Product Custom Fields']);

  const body = {
    name: row['Product Name'],
    type: 'physical',
    sku: row['Product Code/SKU'],
    description: row['Product Description'] || '',
    weight: num(row['Product Weight']),
    width: num(row['Product Width']),
    height: num(row['Product Height']),
    depth: num(row['Product Depth']),
    price: num(row['Price']),
    cost_price: num(row['Cost Price']),
    retail_price: num(row['Retail Price']),
    sale_price: num(row['Sale Price']),
    is_visible: (row['Product Visible?'] || 'Y') === 'Y',
    is_free_shipping: row['Free Shipping'] === 'Y',
    fixed_cost_shipping_price: num(row['Fixed Shipping Cost']),
    inventory_level: int(row['Current Stock Level']),
    inventory_warning_level: int(row['Low Stock Level']),
    inventory_tracking:
      row['Track Inventory'] === 'by product' ? 'product' : 'none',
    upc: row['Product UPC/EAN'] || '',
    mpn: row['Manufacturer Part Number'] || '',
    gtin: row['Global Trade Item Number'] || '',
    page_title: row['Page Title'] || '',
    meta_description: row['Meta Description'] || '',
    search_keywords: row['Search Keywords'] || '',
    warranty: row['Product Warranty'] || '',
    condition: row['Product Condition'] || 'New',
    sort_order: int(row['Sort Order']),
  };

  if (brandId && brandId > 0) body.brand_id = brandId;
  if (categoryIds.length > 0) body.categories = categoryIds;

  // Meta keywords come comma-separated in the CSV; BC wants an array.
  if (row['Meta Keywords']) {
    body.meta_keywords = row['Meta Keywords']
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // Custom URL (preserves the SEO slug from the source store).
  if (row['Product URL']) {
    body.custom_url = {
      url: row['Product URL'],
      is_customized: true,
    };
  }

  // Custom fields can be embedded directly in the create body.
  if (customFields.length > 0) {
    body.custom_fields = customFields;
  }

  return body;
}

// ---------- Existing-product handling ----------

async function listAllProducts() {
  const out = [];
  let page = 1;
  while (true) {
    const json = await bcGet(
      `/catalog/products?page=${page}&limit=250&include_fields=id,name,sku,categories,brand_id`,
    );
    const data = json.data || [];
    out.push(...data);
    if (data.length < 250) break;
    page++;
  }
  return out;
}

async function bulkDeleteProducts(products) {
  const ids = products.map((p) => p.id);
  for (let i = 0; i < ids.length; i += 250) {
    const batch = ids.slice(i, i + 250);
    await bcDelete(`/catalog/products?id:in=${batch.join(',')}`);
  }
}

function writeBackup(products, csvBasename) {
  const dir = path.join('scripts', '.backups');
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = path.join(dir, `sandbox-products-before-${csvBasename}-${stamp}.json`);
  fs.writeFileSync(filename, JSON.stringify(products, null, 2));
  return filename;
}

// ---------- Main ----------

async function main() {
  console.log(`\n📦 pm-replace-products — ${EXECUTE ? '🔴 EXECUTE MODE' : '🟢 DRY-RUN (no writes)'}`);
  console.log(`   Store hash: ${STORE_HASH}`);
  console.log(`   CSV:        ${csvPathArg}\n`);

  // 1. Parse CSV
  const csvText = fs.readFileSync(csvPathArg, 'utf8');
  const rows = rowsToObjects(parseCSV(csvText));
  console.log(`   ✓ Parsed ${rows.length} rows from CSV\n`);

  // Quick validation
  const missingSku = rows.filter((r) => !r['Product Code/SKU']).length;
  const missingName = rows.filter((r) => !r['Product Name']).length;
  if (missingSku || missingName) {
    console.warn(`   ⚠️  ${missingSku} row(s) missing SKU, ${missingName} missing name — those will fail.\n`);
  }

  // 2. List existing
  const existing = await listAllProducts();
  console.log(`   📋 Sandbox currently has ${existing.length} products\n`);

  // 3. Backup
  if (existing.length > 0 && !SKIP_BACKUP) {
    const csvBase = path.basename(csvPathArg, path.extname(csvPathArg));
    const backupPath = writeBackup(existing, csvBase);
    console.log(`   💾 Wrote backup → ${backupPath}\n`);
  }

  // 4. Pre-resolve brands + categories so the dry-run shows the lookup plan
  console.log('   🔎 Resolving brands + categories from CSV...');
  const uniqueBrands = [...new Set(rows.map((r) => r['Brand Name']).filter(Boolean))];
  const uniqueCategoryPaths = [...new Set(
    rows.flatMap((r) =>
      (r['Category'] || '').split(';').map((s) => s.trim()).filter(Boolean),
    ),
  )];
  console.log(`      • Unique brands:     ${uniqueBrands.length} (${uniqueBrands.slice(0, 4).join(', ')}${uniqueBrands.length > 4 ? '…' : ''})`);
  console.log(`      • Unique cat paths:  ${uniqueCategoryPaths.length} (${uniqueCategoryPaths.slice(0, 4).join(' | ')}${uniqueCategoryPaths.length > 4 ? '…' : ''})\n`);

  for (const b of uniqueBrands) await resolveBrand(b);
  for (const c of uniqueCategoryPaths) await resolveCategoryPath(c);

  // 5. Image accounting (informational only — we don't import images)
  let totalImages = 0;
  for (const r of rows) {
    for (let i = 1; i <= 7; i++) {
      if (r[`Product Image File - ${i}`]) totalImages++;
    }
  }
  console.log(`   🖼  ${totalImages} image references in CSV — NOT imported (BC's CSV image paths only resolve through admin's ZIP import). You can either:\n      a) Use BC admin → Catalog → Import → upload the original export ZIP, or\n      b) Add images manually after the import\n`);

  if (!EXECUTE) {
    console.log('   🟢 DRY-RUN COMPLETE — no changes made.');
    console.log('      Re-run with --execute to perform: delete all current products, then import all CSV rows.');
    console.log('      Example:  node scripts/pm-replace-products.mjs <csv-path> --execute\n');
    return;
  }

  // 6. EXECUTE: delete existing
  if (existing.length > 0) {
    console.log(`   🗑  Deleting ${existing.length} existing products...`);
    await bulkDeleteProducts(existing);
    console.log(`      ✓ Deleted\n`);
  }

  // 7. EXECUTE: create from CSV
  console.log(`   📥 Importing ${rows.length} products from CSV...\n`);
  const successes = [];
  const failures = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const sku = row['Product Code/SKU'] || `(row ${i + 1})`;
    const name = (row['Product Name'] || '').slice(0, 60);
    process.stdout.write(`      [${i + 1}/${rows.length}] ${sku} — ${name}... `);
    try {
      const body = await buildProductBody(row);
      const created = await bcPost('/catalog/products', body);
      successes.push({ sku, id: created.data?.id, name });
      process.stdout.write(`✓ id=${created.data?.id}\n`);
    } catch (err) {
      failures.push({ sku, name, error: String(err.message || err).slice(0, 300) });
      process.stdout.write(`✗\n         ${err.message?.slice(0, 240) ?? err}\n`);
    }
  }

  // 8. Report
  console.log('\n   ─────────────────────────────────────────────');
  console.log(`   ✓ Created: ${successes.length}`);
  console.log(`   ✗ Failed:  ${failures.length}`);
  if (failures.length > 0) {
    console.log('\n   Failures:');
    for (const f of failures) {
      console.log(`      • ${f.sku} — ${f.error}`);
    }
  }
  console.log('   ─────────────────────────────────────────────\n');
}

main().catch((err) => {
  console.error('\n❌ Fatal:', err);
  process.exit(1);
});
