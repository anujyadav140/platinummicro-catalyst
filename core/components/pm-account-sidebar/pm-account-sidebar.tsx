'use client';

/**
 * PmAccountSidebar
 * ----------------
 * Left rail used by the account section. Sticky on scroll, ~240px wide.
 *
 * The "active" state is computed from the current route segment so each
 * sub-page (orders, quotes, etc.) gets the right tab highlighted without
 * each page having to pass a flag.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ClipboardList,
  History,
  ListChecks,
  LogOut,
  MailOpen,
  MapPin,
  RotateCcw,
  Settings,
  LayoutDashboard,
  type LucideIcon,
} from 'lucide-react';
import { signOutAction } from '~/app/dev/preview/account/_actions/sign-out';
import { usePmLists } from '~/lib/pm-lists-store';

interface PmSidebarItem {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** When true, treat as exact match for the active state (e.g. dashboard root) */
  exact?: boolean;
  /** Optional small badge after the label — for unread message count etc. */
  badgeCount?: number;
}

const PRIMARY: PmSidebarItem[] = [
  { key: 'dashboard',       label: 'Dashboard',       href: '/dev/preview/account/profile',         icon: LayoutDashboard, exact: true },
  { key: 'orders',          label: 'Orders',          href: '/dev/preview/account/orders',          icon: ClipboardList },
  { key: 'returns',         label: 'Returns',         href: '/dev/preview/account/returns',         icon: RotateCcw },
  { key: 'messages',        label: 'Messages',        href: '/dev/preview/account/messages',        icon: MailOpen },
  { key: 'addresses',       label: 'Addresses',       href: '/dev/preview/account/addresses',       icon: MapPin },
  { key: 'lists',           label: 'Lists',           href: '/dev/preview/account/lists',           icon: ListChecks },
  { key: 'recently-viewed', label: 'Recently viewed', href: '/dev/preview/account/recently-viewed', icon: History },
  { key: 'settings',        label: 'Settings',        href: '/dev/preview/account/settings',        icon: Settings },
];

export interface PmAccountSidebarProps {
  /** Override the items list (e.g., to swap labels or routes for the real Catalyst account flow) */
  items?: PmSidebarItem[];
}

export function PmAccountSidebar({ items = PRIMARY }: PmAccountSidebarProps) {
  const pathname = usePathname();
  // Live counts from the lists store. Renders 0 until hydration completes,
  // at which point the badge fills in. SSR doesn't see the badge — fine,
  // it's a progressive-enhancement signal.
  const { totalListsCount } = usePmLists();

  // Inject dynamic badge counts onto known items. Right now only "lists"
  // shows a count; messages/orders/etc will plug in once their data
  // sources are wired (BC orders, B2B Ninja messages).
  const itemsWithCounts = items.map((item) =>
    item.key === 'lists'
      ? { ...item, badgeCount: totalListsCount }
      : item,
  );

  const isActive = (item: PmSidebarItem) => {
    if (!pathname) return false;
    if (item.exact) return pathname === item.href || pathname === `${item.href}/`;
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  return (
    <aside className="lg:sticky lg:top-[calc(var(--pm-header-top-h)+var(--pm-header-nav-h)+24px)] lg:self-start">
      <nav aria-label="Account navigation" className="flex flex-col gap-1">
        {itemsWithCounts.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`inline-flex items-center gap-3 rounded-md px-3 py-2.5 text-[14px] font-medium transition-colors duration-pm-fast ease-pm-standard ${
                active
                  ? 'bg-pm-navy-pale text-pm-navy-deep'
                  : 'text-pm-ink-700 hover:bg-pm-ink-100 hover:text-pm-ink-900'
              }`}
            >
              <Icon
                size={16}
                strokeWidth={1.5}
                className={active ? 'text-pm-navy-mid' : 'text-pm-ink-500'}
              />
              <span className="flex-1">{item.label}</span>
              {item.badgeCount !== undefined && item.badgeCount > 0 && (
                <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-pm-terracotta px-1.5 text-[10px] font-bold text-white">
                  {item.badgeCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <form action={signOutAction} className="mt-6 border-t border-pm-ink-200 pt-4">
        <button
          type="submit"
          className="inline-flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-[14px] font-medium text-pm-ink-500 transition-colors hover:bg-pm-danger-bg hover:text-pm-danger"
        >
          <LogOut size={16} strokeWidth={1.5} />
          Sign out
        </button>
      </form>
    </aside>
  );
}
