/**
 * /dev/preview/compare
 * --------------------
 * Side-by-side product comparison page. Fully client-state-driven — the
 * page server-renders the chrome via <CompareShell>, then <CompareGrid>
 * reads selected products out of `usePmCompare()` (localStorage-backed).
 *
 * No BC fetch happens here; the comparison data was captured at the
 * moment each product was toggled in the catalog.
 */

import { getPmSessionCustomer } from '~/lib/pm-session-server';
import { CompareGrid } from './compare-grid';
import { CompareShell } from './compare-shell';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Compare products — Platinum Micro',
  description:
    'Side-by-side comparison of products you selected from the Platinum Micro catalog.',
};

export default async function ComparePage() {
  const customer = await getPmSessionCustomer();

  return (
    <CompareShell customer={customer}>
      <CompareGrid />
    </CompareShell>
  );
}
