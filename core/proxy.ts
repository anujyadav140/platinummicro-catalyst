import { composeProxies } from './proxies/compose-proxies';
import { withAnalyticsCookies } from './proxies/with-analytics-cookies';
import { withAuth } from './proxies/with-auth';
import { withChannelId } from './proxies/with-channel-id';
import { withIntl } from './proxies/with-intl';
import { withPmPreviewAuth } from './proxies/with-pm-preview-auth';
import { withRoutes } from './proxies/with-routes';

// PM-MODIFIED: `withPmPreviewAuth` runs FIRST so it can short-circuit the chain
// on `/dev/preview/*` paths. This stops `withRoutes` from invoking BC's
// GraphQL route resolver on our hand-rolled preview pages (which would 404
// since BC doesn't know about /dev/preview/*).
export const proxy = composeProxies(
  withPmPreviewAuth,
  withAuth,
  withAnalyticsCookies,
  withIntl,
  withChannelId,
  withRoutes,
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - _vercel (vercel internals, eg: web vitals)
     * - favicon.ico (favicon file)
     * - admin (admin panel)
     * - sitemap.xml (sitemap route)
     * - xmlsitemap.php (legacy sitemap route)
     * - robots.txt (robots route)
     * - dev (PM-MODIFIED: design playground routes that don't need BC routing
     *        — preview-account auth gate is handled by the second matcher
     *        below, which targets only the protected deep routes)
     * - pm (PM-MODIFIED: Platinum Micro static assets — logo, brand images)
     * - fonts (PM-MODIFIED: Google Sans Flex variable font)
     */
    '/((?!api|admin|dev|pm|fonts|_next/static|_next/image|_vercel|favicon.ico|xmlsitemap.php|sitemap.xml|robots.txt).*)',
    /*
     * PM-MODIFIED: surgical inclusion for the preview-account auth gate.
     * `withPmPreviewAuth` handles every match here and short-circuits the
     * chain, so the storefront proxies (`withRoutes` etc.) never run on
     * these URLs.
     */
    '/dev/preview/account/:path*',
  ],
};
