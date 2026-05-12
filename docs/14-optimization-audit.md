# 14 — Catalyst Optimization & Security Audit

Coverage of the Catalyst optimization guide (https://docs.bigcommerce.com/developer/docs/storefront/catalyst/development/optimization) plus the security headers it implicitly assumes.

## Status matrix

| Recommendation | Status | Where |
|---|---|---|
| Next.js Data Cache (`unstable_cache` + `fetch.next.revalidate`) | ✅ | All `lib/pm-*-fetcher.ts` use the env-driven `revalidate` target. See `docs/07-caching-audit.md`. |
| BigCommerce CDN via Catalyst `<Image>` wrapper | ✅ | All BC GraphQL queries return `urlTemplate(lossy: true)`; consumers use `~/components/image`. See `docs/08-cdn-images-audit.md`. |
| KV Storage for route caching | ✅ | `core/lib/kv/` has Vercel Runtime Cache / Upstash / memory adapters. `core/proxies/with-routes.ts` caches route resolution (30 min) + store status (5 min). |
| JS bundling / `optimizePackageImports` | ✅ | `next.config.ts` now lists `lucide-react` + every installed `@radix-ui/react-*` package so tree-shaking is per-icon-export, not per-barrel. Lucide alone is ~1500 icons; this was a real bundle-size win. |
| Suspense & streaming | ⚠️ Partial | Analytics providers use `<Suspense>`. Non-critical UI sections (mega menu, banners, recently-viewed) don't. Polish task. |
| Firewall / rate limiting | 🚧 | Recommended path: Vercel WAF at deploy time. No app-level rate limiter wired (intentional — that's infra layer). |

## Security headers — the actual lockdown

The guide doesn't enumerate these in depth but they're table-stakes for "blazing fast and secure":

| Header | Value | Why |
|---|---|---|
| `Content-Security-Policy` | full directive set (see below) | XSS / exfiltration / clickjacking mitigation |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Forces HTTPS for 2 years, eligible for HSTS preload list |
| `X-Frame-Options` | `SAMEORIGIN` | Legacy fallback to CSP `frame-ancestors` for older browsers |
| `X-Content-Type-Options` | `nosniff` | Kills MIME-sniffing → drive-by-download attacks |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Prevents URL-path leakage to third-party links |
| `Permissions-Policy` | `camera=() microphone=() geolocation=() ... payment=*` | Explicitly disables hardware-access features the storefront has no business using |
| `Link: …; rel=preconnect` | BC CDN URLs | Saves the TLS handshake on the first product image |

## CSP highlights

Built dynamically in `core/lib/content-security-policy.ts` so it adjusts based on feature flags:

- **`'self'` default-src** — most fetches stay first-party
- **BC origins allowed** for `script-src`, `connect-src`, `frame-src`, `form-action` — covers `*.bigcommerce.com` + `*.mybigcommerce.com` (checkout subdomain)
- **B2B Ninja origins** conditionally allowed when `NEXT_PUBLIC_B2B_NINJA_STORE_ID` is set — otherwise CSP is one origin tighter
- **Makeswift origins** conditionally allowed when `MAKESWIFT_SITE_API_KEY` is set
- **`frame-ancestors 'none'`** unless Makeswift is on (where it has to embed previews)
- **`upgrade-insecure-requests`** — any leftover `http:` subresource is auto-upgraded
- **`'unsafe-inline'`** allowed for scripts + styles — Next.js hydration scripts and Tailwind inline styles need this. Future polish: switch to per-request nonces.

## Cookies — already locked down

Auth.js JWT session cookie:

- `HttpOnly: true` (no JS access)
- `Secure: true` (HTTPS only, in prod)
- `SameSite: 'lax'` (mitigates CSRF on cross-site navigations)
- `__Secure-` prefix in production

Set in `core/auth/anonymous-session.ts` lines 31–38.

## Verification

After applying these, check headers in dev:

```bash
curl -sI http://localhost:3000/dev/preview/ | head -20
```

All six headers (`Content-Security-Policy` + the five plain headers) should be present. Pages still serve 200; no CSP violations in the browser console.

For production, run [Mozilla Observatory](https://observatory.mozilla.org/) against the deployed origin — expected grade A+.

## Recommended next steps

In rough order of impact:

1. **Vercel WAF at deploy time** — set up "Managed Rulesets" for OWASP Top 10 + "Custom Rules" for per-IP rate limits on `/checkout`, `/login`, and search endpoints. Cost: ~10 minutes once deployed.

2. **Suspense for non-critical UI** — wrap mega menu + banner sections in `<Suspense>` with skeletons. Improves time-to-first-paint on first-load by streaming the critical path (header + hero) before the chrome.

3. **Switch CSP `'unsafe-inline'` to nonces** — pulls in a small middleware that generates a per-request nonce, threads it through Next's `<head>` injection. Tighter security but more moving parts.

4. **Add a `vercel.json`** with the same headers (defense-in-depth in case `next.config.ts` headers ever stop firing).
