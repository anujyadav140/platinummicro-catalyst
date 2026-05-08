import { composeProxies } from './proxies/compose-proxies';
import { withAnalyticsCookies } from './proxies/with-analytics-cookies';
import { withAuth } from './proxies/with-auth';
import { withChannelId } from './proxies/with-channel-id';
import { withIntl } from './proxies/with-intl';
import { withRoutes } from './proxies/with-routes';

export const proxy = composeProxies(
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
     * - dev (PM-MODIFIED: design playground routes that don't need BC routing)
     * - pm (PM-MODIFIED: Platinum Micro static assets — logo, brand images)
     * - fonts (PM-MODIFIED: Google Sans Flex variable font)
     */
    '/((?!api|admin|dev|pm|fonts|_next/static|_next/image|_vercel|favicon.ico|xmlsitemap.php|sitemap.xml|robots.txt).*)',
  ],
};
