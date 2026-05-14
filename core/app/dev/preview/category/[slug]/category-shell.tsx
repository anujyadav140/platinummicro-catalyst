'use client';

/**
 * CategoryShell
 * -------------
 * Client wrapper for the category listing route. Provides the same chrome as
 * other preview pages — TopBar + Header + Footer + QuickOrder modal + Quote
 * drawer — wrapped in <PmQuoteProvider>.
 *
 * The actual listing UI (PmCategoryListing) is passed in as `children` from
 * the server `page.tsx`, which has already done the BC fetch + filtering.
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

export interface CategoryShellProps {
  children: ReactNode;
  /** Signed-in customer pulled by the parent server page from `auth()`. */
  customer?: PmSessionCustomer | null;
}

export function CategoryShell({
  children,
  customer = null,
}: CategoryShellProps) {
  return (
    <PmSessionProvider customer={customer}>
      <PmListsProvider>
        <PmRecentlyViewedProvider>
          <PmQuoteProvider>
            <CategoryShellInner>{children}</CategoryShellInner>
          </PmQuoteProvider>
        </PmRecentlyViewedProvider>
      </PmListsProvider>
    </PmSessionProvider>
  );
}

function CategoryShellInner({ children }: { children: ReactNode }) {
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
