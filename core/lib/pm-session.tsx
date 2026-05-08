'use client';

/**
 * pm-session
 * ----------
 * Lightweight client-side session context for the /dev/preview surface.
 *
 * Pattern:
 *   1. Server components (shell wrappers, top-level pages) call `auth()` from
 *      `~/auth` to read the current Auth.js session.
 *   2. They distill it into a `PmSessionCustomer` and pass it to
 *      `<PmSessionProvider customer={...}>`.
 *   3. Any client component below — PmHeader, PmTopBar, drawers, etc. — can
 *      read it with `usePmSession()` without prop-drilling and without
 *      triggering an extra `/api/auth/session` round-trip on the client.
 *
 * `customer === null` means the user is signed out (or session lookup failed).
 *
 * For server components, prefer `auth()` directly — this hook is a pure
 * client-side affordance for UI that toggles based on signed-in state.
 */
import { createContext, useContext, type ReactNode } from 'react';

export interface PmSessionCustomer {
  /** First name from BC's customer record. Falls back to "there" if missing. */
  firstName: string;
  /** Last name from BC. Optional — used only for full-name renderings. */
  lastName?: string;
  /** Email — primary identifier shown in the account chrome. */
  email: string;
}

interface PmSessionState {
  customer: PmSessionCustomer | null;
  /** Convenience boolean — equivalent to `customer !== null`. */
  isSignedIn: boolean;
}

const PmSessionContext = createContext<PmSessionState>({
  customer: null,
  isSignedIn: false,
});

export interface PmSessionProviderProps {
  customer: PmSessionCustomer | null;
  children: ReactNode;
}

export function PmSessionProvider({
  customer,
  children,
}: PmSessionProviderProps) {
  const value: PmSessionState = {
    customer,
    isSignedIn: customer !== null,
  };
  return (
    <PmSessionContext.Provider value={value}>
      {children}
    </PmSessionContext.Provider>
  );
}

export function usePmSession(): PmSessionState {
  return useContext(PmSessionContext);
}
