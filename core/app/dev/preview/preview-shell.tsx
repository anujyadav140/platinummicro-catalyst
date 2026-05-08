'use client';

/**
 * PreviewShell
 * ------------
 * Client subtree of /dev/preview. Hosts:
 *   - QuickOrder modal open/close state
 *   - <PmQuoteProvider> for the BOM/Quote drawer
 *
 * The server `page.tsx` fetches BC catalog data and passes it down as props.
 */

import { useState } from 'react';
import { PmTopBar } from '~/components/pm-top-bar';
import { PmHeader } from '~/components/pm-header';
import { PmHero } from '~/components/pm-hero';
import { PmAudienceStrip } from '~/components/pm-audience-strip';
import { PmCategoryStrip } from '~/components/pm-category-strip';
import { PmProductGrid } from '~/components/pm-product-grid';
import { PmAboutBanner } from '~/components/pm-about-banner';
import { PmBrandWall } from '~/components/pm-brand-wall';
import { PmFooter } from '~/components/pm-footer';
import {
  PmQuickOrderModal,
  type PmQuickOrderRow,
} from '~/components/pm-quick-order-modal';
import { PmQuoteDrawer } from '~/components/pm-quote-drawer';
import { PmQuoteProvider, usePmQuote } from '~/lib/pm-quote-store';
import { PmListsProvider } from '~/lib/pm-lists-store';
import { PmRecentlyViewedProvider } from '~/lib/pm-recently-viewed-store';
import {
  PmSessionProvider,
  type PmSessionCustomer,
} from '~/lib/pm-session';
import type { PmProduct } from '~/lib/pm-products';

export interface PreviewShellProps {
  products: PmProduct[];
  /** Signed-in customer pulled by the parent server page from `auth()`. */
  customer?: PmSessionCustomer | null;
}

export function PreviewShell({ products, customer = null }: PreviewShellProps) {
  return (
    <PmSessionProvider customer={customer}>
      <PmListsProvider>
        <PmRecentlyViewedProvider>
          <PmQuoteProvider>
            <PreviewInner products={products} />
          </PmQuoteProvider>
        </PmRecentlyViewedProvider>
      </PmListsProvider>
    </PmSessionProvider>
  );
}

function PreviewInner({ products }: { products: PmProduct[] }) {
  const { lines, addLines, open: openDrawer } = usePmQuote();
  const [quickOrderOpen, setQuickOrderOpen] = useState(false);

  const handleQuickOrderAdd = (rows: PmQuickOrderRow[]) => {
    addLines(rows.map((r) => ({ sku: r.sku.trim(), qty: Number(r.qty) || 1 })));
    openDrawer();
  };

  return (
    <>
      <PmTopBar
        onQuickOrder={() => setQuickOrderOpen(true)}
        signInHref="/dev/preview/account"
      />

      <PmHeader
        quoteCount={lines.length}
        onQuickOrder={() => setQuickOrderOpen(true)}
        onOpenQuote={openDrawer}
        accountHref="/dev/preview/account"
        homeHref="/dev/preview"
      />

      <PmHero
        eyebrow="Enterprise IT distribution · est. 2000"
        headline="Enterprise IT, sourced."
        lead="Two decades stocking servers, storage, and networking for system integrators, public sector, and healthcare buyers worldwide. Real lead times, real account managers, real freight from Southern California."
        primaryCtaLabel="Request a quote"
        primaryCtaHref="/dev/preview/account/register"
        secondaryCtaLabel="Browse the catalog"
        secondaryCtaHref="/dev/preview/category/servers"
        featureCard={{
          eyebrow: 'In stock now',
          title: 'HPE ProLiant DL380 Gen11',
          body: '2× Intel Xeon Gold 6444Y · 256 GB DDR5 ECC · iLO 6 · 3-year on-site warranty.',
          price: '$8,420',
          priceSuffix: '/unit',
          stockBadge: '312 in stock',
        }}
        trustCardTitle="Quote in one business day."
        trustCardBody="Average response time across all enterprise tickets."
      />

      <PmAudienceStrip />

      <PmCategoryStrip />

      <PmProductGrid
        eyebrow="Catalog"
        title="Recently in stock"
        linkLabel="View all products"
        linkHref="/dev/preview/sitemap"
        products={products}
      />

      <PmAboutBanner />

      <PmBrandWall />

      <PmFooter />

      <PmQuickOrderModal
        open={quickOrderOpen}
        onClose={() => setQuickOrderOpen(false)}
        onAdd={handleQuickOrderAdd}
      />

      <PmQuoteDrawer />
    </>
  );
}
