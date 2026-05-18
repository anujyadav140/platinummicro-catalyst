/**
 * PmHero
 * ------
 * Two-column hero (navy left / warm tan-pale right). Server component — no
 * interactivity at this layer; CTAs are plain links.
 */

import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import type { PmHeroProps } from './pm-hero.types';

const DEFAULT_STATS = [
  { value: '20+', label: 'Years in distribution' },
  { value: '40k+', label: 'SKUs in stock' },
  { value: '120+', label: 'Manufacturer partners' },
];

export function PmHero({
  eyebrow,
  headline,
  lead,
  primaryCtaLabel,
  primaryCtaHref,
  secondaryCtaLabel,
  secondaryCtaHref,
  stats = DEFAULT_STATS,
  featureCard,
  trustCardTitle,
  trustCardBody,
}: PmHeroProps) {
  return (
    <section className="overflow-hidden bg-pm-navy-deep text-white">
      <div className="mx-auto grid max-w-pm-container grid-cols-1 items-stretch gap-0 px-4 sm:px-6 md:px-8 lg:grid-cols-[1.1fr_1fr] lg:min-h-[480px]">
        {/* ============================== LEFT ============================ */}
        <div className="flex flex-col justify-center gap-5 py-12 sm:gap-6 sm:py-16 md:py-20 lg:pr-14">
          {eyebrow && (
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-pm-terracotta-light">
              {eyebrow}
            </span>
          )}

          <h1 className="text-[28px] font-bold leading-[1.1] tracking-[-0.02em] text-white sm:text-[clamp(32px,4.4vw,56px)] sm:leading-[1.05]">
            {headline}
          </h1>

          {lead && (
            <p className="max-w-[520px] text-[15px] leading-[1.6] text-white/[0.78] sm:text-[17px]">
              {lead}
            </p>
          )}

          <div className="mt-2 flex flex-wrap gap-3">
            <Link
              href={primaryCtaHref}
              className="inline-flex items-center gap-2 rounded-md bg-pm-terracotta px-4 py-3.5 text-[15px] font-semibold tracking-[0.01em] text-white transition-colors hover:bg-pm-terracotta-light"
            >
              {primaryCtaLabel}
              <ArrowRight size={16} strokeWidth={2} />
            </Link>

            {secondaryCtaLabel && secondaryCtaHref && (
              <Link
                href={secondaryCtaHref}
                className="inline-flex items-center gap-2 rounded-md border-[1.5px] border-white/[0.45] bg-transparent px-4 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-white hover:text-pm-navy-deep hover:border-white"
              >
                {secondaryCtaLabel}
              </Link>
            )}
          </div>

          {stats && stats.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-6 border-t border-white/[0.12] pt-6 sm:gap-10">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <div className="text-[22px] font-bold leading-none text-white sm:text-[26px]">
                    {stat.value}
                  </div>
                  <div className="mt-1.5 text-[11px] uppercase tracking-[0.14em] text-white/60">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ============================== RIGHT =========================== */}
        <div className="relative flex flex-col justify-center gap-4 bg-pm-tan-pale px-5 py-10 sm:px-8 sm:py-12 md:px-14 md:py-14 lg:-mr-8">
          {featureCard && (
            <div className="rounded-lg border border-pm-ink-200 bg-white p-[22px] shadow-[0_2px_4px_rgba(7,21,37,0.06),0_4px_8px_rgba(7,21,37,0.05)]">
              {featureCard.eyebrow && (
                <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-pm-tan">
                  {featureCard.eyebrow}
                </div>
              )}
              <h3 className="mb-1.5 text-lg font-bold text-pm-navy-deep">
                {featureCard.title}
              </h3>
              <p className="mb-3.5 text-[13px] leading-[1.5] text-pm-ink-500">
                {featureCard.body}
              </p>
              {(featureCard.price || featureCard.stockBadge) && (
                <div className="flex items-center justify-between">
                  {featureCard.price && (
                    <div className="text-lg font-bold text-pm-navy-deep">
                      {featureCard.price}
                      {featureCard.priceSuffix && (
                        <small className="ml-1 text-[11px] font-medium text-pm-ink-500">
                          {featureCard.priceSuffix}
                        </small>
                      )}
                    </div>
                  )}
                  {featureCard.stockBadge && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-pm-success-bg px-2.5 py-1 text-xs font-semibold text-pm-success">
                      <span className="h-1.5 w-1.5 rounded-full bg-pm-success" />
                      {featureCard.stockBadge}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {trustCardTitle && (
            <div className="rounded-lg border border-pm-ink-200 bg-white px-[18px] py-3.5 shadow-[0_2px_4px_rgba(7,21,37,0.06),0_4px_8px_rgba(7,21,37,0.05)]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-[34px] w-[34px] items-center justify-center rounded-md bg-pm-navy-pale text-pm-navy-mid">
                  <Check size={18} strokeWidth={2} />
                </div>
                <div className="text-[13px] leading-[1.4]">
                  <strong className="text-pm-ink-900">{trustCardTitle}</strong>
                  {trustCardBody && (
                    <>
                      <br />
                      <span className="text-pm-ink-500">{trustCardBody}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
