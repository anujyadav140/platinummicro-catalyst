# 09 — Session Sync (Catalyst ↔ Stencil Checkout)

## What it solves

Catalyst (our storefront) and Stencil checkout (BC's hosted checkout) run on **different domains** with **different sessions**. Without session sync, a customer who signs in at `platinummicro.com` is treated as a **guest** the moment they hit `checkout.platinummicro.com`.

For a B2B reseller targeting OMNIA / public-sector buyers, that's load-bearing — not cosmetic. Four critical flows break without sync:

| Flow | Why it breaks without sync |
|---|---|
| Customer-group / contract-tier pricing | Only applies when BC knows which customer is checking out |
| Tax exemptions (public sector, education, non-profit) | Tied to the customer record; ignored for guests |
| Coupon codes & promotions | Customer-eligibility rules silently skip guests |
| Saved addresses & payment methods | Guest checkout shows an empty form |

After session sync is wired up:
- Login on Catalyst → recognized at Stencil checkout (no re-login)
- Logout on Stencil → cookie cleared on Catalyst too
- All four flows above work as configured in BC admin

## What's configured

Two BigCommerce Management API resources are set per the Catalyst session-sync guide:

1. **Site routes** (`PUT /v3/sites/{site_id}/routes`)
   - `type: login`  → `route: /login`
   - `type: logout` → `route: /logout`

2. **Checkout settings** (`PUT /v3/checkouts/settings/channels/{channel_id}`)
   - `should_redirect_to_storefront_for_auth: true`

These point Stencil checkout's auth flow back to the Catalyst storefront's stock `/login` and `/logout` routes (the ones already shipped by Catalyst under `app/[locale]/(auth)/`). After cutover (when `/dev/preview/*` migrates to `/`), the same paths stay valid — no re-run needed.

## How to run

```bash
cd core
node scripts/bc-bootstrap-session-sync.mjs
```

Reads `core/.env.local` for `BIGCOMMERCE_STORE_HASH`, `BIGCOMMERCE_ACCESS_TOKEN`, `BIGCOMMERCE_CHANNEL_ID`. Idempotent — re-running prints "already configured" and exits clean.

Optional overrides:
- `PM_LOGIN_PATH` (default `/login`)
- `PM_LOGOUT_PATH` (default `/logout`)

## How to test

End-to-end manual:

1. Sign in via `/dev/preview/account` (or `/login` after cutover) as a customer with a customer-group price configured in BC admin.
2. Add a product to cart — note the tier price.
3. Click checkout. Watch the URL bar: Catalyst → Stencil. The customer-group price should hold; tax exemptions and saved addresses should pre-fill.
4. Hit "Sign out" on Stencil → land back on Catalyst as anonymous.

If checkout shows MSRP instead of tier pricing, the customer isn't being recognized — check BC admin → Channel Manager → Storefront Settings → Site URL matches the Catalyst origin.

## When to re-run

- Cutover from `/dev/preview/*` to `/` — routes don't change; **no re-run needed**.
- If we change the login/logout URL structure (e.g. move to `/account` instead of `/login`), re-run with `PM_LOGIN_PATH` and `PM_LOGOUT_PATH` env overrides.
- If we add additional channels — re-run per channel with `BIGCOMMERCE_CHANNEL_ID=<id>`.

## What's NOT in scope

- Anonymous cart persistence across the boundary. BC handles this automatically via its cart-cookie bridge; nothing to configure on our side.
- B2B Edition's quote-to-checkout handoff. That's a separate flow (B2B Edition app) and requires its own session bridge if we ever turn it on.
