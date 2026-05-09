/**
 * /dev/preview/sitemap
 * Discoverable index of every working /dev/preview/* route. Built from
 * scratch — the OG /site-map page is content-light. Internal routes only,
 * grouped by section so users can browse the catalog and account areas
 * without relying on header/footer chrome.
 */

import Link from 'next/link';
import { PmLegalLayout } from '~/components/pm-legal-layout';
import { fetchPmCategories } from '~/lib/pm-categories-fetcher';

export const metadata = {
  title: 'Site Map — Platinum Micro',
  description:
    'Complete index of pages on platinummicro.com — catalog, account, legal, and about sections.',
};

interface SiteMapLink {
  label: string;
  href: string;
}

interface SiteMapSection {
  title: string;
  blurb?: string;
  links: SiteMapLink[];
}

// Editorial aliases can still slip in (e.g. via the static fallback), so
// dedupe by href to avoid two visually-different links pointing at the
// same URL — also keeps React keys unique downstream.
function dedupeByHref(links: SiteMapLink[]): SiteMapLink[] {
  const seen = new Set<string>();
  return links.filter((l) => {
    if (seen.has(l.href)) return false;
    seen.add(l.href);
    return true;
  });
}

const STATIC_SECTIONS: SiteMapSection[] = [
  {
    title: 'About',
    blurb: 'Company background, partner brands, and policies.',
    links: [
      { label: 'About Us', href: '/dev/preview/about' },
      { label: 'Authorized Brands', href: '/dev/preview/brands' },
      { label: 'Contact Us', href: '/dev/preview/contact' },
      { label: 'Shipping & Returns', href: '/dev/preview/shipping-returns' },
      { label: 'Site Map', href: '/dev/preview/sitemap' },
      {
        label: 'Social Responsibility',
        href: '/dev/preview/social-responsibility',
      },
    ],
  },
  {
    title: 'Account',
    blurb: 'Sign in, register, or recover account access.',
    links: [
      { label: 'Sign in', href: '/dev/preview/account' },
      { label: 'Register', href: '/dev/preview/account/register' },
      { label: 'Forgot password', href: '/dev/preview/account/forgot' },
      { label: 'Reset password', href: '/dev/preview/account/reset-password' },
      { label: 'Profile', href: '/dev/preview/account/profile' },
    ],
  },
  {
    title: 'Legal',
    blurb: 'Terms of sale, privacy, and order verification.',
    links: [
      {
        label: 'Terms & Conditions',
        href: '/dev/preview/legal/terms-conditions',
      },
      {
        label: 'Privacy Policy',
        href: '/dev/preview/legal/privacy-policy',
      },
      {
        label: 'Order Verification',
        href: '/dev/preview/legal/order-verification',
      },
    ],
  },
];

export default async function SiteMapPage() {
  const categories = await fetchPmCategories();
  const sections: SiteMapSection[] = [
    {
      title: 'Catalog',
      blurb: 'Browse the product catalog by category.',
      links: dedupeByHref([
        { label: 'Home', href: '/dev/preview' },
        ...categories.map((c) => ({ label: c.label, href: c.href })),
      ]),
    },
    ...STATIC_SECTIONS,
  ];

  return (
    <PmLegalLayout
      eyebrow="Site map"
      title="Browse the Site."
      meta={`${sections.reduce((n, s) => n + s.links.length, 0)} pages across ${sections.length} sections`}
    >
      <p>
        Every working route on platinummicro.com, grouped by section. If
        you can't find what you're looking for, the search bar at the top
        of every page covers the full product catalog. The contact page
        lists direct phone and email for sales, support, and billing.
      </p>

      {sections.map((section) => (
        <section key={section.title}>
          <h2>{section.title}</h2>
          {section.blurb && <p>{section.blurb}</p>}
          <ul>
            {section.links.map((link) => (
              <li key={`${section.title}-${link.href}`}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </PmLegalLayout>
  );
}
