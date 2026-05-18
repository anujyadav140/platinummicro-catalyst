/**
 * PmPromotionCard
 * ---------------
 * Tile in the public promotions listing. Renders a single active or inactive
 * site-wide offer in the PM card aesthetic — hairline border, white surface,
 * navy title weight, a redemption-mechanism badge up top, and an end-date
 * footnote when the promo has a scheduled cutoff.
 *
 * Pure server component (no interactive bits) so it's just shaped data in,
 * markup out.
 */

import type { PmPromotion } from '~/lib/pm-promotions';

export interface PmPromotionCardProps {
  promo: PmPromotion;
}

const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });

export function PmPromotionCard({ promo }: PmPromotionCardProps) {
  const isCoupon = promo.redemption === 'COUPON';
  const badgeLabel = isCoupon ? 'Coupon code' : 'Automatic';
  const badgeClass = isCoupon
    ? 'bg-pm-navy-deep text-white'
    : 'bg-pm-terracotta text-white';

  return (
    <div
      className={`relative flex flex-col gap-3 rounded-lg border border-pm-ink-200 bg-white p-5 sm:p-6 ${
        promo.isActive ? '' : 'opacity-60'
      }`}
    >
      {/* Inactive overlay tag — unobtrusive, top-right */}
      {!promo.isActive && (
        <span className="absolute right-4 top-4 inline-flex items-center rounded-full bg-pm-ink-200 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-pm-ink-700">
          Inactive
        </span>
      )}

      {/* Redemption-mechanism badge */}
      <span
        className={`inline-flex w-fit items-center rounded-sm px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.14em] ${badgeClass}`}
      >
        {badgeLabel}
      </span>

      {/* Big summary line — the headline number ("10% off") */}
      <div className="text-[22px] font-bold leading-[1.15] tracking-[-0.018em] text-pm-navy-deep sm:text-[26px]">
        {promo.summary}
      </div>

      {/* Marketing headline from the admin notification */}
      <p className="text-sm leading-[1.5] text-pm-ink-700">{promo.headline}</p>

      {/* Optional end-date footnote */}
      {promo.endsAt && (
        <div className="mt-1 text-[12px] text-pm-ink-500">
          Ends {dateFormatter.format(new Date(promo.endsAt))}
        </div>
      )}
    </div>
  );
}
