'use server';

/**
 * Sign-out server action
 * ----------------------
 * Calls Auth.js `signOut` (which clears the JWT cookie and runs the
 * `events.signOut` hook in `~/auth`, where Catalyst issues the BC
 * `LogoutMutation` and re-establishes an anonymous session). The action
 * then redirects to the preview home so the user lands somewhere that
 * makes sense after losing access to /account/profile.
 *
 * Used by the account dropdown in PmHeader and the sign-out CTA on the
 * profile page. Form-based so it works with progressive enhancement —
 * even without JS, posting the form signs the user out.
 */

import { signOut } from '~/auth';

export async function signOutAction() {
  await signOut({ redirectTo: '/dev/preview' });
}
