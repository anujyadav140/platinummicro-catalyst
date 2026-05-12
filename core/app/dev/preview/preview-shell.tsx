'use client';

/**
 * PreviewShell
 * ------------
 * Client subtree of /dev/preview. Hosts:
 *   - QuickOrder modal open/close state
 *   - <PmQuoteProvider> for the BOM/Quote drawer
 *
 * The server `page.tsx` fetches BC catalog data + the homepage hero banner
 * (from the admin-managed "PM Page Banners → homepage" category) and
 * passes them down as props. The old hardcoded <PmHero> is gone — when
 * the admin hasn't configured a banner, the homepage simply omits the
 * hero section.
 */

import { useState } from 'react';
import { PmTopBar } from '~/components/pm-top-bar';
import { PmHeader } from '~/components/pm-header';
import { PmPageSectionsRenderer } from '~/components/pm-page-sections-renderer';
import { PmCategoryStrip } from '~/components/pm-category-strip';
import { PmProductGrid } from '~/components/pm-product-grid';
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
import type { PmPageSection } from '~/lib/pm-page-sections';

export interface PreviewShellProps {
  products: PmProduct[];
  /** Signed-in customer pulled by the parent server page from `auth()`. */
  customer?: PmSessionCustomer | null;
  /** Admin-managed page sections (heroes + card grids in document
   *  order). Empty when not configured. */
  sections?: PmPageSection[];
}

export function PreviewShell({
  products,
  customer = null,
  sections = [],
}: PreviewShellProps) {
  return (
    <PmSessionProvider customer={customer}>
      <PmListsProvider>
        <PmRecentlyViewedProvider>
          <PmQuoteProvider>
            <PreviewInner products={products} sections={sections} />
          </PmQuoteProvider>
        </PmRecentlyViewedProvider>
      </PmListsProvider>
    </PmSessionProvider>
  );
}

function PreviewInner({
  products,
  sections,
}: {
  products: PmProduct[];
  sections: PmPageSection[];
}) {
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

      {/* Admin-managed page sections (heroes + card grids), configured
          via BC admin → Products → Categories → "PM Page Banners" →
          "homepage" → Description. Each fence block (<!--pm-hero ... -->
          or <!--pm-cards ... -->) renders here in document order. The
          old hardcoded <PmAudienceStrip> ("Industries we serve") has
          moved INTO this config — admin can edit/reorder/add/remove
          cards without code. */}
      <PmPageSectionsRenderer sections={sections} />

      <PmCategoryStrip />

      <PmProductGrid
        eyebrow="Catalog"
        title="Recently in stock"
        linkLabel="View all products"
        linkHref="/dev/preview/sitemap"
        products={products}
      />

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
