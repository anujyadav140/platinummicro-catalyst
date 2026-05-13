/**
 * pm-customer-profile
 * --------------------
 * Server-side fetcher for the full BC customer record. Auth.js's session
 * only carries `firstName`, `lastName`, and `email` — fine for header chrome,
 * but the Account Settings form needs `company` and `phone` too, which BC
 * stores on the customer profile.
 *
 * Hits BC's `customer { ... }` storefront query with the session's
 * customerAccessToken. Returns null when there's no session or when BC
 * fails to respond — pages should treat null as "show empty defaults"
 * rather than as an error condition.
 *
 * No caching: customer-scoped queries can't be cached publicly, and the
 * settings page reads this once per request anyway.
 */
import { auth } from '~/auth';
import { client } from '~/client';
import { graphql } from '~/client/graphql';

export interface PmCustomerProfile {
  entityId: number;
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
  phone?: string;
}

const PmCustomerProfileQuery = graphql(`
  query PmCustomerProfileQuery {
    customer {
      entityId
      firstName
      lastName
      email
      company
      phone
    }
  }
`);

export async function fetchPmCustomerProfile(): Promise<PmCustomerProfile | null> {
  const session = await auth().catch(() => null);
  const customerAccessToken = session?.user?.customerAccessToken;

  if (!customerAccessToken) return null;

  try {
    const response = await client.fetch({
      document: PmCustomerProfileQuery,
      customerAccessToken,
      fetchOptions: { cache: 'no-store' },
    });

    if (response.errors && response.errors.length > 0) return null;

    // The BC codegen types `response.data` as `{}` project-wide because
    // the schema introspection isn't running. Cast to the shape we
    // actually expect; runtime is fine.
    const data = response.data as
      | {
          customer?: {
            entityId: number;
            firstName: string | null;
            lastName: string | null;
            email: string | null;
            company: string | null;
            phone: string | null;
          } | null;
        }
      | undefined;

    const c = data?.customer;
    if (!c) return null;

    return {
      entityId: c.entityId,
      firstName: c.firstName ?? '',
      lastName: c.lastName ?? '',
      email: c.email ?? '',
      // BC returns empty string when unset; normalize to undefined so
      // form `defaultValue={undefined}` doesn't render a stray "".
      company: c.company || undefined,
      phone: c.phone || undefined,
    };
  } catch (error) {
    // eslint-disable-next-line no-console -- dev-only diagnostic
    console.warn('[pm-customer-profile] fetch failed:', error);
    return null;
  }
}
