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
    // Per the Catalyst optimization guide, Next.js can tree-shake icon /
    // utility libraries much more aggressively when they're listed here.
    // Without this, `import { ChevronDown } from 'lucide-react'` pulls in
    // ALL ~1500 icons into the bundle; with it, only the ones actually
    // referenced ship.
    //
    // Add a package here when:
    //   - we import named exports from a single barrel file (lucide,
    //     @radix-ui sub-packages, etc.)
    //   - the package is large (10+ KB minified) when imported naively
    experimental: {
      optimizePackageImports: [
        '@icons-pack/react-simple-icons',
        'lucide-react',
        '@radix-ui/react-accordion',
        '@radix-ui/react-checkbox',
        '@radix-ui/react-dialog',
        '@radix-ui/react-dropdown-menu',
        '@radix-ui/react-navigation-menu',
        '@radix-ui/react-popover',
        '@radix-ui/react-radio-group',
        '@radix-ui/react-select',
      ],
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

      // Security headers — defense in depth alongside the CSP defined
      // in lib/content-security-policy.ts. None of these have any
      // performance cost, and they harden against the most common
      // attack classes:
      //   - HSTS: forces HTTPS on every subsequent request for 2 years,
      //     including subdomains. `preload` opts into the HSTS preload
      //     list (chromium/firefox ship the domain hard-coded as
      //     HTTPS-only). Safe once we're on HTTPS in prod.
      //   - X-Frame-Options: redundant with CSP frame-ancestors but
      //     covers older browsers that don't parse CSP.
      //   - X-Content-Type-Options: kills MIME-sniffing attacks where
      //     a server-supplied content type is overridden by the browser.
      //   - Referrer-Policy: leaks the path of the previous page when
      //     navigating cross-origin; strict-origin-when-cross-origin
      //     sends only the bare origin in cross-origin requests.
      //   - Permissions-Policy: explicitly disable browser features
      //     this storefront has no business using (camera, mic,
      //     geolocation, etc.). Prevents a future XSS from accessing
      //     them even if it slipped through CSP.
      const securityHeaders = [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
        {
          key: 'X-Frame-Options',
          // CSP frame-ancestors does the real work; this is a fallback.
          // SAMEORIGIN (not DENY) because makeswift integration needs
          // iframe embedding and CSP handles the case-by-case allow.
          value: 'SAMEORIGIN',
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
        {
          key: 'Permissions-Policy',
          // Disable hardware-access features that an e-commerce storefront
          // never needs. payment=*  is allowed because PaymentRequest is
          // used by Apple Pay / Google Pay flows in the embedded checkout.
          value: [
            'camera=()',
            'microphone=()',
            'geolocation=()',
            'gyroscope=()',
            'magnetometer=()',
            'accelerometer=()',
            'usb=()',
            'midi=()',
            'autoplay=(self)',
            'fullscreen=(self)',
            'payment=*',
          ].join(', '),
        },
      ];

      return [
        {
          source: '/(.*)',
          headers: [
            {
              key: 'Content-Security-Policy',
              value: cspHeader.replace(/\n/g, ''),
            },
            ...securityHeaders,
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
