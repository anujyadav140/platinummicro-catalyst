#!/usr/bin/env node
/**
 * pm-bundle-bulk-adjusters.mjs
 * ----------------------------
 * Pushes the "N% off base" price adjuster onto every option value of every
 * bundle modifier we've created. Without this, BC's checkout charges the
 * full base price even though our PDP/cart preview shows the discounted
 * one — and the user lands on a confusing price-jump at checkout.
 *
 * The discount percent is parsed from each modifier's `display_name`
 * (e.g. "Bundle and get 3% off" → 3). Idempotent: re-running it just
 * re-asserts the same adjuster.
 *
 * Run:  node scripts/pm-bundle-bulk-adjusters.mjs [--dry-run]
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
const bcPut = (p, b) => bcReq('PUT', p, b);

function parseDiscountPct(displayName) {
  const m = (displayName || '').match(/(\d+(?:\.\d+)?)\s*%\s*off/i);
  if (!m) return null;
  const pct = Number(m[1]);
  if (!Number.isFinite(pct) || pct <= 0 || pct >= 100) return null;
  return pct;
}

async function main() {
  const discovery = JSON.parse(
    await fs.readFile('scripts/pm-bundle-discovery.json', 'utf-8'),
  );
  const bundles = discovery.filter(
    (d) => Array.isArray(d.options) && d.options.length > 0,
  );
  console.log(`→ ${bundles.length} bundle products to update`);
  if (DRY_RUN) console.log('  (dry run — no writes will happen)');

  const summary = { updated: [], skipped: [], failed: [] };

  for (const bundle of bundles) {
    process.stdout.write(`  • ${bundle.sku.padEnd(20)} `);
    try {
      const mods = await bcGet(`/catalog/products/${bundle.bcProductId}/modifiers`);
      const bundleMod = mods.data.find((m) => /bundle/i.test(m.display_name));
      if (!bundleMod) {
        console.log('skip — no bundle modifier on this product');
        summary.skipped.push({ sku: bundle.sku, reason: 'no bundle modifier' });
        continue;
      }
      const pct = parseDiscountPct(bundleMod.display_name);
      if (!pct) {
        console.log(`skip — couldn't parse %off from "${bundleMod.display_name}"`);
        summary.skipped.push({
          sku: bundle.sku,
          reason: `unparsed display_name "${bundleMod.display_name}"`,
        });
        continue;
      }

      let updated = 0;
      for (const value of bundleMod.option_values || []) {
        const currentAdj = value.adjusters?.price;
        const alreadySet =
          currentAdj?.adjuster === 'percentage' &&
          Number(currentAdj.adjuster_value) === -pct;
        if (alreadySet) continue;

        const body = {
          // Updating the value requires the existing label + product_id to
          // stay put; we only swap the adjuster.
          label: value.label,
          sort_order: value.sort_order,
          is_default: value.is_default,
          value_data: value.value_data, // { product_id }
          adjusters: {
            ...value.adjusters,
            price: {
              adjuster: 'percentage',
              adjuster_value: -pct,
            },
          },
        };

        if (DRY_RUN) {
          updated += 1;
          continue;
        }

        await bcPut(
          `/catalog/products/${bundle.bcProductId}/modifiers/${bundleMod.id}/values/${value.id}`,
          body,
        );
        updated += 1;
      }
      console.log(
        `${DRY_RUN ? '[dry-run] would update' : 'updated'} ${updated}/${(bundleMod.option_values || []).length} value(s) with -${pct}% adjuster`,
      );
      summary.updated.push({
        sku: bundle.sku,
        modifierId: bundleMod.id,
        valuesUpdated: updated,
        discountPct: pct,
      });
    } catch (err) {
      console.log(`FAIL ${err.message}`);
      summary.failed.push({ sku: bundle.sku, error: err.message });
    }
  }

  console.log('\n────────────────────────────────────────');
  console.log(`updated: ${summary.updated.length}`);
  console.log(`skipped: ${summary.skipped.length}`);
  console.log(`failed:  ${summary.failed.length}`);
  await fs.writeFile(
    'scripts/pm-bundle-bulk-adjusters.log.json',
    JSON.stringify(summary, null, 2),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
