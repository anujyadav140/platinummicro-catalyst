/* eslint-disable check-file/folder-naming-convention */
/*
 * Proxy to the existing BigCommerce sitemap index on the canonical URL
 */

import { getChannelIdFromLocale } from '~/channels.config';
import { client } from '~/client';
import { defaultLocale } from '~/i18n/locales';

// PM-MODIFIED: sitemap-index proxy must NOT prerender at build time.
// fetchSitemapIndex calls into BC and races against the build's other
// BC fetches (mega-menu, settings, etc.), tripping the store's 429
// rate limit and failing the deploy. Serving dynamically with a 1-hour
// revalidate keeps fresh data without breaking builds.
export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export const GET = async () => {
  const sitemapIndex = await client.fetchSitemapIndex(getChannelIdFromLocale(defaultLocale));

  return new Response(sitemapIndex, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
};
