import bundleAnalyzer from '@next/bundle-analyzer';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

import { writeBuildConfig } from './build-config/writer';
import { client } from './client';
import { graphql } from './client/graphql';
import { cspHeader } from './lib/content-security-policy';

const withNextIntl = createNextIntlPlugin({
  experimental: {
    createMessagesDeclaration: './messages/en.json',
  },
});

const SettingsQuery = graphql(`
  query SettingsQuery {
    site {
      settings {
        url {
          vanityUrl
          cdnUrl
          checkoutUrl
        }
        locales {
          code
          isDefault
        }
      }
    }
  }
`);

// PM-MODIFIED: dev-only escape hatch.
// When PM_SKIP_BC_BOOT=1 is set in .env.local we skip the live BigCommerce
// SettingsQuery fetch and write a stub build-config.json instead. This lets
// /dev/preview render before the Storefront API token is wired up. Production
// builds and `pnpm dev` against a real store leave the flag unset, so the
// real fetch runs as designed.
const PM_SKIP_BC_BOOT = process.env.PM_SKIP_BC_BOOT === '1';

async function writeSettingsToBuildConfig() {
  if (PM_SKIP_BC_BOOT) {
    // eslint-disable-next-line no-console -- visible signal during dev
    console.log(
      '[PM] PM_SKIP_BC_BOOT=1 — skipping BigCommerce SettingsQuery, using stub build config.',
    );
    return await writeBuildConfig({
      locales: [{ code: 'en', isDefault: true }],
      urls: {
        vanityUrl: 'http://localhost:3000',
        checkoutUrl: 'http://localhost:3000',
        cdnUrls: ['cdn11.bigcommerce.com'],
      },
    });
  }

  const { data } = await client.fetch({ document: SettingsQuery });

  const cdnEnvHostnames = process.env.NEXT_PUBLIC_BIGCOMMERCE_CDN_HOSTNAME;

  const cdnUrls = (
    cdnEnvHostnames
      ? cdnEnvHostnames.split(',').map((s) => s.trim())
      : [data.site.settings?.url.cdnUrl]
  ).filter((url): url is string => !!url);

  if (!cdnUrls.length) {
    throw new Error(
      'No CDN URLs found. Please ensure that NEXT_PUBLIC_BIGCOMMERCE_CDN_HOSTNAME is set correctly.',
    );
  }

  return await writeBuildConfig({
    locales: data.site.settings?.locales,
    urls: {
      ...data.site.settings?.url,
      cdnUrls,
    },
  });
}

export default async (): Promise<NextConfig> => {
  const settings = await writeSettingsToBuildConfig();

  let nextConfig: NextConfig = {
    reactStrictMode: true,
    experimental: {
      optimizePackageImports: ['@icons-pack/react-simple-icons'],
    },
    typescript: {
      ignoreBuildErrors: !!process.env.CI,
    },
    // default URL generation in BigCommerce uses trailing slash
    trailingSlash: process.env.TRAILING_SLASH !== 'false',
    // Redirect bare root (and the default Catalyst locale prefix) into the
    // PM storefront so visitors never land on the stock Catalyst pages (which
    // can link out to the BC Stencil theme).
    // eslint-disable-next-line @typescript-eslint/require-await
    async redirects() {
      return [
        {
          source: '/',
          destination: '/dev/preview/',
          permanent: false,
        },
        // Catch the locale-prefixed root too (e.g. /en/)
        {
          source: '/en',
          destination: '/dev/preview/',
          permanent: false,
        },
      ];
    },
    // eslint-disable-next-line @typescript-eslint/require-await
    async headers() {
      const cdnLinks = settings.urls.cdnUrls.map((url) => ({
        key: 'Link',
        value: `<https://${url}>; rel=preconnect`,
      }));

      return [
        {
          source: '/(.*)',
          headers: [
            {
              key: 'Content-Security-Policy',
              value: cspHeader.replace(/\n/g, ''),
            },
            ...cdnLinks,
          ],
        },
      ];
    },
  };

  // Apply withNextIntl to the config
  nextConfig = withNextIntl(nextConfig);

  if (process.env.ANALYZE === 'true') {
    const withBundleAnalyzer = bundleAnalyzer();

    nextConfig = withBundleAnalyzer(nextConfig);
  }

  return nextConfig;
};
