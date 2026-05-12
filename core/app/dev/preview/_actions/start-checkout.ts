'use server';

/**
 * start-checkout
 * --------------
 * Bridges the PM client-side `pm-quote-store` to BC's real cart, then
 * hands off to Catalyst's stock `/checkout` route (which exchanges the
 * cookie cart ID for a Stencil OPC redirect URL).
 *
 * Why we need this: the in-drawer cart lives in a React Context, NOT in
 * BC. When the user clicks "Check out", we have to materialize a BC cart
 * with the same line items, write its ID to the session cookie, and only
 * then can the existing `/checkout` redirect handler resolve the Stencil
 * checkout URL.
 *
 * Lines without a productEntityId are skipped — BC's createCart mutation
 * keys on entityId, not SKU. Quick Order paste flows produce such lines
 * (no BC roundtrip done yet); the drawer's "all-in-stock → checkout"
 * heuristic also gates on productEntityId so paste-only carts naturally
 * fall back to the quote path.
 */

import { redirect } from 'next/navigation';

import { applyCouponCode } from '~/app/[locale]/(default)/cart/_actions/apply-coupon-code';
import { getSessionCustomerAccessToken } from '~/auth';
import { client } from '~/client';
import { graphql } from '~/client/graphql';
import { addToOrCreateCart, clearCartId, getCartId } from '~/lib/cart';

/**
 * Wipes the BC cart whose entityId is cached in our session, if any.
 * Used at the top of every checkout-start so the cart we hand off to
 * Stencil OPC matches `pm-quote-store` exactly — without this, clicking
 * "Check out" → back → "Check out" again would APPEND the same line
 * items twice to the same BC cart, doubling the order.
 *
 * Failures are logged and swallowed: a missing/already-deleted BC cart
 * shouldn't block the user from starting checkout. The subsequent
 * `addToOrCreateCart` call will create a brand-new BC cart either way.
 */
const DeleteCartMutation = graphql(`
  mutation DeleteCartMutation($input: DeleteCartInput!) {
    cart {
      deleteCart(input: $input) {
        deletedCartEntityId
      }
    }
  }
`);

async function wipeExistingBcCart(): Promise<void> {
  const existingId = await getCartId();
  if (!existingId) return;

  try {
    const customerAccessToken = await getSessionCustomerAccessToken();
    await client.fetch({
      document: DeleteCartMutation,
      variables: { input: { cartEntityId: existingId } },
      customerAccessToken,
      fetchOptions: { cache: 'no-store' },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[start-checkout] deleteCart failed', err);
  }

  // Always clear the cookie even if the BC-side delete errored — if the
  // cart truly is gone in BC, addToOrCreateCart will hit "cart not found"
  // and re-create. If it isn't, our cookie still no longer references it
  // so the user gets a fresh BC cart next.
  await clearCartId();
}

export interface PmCheckoutLine {
  productEntityId: number;
  quantity: number;
}

export async function startCheckoutAction(
  lines: PmCheckoutLine[],
  /**
   * Optional validated coupon code from PmQuoteStore. When present we
   * apply it to the BC checkout (which BC creates implicitly from the
   * cart) AFTER the line items land, so the coupon carries through to
   * Stencil OPC without the user having to retype it there.
   *
   * Failures here do NOT block checkout — if BC rejects the code (race
   * condition, cart-minimum not met, etc.) we still want the user to
   * reach Stencil so they can fix it there. The error is logged for
   * follow-up; the redirect proceeds.
   */
  couponCode?: string | null,
) {
  // Defensive filter — drop anything that lost its entityId or has a
  // non-positive quantity (corrupted client state, paste flow stragglers).
  const valid = lines.filter(
    (l) =>
      Number.isFinite(l.productEntityId) &&
      l.productEntityId > 0 &&
      Number.isFinite(l.quantity) &&
      l.quantity > 0,
  );

  if (valid.length === 0) {
    // Nothing to check out — bounce back to the cart drawer's parent page.
    // Throws via Next.js's redirect mechanism; safe to call mid-function.
    redirect('/dev/preview/');
  }

  // Wipe any pre-existing BC cart cached in our session before pushing
  // line items. Without this, clicking Check out → browser back → Check
  // out again would APPEND the same items twice to BC's cart, doubling
  // the order. The user's pm-quote-store is the source of truth; BC's
  // cart should match it exactly at handoff time, every time.
  await wipeExistingBcCart();

  // Pushes to BC's cart — now always creates a brand-new one (we just
  // cleared the cookie above). Server-side, so the new cookie value lands
  // before the redirect below reads it.
  await addToOrCreateCart({
    lineItems: valid.map((l) => ({
      productEntityId: l.productEntityId,
      quantity: l.quantity,
    })),
  });

  // Apply the validated coupon to the BC checkout, if one is set.
  // In BigCommerce the cart and the checkout share the same entityId,
  // so `cartId` is what `applyCheckoutCoupon` expects. We log and swallow
  // any error so a coupon hiccup never strands the user on our page —
  // they'll see Stencil OPC, can re-enter the code if needed.
  const trimmedCode = couponCode?.trim().toUpperCase();
  if (trimmedCode) {
    try {
      const cartId = await getCartId();
      if (cartId) {
        await applyCouponCode({
          checkoutEntityId: cartId,
          couponCode: trimmedCode,
        });
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[start-checkout] applyCouponCode failed', err);
    }
  }

  // /checkout reads cartId from the session cookie, calls BC's
  // createCartRedirectUrls mutation, and 302s to Stencil's OPC URL.
  // Everything downstream (session sync, brand styling, payment) is
  // handled there.
  redirect('/checkout');
}
