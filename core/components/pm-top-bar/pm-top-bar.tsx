'use client';

/**
 * PmTopBar
 * --------
 * Slim trust bar that sits above the main header.
 *
 * Visual: navy-deepest bg, 36px tall, NOT sticky. White-bold lead text on the
 * left (MBE-certified trust signal, freight, ships from CA). On the right:
 * Quick order, Sign in, phone number, separated by middots, then a small X
 * to dismiss.
 *
 * Dismissal persists in localStorage under `pm-top-bar-dismissed` so the bar
 * stays gone on subsequent page loads. To re-show during dev, run
 * `localStorage.removeItem('pm-top-bar-dismissed')` in the console.
 */

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { usePmSession } from '~/lib/pm-session';
import type { PmTopBarProps } from './pm-top-bar.types';

const DEFAULT_PHONE = '(877)-PMG4YOU';
const DEFAULT_FREE_SHIP = 5000;
const DISMISS_KEY = 'pm-top-bar-dismissed';

export function PmTopBar({
  phone = DEFAULT_PHONE,
  freeShipMinimum = DEFAULT_FREE_SHIP,
  onQuickOrder,
  signInHref = '/dev/preview/account',
  profileHref = '/dev/preview/account/profile',
}: PmTopBarProps) {
  // Pulls signed-in customer (or null) from PmSessionProvider seeded by the
  // server shell. When signed in we swap "Sign in" → "Hi, {firstName}".
  const { customer } = usePmSession();

  // Render nothing until we've checked localStorage so we don't flash the bar
  // and then immediately hide it on the client. Default to `false` (showing)
  // for users who never dismissed.
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      // SSR or storage unavailable — show the bar.
      setDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Storage failure is non-fatal — bar still hides for this page load.
    }
  };

  // First paint before the effect runs: render the bar (avoids layout shift
  // for first-time visitors). After the effect: hide if dismissed.
  if (dismissed === true) return null;

  return (
    <div
      className="relative bg-pm-navy-deepest text-[13px] text-white/70"
      style={{ height: 'var(--pm-trust-bar-h)' }}
    >
      {/* Inner container reserves space on the right so the absolute-positioned
          X button never overlaps the phone number. */}
      <div className="mx-auto flex h-full max-w-pm-container items-center justify-between gap-6 px-8 pr-16">
        <span className="hidden md:inline">
          <strong className="font-semibold text-white">MBE-certified</strong>{' '}
          · Authorized HPE &amp; Intel partner
          <span className="px-2 text-white/40">·</span>
          Free freight on orders over ${freeShipMinimum.toLocaleString()}
          <span className="px-2 text-white/40">·</span>
          Ships from Southern California
        </span>

        <span className="flex items-center gap-3">
          <button
            type="button"
            onClick={onQuickOrder}
            aria-label="Open quick order modal"
            className="font-semibold text-white border-b border-dotted border-white/40 hover:border-white transition-colors"
          >
            Quick order
          </button>
          <span className="text-white/40">·</span>
          {customer ? (
            <a
              href={profileHref}
              className="font-semibold text-white transition-colors hover:text-pm-tan"
              title={customer.email}
            >
              Hi, {customer.firstName}
            </a>
          ) : (
            <a
              href={signInHref}
              className="hover:text-white transition-colors"
            >
              Sign in
            </a>
          )}
          <span className="text-white/40">·</span>
          <a
            href={`tel:${phone.replace(/[^\d+]/g, '')}`}
            className="hover:text-white transition-colors"
          >
            {phone}
          </a>
        </span>
      </div>

      {/* Dismiss button — flush to the right edge of the bar, vertically
          centered. Sits outside the container so it always lands at the
          viewport edge regardless of content width. */}
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss promotion bar"
        title="Dismiss"
        className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-white/60 transition-colors hover:bg-white/10 hover:text-white"
      >
        <X size={20} strokeWidth={2} />
      </button>
    </div>
  );
}
