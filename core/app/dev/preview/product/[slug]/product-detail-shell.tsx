'use client';

/**
 * ProductDetailShell
 * ------------------
 * Client subtree of /dev/preview/product/[slug]. Hosts:
 *   - QuickOrder modal open/close state
 *   - <PmQuoteProvider> for the BOM/Quote drawer
 *   - The PmProductDetail body (which dispatches Add-to-cart into the same
 *     quote store that the drawer reads from)
 *
 * Mirrors the structure of preview-shell.tsx and account-shell.tsx so the
 * persistent header chrome behaves identically across all preview routes.
 */

import { useState } from 'react';
import { PmTopBar } from '~/components/pm-top-bar';
import { PmHeader } from '~/components/pm-header';
import { PmFooter } from '~/components/pm-footer';
import { PmQuickOrderModal } from '~/components/pm-quick-order-modal';
import { PmQuoteDrawer } from '~/components/pm-quote-drawer';
import { PmQuoteProvider, usePmQuote } from '~/lib/pm-quote-store';
import { useQuickOrderAddHandler } from '~/lib/pm-quick-order-handler';
import { PmListsProvider } from '~/lib/pm-lists-store';
import { PmRecentlyViewedProvider } from '~/lib/pm-recently-viewed-store';
import {
  PmSessionProvider,
  type PmSessionCustomer,
} from '~/lib/pm-session';
import { PmProductDetail } from '~/components/pm-product-detail';
import type { PmProductDetail as PmProductDetailData } from '~/lib/pm-product-by-slug';

export interface ProductDetailShellProps {
  product: PmProductDetailData;
  /** Signed-in customer pulled by the parent server page from `auth()`. */
  customer?: PmSessionCustomer | null;
}

export function ProductDetailShell({
  product,
  customer = null,
}: ProductDetailShellProps) {
  return (
    <PmSessionProvider customer={customer}>
      <PmListsProvider>
        <PmRecentlyViewedProvider>
          <PmQuoteProvider>
            <ProductDetailShellInner product={product} />
          </PmQuoteProvider>
        </PmRecentlyViewedProvider>
      </PmListsProvider>
    </PmSessionProvider>
  );
}

function ProductDetailShellInner({
  product,
}: {
  product: PmProductDetailData;
}) {
  const { lines, open: openDrawer } = usePmQuote();
  const [quickOrderOpen, setQuickOrderOpen] = useState(false);
  const handleQuickOrderAdd = useQuickOrderAddHandler();

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

      <PmProductDetail product={product} />

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
