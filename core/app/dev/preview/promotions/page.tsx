/**
 * /dev/preview/promotions
 * -----------------------
 * Public listing of active site-wide offers. Pulls from BC admin (Marketing →
 * Promotions) via the V3 REST endpoint so the marketing team can publish
 * deals without code changes.
 *
 * Server component — fetches at request time (revalidated every 60s) and
 * renders a responsive 1/2/3-column grid of `PmPromotionCard`s. Inactive
 * promos still render dimmed so the team can preview what's been queued or
 * paused in admin.
 */

import type { Metadata } from 'next';
import { Tag } from 'lucide-react';
import { fetchPmPromotions } from '~/lib/pm-promotions';
import { PmPromotionCard } from '~/components/pm-promotion-card';

const PAGE_DESCRIPTION =
  'Browse current site-wide offers — automatic discounts apply at checkout, coupon codes can be entered at checkout.';

export const metadata: Metadata = {
  title: 'Active promotions — Platinum Micro',
  description: PAGE_DESCRIPTION,
};

export default async function PromotionsPreviewPage() {
  const promotions = await fetchPmPromotions();

  return (
    <main className="bg-pm-paper">
      <div className="mx-auto max-w-pm-container px-8 py-12">
        {/* Page header */}
        <header className="mb-10 max-w-2xl">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-pm-tan">
            Marketing
          </div>
          <h1 className="mt-3 text-[clamp(28px,3vw,40px)] font-bold leading-[1.15] tracking-[-0.02em] text-pm-ink-900">
            Active promotions
          </h1>
          <p className="mt-4 text-[15px] leading-[1.6] text-pm-ink-700">
            {PAGE_DESCRIPTION}
          </p>
        </header>

        {promotions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-pm-ink-200 bg-white px-8 py-16 text-center">
            <Tag size={28} strokeWidth={1.6} className="text-pm-ink-400" />
            <p className="text-[15px] text-pm-ink-700">
              No active promotions right now — check back soon.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {promotions.map((promo) => (
              <PmPromotionCard key={promo.id} promo={promo} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
