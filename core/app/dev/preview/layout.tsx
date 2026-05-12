import '~/globals.css';

import type { ReactNode } from 'react';
import { cookies } from 'next/headers';

import { fetchPmBanners, isPmTrustBarBanner } from '~/lib/pm-banners';
import { fetchPmCategories } from '~/lib/pm-categories-fetcher';
import { fetchPmFooterConfig } from '~/lib/pm-footer-fetcher';
import { fetchPmMegaMenu } from '~/lib/pm-mega-menu-fetcher';
import { PmBannerStrip } from '~/components/pm-banner-strip';
import { PmCompareBar } from '~/components/pm-compare-bar';
import { PmRangeSliderStyles } from '~/components/pm-range-slider';
import { PmCompareProvider } from '~/lib/pm-compare-store';
import { PmNavProvider } from '~/lib/pm-mega-menu-context';
import {
  PM_DISMISSED_BANNERS_COOKIE,
  PM_TOP_BAR_DISMISSED_COOKIE,
  parseDismissedBannerIds,
} from '~/lib/pm-top-bar-cookie';

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
  const [categories, megaMenu, banners, footerConfig, cookieStore] = await Promise.all([
    fetchPmCategories(),
    fetchPmMegaMenu(),
    fetchPmBanners(),
    fetchPmFooterConfig(),
    cookies(),
  ]);
  const topBarDismissed =
    cookieStore.get(PM_TOP_BAR_DISMISSED_COOKIE)?.value === '1';

  // Per-banner dismissals: filter out anything the user has previously
  // X-closed before render so there's no SSR-to-CSR flash of a banner that
  // is about to disappear on the client. Cookie shape: comma-separated BC
  // banner IDs (see pm-top-bar-cookie.ts).
  const dismissedBannerIds = parseDismissedBannerIds(
    cookieStore.get(PM_DISMISSED_BANNERS_COOKIE)?.value,
  );
  const visibleBanners = banners.filter((b) => !dismissedBannerIds.has(b.id));

  // Split BC banners into "trust line" copy (renders inside PmTopBar's navy
  // strip) vs. everything else (renders in PmBannerStrip below). First
  // matching trust banner wins; subsequent ones are ignored.
  const trustBarHtml =
    visibleBanners.find(isPmTrustBarBanner)?.content ?? null;
  const otherBanners = visibleBanners.filter((b) => !isPmTrustBarBanner(b));

  return (
    <html lang="en">
      <head>
        <title>PM Catalyst — design preview</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Global static styles for pseudo-element thumbs of <PmRangeSlider>. */}
        <PmRangeSliderStyles />
      </head>
      <body className="bg-pm-paper text-pm-ink-900 antialiased">
        <PmNavProvider
          value={{ categories, megaMenu, topBarDismissed, trustBarHtml, footerConfig }}
        >
          <PmCompareProvider>
            <PmBannerStrip banners={otherBanners} placement="top" />
            {children}
            {/* Fixed compare tray — bottom-anchored to the viewport, so its
                placement in source order only needs to live inside the
                provider tree, above existing bottom-of-page elements. */}
            <PmCompareBar />
            <PmBannerStrip banners={otherBanners} placement="bottom" />
          </PmCompareProvider>
        </PmNavProvider>
      </body>
    </html>
  );
}
