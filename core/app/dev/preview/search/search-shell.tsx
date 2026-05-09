'use client';

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

export interface SearchShellProps {
  children: ReactNode;
  customer?: PmSessionCustomer | null;
}

export function SearchShell({
  children,
  customer = null,
}: SearchShellProps) {
  return (
    <PmSessionProvider customer={customer}>
      <PmListsProvider>
        <PmRecentlyViewedProvider>
          <PmQuoteProvider>
            <SearchShellInner>{children}</SearchShellInner>
          </PmQuoteProvider>
        </PmRecentlyViewedProvider>
      </PmListsProvider>
    </PmSessionProvider>
  );
}

function SearchShellInner({ children }: { children: ReactNode }) {
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

      {children}

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
