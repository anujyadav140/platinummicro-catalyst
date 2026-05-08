// Probe BC's customer-create flow directly.
// Usage: node scripts/probe-bc-register.mjs

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

const url = `https://store-${STORE_HASH}-${CHANNEL_ID}.mybigcommerce.com/graphql`;

const testEmail = `probe+${Date.now()}@platinummicro.com`;
const testPassword = 'TestPass1234!';

console.log('POST', url);
console.log('  test email:', testEmail);

const res = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${TOKEN}`,
  },
  body: JSON.stringify({
    query: `
      mutation Register($input: RegisterCustomerInput!, $reCaptchaV2: ReCaptchaV2Input) {
        customer {
          registerCustomer(input: $input, reCaptchaV2: $reCaptchaV2) {
            customer { entityId firstName lastName email }
            errors { __typename ... on Error { message } }
          }
        }
      }
    `,
    variables: {
      input: {
        firstName: 'Probe',
        lastName: 'Tester',
        email: testEmail,
        password: testPassword,
        formFields: {
          checkboxes: [],
          multipleChoices: [],
          numbers: [],
          dates: [],
          passwords: [],
          multilineTexts: [],
          texts: [],
        },
      },
    },
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

// If success, also try to sign in with the new account immediately
const data = JSON.parse(text).data;
if (data?.customer?.registerCustomer?.customer && data.customer.registerCustomer.errors.length === 0) {
  console.log('\n--- Now signing in with the new account ---');
  const loginRes = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({
      query: `mutation L($e: String!, $p: String!) { login(email: $e, password: $p) { customer { entityId email firstName } customerAccessToken { value } } }`,
      variables: { e: testEmail, p: testPassword },
    }),
  });
  console.log('HTTP', loginRes.status);
  console.log(JSON.stringify(JSON.parse(await loginRes.text()), null, 2));
}
