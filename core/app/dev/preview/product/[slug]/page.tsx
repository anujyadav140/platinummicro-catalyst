/**
 * /dev/preview/product/[slug] (server entry)
 * ------------------------------------------
 * Async server component that resolves a BC product by its storefront `path`
 * slug and hands the flattened detail shape to the client shell. Mirrors the
 * shape of /dev/preview/page.tsx so behaviors stay consistent across the
 * preview surface.
 *
 * If the slug doesn't resolve to a Product (404, redirect, or a different
 * node type), we call Next's `notFound()` so the standard not-found UI
 * renders instead of a half-broken page.
 */

import { notFound } from 'next/navigation';
import { fetchPmProductBySlug } from '~/lib/pm-product-by-slug';
import { getPmSessionCustomer } from '~/lib/pm-session-server';
import { ProductDetailShell } from './product-detail-shell';

interface ProductPageParams {
  slug: string;
}

interface ProductPageProps {
  params: Promise<ProductPageParams>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);

  const [product, customer] = await Promise.all([
    fetchPmProductBySlug(decoded).catch((error) => {
      // eslint-disable-next-line no-console -- dev-only helpful signal
      // `console.warn` not `.error` — see app/dev/preview/page.tsx for why.
      console.warn('[dev/preview/product] product fetch failed:', error);
      return null;
    }),
    getPmSessionCustomer(),
  ]);

  if (!product) notFound();

  return <ProductDetailShell product={product} customer={customer} />;
}
