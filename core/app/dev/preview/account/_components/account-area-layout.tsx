/**
 * PmAccountAreaLayout
 * --------------------
 * Shared wrapper for every signed-in account sub-page (Dashboard, Orders,
 * Returns, Addresses, Lists, etc).
 *
 * Responsibilities:
 *   1. **Auth gate** — server-side reads the session; if not signed in,
 *      redirect to `/dev/preview/account` (sign-in form). No flash, no flicker.
 *   2. **Chrome** — wraps content in <AccountShell> so TopBar + Header +
 *      Footer + cart drawer are present and aware of the signed-in state.
 *   3. **Two-column body** — sticky left rail (PmAccountSidebar) + 1fr main
 *      content. The sidebar collapses above the content on mobile.
 *
 * Pages just render their content and the shell, sidebar, and gating are
 * inherited:
 *
 *     export default async function OrdersPage() {
 *       return (
 *         <PmAccountAreaLayout>
 *           <PmAccountPageHeader title="Orders" />
 *           <PmAccountEmptyState ... />
 *         </PmAccountAreaLayout>
 *       );
 *     }
 */
import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { PmAccountSidebar } from '~/components/pm-account-sidebar';
import { getPmSessionCustomer } from '~/lib/pm-session-server';
import { AccountShell } from '../account-shell';

export interface PmAccountAreaLayoutProps {
  children: ReactNode;
}

export async function PmAccountAreaLayout({
  children,
}: PmAccountAreaLayoutProps) {
  const customer = await getPmSessionCustomer();
  if (!customer) {
    redirect('/dev/preview/account');
  }

  return (
    <AccountShell customer={customer}>
      <main className="bg-pm-paper">
        <div className="mx-auto max-w-pm-container px-6 py-10 sm:px-8 lg:py-14">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[240px_1fr] lg:gap-12">
            <PmAccountSidebar />
            <div className="min-w-0 flex flex-col gap-8">{children}</div>
          </div>
        </div>
      </main>
    </AccountShell>
  );
}
