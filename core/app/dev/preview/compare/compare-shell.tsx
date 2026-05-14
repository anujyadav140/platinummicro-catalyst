'use client';

/**
 * CompareShell
 * ------------
 * Client chrome for /dev/preview/compare/. Mirrors search-shell + category-shell
 * — same provider tree, same TopBar / Header / Footer / QuoteDrawer pieces —
 * so the comparison page stays visually consistent with the rest of the
 * preview surface.
 *
 * Page body is passed in via children (server-rendered or static — currently
 * the static empty-state + compare grid live in page.tsx).
 */

import { useState, type ReactNode } from 'react';
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

export interface CompareShellProps {
  children: ReactNode;
  customer?: PmSessionCustomer | null;
}

export function CompareShell({
  children,
  customer = null,
}: CompareShellProps) {
  return (
    <PmSessionProvider customer={customer}>
      <PmListsProvider>
        <PmRecentlyViewedProvider>
          <PmQuoteProvider>
            <CompareShellInner>{children}</CompareShellInner>
          </PmQuoteProvider>
        </PmRecentlyViewedProvider>
      </PmListsProvider>
    </PmSessionProvider>
  );
}

function CompareShellInner({ children }: { children: ReactNode }) {
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

      {/* Bottom padding leaves room for the fixed PmCompareBar so the
          last row of the comparison table is never hidden behind it. */}
      <main className="min-h-[60vh] pb-[120px]">{children}</main>

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
