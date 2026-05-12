# 10 — Checkout: State of Play

Current state of the checkout flow + what's blocking go-live + the simplest path to a working checkout.

## The full flow today

```
Catalyst (platinummicro.com)
  │
  │  user clicks "Check out" in pm-quote-drawer
  │  → app/[locale]/(default)/checkout/route.ts
  │  → GraphQL: cart.createCartRedirectUrls()
  │
  ▼
Stencil OPC (checkout.aaawave-sandbox-1.mybigcommerce.com)
  │
  │  STEP 1  Customer (auto-skipped if signed in — session sync ✅)
  │  STEP 2  Shipping address
  │  STEP 3  Shipping method        ← needs ≥1 method enabled (DONE: $15 flat)
  │  STEP 4  Payment                ← needs real gateway (PENDING — using test gateway)
  │  STEP 5  Review + Place Order
  │
  ▼
Stencil "Thank You" page (still on checkout.* domain)
  │  → "Continue shopping" → back to Catalyst storefront
  │
  ▼
Catalyst /account/orders/[id]  (viewable later, branded)
```

## Status checklist

| Component | Status | Notes |
|---|---|---|
| Catalyst → Stencil cart handoff | ✅ working | `cart.createCartRedirectUrls` mutation |
| Session sync | ✅ DONE | Signed-in customers carry through |
| Shipping methods | ✅ MIN VIABLE | "Standard Shipping" $15 flat added; user's team can add UPS/FedEx later |
| Payment gateway | 🚧 **TEST GATEWAY ONLY** | BC's `bigpaypay` mock — **must be replaced before go-live** |
| Tax provider | 🚧 **DEFAULT (manual rates)** | OK for v1; install Avalara before scaling nationally |
| Stencil OPC branding | 🚧 **DEFAULT BC THEME** | See `11-stencil-opc-brand-brief.md` for the styling steps |
| `/account/orders` (post-checkout history) | ✅ shipped | Stock Catalyst page; brand styling inherits site-wide CSS |
| `/account/orders/[id]` (single order detail) | ✅ shipped | Stock Catalyst page |

## What's blocking go-live

In priority order:

### 1. Real payment gateway (only blocker for ACTUAL working checkout)

Right now the sandbox can only accept BC's mock test cards. Until a real gateway is connected:
- Real customers cannot place real orders
- We CAN test the full flow end-to-end with test cards

Recommended: **Stripe** (covers cards + Apple Pay + Google Pay + Link in one connector). Onboarding steps in `12-payment-gateway-onboarding.md`.

### 2. Stencil OPC brand styling

Right now Stencil OPC looks like generic BC. After applying the brief in `11-stencil-opc-brand-brief.md`, it matches the Platinum Micro design system (navy headings, terracotta CTAs, Inter font, white-on-paper cards). 30-minute task in BC admin.

### 3. Tax provider (deferrable until scaling)

If we're collecting tax in >3 states, install Avalara AvaTax. Until then, manual zone rates are fine. See the discussion in conversation history — we **do not implement tax ourselves**.

## What's NOT blocking

These are nice-to-haves; the checkout works without them.

- **Pay on Account / Net 30 terms** — defer until OMNIA flow goes live
- **Customer-group tier pricing** — defer per user direction
- **Embedded checkout** (iframe inside Catalyst) — defer; full-redirect to Stencil is fine for v1
- **PayPal / BNPL** — optional, low priority for B2B
- **ACH / wire transfer** — defer until high-ticket orders demand it

## How to test end-to-end RIGHT NOW

With the test gateway:

1. Visit `http://localhost:3000/dev/preview/`
2. Add 2 products to cart via `pm-quote-drawer`
3. Click "Check out" — should redirect to Stencil OPC
4. Enter any shipping address (use a CA zip for tax calc test)
5. Pick "Standard Shipping $15"
6. Choose the test payment provider, use BC's test card: `4111 1111 1111 1111` / any future date / any CVV
7. Place order
8. Verify order shows up at `/dev/preview/account/orders` (when logged in)

If step 7 produces a thank-you page, end-to-end is working. Everything past that is brand polish + real-money payment.
