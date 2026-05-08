/**
 * PmAccountEmptyState
 * --------------------
 * Reusable "nothing here yet" block for account sub-pages (Orders, Returns,
 * Messages, Recently viewed, etc). Replaces the dated grey banner from the
 * legacy Stencil account chrome with a clean, centered card:
 *
 *   - 56×56 ink-100 disc with a tinted Lucide icon
 *   - 18px h2 title
 *   - 14px body copy with comfortable max-width
 *   - Optional CTA link (rendered as our standard PM button)
 *
 * Pure server component — props in, JSX out.
 */
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

export interface PmAccountEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export function PmAccountEmptyState({
  icon: Icon,
  title,
  description,
  ctaLabel,
  ctaHref,
}: PmAccountEmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-md border border-dashed border-pm-ink-200 bg-white px-8 py-16 text-center">
      <span
        aria-hidden
        className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-pm-ink-100 text-pm-ink-500"
      >
        <Icon size={24} strokeWidth={1.5} />
      </span>
      <h2 className="text-[18px] font-bold tracking-tight text-pm-ink-900">
        {title}
      </h2>
      <p className="mt-2 max-w-[420px] text-[14px] leading-[1.55] text-pm-ink-500">
        {description}
      </p>
      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-pm-terracotta px-4 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-pm-terracotta-light"
        >
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
