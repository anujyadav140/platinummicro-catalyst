/**
 * /dev/preview/cart
 * -----------------
 * Dedicated cart page — modern B2B layout. The drawer (PmQuoteDrawer)
 * remains as the "you just added this" interstitial; this page is the
 * canonical review-and-decide surface before bouncing to Stencil OPC
 * for actual checkout.
 *
 * The cart itself lives in pm-quote-store (client React Context). This
 * page only renders chrome + reads the auth session for the signed-in
 * affordances. Cart state is hydrated from localStorage when the client
 * mounts.
 */

import { getPmSessionCustomer } from '~/lib/pm-session-server';
import { CartShell } from './cart-shell';
import { CartPageContent } from './cart-page';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Your cart — Platinum Micro',
  description:
    'Review the items in your cart before checkout. Estimated shipping and tax are calculated at checkout.',
};

export default async function CartPage() {
  const customer = await getPmSessionCustomer();

  return (
    <CartShell customer={customer}>
      <CartPageContent />
    </CartShell>
  );
}
