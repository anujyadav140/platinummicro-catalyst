#!/usr/bin/env node
/**
 * pm-bundle-discovery.mjs
 * -----------------------
 * Walks the /bundles/ category in BC sandbox, lists every product, then for
 * each one fetches the LEGACY platinummicro.com PDP HTML and extracts the
 * bundle modifier configuration so we can mirror it in the sandbox.
 *
 * Output: writes scripts/pm-bundle-discovery.json with the shape:
 *   [
 *     { bcProductId, name, sku, slug, legacyUrl,
 *       modifierDisplayName, options: [{ label, sku, productId? }] },
 *     ...
 *   ]
 *
 * The script only READS — no BC mutations. Run pm-bundle-bulk-setup.mjs to
 * apply.
 */

import fs from 'node:fs/promises';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const STORE_HASH = '1dedrz66md';
const ACCESS_TOKEN = 'bhjmal6xz743bqbhtdck1qnme9tm6m4';
const BC_BASE = `https://api.bigcommerce.com/stores/${STORE_HASH}/v3`;
const LEGACY_BASE = 'https://www.platinummicro.com';

const bcHeaders = {
  'X-Auth-Token': ACCESS_TOKEN,
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

async function bcGet(path) {
  const res = await fetch(`${BC_BASE}${path}`, { headers: bcHeaders });
  if (!res.ok) throw new Error(`BC ${res.status} ${path}: ${await res.text()}`);
  return res.json();
}

async function findBundlesCategoryIds() {
  // /bundles/ is the parent; actual products live in children like "All Bundles"
  // or "NAS Bundle". Return the parent and all descendants so we can search the
  // union.
  const tree = await bcGet('/catalog/trees/1/categories');
  const flatten = (nodes) => nodes.flatMap((n) => [n, ...flatten(n.children || [])]);
  const all = flatten(tree.data);
  const parent = all.find((c) => /^bundles?$/i.test(c.name));
  if (!parent) throw new Error('No /bundles/ category found in BC tree');
  const collect = (id) => {
    const ids = [id];
    for (const c of all) if (c.parent_id === id) ids.push(...collect(c.id));
    return ids;
  };
  return collect(parent.id);
}

async function listProductsInCategory(categoryId) {
  const out = [];
  let page = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const j = await bcGet(
      `/catalog/products?categories:in=${categoryId}&limit=250&page=${page}`,
    );
    out.push(...j.data);
    if (!j.meta?.pagination || j.meta.pagination.current_page >= j.meta.pagination.total_pages)
      break;
    page += 1;
  }
  return out;
}

function buildLegacyUrl(slug) {
  // BC custom_url.url already includes leading slash like /asustor-as6706t-v2-.../
  const path = slug.startsWith('/') ? slug : `/${slug}`;
  return `${LEGACY_BASE}${path}`;
}

async function fetchLegacyHtml(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, html: await res.text() };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

/**
 * Stencil PDP renders ProductPickList modifiers like:
 *
 *   <label class="form-label form-label--inlineSmall">
 *     Bundle and get 3% off:
 *   </label>
 *   <ul class="productOptions-list">
 *     <li class="productOptions-list-item">
 *       <input type="radio" name="attribute[5612]" value="0" /> None
 *     </li>
 *     <li class="productOptions-list-item" data-product-attribute-value="750">
 *       <figure><img src=".../products/8185/.../WDS400T4B0E__....jpg" /></figure>
 *       <input type="radio" name="attribute[5612]" value="750" />
 *       <label>WD WDS400T4B0E 4TB WD Blue ... NVMe SSD ...</label>
 *     </li>
 *     <li ...>WD 4TB ... (Pack of 2)</li>
 *     <li ...>WD 4TB ... (Pack of 3)</li>
 *     ...
 *   </ul>
 *
 * The legacy workaround creates a separate BC product for every "Pack of N".
 * For our new bundle UI we want ONE option (the single-pack) per base product
 * and let the quantity stepper handle multiplication. We extract:
 *   - modifier label (display name)
 *   - one entry per unique "base" option, keyed by the image-URL product id,
 *     keeping only the variant whose label does NOT contain "Pack of N"
 *   - candidate SKU + legacy product id we can use to look the product up in
 *     the sandbox BC store
 */
function extractBundleConfig(html) {
  // Modifier label — legacy label contains a <span data-option-value> inside,
  // so we capture everything up to </label> and then strip nested tags.
  const labelRegex = /<label[^>]*>([\s\S]*?)<\/label>/gi;
  let labelMatch = null;
  let m;
  while ((m = labelRegex.exec(html)) !== null) {
    const inner = m[1];
    // Only consider <label>s with a "form-label" class (skip stencil pills/etc.)
    // AND containing "Bundle" in the visible text.
    const visible = inner.replace(/<[^>]+>/g, '').trim();
    if (/Bundle/i.test(visible) && /form-label/i.test(m[0])) {
      labelMatch = { index: m.index, text: visible };
      break;
    }
  }
  if (!labelMatch) return null;
  const labelText = labelMatch.text.replace(/\s+/g, ' ').trim();

  // Find the productOptions-list <ul> that follows
  const tail = html.slice(labelMatch.index, labelMatch.index + 80000);
  const ulMatch = tail.match(/<ul[^>]*class="[^"]*productOptions-list[^"]*"[^>]*>([\s\S]*?)<\/ul>/i);
  if (!ulMatch) return null;
  const ulHtml = ulMatch[1];

  // Parse each <li> in turn
  const items = [];
  const liRegex = /<li[^>]*class="[^"]*productOptions-list-item[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
  let liMatch;
  while ((liMatch = liRegex.exec(ulHtml)) !== null) {
    const liHtml = liMatch[1];
    const valueMatch = liHtml.match(/<input[^>]*type="radio"[^>]*value="([^"]*)"/i);
    const value = valueMatch?.[1] || null;
    const labelMatchInner = liHtml.match(/<label[^>]*>([\s\S]*?)<\/label>/i);
    const rawLabel = labelMatchInner?.[1]?.replace(/\s+/g, ' ').trim() || '';
    // Image src points at e.g. .../products/8185/31473/WDS400T4B0E__...jpg
    // → legacy product id = 8185, image filename SKU = WDS400T4B0E
    const imgMatch = liHtml.match(
      /<img[^>]+src="[^"]*\/products\/(\d+)\/(\d+)\/([^_"\.\/]+)__/i,
    );
    items.push({
      value,
      label: rawLabel,
      legacyProductId: imgMatch ? Number(imgMatch[1]) : null,
      imageFilenameSku: imgMatch?.[3] || null,
      isNone: value === '0' || /^none$/i.test(rawLabel),
      isPackOfN: /pack of \d+/i.test(rawLabel),
    });
  }

  // The legacy site puts EACH Pack-of-N in its own BC product (the workaround
  // we're replacing). Filter to keep only "None"-less, single-pack options;
  // the new bundle UI represents Pack-of-N via the quantity stepper.
  const singleOptions = items.filter((it) => !it.isNone && !it.isPackOfN);

  return {
    labelText,
    rawOptionCount: items.length,
    options: singleOptions,
  };
}

async function main() {
  console.log('→ Locating /bundles/ category tree in BC...');
  const bundlesCatIds = await findBundlesCategoryIds();
  console.log(`  bundles category tree ids = ${bundlesCatIds.join(',')}`);

  console.log('→ Listing products in /bundles/ tree...');
  const seen = new Set();
  const products = [];
  for (const cid of bundlesCatIds) {
    const items = await listProductsInCategory(cid);
    for (const p of items) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      products.push(p);
    }
  }
  console.log(`  found ${products.length} products`);

  const asustor = products.filter((p) =>
    /asustor/i.test(p.name) || /^AS/i.test(p.sku || ''),
  );
  console.log(`  ${asustor.length} appear to be Asustor bundles`);

  // Fetch custom_url for each product individually (sub-resource on /catalog/products/{id})
  for (const p of asustor) {
    try {
      const j = await bcGet(`/catalog/products/${p.id}?include=custom_url`);
      p.custom_url = j.data?.custom_url;
    } catch (err) {
      console.warn(`  ! couldn't fetch slug for ${p.sku}: ${err.message}`);
    }
  }

  const out = [];
  for (const p of asustor) {
    const slug = p.custom_url?.url || '';
    const url = buildLegacyUrl(slug);
    process.stdout.write(`  • ${p.sku.padEnd(20)} ${url} ... `);
    const r = await fetchLegacyHtml(url);
    if (!r.ok) {
      console.log(`FAIL ${r.status || r.error}`);
      out.push({
        bcProductId: p.id,
        sku: p.sku,
        name: p.name,
        slug,
        legacyUrl: url,
        legacyFetchFailed: r.status || r.error,
      });
      continue;
    }
    const cfg = extractBundleConfig(r.html);
    if (!cfg) {
      console.log('no bundle modifier found');
      out.push({
        bcProductId: p.id,
        sku: p.sku,
        name: p.name,
        slug,
        legacyUrl: url,
        noBundleModifierOnLegacy: true,
      });
      continue;
    }
    console.log(
      `${cfg.options.length} unique options (${cfg.rawOptionCount} raw incl. Pack-of-N)`,
    );
    out.push({
      bcProductId: p.id,
      sku: p.sku,
      name: p.name,
      slug,
      legacyUrl: url,
      modifierDisplayName: cfg.labelText,
      rawOptionCount: cfg.rawOptionCount,
      options: cfg.options.map((o) => ({
        legacyValueAttr: o.value,
        legacyProductId: o.legacyProductId,
        imageFilenameSku: o.imageFilenameSku,
        labelText: o.label,
      })),
    });
  }

  await fs.writeFile(
    'scripts/pm-bundle-discovery.json',
    JSON.stringify(out, null, 2),
  );
  console.log(`\n✓ wrote scripts/pm-bundle-discovery.json (${out.length} entries)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
