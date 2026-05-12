'use client';

/**
 * PmCompareBar
 * ------------
 * Fixed bottom bar that surfaces the current compare selection. Renders
 * a horizontal strip of up to 4 product thumbnails with name + SKU + an
 * X to remove. Includes a "Compare" CTA linking to /dev/preview/compare/
 * and a "Clear all" reset.
 *
 * Visibility rules:
 *   - Hidden until the store has hydrated (avoids SSR/CSR mismatch).
 *   - Hidden when there are zero items selected.
 *
 * Layout constraint: the bar stays under ~96px tall so it doesn't
 * dominate the viewport. Thumbnails are 56x56 with a one-line name +
 * SKU stacked beside them.
 *
 * Read by /dev/preview/* via the wrapper layout once PmCompareProvider
 * is in scope.
 */

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowRight, ChevronDown, ChevronUp, X, Trash2 } from 'lucide-react';
import { Image } from '~/components/image';
import { usePmCompare } from '~/lib/pm-compare-store';

const COMPARE_HREF = '/dev/preview/compare/';

export function PmCompareBar() {
  const { items, ready, MAX, overflowed, remove, clear } = usePmCompare();
  const pathname = usePathname();
  // Default state: SHOW. User can collapse to a thin pill via the chevron.
  const [collapsed, setCollapsed] = useState(false);

  if (!ready || items.length === 0) return null;

  // Suppress on the compare page itself — the page already shows the same
  // products in full-fidelity cards, so the tray would just be visual noise.
  // Account for both with-trailing-slash and without (Next's trailingSlash
  // config is on, but defensive matching is cheap).
  if (
    pathname === COMPARE_HREF ||
    pathname === COMPARE_HREF.replace(/\/$/, '')
  ) {
    return null;
  }

  // Collapsed pill — keeps the affordance visible without dominating the
  // viewport. Tapping the pill (or its chevron) re-expands the full tray.
  if (collapsed) {
    return (
      <div className="fixed bottom-4 right-4 z-40">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label={`Expand compare tray (${items.length} of ${MAX} selected)`}
          className="inline-flex items-center gap-2 rounded-full border border-pm-ink-200 bg-white px-4 py-2.5 shadow-[0_-4px_16px_-8px_rgba(0,0,0,0.18)] transition-colors hover:border-pm-ink-300"
        >
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-pm-tan">
            Compare
          </span>
          <span className="rounded-full bg-pm-navy-deep px-2 py-0.5 text-[11px] font-bold text-white">
            {items.length}
          </span>
          <ChevronUp size={14} strokeWidth={2.25} className="text-pm-ink-500" />
        </button>
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label="Product comparison tray"
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-pm-ink-200 bg-white shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.18)] transition-transform duration-200 ease-pm-standard ${
        overflowed ? 'animate-[pm-compare-shake_360ms_ease-in-out]' : ''
      }`}
    >
      {/* Local keyframes for the overflow shake — keeps the feature
          self-contained without needing a tailwind config tweak. */}
      <style>{`@keyframes pm-compare-shake {
        0%, 100% { transform: translateX(0); }
        20% { transform: translateX(-6px); }
        40% { transform: translateX(6px); }
        60% { transform: translateX(-4px); }
        80% { transform: translateX(4px); }
      }`}</style>

      <div className="mx-auto flex max-w-[1280px] items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6">
        {/* Label + count */}
        <div className="hidden flex-shrink-0 flex-col leading-tight sm:flex">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-pm-tan">
            Compare
          </span>
          <span
            className={`text-[13px] font-semibold ${
              overflowed ? 'text-pm-terracotta' : 'text-pm-ink-700'
            }`}
            aria-live="polite"
          >
            {overflowed
              ? `Max ${MAX} products`
              : `${items.length} of ${MAX} selected`}
          </span>
        </div>

        {/* Thumbnail row — flex-grow, scrolls horizontally on narrow viewports */}
        <ul className="flex flex-1 items-center gap-2 overflow-x-auto sm:gap-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="group flex flex-shrink-0 items-center gap-2 rounded-md border border-pm-ink-200 bg-white p-1.5 pr-2 sm:gap-2.5"
            >
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-sm bg-pm-ink-100">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    width={56}
                    height={56}
                    sizes="56px"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span className="text-[10px] text-pm-ink-400">No img</span>
                )}
              </div>
              <div className="hidden min-w-0 max-w-[180px] flex-col leading-tight sm:flex">
                <span className="line-clamp-1 text-[12px] font-semibold text-pm-ink-900">
                  {item.name}
                </span>
                <span className="line-clamp-1 text-[11px] text-pm-ink-500">
                  SKU {item.sku}
                </span>
              </div>
              <button
                type="button"
                onClick={() => remove(item.id)}
                aria-label={`Remove ${item.name} from compare`}
                className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-pm-ink-500 transition-colors hover:bg-pm-ink-100 hover:text-pm-ink-900"
              >
                <X size={14} strokeWidth={2.25} />
              </button>
            </li>
          ))}
        </ul>

        {/* Actions */}
        <div className="flex flex-shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={clear}
            aria-label="Clear all compare items"
            className="inline-flex items-center gap-1.5 rounded-md border border-pm-ink-300 bg-white px-3 py-2 text-[13px] font-semibold text-pm-ink-700 transition-colors hover:border-pm-ink-500 hover:text-pm-ink-900"
          >
            <Trash2 size={13} strokeWidth={2} />
            <span className="hidden sm:inline">Clear all</span>
          </button>
          <Link
            href={COMPARE_HREF}
            aria-label="Open product comparison page"
            className="inline-flex items-center gap-1.5 rounded-md bg-pm-navy-deep px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-pm-navy-deep/90"
          >
            Compare
            <ArrowRight size={14} strokeWidth={2.25} />
          </Link>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            aria-label="Collapse compare tray"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-pm-ink-200 bg-white text-pm-ink-500 transition-colors hover:border-pm-ink-300 hover:text-pm-ink-900"
          >
            <ChevronDown size={16} strokeWidth={2.25} />
          </button>
        </div>
      </div>
    </div>
  );
}
