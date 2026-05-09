/**
 * Search route segment layout
 * ---------------------------
 * Wraps both `page.tsx` and `loading.tsx` in <SearchShell> so the chrome
 * (TopBar, Header, Footer, providers) renders once. Without this layout,
 * loading.tsx and page.tsx would each render their own SearchShell and we'd
 * end up with duplicate chrome and stuck-on-loading hydration.
 *
 * The customer is fetched here once and forwarded into SearchShell.
 */

import type { ReactNode } from 'react';
import { getPmSessionCustomer } from '~/lib/pm-session-server';
import { SearchShell } from './search-shell';

export default async function SearchLayout({
  children,
}: {
  children: ReactNode;
}) {
  const customer = await getPmSessionCustomer();
  return <SearchShell customer={customer}>{children}</SearchShell>;
}
