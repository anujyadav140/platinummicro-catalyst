/**
 * PmTopBar — the trust bar that sits above the main header.
 * navy-deepest, 36px tall, NOT sticky.
 */

export interface PmTopBarProps {
  /** Contact phone number shown on the right side */
  phone?: string;

  /** Free freight threshold (USD) */
  freeShipMinimum?: number;

  /** Click handler for the "Quick order" link */
  onQuickOrder?: () => void;

  /**
   * Sign-in destination. Defaults to Catalyst's `/login` route.
   * (We pass a string href rather than an onClick so server-side links work
   * without JS hydration.)
   */
  signInHref?: string;

  /**
   * Profile destination — used when the user is signed in and we render
   * "Hi, {firstName}" in place of "Sign in".
   */
  profileHref?: string;
}
