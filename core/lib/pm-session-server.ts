/**
 * pm-session (server)
 * --------------------
 * Server-side companion to `pm-session.tsx`. Reads the Auth.js session via
 * `auth()` and distills it into the `PmSessionCustomer` shape that the
 * client `<PmSessionProvider>` accepts.
 *
 * Returns `null` when there is no signed-in customer (or when reading the
 * session fails for any reason — Auth.js can throw if cookies are missing
 * or the JWT is malformed). Pages should treat null as "signed out" rather
 * than as an error condition.
 *
 * Usage from a server page:
 *
 *     import { getPmSessionCustomer } from '~/lib/pm-session-server';
 *
 *     export default async function Page() {
 *       const customer = await getPmSessionCustomer();
 *       return <SomeShell customer={customer}>...</SomeShell>;
 *     }
 */
import { auth } from '~/auth';
import type { PmSessionCustomer } from '~/lib/pm-session';

export async function getPmSessionCustomer(): Promise<PmSessionCustomer | null> {
  // `auth()` reads cookies + verifies the JWT. If there's no valid session
  // it resolves to null; if the cookie store throws (e.g., during static
  // generation) we fall through and treat as signed-out.
  const session = await auth().catch(() => null);
  const user = session?.user;

  if (!user?.customerAccessToken) return null;

  return {
    firstName: user.firstName ?? 'there',
    // Auth.js types `lastName` as `string | null | undefined`; PmSessionCustomer
    // wants `string | undefined`, so coerce null → undefined.
    lastName: user.lastName ?? undefined,
    email: user.email ?? '',
  };
}
