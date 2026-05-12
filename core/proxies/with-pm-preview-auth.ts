/**
 * with-pm-preview-auth
 * --------------------
 * Catalyst's middleware doc recommends gating protected routes at the edge.
 * The stock `withAuth` proxy already does this for `/[locale]/account/*` (the
 * production storefront namespace), but our Platinum Micro preview lives at
 * `/dev/preview/*` — which is intentionally OUTSIDE the main proxy matcher
 * because we don't want `withRoutes` running BC route resolution on our
 * hand-rolled preview pages.
 *
 * This proxy bridges the gap: when a request hits `/dev/preview/account/*`
 * (excluding the public auth routes — sign-in, register, forgot/reset
 * password), we check the Auth.js session and bounce signed-out users to the
 * preview sign-in page at `/dev/preview/account`. For every other path it
 * passes through to the next proxy in the chain unchanged.
 *
 * This proxy is composed FIRST in `proxy.ts` so it can short-circuit the
 * rest of the chain on `/dev/preview/*` paths — `withRoutes` MUST NOT see
 * these URLs, or it will hit BC's GraphQL trying to resolve them and end up
 * 404'ing the page.
 *
 * Page-level guards via `<PmAccountAreaLayout>` still apply as a defense in
 * depth — this proxy just stops the unauthenticated request from ever
 * reaching the page render in the first place.
 */

import { NextResponse } from 'next/server';

import { auth } from '~/auth';

import { type ProxyFactory } from './compose-proxies';

// Public preview-account routes — these MUST stay reachable while signed out.
//   /dev/preview/account              → sign-in page itself
//   /dev/preview/account/register     → new-customer registration
//   /dev/preview/account/forgot       → password reset request form
//   /dev/preview/account/reset-password → password reset confirmation form
const PUBLIC_PREVIEW_ACCOUNT_RE =
  /^\/dev\/preview\/account(?:\/(?:register|forgot|reset-password)(?:\/.*)?)?\/?$/;

// Protected preview-account deep routes — any /dev/preview/account/<segment>
// that ISN'T one of the public ones above. We use a positive match (rather
// than relying on the negation alone) so a typo in the matcher can't silently
// expose a deep route.
const PROTECTED_PREVIEW_ACCOUNT_RE = /^\/dev\/preview\/account\/[^/]+/;

export const withPmPreviewAuth: ProxyFactory = (next) => {
  return async (request, event) => {
    const path = new URL(request.url).pathname;

    // Not a preview path → let the rest of the chain handle it as normal.
    if (!path.startsWith('/dev/preview/')) {
      return next(request, event);
    }

    // Public auth routes pass through to render — and we short-circuit so
    // `withRoutes` doesn't see them.
    if (PUBLIC_PREVIEW_ACCOUNT_RE.test(path)) {
      return NextResponse.next();
    }

    // Protected deep account routes — check Auth.js session.
    if (PROTECTED_PREVIEW_ACCOUNT_RE.test(path)) {
      const session = await auth();
      if (!session?.user?.customerAccessToken) {
        // Bounce to the preview sign-in page; the `from` param lets us
        // optionally honor a redirect-back after sign-in if we wire that
        // up later (the sign-in action doesn't read it yet).
        const signInUrl = new URL('/dev/preview/account', request.url);
        signInUrl.searchParams.set('from', path);
        return NextResponse.redirect(signInUrl, { status: 302 });
      }
      // Authenticated → short-circuit; the rest of the chain shouldn't run
      // for /dev/preview paths.
      return NextResponse.next();
    }

    // Other /dev/preview/* paths (homepage, catalog, etc.) — pass through
    // without invoking BC route resolution.
    return NextResponse.next();
  };
};
