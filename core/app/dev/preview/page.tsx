/**
 * /dev/preview (server entry)
 * ---------------------------
 * Async server component that fetches real BigCommerce product data and
 * passes it to the client shell. If the BC fetch fails (no token, channel
 * mismatch, network issue), we fall back to an empty list so the rest of the
 * design still renders — failures here should never break the design surface.
 */

import { fetchPmFeaturedProducts, type PmProduct } from '~/lib/pm-products';
import { getPmSessionCustomer } from '~/lib/pm-session-server';
import { PreviewShell } from './preview-shell';

async function safeFetch(): Promise<PmProduct[]> {
  try {
    return await fetchPmFeaturedProducts();
  } catch (error) {
    // eslint-disable-next-line no-console -- dev-only helpful signal
    console.error('[dev/preview] product fetch failed, rendering empty grid:', error);
    return [];
  }
}

export default async function PreviewPage() {
  // Fetch products and the signed-in customer in parallel.
  const [products, customer] = await Promise.all([
    safeFetch(),
    getPmSessionCustomer(),
  ]);

  return <PreviewShell products={products} customer={customer} />;
}
