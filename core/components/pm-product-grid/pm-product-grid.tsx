/**
 * PmProductGrid
 * -------------
 * Section wrapper around a 4-column responsive product grid. Pure layout —
 * receives an array of PmProduct already shaped by lib/pm-products.
 *
 * Server component. Each card inside hydrates to a tiny client component for
 * the Add-to-BOM button.
 */

import { PmSectionHeader } from '~/components/pm-section-header';
import { PmProductCard } from '~/components/pm-product-card';
import type { PmProduct } from '~/lib/pm-products';

export interface PmProductGridProps {
  /** Section eyebrow (small tan all-caps line above the title) */
  eyebrow?: string;
  /** Section h2 title */
  title?: string;
  /** Right-aligned link label (omit to hide the link) */
  linkLabel?: string;
  /** Right-aligned link target */
  linkHref?: string;
  /** Products to render */
  products: PmProduct[];
  /** Show empty state if products list is empty (default true) */
  showEmpty?: boolean;
}

export function PmProductGrid({
  eyebrow = 'Catalog',
  title = 'Recently in stock',
  linkLabel = 'View all products',
  linkHref = '/category',
  products,
  showEmpty = true,
}: PmProductGridProps) {
  if (products.length === 0 && !showEmpty) return null;

  return (
    <section className="py-12 sm:py-16 md:py-20">
      <div className="mx-auto max-w-pm-container px-4 sm:px-6 md:px-8">
        <PmSectionHeader
          eyebrow={eyebrow}
          title={title}
          linkLabel={linkLabel}
          linkHref={linkHref}
        />

        {products.length === 0 ? (
          <div className="rounded-lg border border-dashed border-pm-ink-200 bg-white px-8 py-16 text-center text-sm text-pm-ink-500">
            No products yet. Add some in the BigCommerce admin and they will appear
            here.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            {products.map((product) => (
              <PmProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
