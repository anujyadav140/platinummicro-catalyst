# 13 — B2B Ninja Integration (Quote App)

How "Send for quote" is wired on the Catalyst storefront. Same vendor the legacy platinummicro.com site uses, headless mode.

## The picture

```
/dev/preview/cart/ page  ── "Send for quote" click ──▶  window.BN.add_products_to_quote()
                                                              │
                                                              ▼
                                                B2B Ninja hosted modal
                                                (Request a Quote form)
                                                              │
                                                              ▼
                                                B2B Ninja servers
                                                — email to sales
                                                — quote in BN admin
                                                — customer "My Quotes" portal
```

Catalyst owns the cart + the "Send for quote" button. Everything that happens *after* the click (the modal, the form, the submission, the merchant notification, the customer quote history) lives in B2B Ninja's hosted infrastructure. Nothing to maintain on our side beyond the loader.

## Files

| File | Role |
|---|---|
| `core/components/pm-b2b-ninja/pm-b2b-ninja-provider.tsx` | React provider that loads B2B Ninja's headless script + exposes `usePmB2BNinja()` |
| `core/components/pm-b2b-ninja/index.ts` | Public exports |
| `core/app/dev/preview/layout.tsx` | Mounts `<PmB2BNinjaProvider>` once for every preview page |
| `core/app/dev/preview/cart/cart-page.tsx` | Calls `openQuoteWithProducts(...)` from the "Send for quote" button |
| `core/.env.example` | Documents the `NEXT_PUBLIC_B2B_NINJA_STORE_ID` env var |

## What the provider does

Loads `https://cdn.quoteninja.com/storefront/quoteninja-headless.js?storeID=<id>` via Next's `<Script strategy="afterInteractive">`. Their script attaches a global `window.BN` object with these methods (per [docs.b2bninja.com](https://docs.b2bninja.com/storefront-api/reference/)):

- `BN.show_quote('quote-view')` — open the current quote modal
- `BN.show_quote('submitted-quotes')` — open the user's past quotes
- `BN.add_products_to_quote(products, merge, showDialog)` — push BC products into the current quote and pop the modal
- `BN.log_in_customer(bcV2Customer)` — bridge auth so the user sees their past quotes
- `BN.log_out_customer()` — clear auth

The provider exposes a small subset via `usePmB2BNinja()`:

```ts
const { openQuoteWithProducts, openMyQuotes, ready, configured } = usePmB2BNinja();
```

`configured` is `true` when `NEXT_PUBLIC_B2B_NINJA_STORE_ID` is set. `ready` flips `true` once `window.BN` is attached (the provider polls every 100 ms up to 4 s).

## How the cart page uses it

```tsx
const { openQuoteWithProducts, configured: ninjaConfigured, ready: ninjaReady } = usePmB2BNinja();

// "Send for quote" button onClick:
openQuoteWithProducts(
  lines
    .filter((l) => typeof l.productEntityId === 'number')
    .map((l) => ({ id: l.productEntityId, qty: l.qty, options: [] })),
);
```

Lines missing a BC `productEntityId` (Quick Order paste, saved-list import) are dropped — B2B Ninja's hosted modal lets the user add free-text items inline if needed.

Button states:

| `configured` | `ready` | Button shows |
|---|---|---|
| false | — | "Send for quote" → alert: configure env var |
| true | false | "Loading quote engine…" (disabled) |
| true | true | "Send for quote" → opens BN modal |

## To turn it on

1. **Install B2B Ninja on the BC channel.**
   BC admin → Apps → search "B2B Ninja" (also listed as "Quote Cart" / "Quote Ninja"). Connect on the same channel as the Catalyst storefront.

2. **Get the storefront ID.**
   B2B Ninja admin → Settings → look for "Headless Integration" or the script snippet they hand you. The `storeID=` query param in that snippet IS the value we need.

3. **Set the env var.**
   In `core/.env.local`:
   ```
   NEXT_PUBLIC_B2B_NINJA_STORE_ID=<value-from-step-2>
   ```
   Restart `pnpm dev` so Next picks up the public env var.

4. **Smoke test.**
   - Add a real BC product to cart from a PDP
   - Open `/dev/preview/cart/`
   - Click "Send for quote" — B2B Ninja's modal should pop, pre-filled with the line items
   - Submit a test quote with your own email
   - Verify it lands in B2B Ninja's admin + you receive the merchant notification

## What's not in scope yet

- **Customer auth bridge.** We don't currently call `BN.log_in_customer(bcV2Customer)` when a user signs into Catalyst. Result: B2B Ninja's modal collects contact details fresh every time, and the "View my quotes" tab won't show past quotes for signed-in users. To wire later, fetch the BC V2 customer object server-side after sign-in and pass it into a client component that calls `BN.log_in_customer(...)` on mount.
- **Drawer entry point.** The cart drawer (`pm-quote-drawer.tsx`) currently only offers "View cart" — by design, since the decision between "check out" and "send for quote" deserves the full cart page. If a "Send for quote" affordance is wanted in the drawer too, mirror the cart-page button.
- **PDP "Add to quote" button.** Some B2B sites surface a per-product "Add to quote" CTA alongside "Add to cart" on the PDP. Easy add — call `openQuoteWithProducts([{ id, qty: 1 }])` from a button. Defer unless data shows demand.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Button says "Loading quote engine…" forever | Script blocked by CSP, adblock, or storeID wrong. Open devtools → Network → look for `quoteninja-headless.js` |
| Modal opens but with the wrong store | Wrong `storeID`. Double-check via B2B Ninja admin |
| Lines don't appear in modal | `productEntityId` is missing from the line. Verify by inspecting `usePmQuote().lines` in React DevTools |
| "Send for quote" alerts "not configured" even after setting env var | Forgot to restart dev server. `NEXT_PUBLIC_*` is baked at build time |
| Modal shows but customer's past quotes are empty | Customer auth bridge isn't wired yet (see "not in scope") |
