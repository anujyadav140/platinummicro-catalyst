/**
 * PmAboutBanner
 * -------------
 * Dark navy strip with the company description. Sits between the brand wall
 * and the rest of the homepage as a "trust + provenance" beat. Pure server
 * component — static copy, no interactivity.
 *
 * Voice: third person, factual, low-hype per the design system rules. No
 * "we" / "our" / "exceptional partner experience" startup voice.
 */

export interface PmAboutBannerProps {
  eyebrow?: string;
  body?: string;
}

const DEFAULT_BODY =
  'For two decades, Platinum Micro has distributed enterprise IT from Southern California to system integrators, public-sector buyers, and healthcare networks worldwide. Forty-plus manufacturer partnerships, real lead times, named account managers — sourced direct, with trade credit available on approved application.';

export function PmAboutBanner({
  eyebrow = 'About Platinum Micro',
  body = DEFAULT_BODY,
}: PmAboutBannerProps) {
  return (
    <section className="bg-pm-navy-deepest text-white">
      <div className="mx-auto max-w-[920px] px-4 py-12 text-center sm:px-6 sm:py-16 md:px-8 md:py-20">
        <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-pm-terracotta-light">
          {eyebrow}
        </div>
        <p className="text-[15px] leading-[1.65] text-white/85 sm:text-[16px] md:text-[18px]">{body}</p>
      </div>
    </section>
  );
}
