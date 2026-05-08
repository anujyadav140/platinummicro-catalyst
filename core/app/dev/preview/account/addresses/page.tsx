/**
 * /dev/preview/account/addresses
 * ------------------------------
 * Saved address book — BC is the source of truth. Server fetches the
 * customer's addresses on every request (no-store), passes them to the
 * client `<AddressesGrid>`, and the grid wires Edit / Delete / Add to
 * BC mutations via server actions in `_actions/addresses.ts`. Each
 * mutation calls `revalidatePath` so this page re-renders with fresh
 * data automatically.
 */
import { fetchPmCustomerAddresses } from '~/lib/pm-customer-addresses';
import { PmAccountAreaLayout } from '../_components/account-area-layout';
import { PmAccountPageHeader } from '../_components/page-header';
import { AddressesGrid } from './_components/addresses-grid';

export default async function AddressesPage() {
  const addresses = await fetchPmCustomerAddresses();

  return (
    <PmAccountAreaLayout>
      <PmAccountPageHeader
        title="Addresses"
        description="Shipping and billing destinations on file. Defaults are pre-selected at checkout."
      />
      <AddressesGrid addresses={addresses} />
    </PmAccountAreaLayout>
  );
}
