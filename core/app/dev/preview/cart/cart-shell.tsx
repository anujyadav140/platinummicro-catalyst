'use client';

/**
 * CartShell
 * ---------
 * Client chrome for /dev/preview/cart/. Mirrors the provider tree of
 * search-shell / compare-shell / preview-shell so the cart page shares
 * the same session, quote store, lists store, and recently-viewed state
 * as the rest of the preview surface.
 *
 * Body is passed in as children — CartPageContent does all the actual
 * rendering, this shell only stitches together the header, footer,
 * Quick Order modal, and the slide-out drawer.
 */

import { useState, type ReactNode } from 'react';
import { PmTopBar } from '~/components/pm-top-bar';
import { PmHeader } from '~/components/pm-header';
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

export interface CartShellProps {
  children: ReactNode;
  customer?: PmSessionCustomer | null;
}

export function CartShell({ children, customer = null }: CartShellProps) {
  return (
    <PmSessionProvider customer={customer}>
      <PmListsProvider>
        <PmRecentlyViewedProvider>
          <PmQuoteProvider>
            <CartShellInner>{children}</CartShellInner>
          </PmQuoteProvider>
        </PmRecentlyViewedProvider>
      </PmListsProvider>
    </PmSessionProvider>
  );
}

function CartShellInner({ children }: { children: ReactNode }) {
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

      <main className="min-h-[60vh] bg-pm-paper">{children}</main>

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
