'use client';

/**
 * PmHeader
 * --------
 * Two-row site header.
 *   - Top row (white, 84px, sticky): logo, pill search, action buttons
 *   - Bottom row (navy-deep, 48px): primary nav rail with mega-menu hooks
 *
 * Mega-menu behavior:
 *   - Hover a nav item that has a mega entry → panel opens after a short delay
 *   - Mouse can travel from the nav item into the panel without closing
 *   - Mouse leaves the whole header → panel closes (with grace delay)
 *   - Esc closes immediately
 *
 * Search posts as a GET form so it works without JS (Catalyst's /search
 * route picks up the `q` query param).
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Box,
  ChevronDown,
  LogOut,
  ShoppingCart,
  User,
} from 'lucide-react';
import { PM_CATEGORIES } from '~/lib/pm-categories';
import { PM_MEGA_MENU } from '~/lib/pm-mega-menu';
import { usePmSession } from '~/lib/pm-session';
import { signOutAction } from '~/app/dev/preview/account/_actions/sign-out';
import type { PmHeaderProps } from './pm-header.types';

const HOVER_OPEN_DELAY = 100;
const HOVER_CLOSE_DELAY = 120;

export function PmHeader({
  quoteCount = 0,
  categories = PM_CATEGORIES,
  onQuickOrder,
  onOpenQuote,
  searchAction = '/search',
  searchPlaceholder = 'Search by keyword, brand, or SKU',
  accountHref = '/account',
  logoSrc = '/pm/logo.png',
  homeHref = '/',
}: PmHeaderProps) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Schedule an open after a short delay (lets users skim past items)
  const scheduleOpen = (key: string) => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    if (openTimer.current) clearTimeout(openTimer.current);
    openTimer.current = setTimeout(() => setOpenKey(key), HOVER_OPEN_DELAY);
  };

  // Schedule a close (grace delay so mouse can travel into the panel)
  const scheduleClose = () => {
    if (openTimer.current) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenKey(null), HOVER_CLOSE_DELAY);
  };

  // Esc closes immediately
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenKey(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (openTimer.current) clearTimeout(openTimer.current);
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  const activeMega = openKey ? PM_MEGA_MENU[openKey] : undefined;

  return (
    <header
      className="sticky top-0 z-50 bg-pm-navy-deep text-white shadow-[0_1px_0_rgba(255,255,255,0.04)]"
      onMouseLeave={scheduleClose}
    >
      {/* ============================ TOP ROW ============================ */}
      <div className="bg-white text-pm-ink-900 border-b border-pm-ink-200">
        <div
          className="mx-auto flex max-w-pm-container items-center gap-6 px-8"
          style={{ height: 'var(--pm-header-top-h)' }}
        >
          {/* Logo */}
          <Link
            href={homeHref}
            aria-label="Platinum Micro home"
            className="flex shrink-0 items-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} alt="Platinum Micro" width="200" height="56" className="block h-14 w-auto" />
          </Link>

          {/* Search field */}
          <form
            action={searchAction}
            method="get"
            className="flex flex-1 items-stretch overflow-hidden rounded-lg border-[1.5px] border-pm-ink-300 bg-white max-w-[720px] focus-within:border-pm-navy-light focus-within:shadow-[0_0_0_3px_rgba(46,109,180,0.15)] transition-all"
          >
            <input
              type="search"
              name="q"
              placeholder={searchPlaceholder}
              aria-label="Search products"
              className="min-w-0 flex-1 border-0 bg-transparent px-[18px] py-[13px] text-[15px] text-pm-ink-900 outline-none placeholder:text-pm-ink-500"
            />
            <button
              type="submit"
              className="shrink-0 bg-pm-terracotta px-7 text-[15px] font-semibold text-white transition-colors hover:bg-pm-terracotta-light"
            >
              Search
            </button>
          </form>

          {/* Action buttons */}
          <div className="flex shrink-0 items-center gap-[18px]">
            <button
              type="button"
              onClick={onQuickOrder}
              title="Quick order — paste SKUs and quantities"
              className="inline-flex items-center gap-2 px-1 py-1.5 text-sm font-semibold text-pm-ink-900 transition-colors hover:text-pm-navy-light"
            >
              <Box size={18} strokeWidth={1.5} />
              <span>Quick order</span>
            </button>

            <PmHeaderAccountControl
              accountHref={accountHref}
              profileHref="/dev/preview/account/profile"
            />

            <button
              type="button"
              onClick={onOpenQuote}
              title="Cart"
              className="relative inline-flex items-center gap-2 px-1 py-1.5 text-sm font-semibold text-pm-ink-900 transition-colors hover:text-pm-navy-light"
            >
              <ShoppingCart size={18} strokeWidth={1.5} />
              <span>Cart</span>
              {quoteCount > 0 && (
                <span className="absolute -right-2.5 -top-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-pm-terracotta px-[5px] text-[10px] font-bold text-white">
                  {quoteCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ============================ NAV ROW ============================ */}
      {/* (PmHeaderAccountControl is defined at the bottom of this file —
          handles the signed-out "Account" link and the signed-in dropdown.) */}
      <div className="relative bg-pm-navy-deep border-t border-white/5">
        <nav
          aria-label="Primary"
          className="mx-auto flex max-w-pm-container items-center gap-1 px-8"
          style={{ height: 'var(--pm-header-nav-h)' }}
        >
          {categories.map((cat) => {
            const hasMega = Boolean(PM_MEGA_MENU[cat.key]);
            const isOpen = openKey === cat.key;
            return (
              <Link
                key={cat.key}
                href={cat.href}
                onMouseEnter={() => (hasMega ? scheduleOpen(cat.key) : setOpenKey(null))}
                aria-haspopup={hasMega ? 'true' : undefined}
                aria-expanded={hasMega ? isOpen : undefined}
                className={`inline-flex items-center gap-1.5 rounded-md px-4 py-3 text-sm font-medium transition-all duration-[120ms] ease-pm-standard ${
                  isOpen
                    ? 'bg-white/10 text-white'
                    : 'text-white/85 hover:bg-white/10 hover:text-white'
                }`}
              >
                {cat.label}
                {hasMega && (
                  <ChevronDown
                    size={14}
                    strokeWidth={2}
                    className={`opacity-60 transition-transform duration-[120ms] ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* MEGA PANEL — absolute, full-width, overlays content below */}
        {activeMega && (
          <div
            className="absolute inset-x-0 top-full z-40 border-t border-pm-ink-200 bg-white text-pm-ink-900 shadow-lg"
            onMouseEnter={() => {
              if (closeTimer.current) {
                clearTimeout(closeTimer.current);
                closeTimer.current = null;
              }
            }}
            onMouseLeave={scheduleClose}
          >
            <div
              className={`mx-auto grid max-w-pm-container gap-8 px-8 py-8 ${
                activeMega.promo
                  ? 'grid-cols-[repeat(4,1fr)_280px]'
                  : 'grid-cols-4'
              }`}
            >
              {activeMega.cols.map((col) => (
                <div key={col.title}>
                  <h5 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-pm-tan">
                    {col.title}
                  </h5>
                  <ul className="flex flex-col gap-2">
                    {col.items.map((item) => (
                      // Many mega-menu items in the same column share the
                      // same href (all the "form factor" links go to the
                      // parent PLP, etc.), so the label is the unique
                      // discriminator within a column.
                      <li key={item.label}>
                        <Link
                          href={item.href}
                          className="text-sm text-pm-ink-700 transition-colors hover:text-pm-navy-light"
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              {activeMega.promo && (
                <div className="flex flex-col gap-3 rounded-lg bg-pm-tan-pale p-5">
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-pm-tan">
                    {activeMega.promo.eyebrow}
                  </span>
                  <h4 className="text-[18px] font-bold leading-[1.3] text-pm-navy-deep">
                    {activeMega.promo.title}
                  </h4>
                  <p className="text-[13px] leading-[1.5] text-pm-ink-700">
                    {activeMega.promo.body}
                  </p>
                  <Link
                    href={activeMega.promo.ctaHref}
                    className="mt-1 inline-flex items-center gap-1.5 self-start rounded-md bg-pm-terracotta px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-pm-terracotta-light"
                  >
                    {activeMega.promo.ctaLabel}
                    <ArrowRight size={12} strokeWidth={2.5} />
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

/**
 * PmHeaderAccountControl
 * ----------------------
 * Toggles between two affordances depending on PmSessionProvider state:
 *
 *   - SIGNED OUT — a plain "Account" link to the sign-in page (the current
 *     pre-auth behaviour, unchanged).
 *   - SIGNED IN  — a "Hi, {firstName} ▾" trigger that opens a small popover
 *     with profile shortcuts and a Sign out form (posts to signOutAction,
 *     which calls Auth.js `signOut` + redirects).
 *
 * Click-outside + Escape both close the dropdown. The trigger is keyboard-
 * accessible (it's a real `<button aria-haspopup>`).
 */
function PmHeaderAccountControl({
  accountHref,
  profileHref,
}: {
  accountHref: string;
  profileHref: string;
}) {
  const { customer } = usePmSession();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Click outside → close
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const wrapper = wrapperRef.current;
      if (wrapper && !wrapper.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  // Escape → close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!customer) {
    return (
      <Link
        href={accountHref}
        title="Account"
        className="inline-flex items-center gap-2 px-1 py-1.5 text-sm font-semibold text-pm-ink-900 transition-colors hover:text-pm-navy-light"
      >
        <User size={18} strokeWidth={1.5} />
        <span>Account</span>
      </Link>
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={customer.email}
        className={`inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold transition-colors ${
          open
            ? 'bg-pm-ink-100 text-pm-navy-deep'
            : 'text-pm-ink-900 hover:text-pm-navy-light'
        }`}
      >
        <User size={18} strokeWidth={1.5} />
        <span>Hi, {customer.firstName}</span>
        <ChevronDown
          size={14}
          strokeWidth={2}
          className={`opacity-60 transition-transform duration-[120ms] ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-1.5 w-[260px] overflow-hidden rounded-md border border-pm-ink-200 bg-white shadow-lg"
        >
          <div className="border-b border-pm-ink-100 px-4 py-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-pm-tan">
              Signed in as
            </div>
            <div className="mt-0.5 truncate text-[13px] font-semibold text-pm-ink-900">
              {customer.email}
            </div>
          </div>

          <Link
            href={profileHref}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-pm-ink-700 transition-colors hover:bg-pm-ink-100 hover:text-pm-ink-900"
          >
            <User size={14} strokeWidth={1.75} />
            Account &amp; profile
          </Link>

          <form action={signOutAction}>
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2.5 border-t border-pm-ink-100 px-4 py-2.5 text-left text-[13px] font-semibold text-pm-ink-700 transition-colors hover:bg-pm-danger-bg hover:text-pm-danger"
            >
              <LogOut size={14} strokeWidth={1.75} />
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
