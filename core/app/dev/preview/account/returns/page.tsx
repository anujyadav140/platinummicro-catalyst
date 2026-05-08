/**
 * /dev/preview/account/returns
 * ----------------------------
 * Returns / RMA index. Empty state until BC exposes return-history via the
 * storefront API or we wire a custom RMA backend. The 30-day return window
 * and process are documented at /dev/preview/shipping-returns — we link to
 * it as the secondary CTA.
 */
import { RotateCcw } from 'lucide-react';

import { PmAccountAreaLayout } from '../_components/account-area-layout';
import { PmAccountEmptyState } from '../_components/empty-state';
import { PmAccountPageHeader } from '../_components/page-header';

export default function ReturnsPage() {
  return (
    <PmAccountAreaLayout>
      <PmAccountPageHeader
        title="Returns"
        description="Track RMAs and active returns. New return requests start with an email to your account manager."
      />
      <PmAccountEmptyState
        icon={RotateCcw}
        title="No returns to show"
        description="When you submit an RMA, its status, tracking, and refund timeline appear here."
        ctaLabel="Read the return policy"
        ctaHref="/dev/preview/shipping-returns"
      />
    </PmAccountAreaLayout>
  );
}
