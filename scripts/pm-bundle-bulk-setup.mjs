#!/usr/bin/env node
/**
 * pm-bundle-bulk-setup.mjs
 * ------------------------
 * Reads scripts/pm-bundle-discovery.json and creates a
 * ProductPickList-with-images modifier on each Asustor bundle product in
 * the BC sandbox, mirroring whatever the LEGACY platinummicro.com PDP
 * offered.
 *
 * Idempotent: if the bundle product already has a modifier whose name
 * contains "Bundle", we skip it.
 *
 * Per-option mapping rule:
 *   legacy image filename (e.g. WDS400T4B0E) → sandbox product SKU
 *   CC<legacySku>  (e.g. CCWDS400T4B0E)
 * We resolve the linked product by searching BC for that SKU and picking
 * the one with the exact match (so we don't pick up the X2/X3/... pack
 * variants).
 *
 * Run with:  node scripts/pm-bundle-bulk-setup.mjs
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

async function bcReq(method, path, body) {
  const res = await fetch(`${BC_BASE}${path}`, {
    method,
    headers: HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`BC ${res.status} ${method} ${path}: ${text}`);
  }
  return text ? JSON.parse(text) : null;
}
const bcGet = (p) => bcReq('GET', p);
const bcPost = (p, b) => bcReq('POST', p, b);

const skuCache = new Map();
async function resolveLinkedProductBySku(targetSku) {
  if (skuCache.has(targetSku)) return skuCache.get(targetSku);
  const j = await bcGet(`/catalog/products?sku=${encodeURIComponent(targetSku)}`);
  const exact = j.data.find((p) => p.sku === targetSku);
  if (!exact) throw new Error(`Sandbox has no product with sku=${targetSku}`);
  skuCache.set(targetSku, exact);
  return exact;
}

async function existingBundleModifier(bcProductId) {
  const j = await bcGet(`/catalog/products/${bcProductId}/modifiers`);
  return j.data.find((m) => /bundle/i.test(m.display_name || '')) || null;
}

async function createBundleModifier(bcProductId, displayName, optionValues) {
  const body = {
    type: 'product_list_with_images',
    required: false,
    display_name: displayName,
    option_values: optionValues.map((ov, i) => ({
      label: ov.label,
      sort_order: i,
      is_default: false,
      adjusters: { price: null, weight: null, image_url: '', purchasing_disabled: { status: false, message: '' } },
      value_data: { product_id: ov.productId },
    })),
  };
  if (DRY_RUN) {
    console.log(`     [dry-run] would POST /v3/catalog/products/${bcProductId}/modifiers`);
    console.log(`     ${JSON.stringify(body)}`);
    return { id: 'dry-run' };
  }
  return bcPost(`/catalog/products/${bcProductId}/modifiers`, body);
}

async function main() {
  const discovery = JSON.parse(
    await fs.readFile('scripts/pm-bundle-discovery.json', 'utf-8'),
  );
  const setupTargets = discovery.filter(
    (d) => Array.isArray(d.options) && d.options.length > 0,
  );
  console.log(
    `→ ${setupTargets.length} bundle products have parseable legacy modifiers (out of ${discovery.length})`,
  );
  if (DRY_RUN) console.log('  (dry run — no writes will happen)');

  const summary = { created: [], skipped: [], failed: [] };

  for (const bundle of setupTargets) {
    process.stdout.write(`  • ${bundle.sku.padEnd(20)} `);
    try {
      const existing = await existingBundleModifier(bundle.bcProductId);
      if (existing) {
        console.log(
          `skip — already has modifier id=${existing.id} "${existing.display_name}"`,
        );
        summary.skipped.push({ sku: bundle.sku, modifierId: existing.id });
        continue;
      }

      const optionValues = [];
      for (const o of bundle.options) {
        if (!o.imageFilenameSku) {
          throw new Error(`option has no imageFilenameSku: ${JSON.stringify(o)}`);
        }
        const targetSku = `CC${o.imageFilenameSku.toUpperCase()}`;
        const linked = await resolveLinkedProductBySku(targetSku);
        optionValues.push({
          label: o.labelText,
          productId: linked.id,
          linkedSku: linked.sku,
        });
      }

      // Strip any trailing punctuation/whitespace, including unicode spaces.
      const displayName = (bundle.modifierDisplayName || 'Bundle and get 3% off')
        .replace(/[\s:]+$/u, '')
        .trim();

      const created = await createBundleModifier(
        bundle.bcProductId,
        displayName,
        optionValues,
      );
      const optsRepr = optionValues
        .map((o) => `${o.linkedSku}(${o.productId})`)
        .join(', ');
      console.log(
        `created modifier id=${created.id} "${displayName}" → [${optsRepr}]`,
      );
      summary.created.push({
        sku: bundle.sku,
        modifierId: created.id,
        options: optionValues,
      });
    } catch (err) {
      console.log(`FAIL ${err.message}`);
      summary.failed.push({ sku: bundle.sku, error: err.message });
    }
  }

  console.log('\n────────────────────────────────────────');
  console.log(`created: ${summary.created.length}`);
  console.log(`skipped: ${summary.skipped.length}`);
  console.log(`failed:  ${summary.failed.length}`);
  await fs.writeFile(
    'scripts/pm-bundle-bulk-setup.log.json',
    JSON.stringify(summary, null, 2),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
