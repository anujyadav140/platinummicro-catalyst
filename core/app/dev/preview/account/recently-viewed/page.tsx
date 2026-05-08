/**
 * /dev/preview/account/recently-viewed
 * ------------------------------------
 * Browsing history. Tracking lives in pm-recently-viewed-store, which the
 * PDP fires on mount via `usePmRecentlyViewed().trackView(...)`. This
 * page renders whatever's in the store.
 */
import { PmAccountAreaLayout } from '../_components/account-area-layout';
import { PmAccountPageHeader } from '../_components/page-header';
import { RecentlyViewedGrid } from './_components/recently-viewed-grid';

export default function RecentlyViewedPage() {
  return (
    <PmAccountAreaLayout>
      <PmAccountPageHeader
        title="Recently viewed"
        description="The last products you opened — quick way back to a part you were comparing. History is stored only on this browser."
      />
      <RecentlyViewedGrid />
    </PmAccountAreaLayout>
  );
}
