#!/usr/bin/env node
/**
 * bc-bootstrap-session-sync.mjs
 * =============================
 * One-time setup script that wires up BigCommerce's session-sync between
 * the Catalyst storefront and BC's hosted Stencil checkout. Per the
 * Catalyst sessions guide:
 *
 *   https://docs.bigcommerce.com/developer/docs/storefront/catalyst/development/session-sync
 *
 * Without this in place, a customer who signs in on platinummicro.com is
 * treated as a guest the moment they reach checkout.<store>.com. That
 * breaks four critical B2B flows:
 *
 *   1. Customer-group pricing (OMNIA / contract tier prices) — only
 *      applies when BC recognizes the customer at checkout.
 *   2. Tax exemptions (public-sector, education, non-profit) — only
 *      attach to known customers.
 *   3. Coupon codes & promotions — customer-tied promo rules silently
 *      fail for guests.
 *   4. Saved addresses & payment methods — the customer hits an empty
 *      form despite having 40 addresses on file.
 *
 * This script makes two BC Management API calls:
 *
 *   1) PUT /v3/sites/{site_id}/routes
 *      → Tell BC where the storefront's login + logout routes are, so
 *        Stencil checkout knows where to bounce signed-out users.
 *
 *   2) PUT /v3/checkouts/settings/channels/{channel_id}
 *      → Flip `should_redirect_to_storefront_for_auth: true`, which
 *        tells Stencil "if a checkout-bound user isn't signed in,
 *        redirect them BACK to my storefront's login page (instead of
 *        showing Stencil's own login)".
 *
 * After this runs once, BC handles the rest automatically — sign-in
 * state carries from Catalyst → Stencil, and sign-out on Stencil
 * propagates back to Catalyst.
 *
 * Usage:
 *   node scripts/bc-bootstrap-session-sync.mjs
 *
 * Env vars read from ../.env.local (or process env):
 *   BIGCOMMERCE_STORE_HASH
 *   BIGCOMMERCE_ACCESS_TOKEN
 *   BIGCOMMERCE_CHANNEL_ID
 *
 * Optional overrides (otherwise defaults are used):
 *   PM_LOGIN_PATH    — default '/login'
 *   PM_LOGOUT_PATH   — default '/logout'
 *
 * Idempotent — re-running does nothing destructive. Existing route
 * entries with the same `type` are PATCHed if the path differs, left
 * alone if not. Checkout settings get PUT every run (last write wins).
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = resolve(__dirname, '../.env.local');

// ── .env loader ─────────────────────────────────────────────────────────────

function loadEnv() {
  try {
    const text = readFileSync(ENV_PATH, 'utf8');
    const env = {};
    for (const line of text.split('\n')) {
      const m = line.match(/^([A-Z_]+)=(.+)$/);
      if (m) env[m[1]] = m[2].trim();
    }
    return env;
  } catch {
    return {};
  }
}

const env = loadEnv();
const STORE_HASH =
  process.env.BIGCOMMERCE_STORE_HASH || env.BIGCOMMERCE_STORE_HASH;
const ACCESS_TOKEN =
  process.env.BIGCOMMERCE_ACCESS_TOKEN || env.BIGCOMMERCE_ACCESS_TOKEN;
const CHANNEL_ID =
  process.env.BIGCOMMERCE_CHANNEL_ID || env.BIGCOMMERCE_CHANNEL_ID || '1';

// Login / logout paths on the Catalyst storefront. These are the routes
// that Catalyst already ships (under `app/[locale]/(auth)/login/` and
// `app/[locale]/(auth)/logout/`). When we cut over from /dev/preview/*
// to /, these paths stay valid — no re-run needed at cutover.
const LOGIN_PATH = process.env.PM_LOGIN_PATH || env.PM_LOGIN_PATH || '/login';
const LOGOUT_PATH =
  process.env.PM_LOGOUT_PATH || env.PM_LOGOUT_PATH || '/logout';

if (!STORE_HASH || !ACCESS_TOKEN) {
  console.error(
    '❌ Missing BIGCOMMERCE_STORE_HASH or BIGCOMMERCE_ACCESS_TOKEN in .env.local',
  );
  process.exit(1);
}

const BASE = `https://api.bigcommerce.com/stores/${STORE_HASH}/v3`;
const HEADERS = {
  'X-Auth-Token': ACCESS_TOKEN,
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

// ── HTTP helpers ────────────────────────────────────────────────────────────

async function bcGet(path) {
  const res = await fetch(`${BASE}${path}`, { headers: HEADERS });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`GET ${path} → ${res.status}: ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

async function bcSend(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: HEADERS,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

const bcPost = (path, body) => bcSend('POST', path, body);
const bcPut = (path, body) => bcSend('PUT', path, body);
const bcDelete = (path) => bcSend('DELETE', path);

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  PM Session-Sync — BC bootstrap              ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`Store:    ${STORE_HASH}`);
  console.log(`Channel:  ${CHANNEL_ID}`);
  console.log(`Login →   ${LOGIN_PATH}`);
  console.log(`Logout →  ${LOGOUT_PATH}\n`);

  // ── Step 1: resolve the site ID for the channel ──────────────────────────
  // The Sites API is keyed by site_id, but Catalyst configs (and our
  // .env.local) tend to track channel_id. BC exposes a lookup endpoint
  // so we don't need to ask the user for the site_id directly.
  console.log('🔍 Resolving site_id for the channel…');
  const sitesResp = await bcGet(`/sites?channel_id=${CHANNEL_ID}`);
  const sites = sitesResp?.data ?? [];
  if (sites.length === 0) {
    console.error(
      `❌ No site found for channel_id=${CHANNEL_ID}. Make sure the channel ` +
        'has a site configured in BC admin (Channel Manager → ' +
        'Storefront Settings → Site URL).',
    );
    process.exit(1);
  }
  const site = sites[0];
  const SITE_ID = site.id;
  console.log(`   ✅ site_id=${SITE_ID} (${site.url || '<no URL set>'})\n`);

  // ── Step 2: upsert login + logout routes ──────────────────────────────────
  // The routes API on BC works as: each (site, type) pair has at most
  // one row. So we list, then for each desired route we either:
  //   - skip (already correct)
  //   - update (path differs)
  //   - create (no row for this type yet)
  console.log('🔗 Configuring site routes…');
  const existingResp = await bcGet(`/sites/${SITE_ID}/routes`);
  const existing = existingResp?.data ?? [];

  const desired = [
    { type: 'login', matching: 'exact', route: LOGIN_PATH },
    { type: 'logout', matching: 'exact', route: LOGOUT_PATH },
  ];

  for (const want of desired) {
    const have = existing.find((r) => r.type === want.type);
    if (!have) {
      console.log(`   ➕ creating ${want.type} → ${want.route}`);
      await bcPost(`/sites/${SITE_ID}/routes`, want);
    } else if (have.route === want.route && have.matching === want.matching) {
      console.log(`   ✅ ${want.type} already → ${want.route}`);
    } else {
      console.log(
        `   🔄 updating ${want.type}: ${have.route} → ${want.route}`,
      );
      await bcPut(`/sites/${SITE_ID}/routes/${have.id}`, want);
    }
  }
  console.log('');

  // ── Step 3: enable storefront-for-auth redirect on the channel ────────────
  // This is the flag that makes Stencil checkout bounce signed-out users
  // BACK to Catalyst's login page (instead of showing its own form). It's
  // the keystone of session sync — without it, users see Stencil's
  // separate login UI and have to sign in twice.
  console.log('⚙️  Flipping should_redirect_to_storefront_for_auth=true…');
  await bcPut(`/checkouts/settings/channels/${CHANNEL_ID}`, {
    should_redirect_to_storefront_for_auth: true,
  });
  console.log('   ✅ checkout settings updated\n');

  // ── Step 4: confirm by reading back ───────────────────────────────────────
  console.log('🔎 Verifying configuration…');
  const finalRoutes = await bcGet(`/sites/${SITE_ID}/routes`);
  const finalSettings = await bcGet(`/checkouts/settings/channels/${CHANNEL_ID}`);

  const loginRow = finalRoutes?.data?.find((r) => r.type === 'login');
  const logoutRow = finalRoutes?.data?.find((r) => r.type === 'logout');

  console.log(`   login route:  ${loginRow?.route ?? '(missing)'}`);
  console.log(`   logout route: ${logoutRow?.route ?? '(missing)'}`);
  console.log(
    `   redirect-to-storefront-for-auth: ${
      finalSettings?.data?.should_redirect_to_storefront_for_auth ?? '(unknown)'
    }`,
  );
  console.log('');

  console.log('🎉 Session-sync bootstrap complete.\n');
  console.log('What this unlocks:');
  console.log('  • Customer-group pricing applies at checkout');
  console.log('  • Tax exemptions auto-attach for known customers');
  console.log('  • Coupon codes / promo rules tied to the customer fire');
  console.log('  • Saved addresses + payment methods pre-fill');
  console.log('  • Signed-in users skip Stencil\'s own login screen\n');
}

main().catch((err) => {
  console.error('\n❌ Bootstrap failed:');
  console.error(err.message || err);
  process.exit(1);
});
