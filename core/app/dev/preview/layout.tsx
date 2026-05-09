import '~/globals.css';

import type { ReactNode } from 'react';
import { cookies } from 'next/headers';

import { fetchPmBanners, isPmTrustBarBanner } from '~/lib/pm-banners';
import { fetchPmCategories } from '~/lib/pm-categories-fetcher';
import { fetchPmMegaMenu } from '~/lib/pm-mega-menu-fetcher';
import { PmBannerStrip } from '~/components/pm-banner-strip';
import { PmNavProvider } from '~/lib/pm-mega-menu-context';
import { PM_TOP_BAR_DISMISSED_COOKIE } from '~/lib/pm-top-bar-cookie';

/**
 * Standalone layout for the design preview. Lives outside [locale] so it
 * renders without needing i18n setup or any of the Catalyst providers —
 * it's a pure "design playground" route family.
 *
 * Server-fetches three things and forwards them via PmNavProvider:
 *   1. BC top-level categories (nav rail, footer, sitemap, facet sidebar)
 *   2. BC mega-menu subtree (header dropdowns)
 *   3. Top-bar dismissed flag from a cookie (kills the split-second flash
 *      that localStorage-only dismissal causes — server now SSRs the
 *      correct state, so there's no client-side state correction)
 *
 * Both BC fetches are cached for 60s and resolved in parallel.
 */
export default async function PreviewLayout({ children }: { children: ReactNode }) {
  const [categories, megaMenu, banners, cookieStore] = await Promise.all([
    fetchPmCategories(),
    fetchPmMegaMenu(),
    fetchPmBanners(),
    cookies(),
  ]);
  const topBarDismissed =
    cookieStore.get(PM_TOP_BAR_DISMISSED_COOKIE)?.value === '1';

  // Split BC banners into "trust line" copy (renders inside PmTopBar's navy
  // strip) vs. everything else (renders in PmBannerStrip below). First
  // matching trust banner wins; subsequent ones are ignored.
  const trustBarHtml =
    banners.find(isPmTrustBarBanner)?.content ?? null;
  const otherBanners = banners.filter((b) => !isPmTrustBarBanner(b));

  return (
    <html lang="en">
      <head>
        <title>PM Catalyst — design preview</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="bg-pm-paper text-pm-ink-900 antialiased">
        <PmNavProvider
          value={{ categories, megaMenu, topBarDismissed, trustBarHtml }}
        >
          <PmBannerStrip banners={otherBanners} placement="top" />
          {children}
          <PmBannerStrip banners={otherBanners} placement="bottom" />
        </PmNavProvider>
      </body>
    </html>
  );
}
