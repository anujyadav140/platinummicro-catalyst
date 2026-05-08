/**
 * /dev/preview/account/profile
 * ----------------------------
 * Account dashboard root. Replaces the old "Welcome back" stub with a real
 * landing page:
 *   - Page header with greeting + last-signed-in hint
 *   - 3-tile quick stats row (Orders, Lists, Credit) — values are 0/-/etc
 *     placeholders until BC data is wired
 *   - "Quick actions" card with shortcut links to the deep account routes
 *
 * Auth-gated through PmAccountAreaLayout — unauthenticated visitors are
 * bounced to the sign-in page automatically.
 */
import {
  ClipboardList,
  ListChecks,
  MapPin,
  RotateCcw,
  Settings,
  Wallet,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

import { PmAccountStat } from '~/components/pm-account-stat';
import { getPmSessionCustomer } from '~/lib/pm-session-server';

import { PmAccountAreaLayout } from '../_components/account-area-layout';
import { PmAccountPageHeader } from '../_components/page-header';

const QUICK_ACTIONS = [
  {
    label: 'View orders',
    href: '/dev/preview/account/orders',
    icon: ClipboardList,
  },
  {
    label: 'Start a return',
    href: '/dev/preview/account/returns',
    icon: RotateCcw,
  },
  {
    label: 'Manage addresses',
    href: '/dev/preview/account/addresses',
    icon: MapPin,
  },
  {
    label: 'Saved lists',
    href: '/dev/preview/account/lists',
    icon: ListChecks,
  },
  {
    label: 'Account settings',
    href: '/dev/preview/account/settings',
    icon: Settings,
  },
] as const;

export default async function PreviewProfilePage() {
  // Auth-gating happens inside PmAccountAreaLayout. Reading the customer
  // again here lets us address them by name in the page body without
  // double-redirecting.
  const customer = await getPmSessionCustomer();

  return (
    <PmAccountAreaLayout>
      <PmAccountPageHeader
        eyebrow="Dashboard"
        title={`Welcome back, ${customer?.firstName ?? 'there'}.`}
        description="Quick snapshot of your business account. Drill into any section from the left rail."
      />

      {/* Stat tiles */}
      <section
        aria-labelledby="dashboard-stats"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <h2 id="dashboard-stats" className="sr-only">
          Account stats
        </h2>
        <PmAccountStat
          label="Open orders"
          value="0"
          icon={ClipboardList}
          hint="No orders yet — placed orders will appear here."
          linkLabel="View all"
          linkHref="/dev/preview/account/orders"
        />
        <PmAccountStat
          label="Saved lists"
          value="0"
          icon={ListChecks}
          hint="Save BOMs and reorder kits in one click."
          linkLabel="Manage lists"
          linkHref="/dev/preview/account/lists"
        />
        <PmAccountStat
          label="Credit status"
          value="—"
          icon={Wallet}
          hint="Apply for trade credit through your account manager."
          linkLabel="Contact sales"
          linkHref="/dev/preview/contact"
        />
      </section>

      {/* Quick actions card */}
      <section
        aria-labelledby="dashboard-actions"
        className="rounded-md border border-pm-ink-200 bg-white p-6 shadow-sm"
      >
        <h2
          id="dashboard-actions"
          className="text-[16px] font-bold tracking-tight text-pm-ink-900"
        >
          Quick actions
        </h2>
        <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {QUICK_ACTIONS.map(({ label, href, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="group inline-flex w-full items-center gap-3 rounded-md border border-pm-ink-200 bg-white px-4 py-3 text-[14px] font-semibold text-pm-ink-900 transition-colors hover:border-pm-navy-light hover:bg-pm-navy-pale"
              >
                <Icon
                  size={16}
                  strokeWidth={1.5}
                  className="text-pm-navy-mid"
                />
                <span className="flex-1">{label}</span>
                <ArrowRight
                  size={14}
                  strokeWidth={2}
                  className="text-pm-ink-400 transition-transform group-hover:translate-x-0.5 group-hover:text-pm-navy-mid"
                />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </PmAccountAreaLayout>
  );
}
