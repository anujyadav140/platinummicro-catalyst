/**
 * PmAccountStat
 * -------------
 * Tile that displays a single account metric — e.g. "Active quotes", "Credit balance".
 * Used in the dashboard stats row.
 *
 * Pure server component (just markup).
 */

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface PmAccountStatProps {
  /** Small uppercase label above the value */
  label: string;
  /** Big number / formatted value */
  value: string | number;
  /** Optional Lucide icon shown top-right of the tile */
  icon?: LucideIcon;
  /** Optional inline supporting copy below the value */
  hint?: string;
  /** Optional link in the bottom-right corner */
  linkLabel?: string;
  linkHref?: string;
}

export function PmAccountStat({
  label,
  value,
  icon: Icon,
  hint,
  linkLabel,
  linkHref,
}: PmAccountStatProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-pm-ink-200 bg-white p-4 shadow-sm sm:gap-3 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-pm-tan">
          {label}
        </span>
        {Icon && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-pm-navy-pale text-pm-navy-mid">
            <Icon size={16} strokeWidth={1.5} />
          </div>
        )}
      </div>

      <div className="text-[22px] font-bold leading-none tracking-[-0.01em] text-pm-navy-deep sm:text-[28px]">
        {value}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-2 sm:gap-3">
        {hint ? (
          <span className="text-[12px] leading-[1.4] text-pm-ink-500">{hint}</span>
        ) : (
          <span />
        )}
        {linkLabel && linkHref && (
          <Link
            href={linkHref}
            className="inline-flex min-h-[32px] shrink-0 items-center gap-1 text-sm font-semibold text-pm-navy-mid transition-colors hover:text-pm-navy-light"
          >
            {linkLabel}
            <ArrowRight size={11} strokeWidth={2} />
          </Link>
        )}
      </div>
    </div>
  );
}
