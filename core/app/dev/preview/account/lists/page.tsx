/**
 * /dev/preview/account/lists
 * --------------------------
 * Saved-list dashboard. Auth-gated through PmAccountAreaLayout. The
 * actual UI is the client-side <ListsGrid> which reads from the
 * pm-lists-store (localStorage-backed). Create / rename / delete are
 * all functional now.
 */
import { PmAccountAreaLayout } from '../_components/account-area-layout';
import { PmAccountPageHeader } from '../_components/page-header';
import { ListsGrid } from './_components/lists-grid';

export default function ListsPage() {
  return (
    <PmAccountAreaLayout>
      <PmAccountPageHeader
        title="Lists"
        description="Save BOMs, recurring carts, and shortlists. Add their items to your cart in one click."
      />
      <ListsGrid />
    </PmAccountAreaLayout>
  );
}
