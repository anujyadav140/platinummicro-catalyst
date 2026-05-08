'use client';

/**
 * AccountShell
 * ------------
 * Shared chrome for sign-in and register pages — TopBar, Header, Footer,
 * cart provider, plus the Quick Order modal and drawer (so the persistent
 * nav still works even from auth screens).
 *
 * The page passes form content as children. No dashboard, no profile UI —
 * the actual customer area lives in Catalyst's `[locale]/(default)/account/`
 * and is only reachable after a real sign-in.
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

export interface AccountShellProps {
  children: ReactNode;
  /** Signed-in customer pulled by the parent server page from `auth()`. */
  customer?: PmSessionCustomer | null;
}

export function AccountShell({ children, customer = null }: AccountShellProps) {
  return (
    <PmSessionProvider customer={customer}>
      <PmListsProvider>
        <PmRecentlyViewedProvider>
          <PmQuoteProvider>
            <AccountShellInner>{children}</AccountShellInner>
          </PmQuoteProvider>
        </PmRecentlyViewedProvider>
      </PmListsProvider>
    </PmSessionProvider>
  );
}

function AccountShellInner({ children }: { children: ReactNode }) {
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

      {/* Layout is owned by each page so we can do split-screen / centered / etc. */}
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
