/**
 * /dev/preview/account/orders
 * ---------------------------
 * Orders index. BC's storefront API exposes orders via
 * `customer.orders` once we have a customerAccessToken on every request,
 * but until that's wired we render the empty state — which is what the
 * sandbox account would show anyway since no orders have been placed.
 */
import { ClipboardList } from 'lucide-react';

import { PmAccountAreaLayout } from '../_components/account-area-layout';
import { PmAccountEmptyState } from '../_components/empty-state';
import { PmAccountPageHeader } from '../_components/page-header';

export default function OrdersPage() {
  return (
    <PmAccountAreaLayout>
      <PmAccountPageHeader
        title="Orders"
        description="Every order placed on this account, with status and tracking once it ships."
      />
      <PmAccountEmptyState
        icon={ClipboardList}
        title="No orders yet"
        description="When you place your first order, you'll see status, tracking, and reorder shortcuts right here."
        ctaLabel="Browse the catalog"
        ctaHref="/dev/preview"
      />
    </PmAccountAreaLayout>
  );
}
