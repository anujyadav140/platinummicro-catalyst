/**
 * PmHero — full-width split hero.
 * Navy left half holds copy + CTAs + stats. Warm right half holds 1-2
 * highlight cards (featured product, trust signal).
 *
 * Props are intentionally flat & serializable so this component can be
 * exposed to Makeswift later without refactoring (see docs/03-makeswift-strategy.md).
 */

export interface PmHeroStat {
  /** Big number, e.g. "20+" */
  value: string;
  /** Caption below, e.g. "Years in distribution" */
  label: string;
}

export interface PmHeroFeatureCard {
  eyebrow?: string;       // e.g. "In stock now"
  title: string;          // e.g. "HPE ProLiant DL380 Gen11"
  body: string;           // spec summary
  price?: string;         // e.g. "$8,420"
  priceSuffix?: string;   // e.g. "/unit"
  stockBadge?: string;    // e.g. "312 in stock"
}

export interface PmHeroProps {
  /** small all-caps line above headline */
  eyebrow?: string;

  /** main h1 */
  headline: string;

  /** lead paragraph beneath the headline */
  lead?: string;

  /** primary CTA */
  primaryCtaLabel: string;
  primaryCtaHref: string;

  /** secondary "ghost" CTA on the navy panel */
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;

  /** three stats shown beneath the CTAs (border-top divider above) */
  stats?: PmHeroStat[];

  /** main featured product card on the warm right panel */
  featureCard?: PmHeroFeatureCard;

  /** secondary trust message card (icon + headline + sub) */
  trustCardTitle?: string;
  trustCardBody?: string;
}
