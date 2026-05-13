#!/usr/bin/env node
/**
 * pm-bundle-bulk-tiers.mjs
 * ------------------------
 * Adds BC bulk-pricing tiers to each "single-pack" bundle item so that
 * picking qty N in the new bundle UI produces the same per-unit price
 * the legacy platinummicro.com site charged via its separate
 * "Pack of N" products.
 *
 * Pricing observed on legacy/sandbox (WD WDS400T4B0E SSD):
 *   qty 1   → $529.99 each   (special bundle-of-1 price on the single SKU)
 *   qty 2+  → $619.99 each   (effective per-unit on Pack-of-N products)
 *
 * Translating that to BC bulk-pricing:
 *   - The single product's BASE price stays at $529.99 (qty 1)
 *   - A bulk-pricing tier kicks in at qty ≥ 2 with a fixed per-unit
 *     price of $619.99
 *
 * The script reads scripts/pm-bundle-discovery.json so it only touches
 * bundle items we already mapped. Idempotent: re-running clears any
 * existing tiers on each product before writing fresh ones.
 *
 * Run:  node scripts/pm-bundle-bulk-tiers.mjs [--dry-run]
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
  if (!res.ok) throw new Error(`BC ${res.status} ${method} ${path}: ${text}`);
  return text ? JSON.parse(text) : null;
}
const bcGet = (p) => bcReq('GET', p);
const bcPost = (p, b) => bcReq('POST', p, b);
const bcDelete = (p) => bcReq('DELETE', p);

/**
 * For a given "single-pack" BC product id, derive the effective qty 2+
 * per-unit price by querying for the related Pack-of-N products by SKU
 * pattern (CCWDS400T4B0E → CCWDS400T4B0EX2/X3/...). Returns the
 * highest-confidence per-unit number we can infer; falls back to null
 * when no Pack-of-N siblings exist.
 */
async function inferQty2PlusPrice(singleProductId, singleSku) {
  // Look up siblings by keyword match on the SKU root (strip the leading
  // "CC" prefix so we match both CCSKU and CCSKUX2 etc.)
  const keyword = singleSku.replace(/^CC/, '');
  const j = await bcGet(
    `/catalog/products?keyword=${encodeURIComponent(keyword)}&limit=20`,
  );
  const siblings = (j.data || []).filter((p) => {
    if (p.id === singleProductId) return false;
    const m = p.sku?.match(new RegExp(`^${singleSku}X(\\d+)$`));
    return !!m;
  });
  const perUnitPrices = siblings
    .map((p) => {
      const m = p.sku.match(new RegExp(`^${singleSku}X(\\d+)$`));
      const packQty = m ? Number(m[1]) : 0;
      if (!packQty) return null;
      return { packQty, perUnit: Number(p.price) / packQty, total: Number(p.price) };
    })
    .filter(Boolean)
    .sort((a, b) => a.packQty - b.packQty);
  if (perUnitPrices.length === 0) return null;
  // All Pack-of-N siblings should have ~the same per-unit price; the
  // legacy data we audited confirms this. Take the median to be safe.
  const sorted = perUnitPrices.map((x) => x.perUnit).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  // Floor to 2 decimals so we land on the LEGACY price the admin set
  // ($619.99) rather than over-rounding to $620.00. Off-by-pennies on
  // some pack sizes (e.g. qty=2 ends up $0.01 below legacy $1,239.99)
  // is acceptable vs the $180 mismatch we had with un-tiered math.
  return {
    perUnit: Math.floor(median * 100) / 100,
    samples: perUnitPrices,
  };
}

async function main() {
  const discovery = JSON.parse(
    await fs.readFile('scripts/pm-bundle-discovery.json', 'utf-8'),
  );
  // Collect every unique linked single-pack product across all bundles.
  // The discovery JSON stores the legacy productId + image filename SKU
  // per option; resolve each to the sandbox single-pack BC product id.
  const seen = new Set();
  const singles = [];
  for (const bundle of discovery) {
    for (const opt of bundle.options || []) {
      if (!opt.imageFilenameSku) continue;
      const sku = `CC${opt.imageFilenameSku.toUpperCase()}`;
      if (seen.has(sku)) continue;
      seen.add(sku);
      singles.push({ sku });
    }
  }
  console.log(`→ ${singles.length} unique single-pack SKU(s) to update`);
  if (DRY_RUN) console.log('  (dry run — no writes)');

  // Resolve each SKU to a product id
  for (const s of singles) {
    const j = await bcGet(`/catalog/products?sku=${encodeURIComponent(s.sku)}`);
    const exact = j.data.find((p) => p.sku === s.sku);
    if (!exact) throw new Error(`sandbox missing single SKU ${s.sku}`);
    s.productId = exact.id;
    s.basePrice = Number(exact.price);
  }

  const summary = { configured: [], skipped: [], failed: [] };

  for (const single of singles) {
    process.stdout.write(`  • ${single.sku.padEnd(20)} (id=${single.productId}) `);
    try {
      const inferred = await inferQty2PlusPrice(single.productId, single.sku);
      if (!inferred) {
        console.log('skip — no Pack-of-N siblings to derive tier from');
        summary.skipped.push({ sku: single.sku, reason: 'no siblings' });
        continue;
      }

      const tierPrice = inferred.perUnit;
      if (tierPrice <= single.basePrice) {
        console.log(
          `skip — inferred tier $${tierPrice} is NOT higher than base $${single.basePrice}; nothing to add`,
        );
        summary.skipped.push({
          sku: single.sku,
          reason: `inferred tier ${tierPrice} ≤ base ${single.basePrice}`,
        });
        continue;
      }

      // Clear any existing tiers we previously set so re-runs stay clean.
      const existing = await bcGet(
        `/catalog/products/${single.productId}/bulk-pricing-rules`,
      );
      for (const rule of existing.data || []) {
        if (DRY_RUN) continue;
        await bcDelete(
          `/catalog/products/${single.productId}/bulk-pricing-rules/${rule.id}`,
        );
      }

      // Add the qty 2+ tier.
      const body = {
        quantity_min: 2,
        quantity_max: 0, // 0 = unlimited
        type: 'price',
        amount: tierPrice,
      };
      if (DRY_RUN) {
        console.log(
          `[dry-run] would POST tier {qty≥2, fixed $${tierPrice}/each}`,
        );
      } else {
        const created = await bcPost(
          `/catalog/products/${single.productId}/bulk-pricing-rules`,
          body,
        );
        console.log(
          `tier added id=${created.data?.id} (qty≥2, fixed $${tierPrice}/each)`,
        );
      }
      summary.configured.push({
        sku: single.sku,
        baseQty1Price: single.basePrice,
        tierQty2PlusPrice: tierPrice,
        derivedFrom: inferred.samples,
      });
    } catch (err) {
      console.log(`FAIL ${err.message}`);
      summary.failed.push({ sku: single.sku, error: err.message });
    }
  }

  console.log('\n────────────────────────────────────────');
  console.log(`configured: ${summary.configured.length}`);
  console.log(`skipped:    ${summary.skipped.length}`);
  console.log(`failed:     ${summary.failed.length}`);
  await fs.writeFile(
    'scripts/pm-bundle-bulk-tiers.log.json',
    JSON.stringify(summary, null, 2),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
