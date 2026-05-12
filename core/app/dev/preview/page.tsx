/**
 * /dev/preview (server entry)
 * ---------------------------
 * Async server component that fetches real BigCommerce product data and
 * passes it to the client shell. If the BC fetch fails (no token, channel
 * mismatch, network issue), we fall back to an empty list so the rest of the
 * design still renders — failures here should never break the design surface.
 *
 * Also fetches the homepage hero banner from the BC "PM Page Banners →
 * homepage" config category. When the admin hasn't configured a banner
 * (no `<!--pm-hero ... -->` block in the description), `heroBanner` is
 * null and the page renders with no hero at all (we no longer have a
 * hardcoded hero fallback — see PreviewShell).
 */

import { fetchPmFeaturedProducts, type PmProduct } from '~/lib/pm-products';
import { fetchPmPageBanner } from '~/lib/pm-page-banner-fetcher';
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
  // Fetch products, customer, and the admin-managed homepage banner in
  // parallel — none of these depend on each other so a single Promise.all
  // keeps the TTFB tight.
  const [products, customer, sections] = await Promise.all([
    safeFetch(),
    getPmSessionCustomer(),
    fetchPmPageBanner('homepage'),
  ]);

  return (
    <PreviewShell
      products={products}
      customer={customer}
      sections={sections}
    />
  );
}
