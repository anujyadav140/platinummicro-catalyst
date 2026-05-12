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

import { addToOrCreateCart } from '~/lib/cart';

export interface PmCheckoutLine {
  productEntityId: number;
  quantity: number;
}

export async function startCheckoutAction(lines: PmCheckoutLine[]) {
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

  // Pushes to BC's cart — creates one if no cookie cartId, otherwise
  // appends. Server-side, so the session cookie update happens before
  // the redirect below sees it.
  await addToOrCreateCart({
    lineItems: valid.map((l) => ({
      productEntityId: l.productEntityId,
      quantity: l.quantity,
    })),
  });

  // /checkout reads cartId from the session cookie, calls BC's
  // createCartRedirectUrls mutation, and 302s to Stencil's OPC URL.
  // Everything downstream (session sync, brand styling, payment) is
  // handled there.
  redirect('/checkout');
}
