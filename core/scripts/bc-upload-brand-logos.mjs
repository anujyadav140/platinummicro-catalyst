#!/usr/bin/env node
/**
 * bc-upload-brand-logos.mjs
 * =========================
 * Mirror the brand logos onto BigCommerce's own CDN so the Authorized
 * Partners section never has a dead-link risk from third-party hosts.
 *
 * STRATEGY:
 * BC's v3 API rejects external URLs in the `image_url` field of
 * /catalog/products/{id}/images (security). So we instead:
 *   1. Download each logo locally (Wikipedia Commons → temp Buffer)
 *   2. Upload as multipart/form-data via `image_file` to a hidden
 *      holder product (SKU=PM-LOGOS). BC stores the bytes directly
 *      and returns stable BC CDN URLs.
 *   3. Rewrite the Authorized Partners category description so every
 *      `brand_N_logo:` line points at the new BC CDN URL.
 *
 * The holder product is hidden from the storefront (is_visible=false)
 * and decoupled from any category — it exists purely as an image
 * filing cabinet.
 *
 * SAFETY: if any of step 1/2 fails for a brand, that brand keeps its
 * existing URL in the description (the script merges old and new
 * instead of clobbering). So a partial failure can never empty the
 * partners section.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = resolve(__dirname, '../.env.local');
const LOG_PATH = resolve(__dirname, '../bc-brand-logos-log.json');

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

const AUTHORIZED_PARTNERS_ID = 313;

// Each brand resolves to a Wikipedia Commons file title. We look up the
// actual rendered thumb URL via the MediaWiki API at script-run time
// rather than hardcoding upload.wikimedia.org paths — those paths
// include a hash-based subdirectory that's not deterministic from the
// file name alone, and the wrong path → 404.
const BRANDS = [
  { name: 'Cisco',           wikiTitle: 'File:Cisco logo.svg',                                fileName: 'cisco.png' },
  { name: 'Intel',           wikiTitle: 'File:Intel logo (2020, dark blue).svg',              fileName: 'intel.png' },
  { name: 'Microsoft',       wikiTitle: 'File:Microsoft logo (2012).svg',                     fileName: 'microsoft.png' },
  { name: 'AMD',             wikiTitle: 'File:AMD Logo.svg',                                  fileName: 'amd.png' },
  { name: 'Arctic',          wikiTitle: 'File:ARCTIC Logo wikipedia 200x99.png',              fileName: 'arctic.png' },
  { name: 'HPE',             wikiTitle: 'File:Hewlett Packard Enterprise logo.svg',          fileName: 'hpe.png' },
  { name: 'Dell',            wikiTitle: 'File:Dell Logo.svg',                                 fileName: 'dell.png' },
  { name: 'Lenovo',          wikiTitle: 'File:Lenovo Global Corporate Logo.png',              fileName: 'lenovo.png' },
  { name: 'Western Digital', wikiTitle: 'File:Western Digital logo.svg',                      fileName: 'western-digital.png' },
  { name: 'Seagate',         wikiTitle: 'File:Seagate logo 2.svg',                            fileName: 'seagate.png' },
  { name: 'Crucial',         wikiTitle: 'File:Crucial Logo.png',                              fileName: 'crucial.png' },
  { name: 'Samsung',         wikiTitle: 'File:Samsung logo.svg',                              fileName: 'samsung.png' },
];

/**
 * Resolve a Wikipedia Commons file title to its rendered thumb URL at
 * 1280px width. Retries on rate-limiting (Wikipedia caps the API at
 * about ~10 req/min for unauthenticated clients — late brands in the
 * loop reliably hit this) and on transient failures.
 *
 * Returns null only after exhausting retries.
 */
async function resolveWikipediaThumb(fileTitle, { maxAttempts = 5 } = {}) {
  const url =
    'https://commons.wikimedia.org/w/api.php?action=query&format=json' +
    `&prop=imageinfo&titles=${encodeURIComponent(fileTitle)}` +
    '&iiprop=url&iiurlwidth=1280';
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const r = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (PlatinumMicro-Catalyst Tooling) Node-fetch',
        },
      });
      if (r.ok) {
        const text = await r.text();
        // Rate-limit responses sometimes come back as 200 + a plaintext
        // "You are making too many requests" body, not JSON.
        let j;
        try {
          j = JSON.parse(text);
        } catch {
          // Not JSON — treat as rate-limit and retry.
          const backoff = 2000 * Math.pow(2, attempt - 1);
          await sleep(backoff);
          continue;
        }
        const pages =
          j.query && j.query.pages ? Object.values(j.query.pages) : [];
        const info = pages[0]?.imageinfo?.[0];
        const out = info?.thumburl ?? info?.url ?? null;
        if (out) return out;
        // No imageinfo → file is genuinely missing, no point retrying.
        return null;
      }
      // 4xx (except 429) are permanent.
      if (r.status >= 400 && r.status < 500 && r.status !== 429) return null;
    } catch {
      // network blip — retry
    }
    // 1s, 2s, 4s, 8s back-off
    const backoff = 2000 * Math.pow(2, attempt - 1);
    await sleep(backoff);
  }
  return null;
}

const JSON_HEADERS = {
  'X-Auth-Token': TOKEN,
  Accept: 'application/json',
  'Content-Type': 'application/json',
};
const NO_CT_HEADERS = {
  'X-Auth-Token': TOKEN,
  Accept: 'application/json',
};

async function bcJson(method, path, body) {
  const opts = { method, headers: JSON_HEADERS };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const r = await fetch(`${BASE}${path}`, opts);
  const text = await r.text();
  if (!r.ok) throw new Error(`${method} ${path} → ${r.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

async function ensureLogosProduct() {
  const list = await bcJson('GET', '/catalog/products?sku=PM-LOGOS&include_fields=id');
  if (list.data && list.data.length > 0) return list.data[0].id;

  const created = await bcJson('POST', '/catalog/products', {
    name: 'PM Brand Logo Assets',
    type: 'physical',
    sku: 'PM-LOGOS',
    weight: 1,
    price: 0,
    is_visible: false,
    inventory_tracking: 'none',
    description:
      '(Internal) Holds the brand logo images for the homepage Authorized ' +
      'Partners section. The brand_N_logo URLs in category id=313 point at ' +
      "this product's image CDN paths.",
  });
  return created.data.id;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Download a remote image into a Blob. Retries on transient failures
 * (429 rate-limit, 5xx server errors, or network blips) with exponential
 * backoff — Wikimedia's thumb pipeline is generally fast but can throttle
 * concurrent requests for the same client.
 */
async function downloadBlob(url, { maxAttempts = 4 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const r = await fetch(url, {
        headers: {
          // Wikimedia requires a real User-Agent — anything generic
          // (curl, undici default) gets 403'd.
          'User-Agent':
            'PlatinumMicro-Catalyst-Tooling/1.0 (admin@platinummicro.com) Node-fetch',
          // Tell Wikimedia we want the rendered PNG, not a redirect.
          Accept: 'image/png,image/*,*/*;q=0.8',
        },
      });
      if (!r.ok) {
        // 4xx (except 429) are permanent — don't retry.
        if (r.status >= 400 && r.status < 500 && r.status !== 429) {
          throw new Error(`download ${url} → ${r.status} (permanent)`);
        }
        // 429 / 5xx → retry after backoff
        lastError = new Error(`download ${url} → ${r.status}`);
      } else {
        const ab = await r.arrayBuffer();
        return new Blob([ab], { type: 'image/png' });
      }
    } catch (e) {
      lastError = e;
    }
    // Exponential backoff: 1s, 2s, 4s
    const backoff = 1000 * Math.pow(2, attempt - 1);
    await sleep(backoff);
  }
  throw lastError ?? new Error(`download ${url} failed after ${maxAttempts} attempts`);
}

/**
 * Upload a blob to BC as a product image via multipart/form-data.
 * Returns the BC CDN URL (the largest variant available).
 */
async function uploadOneLogoMultipart(productId, brand, sortOrder) {
  // Step 1: ask Wikipedia for the real rendered thumb URL for this
  // file (we never hardcode the upload.wikimedia.org path — those are
  // hash-prefixed and not stable from the filename alone).
  const remoteUrl = await resolveWikipediaThumb(brand.wikiTitle);
  if (!remoteUrl) {
    throw new Error(`could not resolve Wikipedia file: ${brand.wikiTitle}`);
  }
  const blob = await downloadBlob(remoteUrl);
  const form = new FormData();
  form.append('image_file', blob, brand.fileName);
  form.append('description', brand.name);
  form.append('sort_order', String(sortOrder));
  form.append('is_thumbnail', 'false');

  // NOTE: don't set Content-Type — fetch+FormData auto-derive it with
  // the right multipart boundary.
  const r = await fetch(`${BASE}/catalog/products/${productId}/images`, {
    method: 'POST',
    headers: NO_CT_HEADERS,
    body: form,
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`upload ${brand.name} → ${r.status}: ${text.slice(0, 200)}`);
  const data = JSON.parse(text).data;
  // url_zoom is the largest stored variant (~1280px); url_standard is
  // ~500px. Logos rarely render larger than 100px tall on the page,
  // so url_standard is plenty.
  return {
    id: data.id,
    url: data.url_zoom || data.url_standard,
  };
}

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  Mirror brand logos to BC CDN (multipart)    ║');
  console.log('╚══════════════════════════════════════════════╝');

  console.log('🔍 Ensuring holder product (SKU=PM-LOGOS)…');
  const productId = await ensureLogosProduct();
  console.log(`   product_id = ${productId}\n`);

  console.log('📥 Downloading + 📤 uploading each logo (multipart)…');
  const results = [];
  for (let i = 0; i < BRANDS.length; i++) {
    const brand = BRANDS[i];
    try {
      const out = await uploadOneLogoMultipart(productId, brand, i + 1);
      results.push({ name: brand.name, url: out.url, imageId: out.id });
      console.log(`  ✅ ${brand.name.padEnd(20)} image_id=${out.id}`);
    } catch (e) {
      results.push({ name: brand.name, error: e.message });
      console.log(`  ❌ ${brand.name.padEnd(20)} ${e.message.slice(0, 100)}`);
    }
    // Be polite to Wikimedia — 1500ms between brands. Each brand makes
    // TWO requests to Wikimedia (the API call to resolve the file
    // title, then the actual thumb download), so the effective rate
    // is ~1 req/750ms which stays well under their per-client cap.
    if (i < BRANDS.length - 1) await sleep(1500);
  }
  console.log();

  console.log('🌐 Verifying each BC CDN URL is reachable…');
  for (const r of results) {
    if (!r.url) continue;
    try {
      const h = await fetch(r.url, { method: 'HEAD' });
      console.log(`  ${h.ok ? '✅' : '⚠'} ${r.name.padEnd(20)} ${h.status}`);
    } catch (e) {
      console.log(`  ⚠ ${r.name.padEnd(20)} ${e.message.slice(0, 100)}`);
    }
  }
  console.log();

  // SAFETY: only rewrite the description if EVERY brand uploaded. A
  // partial result would leave the section visibly broken.
  const failures = results.filter((r) => !r.url);
  if (failures.length > 0) {
    console.log(
      `\n⛔ Skipping description rewrite — ${failures.length} brand(s) failed to upload. ` +
      'Resolve those first, then re-run.',
    );
    writeFileSync(LOG_PATH, JSON.stringify({ productId, results }, null, 2));
    process.exit(1);
  }

  console.log('📝 Patching Authorized Partners description with BC CDN URLs…');
  const lines = [
    '<!--pm-brands',
    'eyebrow: Authorized partners',
    'title: Stocked, supported, sourced direct.',
    'cta_label: All manufacturers',
    'cta_href: /dev/preview/brands',
    'padding_y: 80px',
    'logo_height: 64',
    'columns_lg: 5',
    'columns_md: 3',
    'columns_sm: 2',
    '',
  ];
  results.forEach((r, i) => {
    lines.push(`brand_${i + 1}_name: ${r.name}`);
    lines.push(`brand_${i + 1}_logo: ${r.url}`);
    lines.push('');
  });
  lines.push('-->');
  await bcJson('PUT', `/catalog/categories/${AUTHORIZED_PARTNERS_ID}`, {
    description: lines.join('\n'),
  });
  console.log(`   ✅ category id=${AUTHORIZED_PARTNERS_ID} updated.\n`);

  writeFileSync(LOG_PATH, JSON.stringify({ productId, results }, null, 2));
  console.log(`Log: ${LOG_PATH}`);
  console.log('\nDone.');
}

main().catch((err) => {
  console.error('\n❌ Crashed:', err.message);
  process.exit(1);
});
