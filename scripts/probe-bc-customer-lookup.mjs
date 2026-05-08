// Probe whether BC's V3 REST API can answer "does this customer email exist?"
// Usage: node scripts/probe-bc-customer-lookup.mjs <email>

import fs from 'node:fs';

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

const STORE_HASH = env.BIGCOMMERCE_STORE_HASH;
const V3_TOKEN = process.env.PM_V3_TOKEN || env.BIGCOMMERCE_ACCESS_TOKEN;

if (!STORE_HASH || !V3_TOKEN) {
  console.error(
    'Missing BIGCOMMERCE_STORE_HASH / BIGCOMMERCE_ACCESS_TOKEN in core/.env.local (or PM_V3_TOKEN env override).',
  );
  process.exit(1);
}

const [, , email = 'anuj@platinummicro.com'] = process.argv;

const url = `https://api.bigcommerce.com/stores/${STORE_HASH}/v3/customers?email:in=${encodeURIComponent(email)}`;
console.log('GET', url);

const res = await fetch(url, {
  headers: {
    'X-Auth-Token': V3_TOKEN,
    Accept: 'application/json',
  },
});

console.log('HTTP', res.status);
const text = await res.text();
try {
  const data = JSON.parse(text);
  console.log(JSON.stringify(data, null, 2));
  if (data.data) {
    console.log(`\n→ Match count for "${email}": ${data.data.length}`);
  }
} catch {
  console.log(text);
}
