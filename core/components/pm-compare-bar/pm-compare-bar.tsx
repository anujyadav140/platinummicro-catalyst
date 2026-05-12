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
import { ArrowRight, X, Trash2 } from 'lucide-react';
import { usePmCompare } from '~/lib/pm-compare-store';

const COMPARE_HREF = '/dev/preview/compare/';

export function PmCompareBar() {
  const { items, ready, MAX, overflowed, remove, clear } = usePmCompare();

  if (!ready || items.length === 0) return null;

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
                  // eslint-disable-next-line @next/next/no-img-element -- BC CDN images
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="max-h-full max-w-full object-contain"
                    loading="lazy"
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
        </div>
      </div>
    </div>
  );
}
