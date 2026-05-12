/**
 * pm-checkout-overrides.js
 * ========================
 * Tiny customization script BigCommerce loads inside Stencil's
 * Optimized One-Page Checkout iframe. Configured via the BC checkout
 * settings field `custom_checkout_script_url` — see the session-sync
 * bootstrap script `core/scripts/bc-bootstrap-session-sync.mjs`.
 *
 * What it does today:
 *   1. Hides the "Sign Out" affordance on the Customer step. A user
 *      mid-purchase of a $15K server should not be one accidental click
 *      away from losing their session + cart. BC's "switch account at
 *      checkout" use case is rare enough that the footgun cost
 *      outweighs the feature value for our B2B audience.
 *
 * Why a JS file rather than just CSS: BC's checkout customization
 * pipeline accepts a script URL (via the public API) but not a raw CSS
 * string. So we inject a <style> tag from JS — same end result.
 *
 * Keep this file dependency-free. It runs inside the BC checkout
 * domain, not our Catalyst app — no module imports, no bundler.
 */
(function () {
  'use strict';

  var css = [
    /* Sign Out / Log Out button on the Customer step.
       Stencil OPC renders this with several DOM hooks depending on
       version, so we match a few of them: */
    '[data-test="sign-out-link"]',
    'button[data-test="sign-out-link"]',
    'a[href*="logout" i][data-test*="sign"]',
    'button[aria-label*="Sign Out" i]',
    'button[aria-label*="Sign out" i]',
    'a[aria-label*="Sign Out" i]',
    /* Defensive: catch the catch-all signout class some BC themes use */
    '.checkout-customer .button[aria-label*="sign" i][aria-label*="out" i]'
  ].join(', ') + ' { display: none !important; }';

  function inject() {
    if (document.getElementById('pm-checkout-overrides-style')) return;
    var style = document.createElement('style');
    style.id = 'pm-checkout-overrides-style';
    style.type = 'text/css';
    style.appendChild(document.createTextNode(css));
    (document.head || document.documentElement).appendChild(style);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }

  // Stencil OPC re-renders sections on step transitions; the style tag
  // we inject persists in <head>, but if BC ever wipes it we re-add on
  // visibilitychange as a cheap safety net.
  document.addEventListener('visibilitychange', inject);
})();
