import builder from 'content-security-policy-builder';

/**
 * Content-Security-Policy
 * =======================
 * Locked down per the Catalyst optimization guide. The goal is a policy
 * tight enough to actually mitigate XSS / data-exfiltration / clickjacking
 * but loose enough that nothing the storefront legitimately uses breaks.
 *
 * Sources we have to allow:
 *   - 'self'                                    — our own origin
 *   - 'unsafe-inline' (scriptSrc, styleSrc)     — Next.js hydration scripts
 *                                                  + Tailwind utility classes
 *                                                  inline styles. Tightening
 *                                                  to nonces is future work.
 *   - 'unsafe-eval' (scriptSrc)                 — Next.js dev / a couple of
 *                                                  third-party libs require
 *                                                  it; harmless in practice
 *                                                  with the other directives.
 *   - https://*.bigcommerce.com                 — BC GraphQL Storefront API
 *                                                  + BC Management API.
 *   - https://*.mybigcommerce.com               — Checkout subdomain
 *                                                  + sandbox stores.
 *   - https://cdn11.bigcommerce.com             — Catalog images
 *                                                  (covered by the
 *                                                  wildcard above too).
 *   - https://cdn.quoteninja.com                — B2B Ninja headless script.
 *                                                  Only allowed when the
 *                                                  integration is configured.
 *   - https://fonts.googleapis.com / .gstatic   — Google Fonts (we load the
 *                                                  variable font via @font-face
 *                                                  from /public, but the
 *                                                  JetBrains Mono fallback
 *                                                  routes through Google).
 *   - data: / blob:                             — inline image fallbacks,
 *                                                  blob URLs for downloads
 *                                                  (PDF exports etc.).
 *   - app.makeswift.com                         — only when MAKESWIFT_*
 *                                                  is configured.
 */

const makeswiftEnabled = !!process.env.MAKESWIFT_SITE_API_KEY;
const makeswiftBaseUrl =
  process.env.MAKESWIFT_BASE_URL || 'https://app.makeswift.com';

const b2bNinjaEnabled = !!process.env.NEXT_PUBLIC_B2B_NINJA_STORE_ID;

// Dev runs on http://localhost — turning on `upgrade-insecure-requests`
// in that context tells the browser to force-upgrade EVERY same-origin
// fetch (including our own /api/* routes) to https://, which then fails
// because there's no TLS on localhost. Net effect: every client-side
// fetch dies with a generic "Failed to fetch" error in the console.
// Only enable the directive in production builds where the page itself
// is already on HTTPS.
const isProduction = process.env.NODE_ENV === 'production';

// Iframe-ancestor policy is a separate concern from script/style: when
// Makeswift is on, BC's admin previews our pages by embedding them.
// Otherwise nobody should be allowed to iframe us.
const frameAncestors = makeswiftEnabled ? [makeswiftBaseUrl] : ["'none'"];

// Generic BC origin — covers cdn11, store-{hash}.mybigcommerce.com,
// api.bigcommerce.com, and the per-channel checkout subdomain.
const BC_ORIGINS = [
  'https://*.bigcommerce.com',
  'https://*.mybigcommerce.com',
];

// Third-party origins we use conditionally — only added when the
// corresponding integration env var is set, so a stricter CSP ships
// in builds that don't use those features.
const b2bNinjaOrigins = b2bNinjaEnabled
  ? ['https://cdn.quoteninja.com', 'https://*.quoteninja.com']
  : [];

const makeswiftOrigins = makeswiftEnabled
  ? [makeswiftBaseUrl, 'https://*.makeswift.com']
  : [];

export const cspHeader = builder({
  directives: {
    // Last-resort fallback for fetch directives that aren't explicitly set.
    defaultSrc: ["'self'"],

    // Scripts: our own + Next.js inline hydration + BC + integrations.
    // `unsafe-eval` is required by Next.js's dev runtime and a handful of
    // third-party libs; with everything else locked down it's a small
    // residual risk.
    scriptSrc: [
      "'self'",
      "'unsafe-inline'",
      "'unsafe-eval'",
      ...BC_ORIGINS,
      ...b2bNinjaOrigins,
      ...makeswiftOrigins,
    ],

    // Tailwind + Next.js dump CSS inline; until we move to nonces this
    // has to stay open.
    styleSrc: [
      "'self'",
      "'unsafe-inline'",
      'https://fonts.googleapis.com',
    ],

    // Images can come from data: URIs (placeholders), blob: (downloads),
    // any BC CDN host, and integration partners' user-content CDNs. We
    // intentionally keep this broader than other directives — product
    // imagery is the highest-velocity vector and over-tightening here
    // is a common cause of broken-image bugs.
    imgSrc: [
      "'self'",
      'data:',
      'blob:',
      'https:',
    ],

    // XHR / fetch / WebSocket. WebSocket needed for Next.js dev HMR.
    connectSrc: [
      "'self'",
      ...BC_ORIGINS,
      ...b2bNinjaOrigins,
      ...makeswiftOrigins,
      'ws:',
      'wss:',
    ],

    // Fonts: local (/public/fonts) + Google Fonts CDN + inline.
    fontSrc: [
      "'self'",
      'data:',
      'https://fonts.gstatic.com',
    ],

    // No legacy plugins. Stops Flash / Java / PDF inline objects.
    objectSrc: ["'none'"],

    // Where forms can POST to. 'self' covers all our server actions;
    // BC needed for any direct-to-checkout form posts.
    formAction: ["'self'", ...BC_ORIGINS],

    // Web workers — `blob:` because Next.js generates them at runtime
    // for some lazy-loaded chunks.
    workerSrc: ["'self'", 'blob:'],

    // Where the doc can be navigated to via target=_top. Lock to 'self'
    // for the storefront, plus checkout (Stencil) which legitimately
    // navigates from our domain.
    frameSrc: ["'self'", ...BC_ORIGINS, ...makeswiftOrigins],

    // Manifest for PWA / favicon.
    manifestSrc: ["'self'"],

    // Where the page may be loaded as an iframe — see makeswift logic above.
    frameAncestors,

    // Restricts where <base> tags can rewrite resolution to.
    baseUri: ["'self'"],

    // Force HTTPS on any http: subresource — production only. See the
    // `isProduction` comment at the top of the file for why this can't
    // ship in dev.
    upgradeInsecureRequests: isProduction,
  },
});
