/**
 * PmAccountPageHeader
 * --------------------
 * Title strip for every account sub-page. Eyebrow tag (e.g. "ACCOUNT") on
 * top, big H1 below, optional one-line description, optional right-aligned
 * action slot (e.g., a "+ New address" button).
 *
 * The eyebrow is always tan to keep the rhythm consistent across all
 * account pages — it's the breadcrumb-equivalent identifier for "you're
 * inside the account area."
 */
import type { ReactNode } from 'react';

export interface PmAccountPageHeaderProps {
  /** Small uppercase tracked label above the H1. Defaults to "ACCOUNT". */
  eyebrow?: string;
  /** Page title (H1). */
  title: string;
  /** Optional one-line description under the title. */
  description?: string;
  /** Optional action node — typically a button or link, rendered top-right. */
  action?: ReactNode;
}

export function PmAccountPageHeader({
  eyebrow = 'Account',
  title,
  description,
  action,
}: PmAccountPageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-pm-ink-200 pb-6 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-pm-tan">
          {eyebrow}
        </div>
        <h1 className="mt-1.5 text-[26px] font-bold leading-[1.2] tracking-[-0.012em] text-pm-ink-900">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-[14px] leading-[1.55] text-pm-ink-500">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
