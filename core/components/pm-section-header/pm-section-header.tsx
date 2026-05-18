/**
 * PmSectionHeader
 * ---------------
 * Shared header used by AudienceStrip, CategoryStrip, ProductGrid, BrandWall.
 * Pattern: small tan eyebrow + h2 + optional right-aligned link.
 *
 * Server component — pure layout.
 */

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export interface PmSectionHeaderProps {
  eyebrow?: string;
  title: string;
  linkLabel?: string;
  linkHref?: string;
}

export function PmSectionHeader({
  eyebrow,
  title,
  linkLabel,
  linkHref,
}: PmSectionHeaderProps) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4 sm:mb-9 sm:gap-6">
      <div>
        {eyebrow && (
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-pm-tan">
            {eyebrow}
          </div>
        )}
        <h2 className="text-[24px] font-bold leading-[1.2] tracking-[-0.018em] text-pm-ink-900 sm:text-[28px] md:text-[32px]">
          {title}
        </h2>
      </div>
      {linkLabel && linkHref && (
        <Link
          href={linkHref}
          className="inline-flex min-h-[44px] shrink-0 items-center gap-1 text-sm font-semibold text-pm-navy-mid transition-colors hover:text-pm-navy-light"
        >
          {linkLabel}
          <ArrowRight size={14} strokeWidth={2} />
        </Link>
      )}
    </div>
  );
}
