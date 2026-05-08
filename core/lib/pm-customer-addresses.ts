/**
 * pm-customer-addresses
 * ----------------------
 * Server-side fetcher for the BC customer's saved address book. Hits BC's
 * `customer { addresses(first: 50) { ... } }` storefront query using the
 * session's customerAccessToken, and shapes the result into the same
 * structure pm-addresses-store uses on the client (so the addresses page
 * can seed its localStorage-backed store on first visit).
 *
 * Returns an empty array on signed-out / errored states — pages should
 * treat empty as "no addresses to seed", never as an error.
 */
import { auth } from '~/auth';
import { client } from '~/client';
import { graphql } from '~/client/graphql';

export interface PmBcAddress {
  /** BC's internal numeric ID — informational only on our side */
  entityId: number;
  firstName: string;
  lastName: string;
  company?: string;
  street1: string;
  street2?: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  phone?: string;
}

const PmCustomerAddressesQuery = graphql(`
  query PmCustomerAddressesQuery {
    customer {
      addresses(first: 50) {
        edges {
          node {
            entityId
            firstName
            lastName
            company
            address1
            address2
            city
            stateOrProvince
            postalCode
            country
            phone
          }
        }
      }
    }
  }
`);

export async function fetchPmCustomerAddresses(): Promise<PmBcAddress[]> {
  const session = await auth().catch(() => null);
  const customerAccessToken = session?.user?.customerAccessToken;
  if (!customerAccessToken) return [];

  try {
    const response = await client.fetch({
      document: PmCustomerAddressesQuery,
      customerAccessToken,
      fetchOptions: { cache: 'no-store' },
    });

    if (response.errors && response.errors.length > 0) return [];

    // BC codegen typing is broken project-wide (response.data: {}); cast
    // to the shape the query actually returns.
    const data = response.data as
      | {
          customer?: {
            addresses?: {
              edges?: Array<{
                node?: {
                  entityId: number;
                  firstName: string | null;
                  lastName: string | null;
                  company: string | null;
                  address1: string | null;
                  address2: string | null;
                  city: string | null;
                  stateOrProvince: string | null;
                  postalCode: string | null;
                  country: string | null;
                  phone: string | null;
                } | null;
              } | null> | null;
            } | null;
          } | null;
        }
      | undefined;

    const edges = data?.customer?.addresses?.edges ?? [];
    return edges
      .map((edge) => edge?.node)
      .filter((n): n is NonNullable<typeof n> => n != null)
      .map((n) => ({
        entityId: n.entityId,
        firstName: n.firstName ?? '',
        lastName: n.lastName ?? '',
        company: n.company || undefined,
        street1: n.address1 ?? '',
        street2: n.address2 || undefined,
        city: n.city ?? '',
        region: n.stateOrProvince ?? '',
        postalCode: n.postalCode ?? '',
        country: n.country ?? 'United States',
        phone: n.phone || undefined,
      }));
  } catch (error) {
    // eslint-disable-next-line no-console -- dev-only diagnostic
    console.error('[pm-customer-addresses] fetch failed:', error);
    return [];
  }
}
