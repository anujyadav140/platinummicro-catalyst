'use client';

/**
 * PmPagination
 * ------------
 * Sleek numeric pagination — Linear/Vercel/Stripe style. Square 40x40
 * numbered buttons with hairline borders, wider Prev/Next buttons with
 * chevron icons.
 *
 * Algorithm: when there are more than 7 pages, show the first 1-2, the
 * current page +/- 1, and the last 1-2 with `…` between gaps.
 *
 * Each page is a Link so SSR + middle-click both work; preserves all
 * existing query params when changing pages.
 */

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PmPaginationProps {
  currentPage: number;
  totalPages: number;
}

function buildPageList(current: number, total: number): Array<number | 'ellipsis'> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const out: Array<number | 'ellipsis'> = [1];

  // Show 2 next to first when current is near the start
  if (current <= 3) {
    out.push(2, 3, 4);
    if (total > 5) out.push('ellipsis');
    out.push(total);
    return out;
  }

  // Show 2 next to last when current is near the end
  if (current >= total - 2) {
    out.push('ellipsis');
    out.push(total - 3, total - 2, total - 1, total);
    return out;
  }

  // Middle: 1 … (c-1) c (c+1) … N
  out.push('ellipsis');
  out.push(current - 1, current, current + 1);
  out.push('ellipsis');
  out.push(total);
  return out;
}

export function PmPagination({ currentPage, totalPages }: PmPaginationProps) {
  const params = useSearchParams();

  if (totalPages <= 1) return null;

  const buildHref = (page: number) => {
    const next = new URLSearchParams(params?.toString() ?? '');
    if (page === 1) {
      next.delete('page');
    } else {
      next.set('page', String(page));
    }
    const qs = next.toString();
    return qs ? `?${qs}` : '?';
  };

  const pages = buildPageList(currentPage, totalPages);
  const prevDisabled = currentPage <= 1;
  const nextDisabled = currentPage >= totalPages;

  return (
    <nav
      aria-label="Pagination"
      className="mt-12 flex flex-wrap items-center justify-center gap-2"
    >
      <PaginationStep
        href={buildHref(currentPage - 1)}
        disabled={prevDisabled}
        ariaLabel="Previous page"
        side="prev"
      />

      <ul className="flex items-center gap-1.5">
        {/* Mobile-only compact readout: "Page X of Y" — replaces the numbered
            list on phones so the bar fits without horizontal scroll. */}
        <li className="inline-flex h-11 items-center px-2 text-sm font-semibold text-pm-ink-700 sm:hidden">
          Page {currentPage} of {totalPages}
        </li>
        {pages.map((p, i) =>
          p === 'ellipsis' ? (
            <li
              key={`e-${i}`}
              aria-hidden
              className="hidden h-10 w-6 items-center justify-center text-[14px] text-pm-ink-400 sm:inline-flex"
            >
              …
            </li>
          ) : (
            <li key={p} className="hidden sm:block">
              <Link
                href={buildHref(p)}
                scroll={false}
                aria-current={p === currentPage ? 'page' : undefined}
                aria-label={`Go to page ${p}`}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-md border text-[14px] font-semibold transition-colors ${
                  p === currentPage
                    ? 'border-pm-navy-deep bg-pm-navy-deep text-white'
                    : 'border-pm-ink-200 bg-white text-pm-ink-700 hover:bg-pm-ink-100 hover:text-pm-ink-900'
                }`}
              >
                {p}
              </Link>
            </li>
          ),
        )}
      </ul>

      <PaginationStep
        href={buildHref(currentPage + 1)}
        disabled={nextDisabled}
        ariaLabel="Next page"
        side="next"
      />
    </nav>
  );
}

function PaginationStep({
  href,
  disabled,
  ariaLabel,
  side,
}: {
  href: string;
  disabled: boolean;
  ariaLabel: string;
  side: 'prev' | 'next';
}) {
  const baseClass =
    'inline-flex h-11 items-center gap-1.5 rounded-md border px-3.5 text-sm font-semibold transition-colors sm:h-10';
  const enabledClass =
    'border-pm-ink-200 bg-white text-pm-ink-700 hover:bg-pm-ink-100 hover:text-pm-ink-900';
  const disabledClass =
    'cursor-not-allowed border-pm-ink-100 bg-white text-pm-ink-300';

  const content =
    side === 'prev' ? (
      <>
        <ChevronLeft size={16} strokeWidth={2} />
        <span>Previous</span>
      </>
    ) : (
      <>
        <span>Next</span>
        <ChevronRight size={16} strokeWidth={2} />
      </>
    );

  if (disabled) {
    return (
      <span aria-disabled className={`${baseClass} ${disabledClass}`}>
        {content}
      </span>
    );
  }
  return (
    <Link
      href={href}
      scroll={false}
      aria-label={ariaLabel}
      className={`${baseClass} ${enabledClass}`}
    >
      {content}
    </Link>
  );
}
