# 12 — Payment Gateway Onboarding Playbook

Step-by-step for connecting a real payment processor to the BC channel, replacing the sandbox test gateway. **Nothing on the Catalyst side needs to change** — payment configuration lives entirely in BC admin.

## Pick the gateway

| Gateway | Best for | Why | What it costs |
|---|---|---|---|
| **Stripe** ⭐ recommended | Everyone v1 | One connector covers cards (Visa/MC/Amex/Discover) + Apple Pay + Google Pay + Link. Modern API. Industry default. | 2.9% + 30¢ per transaction; ACH 0.8% capped $5 |
| **PayPal Powered by Braintree** | If your team already has a BT account | Adds PayPal + Pay Later (BNPL) alongside cards. Slightly more complex setup. | Similar to Stripe |
| **Authorize.net** | If you have a long-standing Auth.net merchant account | Legacy enterprise. Works fine. Older UX. | Variable, typically 2.9% + 30¢ + monthly gateway fee |
| **Adyen** | Enterprise scale | Multi-currency, multi-region. Overkill for US-only. | Interchange-plus, contract pricing |
| **PayPal Standard** | Quick add-on | Just PayPal as a button. Pairs with one of the above. | Standard PayPal rates |

**For "simplest path with maximum coverage": pick Stripe.** Single account, single connector, covers the four most common payment methods.

## Stripe — step by step

### Prerequisites

- Stripe account at stripe.com (your team creates if not already)
- Verified business identity in Stripe (Stripe will request EIN, address, etc.)
- US bank account on file in Stripe for payouts
- Decide **test mode vs live mode** for the first connection (recommended: test first, validate, then flip live)

### In BC admin

1. **Storefront** → **Storefront Settings** → confirm you're on the right channel (AAAWAVE - Sandbox 1 for sandbox testing, or your production channel for live)
2. **Settings** → **Payments**
3. **All Payment Methods** → search "Stripe"
4. Two Stripe options will appear:
   - **Stripe** (the modern integration — pick this)
   - **Stripe Powered by BigCommerce** (alternative; either works)
5. Click **Set up** on "Stripe"
6. Click **Connect with Stripe** — opens OAuth popup to Stripe
7. Sign in to Stripe → authorize BigCommerce to charge on your behalf
8. After redirect back, configure:
   - **Display name**: "Pay with card" (what the customer sees)
   - **Test mode**: ON for first pass; OFF for live
   - **Auth & capture**: default is "Authorize and capture immediately" (fine for v1; later you may want "Authorize only" with manual capture for B2B)
9. **Accepted card types**: check Visa, MC, Amex, Discover, JCB (all)
10. **Apple Pay**: toggle ON
    - You'll need to verify your domain in Stripe (Stripe walks you through)
    - Domain to verify: `checkout.<yourdomain>.com` AND `<yourdomain>.com`
11. **Google Pay**: toggle ON
12. **Link**: toggle ON (Stripe's saved-payment 1-click feature)
13. Click **Save**

### Verify it shows up

Re-run our audit:

```bash
cd core
node scripts/bc-audit-checkout.mjs
```

You should now see Stripe (and possibly Apple Pay / Google Pay as separate rows) in the "Payment methods" section, with `Test` column empty for live mode or `⚠️ TEST` for test mode.

### Test end-to-end

1. Add a product to cart on Catalyst
2. Click "Check out"
3. On Stencil OPC, in the Payment step, you should see "Pay with card" with Visa/MC/Amex/Discover logos
4. Use Stripe's test card: `4242 4242 4242 4242` / any future date / any 3-digit CVV / any ZIP
5. Click "Place Order"
6. Land on Stencil's order-placed page
7. Verify the order appears in:
   - BC admin → Orders
   - Stripe dashboard → Payments

If the test order completes, you're done. Real cards work the same way once you flip Stripe to live mode.

## PayPal (optional addition)

Adds PayPal-branded checkout option alongside cards.

1. **Settings** → **Payments** → search "PayPal"
2. **PayPal Express** (simpler) OR **PayPal Powered by Braintree** (more features including Pay Later)
3. **Set up** → Connect with PayPal → OAuth
4. Same flow as Stripe: display name, test mode, save

PayPal buttons will show up at checkout as an *alternative* to card payment.

## ACH / Bank Transfer (defer)

If you want to add ACH for high-ticket orders (>$1K — saves 2.5% in card fees):

- Stripe ACH is the easiest path — same Stripe connector, separate toggle
- Requires `Plaid` for instant bank-account verification (Plaid sub-account; ~$0.50 per verification)
- Adds ~2 day clearing time before order can ship — important for shipping workflow

Defer until you have data showing ACH demand.

## When you go from sandbox → production

The sandbox channel (AAAWAVE - Sandbox 1) is for testing only. When you launch:

1. Create / use the **production channel** in BC
2. Re-run our two bootstrap scripts against the production channel ID:
   ```bash
   BIGCOMMERCE_CHANNEL_ID=<prod_id> node scripts/bc-bootstrap-session-sync.mjs
   ```
3. Repeat this gateway onboarding in production — Stripe et al. requires per-channel connection
4. Flip Stripe to LIVE mode (test mode → off)
5. Update `BIGCOMMERCE_CHANNEL_ID` in `.env.production`

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| "No payment methods available" at checkout | Currency / country mismatch — Stripe supports USD for US, make sure customer ship-to is US for first tests |
| Test card declined | Stripe test mode requires their test cards specifically; `4242 4242 4242 4242` is the one for "success" |
| Apple Pay button missing on iPhone | Domain not verified in Stripe — go to Stripe dashboard → Apple Pay → add `checkout.<domain>.com` |
| Real card declined "do_not_honor" | Issuer-side decline (the customer's bank). Nothing on BC side. |
| Charge succeeds in Stripe but order shows "Awaiting Payment" in BC | Webhook not firing. Check Settings → Webhooks in BC admin; should have a `store/order/statusUpdated` listener for Stripe. |

## Decision log

When the team picks a processor, edit this section:

- **Chosen processor**: _____________
- **Account holder**: Platinum Micro
- **Stripe account ID** (acct_XXXX): _____________
- **Live mode flipped on**: _____________
- **Apple/Google Pay enabled**: _____________
- **First real transaction date**: _____________
