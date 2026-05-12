/**
 * pm-top-bar-cookie
 * -----------------
 * Single source of truth for the cookie name + write helper that records
 * "user dismissed the top promotion bar" state. Cookies (vs localStorage)
 * so the server can read the value during SSR and render the bar in its
 * final state on first paint — no flash, no hydration mismatch.
 *
 * This module also owns the sister cookie for per-banner dismissals on the
 * BC admin-managed banner strips below the top bar (see PmBannerStrip).
 * Same rationale: server can filter dismissed banners out before render,
 * so there is no "ghost flash" of a banner that is about to disappear.
 */

export const PM_TOP_BAR_DISMISSED_COOKIE = 'pm-top-bar-dismissed';

/**
 * Stores the list of BC banner IDs the user has X-closed. Comma-separated
 * (e.g. "12,17,42"). One cookie keeps the wire format trivial; the list is
 * tiny because admins maintain a handful of banners at most. If BC admin
 * deletes and recreates a banner, BC issues a new ID, so the user will see
 * the recreated banner as new — exactly the desired behaviour.
 */
export const PM_DISMISSED_BANNERS_COOKIE = 'pm_dismissed_banners';

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

/**
 * Parse the dismissed-banners cookie value into a Set of banner IDs.
 * Defensive against garbage (non-numeric tokens are dropped) so a manually
 * edited cookie can't crash render.
 */
export function parseDismissedBannerIds(raw: string | undefined): Set<number> {
  const out = new Set<number>();
  if (!raw) return out;
  for (const part of raw.split(',')) {
    const n = Number(part.trim());
    if (Number.isFinite(n) && n > 0) out.add(n);
  }
  return out;
}

/**
 * Append a banner ID to the dismissed-banners cookie from the client.
 * Idempotent — re-dismissing an already-dismissed banner is a no-op.
 *
 * Scoped to /dev/preview to mirror the top-bar cookie; if the storefront
 * later moves out of /dev/preview, change the path here in one place.
 */
export function appendDismissedBannerId(id: number): void {
  if (typeof document === 'undefined') return;
  if (!Number.isFinite(id) || id <= 0) return;

  // Read current value out of document.cookie.
  const match = document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${PM_DISMISSED_BANNERS_COOKIE}=`));
  const raw = match ? decodeURIComponent(match.slice(PM_DISMISSED_BANNERS_COOKIE.length + 1)) : '';

  const ids = parseDismissedBannerIds(raw);
  if (ids.has(id)) return;
  ids.add(id);

  const days = 365;
  const maxAge = days * 24 * 60 * 60;
  const value = Array.from(ids).join(',');
  document.cookie = `${PM_DISMISSED_BANNERS_COOKIE}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/dev/preview; samesite=lax`;
}

/**
 * Wipe the dismissed-banners cookie — useful for QA to "un-dismiss"
 * everything without clearing all site data.
 */
export function clearDismissedBannersCookie(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${PM_DISMISSED_BANNERS_COOKIE}=; max-age=0; path=/dev/preview; samesite=lax`;
}
