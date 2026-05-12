#!/usr/bin/env node
/**
 * bc-audit-checkout.mjs
 * =====================
 * Read-only audit of the BC channel's checkout configuration. Tells us:
 *
 *   - Which payment gateways are connected
 *   - Which payment methods are enabled per channel (cards, PayPal, ACH, etc.)
 *   - Checkout-level settings (storefront-for-auth, custom fields, terms)
 *   - Shipping zones and configured carriers
 *   - Tax provider status (built-in vs Avalara vs TaxJar)
 *   - Currency configuration
 *   - Customer-group flags relevant to B2B (storecredit, PO terms)
 *
 * No writes. Run this before turning on/off gateways so we have a baseline.
 *
 * Usage:
 *   node scripts/bc-audit-checkout.mjs
 *
 * Env vars read from ../.env.local (or process env):
 *   BIGCOMMERCE_STORE_HASH
 *   BIGCOMMERCE_ACCESS_TOKEN
 *   BIGCOMMERCE_CHANNEL_ID
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = resolve(__dirname, '../.env.local');

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

if (!STORE_HASH || !ACCESS_TOKEN) {
  console.error(
    '❌ Missing BIGCOMMERCE_STORE_HASH or BIGCOMMERCE_ACCESS_TOKEN in .env.local',
  );
  process.exit(1);
}

const BASE = `https://api.bigcommerce.com/stores/${STORE_HASH}`;
const HEADERS = {
  'X-Auth-Token': ACCESS_TOKEN,
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

async function bcGet(path) {
  const url = path.startsWith('/v') ? `${BASE}${path}` : `${BASE}/v3${path}`;
  const res = await fetch(url, { headers: HEADERS });
  const text = await res.text();
  if (!res.ok) {
    return { __error: true, status: res.status, body: text };
  }
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { __raw: text };
  }
}

function pad(s, n) {
  s = String(s ?? '');
  return s.length >= n ? s : s + ' '.repeat(n - s.length);
}

function section(label) {
  console.log('');
  console.log('━'.repeat(72));
  console.log(`  ${label}`);
  console.log('━'.repeat(72));
}

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  PM Checkout — BC config audit               ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`Store:    ${STORE_HASH}`);
  console.log(`Channel:  ${CHANNEL_ID}`);

  // ── Store basics ────────────────────────────────────────────────────────
  section('Store + channel basics');
  const store = await bcGet('/v2/store');
  if (!store.__error) {
    console.log(`  Store name:    ${store.name}`);
    console.log(`  Domain:        ${store.domain}`);
    console.log(`  Secure URL:    ${store.secure_url}`);
    console.log(`  Country:       ${store.country}`);
    console.log(`  Currency:      ${store.currency}`);
    console.log(`  Plan:          ${store.plan_name} (${store.plan_level})`);
    console.log(
      `  Industry:      ${store.industry || '(not set)'}`,
    );
  } else {
    console.log(`  ⚠️  /v2/store ${store.status}: ${store.body}`);
  }

  const channels = await bcGet(`/channels?channel_id:in=${CHANNEL_ID}`);
  const channel = channels?.data?.[0];
  if (channel) {
    console.log(`  Channel name:  ${channel.name}`);
    console.log(`  Platform:      ${channel.platform}`);
    console.log(`  Status:        ${channel.status}`);
    console.log(`  Type:          ${channel.type}`);
  }

  // ── Payment methods enabled per channel ────────────────────────────────
  section('Payment methods (enabled at checkout)');
  // BC's v3 /payments/methods requires a checkout context (it's the buyer-
  // facing endpoint). The closest "config-level" endpoint is v2's payment
  // methods list, which returns the store's connected gateways.
  const methodsV2 = await bcGet('/v2/payments/methods');
  if (methodsV2?.__error) {
    console.log(`  ⚠️  /v2/payments/methods ${methodsV2.status}`);
    console.log(
      '     Check manually: BC admin → Settings → Payments',
    );
  } else if (!Array.isArray(methodsV2) || methodsV2.length === 0) {
    console.log('  ❌ No payment methods connected for this store.');
    console.log(
      '     Go to BC admin → Settings → Payments to connect a gateway.',
    );
  } else {
    console.log(
      `  ${pad('Method', 36)} ${pad('Code', 20)} Test`,
    );
    console.log('  ' + '-'.repeat(70));
    for (const m of methodsV2) {
      console.log(
        `  ${pad(m.name ?? m.id, 36)} ${pad(m.code ?? '', 20)} ${m.test_mode ? '⚠️ TEST' : ''}`,
      );
    }
  }

  // ── Checkout settings ──────────────────────────────────────────────────
  section('Checkout settings');
  const checkoutSettings = await bcGet(
    `/checkouts/settings/channels/${CHANNEL_ID}`,
  );
  if (checkoutSettings?.__error) {
    console.log(
      `  ⚠️  /checkouts/settings ${checkoutSettings.status}: ${checkoutSettings.body}`,
    );
  } else {
    const d = checkoutSettings?.data ?? {};
    const flag = (v) =>
      v === true ? '✅ true' : v === false ? '☐ false' : '(unset)';
    console.log(
      `  Custom checkout script URL:           ${d.custom_checkout_script_url || '(none)'}`,
    );
    console.log(
      `  Order confirmation script URL:        ${d.order_confirmation_script_url || '(none)'}`,
    );
    console.log(
      `  should_redirect_to_storefront_for_auth: ${flag(d.should_redirect_to_storefront_for_auth)}`,
    );
    console.log(
      `  customer_login_required:              ${flag(d.customer_login_required)}`,
    );
    console.log(
      `  show_short_alphanumeric_orderids:     ${flag(d.show_short_alphanumeric_orderids)}`,
    );
  }

  // ── Store-level checkout flags (terms, comments) via settings store ────
  section('Store-wide settings (catalog + checkout flags)');
  const storeSettings = await bcGet(
    `/settings/store?channel_id=${CHANNEL_ID}`,
  );
  if (storeSettings?.__error) {
    console.log(`  ⚠️  /settings/store ${storeSettings.status} — skipping`);
  } else {
    const d = storeSettings?.data ?? {};
    Object.entries(d).slice(0, 12).forEach(([k, v]) => {
      console.log(`  ${pad(k, 32)} ${v}`);
    });
  }

  // ── Shipping zones + carriers ──────────────────────────────────────────
  section('Shipping zones');
  // v2 endpoint — still the canonical source for zones.
  const zones = await bcGet('/v2/shipping/zones');
  if (!Array.isArray(zones) || zones.length === 0) {
    console.log('  ❌ No shipping zones configured.');
    console.log('     Go to BC admin → Settings → Shipping → Zones.');
  } else {
    for (const z of zones) {
      console.log(`  • ${z.name} (id=${z.id}, type=${z.type})`);
      const zoneMethods = await bcGet(`/v2/shipping/zones/${z.id}/methods`);
      if (Array.isArray(zoneMethods)) {
        for (const m of zoneMethods) {
          const enabled = m.enabled ? '✅' : '☐';
          console.log(
            `      ${enabled} ${m.name} (${m.type})`,
          );
        }
        if (zoneMethods.length === 0) {
          console.log('      ⚠️  no methods configured');
        }
      }
    }
  }

  // ── Tax (read via classes; BC doesn't expose provider list via API) ────
  section('Tax classes (categorization buckets BC + Avalara use)');
  const taxClasses = await bcGet('/tax/classes');
  if (taxClasses?.__error) {
    console.log(`  ⚠️  /tax/classes ${taxClasses.status} — skipping`);
  } else {
    const list = taxClasses?.data ?? [];
    if (list.length === 0) {
      console.log('  (no tax classes defined — using single default)');
    } else {
      for (const c of list) {
        console.log(
          `  • ${pad(c.name, 24)} ${pad(c.uuid ?? `id=${c.id}`, 38)} ${c.is_default ? 'DEFAULT' : ''}`,
        );
      }
    }
  }
  console.log('');
  console.log('  Note: BC does not expose the installed tax-provider list via');
  console.log('  the public API. Check BC admin → Apps → installed for:');
  console.log('     • Avalara AvaTax   (recommended for national B2B)');
  console.log('     • TaxJar           (lighter-weight alternative)');

  // ── Currencies ─────────────────────────────────────────────────────────
  section('Currencies');
  const currencies = await bcGet('/v2/currencies');
  if (currencies?.__error) {
    console.log(`  ⚠️  /v2/currencies ${currencies.status}`);
  } else {
    const list = Array.isArray(currencies) ? currencies : [];
    for (const c of list) {
      const flag = c.is_default ? '⭐ DEFAULT' : c.enabled ? '✅' : '☐';
      console.log(
        `  ${pad(flag, 12)} ${c.currency_code}  ${pad(c.name, 24)} rate=${c.currency_exchange_rate}`,
      );
    }
  }

  // ── Customer groups (relevant to PO / Net terms scaffolding) ───────────
  section('Customer groups');
  const groups = await bcGet('/v2/customer_groups');
  if (groups?.__error) {
    console.log(`  ⚠️  /v2/customer_groups ${groups.status}`);
  } else {
    const list = Array.isArray(groups) ? groups : [];
    if (list.length === 0) {
      console.log('  (no customer groups configured)');
      console.log(
        '  💡 Use customer groups for: reseller tier pricing, tax-exempt buckets,',
      );
      console.log('     Pay-on-Account eligibility, etc.');
    } else {
      for (const g of list) {
        console.log(
          `  • ${pad(g.name, 32)} id=${g.id} ${g.is_default ? 'DEFAULT' : ''}`,
        );
      }
    }
  }

  console.log('');
  console.log('━'.repeat(72));
  console.log('  Audit complete.');
  console.log('━'.repeat(72));
  console.log('');
}

main().catch((err) => {
  console.error('\n❌ Audit failed:');
  console.error(err.message || err);
  process.exit(1);
});
