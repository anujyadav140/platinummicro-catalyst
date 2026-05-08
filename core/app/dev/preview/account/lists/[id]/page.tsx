/**
 * /dev/preview/account/lists/[id]
 * -------------------------------
 * Detail view for a single saved list. Server entry handles the route
 * params + auth gate; the actual interactive surface lives in the client
 * <ListDetail> component (it needs the localStorage-backed pm-lists-store).
 *
 * The page header reads "List details" with the list name shown in the
 * body — we don't know the list name server-side because lists are
 * client/local-only.
 */
import { PmAccountAreaLayout } from '../../_components/account-area-layout';
import { PmAccountPageHeader } from '../../_components/page-header';
import { ListDetail } from './_components/list-detail';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ListDetailPage({ params }: Props) {
  const { id } = await params;

  return (
    <PmAccountAreaLayout>
      <PmAccountPageHeader
        title="List details"
        description="View, adjust quantities, or push everything into your cart in one click."
      />
      <ListDetail listId={id} />
    </PmAccountAreaLayout>
  );
}
