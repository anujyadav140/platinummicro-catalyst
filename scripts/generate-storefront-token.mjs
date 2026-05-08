// Generate a BigCommerce Storefront API JWT using a V3 REST API access token.
// Usage: node scripts/generate-storefront-token.mjs

const STORE_HASH = process.env.PM_STORE_HASH;
const V3_TOKEN = process.env.PM_V3_TOKEN;
const CHANNEL_ID = Number(process.env.PM_CHANNEL_ID || 1);

if (!STORE_HASH || !V3_TOKEN) {
  console.error('Missing PM_STORE_HASH or PM_V3_TOKEN env vars');
  process.exit(1);
}

const oneYearFromNow = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365;

const res = await fetch(
  `https://api.bigcommerce.com/stores/${STORE_HASH}/v3/storefront/api-token`,
  {
    method: 'POST',
    headers: {
      'X-Auth-Token': V3_TOKEN,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel_id: CHANNEL_ID,
      expires_at: oneYearFromNow,
      allowed_cors_origins: [
        'http://localhost:3000',
        'https://localhost:3000',
      ],
    }),
  },
);

const text = await res.text();

if (!res.ok) {
  console.error(`HTTP ${res.status}`);
  console.error(text);
  process.exit(1);
}

const data = JSON.parse(text);
console.log(data.data.token);
