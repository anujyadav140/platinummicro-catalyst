// Quick probe: call BC's GraphQL login mutation directly and see what comes back.
// Lets us tell apart "scope problem" vs "credentials problem" vs "URL problem".
//
// Usage: node scripts/probe-bc-auth.mjs <email> <password>

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
const CHANNEL_ID = env.BIGCOMMERCE_CHANNEL_ID;

const [, , email = 'probe@example.com', password = 'wrongpassword'] = process.argv;

const url = `https://store-${STORE_HASH}-${CHANNEL_ID}.mybigcommerce.com/graphql`;
console.log('POST', url);
console.log('  email:', email, '  password:', '*'.repeat(password.length));

const res = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${TOKEN}`,
  },
  body: JSON.stringify({
    query: `
      mutation Login($email: String!, $password: String!) {
        login(email: $email, password: $password) {
          customer { entityId firstName lastName email }
          customerAccessToken { value }
        }
      }
    `,
    variables: { email, password },
  }),
});

console.log('---');
console.log('HTTP', res.status);
const text = await res.text();
try {
  console.log(JSON.stringify(JSON.parse(text), null, 2));
} catch {
  console.log(text);
}
