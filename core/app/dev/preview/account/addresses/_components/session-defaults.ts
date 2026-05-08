'use client';

/**
 * Tiny shim that exposes session-derived defaults for the address form
 * (firstName / lastName) without importing the full PmSessionProvider
 * surface. Renders nothing — just a hook.
 *
 * Lives in this folder so it's discoverable next to the consumer.
 */
import { usePmSession } from '~/lib/pm-session';

export function useSession() {
  const { customer } = usePmSession();
  return {
    firstName: customer?.firstName ?? '',
    lastName: customer?.lastName ?? '',
  };
}
