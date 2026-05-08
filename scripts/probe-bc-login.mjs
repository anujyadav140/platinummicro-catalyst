// Probe BC's GraphQL Storefront login mutation directly, bypassing Auth.js.
// Usage:
//   node scripts/probe-bc-login.mjs <email> <password>
//
// Reads BIGCOMMERCE_STORE_HASH and BIGCOMMERCE_STOREFRONT_TOKEN from
// core/.env.local. Tells us straight from BC's mouth whether:
//   1. The credentials are valid
//   2. The Storefront JWT has the customer-login scope
//   3. There's some other GraphQL error (useful raw payload to debug)

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
const TOKEN = env.BIGCOMMERCE_STOREFRONT_TOKEN;
const CHANNEL_ID = env.BIGCOMMERCE_CHANNEL_ID || '1';

if (!STORE_HASH || !TOKEN) {
  console.error('Missing BIGCOMMERCE_STORE_HASH / BIGCOMMERCE_STOREFRONT_TOKEN in core/.env.local');
  process.exit(1);
}

const [, , email, password] = process.argv;

if (!email || !password) {
  console.error('Usage: node scripts/probe-bc-login.mjs <email> <password>');
  process.exit(1);
}

// Catalyst hits `store-{HASH}.mybigcommerce.com/graphql` for channel 1
// (the default), and the suffixed form `store-{HASH}-{CHANNEL}.mybigcommerce.com/graphql`
// for any non-1 channel.
const url =
  CHANNEL_ID === '1'
    ? `https://store-${STORE_HASH}.mybigcommerce.com/graphql`
    : `https://store-${STORE_HASH}-${CHANNEL_ID}.mybigcommerce.com/graphql`;

const query = `
  mutation LoginMutation($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      customerAccessToken {
        value
      }
      customer {
        entityId
        firstName
        lastName
        email
      }
    }
  }
`;

console.log('POST', url);
console.log('Channel ID:', CHANNEL_ID);
console.log('Email:', email);

const res = await fetch(url, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query,
    variables: { email, password },
  }),
});

console.log('HTTP', res.status);
const text = await res.text();
try {
  const data = JSON.parse(text);
  console.log(JSON.stringify(data, null, 2));

  if (data.errors && data.errors.length > 0) {
    console.log('\n→ BC returned GraphQL errors. Common causes:');
    console.log('  - JWT lacks customer-login scope (re-mint with proper permissions)');
    console.log('  - Email/password mismatch');
    console.log('  - Store has email-verification gating turned on');
    console.log('  - Channel/CORS mismatch');
  } else if (data.data?.login?.customer) {
    console.log(`\n→ Login OK. Customer #${data.data.login.customer.entityId} signed in.`);
    console.log('  If sign-in still fails in the app, the BC layer is fine —');
    console.log('  Auth.js wiring or session storage is the culprit.');
  } else {
    console.log('\n→ BC accepted the request but returned a null login result.');
    console.log('  → Wrong email or password (or unverified account).');
  }
} catch {
  console.log(text);
}
