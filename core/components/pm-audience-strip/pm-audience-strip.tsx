/**
 * PmAudienceStrip
 * ---------------
 * "Industries we serve" — horizontal strip of 6 audience cards on the
 * homepage. Visual philosophy borrowed from the live platinummicro.com strip
 * (compact label-led tiles in a row) but in our brand tokens — no stock
 * photography, no gradients, no consumer-soft radii.
 *
 * Cards are intentionally compact — icon + label only — so 6 fit in a single
 * row at desktop. Hover does the work: -3px lift, shadow grows, icon tile
 * shifts from navy-pale → terracotta, label color shifts to navy-deep, and a
 * small arrow fades in at the bottom-right.
 */

import {
  Landmark,
  GraduationCap,
  Globe2,
  Cpu,
  HeartPulse,
  ServerCog,
  ArrowUpRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PM_SEGMENTS, type PmSegment } from '~/lib/pm-segments';

const ICONS: Record<string, LucideIcon> = {
  Landmark,
  GraduationCap,
  Globe2,
  Cpu,
  HeartPulse,
  ServerCog,
};

export interface PmAudienceStripProps {
  /** Override the section title */
  title?: string;
  /** Override the segment list (defaults to PM_SEGMENTS) */
  segments?: PmSegment[];
}

export function PmAudienceStrip({
  title = 'Industries we serve',
  segments = PM_SEGMENTS,
}: PmAudienceStripProps) {
  return (
    <section className="py-12 sm:py-16 md:py-20">
      <div className="mx-auto max-w-pm-container px-4 sm:px-6 md:px-8">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-pm-tan">
          Who we serve
        </div>
        <h2 className="mb-6 text-[24px] font-bold leading-[1.2] tracking-[-0.018em] text-pm-ink-900 sm:mb-9 sm:text-[28px] md:text-[32px]">
          {title}
        </h2>

        {/* 6-col strip at lg, 3 at md, 2 at sm */}
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {segments.map((segment) => {
            const Icon = ICONS[segment.icon] ?? Globe2;
            return (
              <li key={segment.key}>
                <article
                  className="group relative flex h-full flex-col gap-3 overflow-hidden rounded-lg border border-pm-ink-200 bg-white p-5 shadow-sm transition-all duration-pm-base ease-pm-standard hover:-translate-y-1 hover:border-pm-terracotta/40 hover:shadow-md"
                  title={segment.description}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-pm-navy-pale text-pm-navy-mid transition-colors duration-pm-base ease-pm-standard group-hover:bg-pm-terracotta group-hover:text-white">
                    <Icon size={18} strokeWidth={1.75} />
                  </div>

                  <h3 className="text-[15px] font-bold leading-[1.25] text-pm-ink-900 transition-colors duration-pm-base group-hover:text-pm-navy-deep">
                    {segment.label}
                  </h3>

                  <ArrowUpRight
                    size={14}
                    strokeWidth={2}
                    aria-hidden
                    className="absolute bottom-4 right-4 translate-y-1 text-pm-terracotta opacity-0 transition-all duration-pm-base ease-pm-standard group-hover:translate-y-0 group-hover:opacity-100"
                  />
                </article>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
