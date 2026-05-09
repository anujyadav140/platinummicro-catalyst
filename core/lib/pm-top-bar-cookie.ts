/**
 * pm-top-bar-cookie
 * -----------------
 * Single source of truth for the cookie name + write helper that records
 * "user dismissed the top promotion bar" state. Cookies (vs localStorage)
 * so the server can read the value during SSR and render the bar in its
 * final state on first paint — no flash, no hydration mismatch.
 */

export const PM_TOP_BAR_DISMISSED_COOKIE = 'pm-top-bar-dismissed';

/**
 * Write the dismissed flag from the client. Same-site, scoped to the
 * dev/preview route family, 1-year TTL.
 *
 * No httpOnly: this needs to be readable from JS for the dismiss handler
 * to flip without a round trip. No `secure` flag in dev (we run on http
 * localhost); the prod cookie writer should add it.
 */
export function writePmTopBarDismissedCookie(dismissed: boolean): void {
  if (typeof document === 'undefined') return;
  const days = 365;
  const maxAge = days * 24 * 60 * 60;
  const value = dismissed ? '1' : '';
  // Empty value + max-age=0 deletes the cookie when un-dismissing.
  const cookie = dismissed
    ? `${PM_TOP_BAR_DISMISSED_COOKIE}=1; max-age=${maxAge}; path=/dev/preview; samesite=lax`
    : `${PM_TOP_BAR_DISMISSED_COOKIE}=; max-age=0; path=/dev/preview; samesite=lax`;
  document.cookie = cookie;
  void value;
}
