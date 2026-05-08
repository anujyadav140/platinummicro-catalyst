/**
 * /dev/preview/sitemap
 * Discoverable index of every working /dev/preview/* route. Built from
 * scratch — the OG /site-map page is content-light. Internal routes only,
 * grouped by section so users can browse the catalog and account areas
 * without relying on header/footer chrome.
 */

import Link from 'next/link';
import { PmLegalLayout } from '~/components/pm-legal-layout';
import { PM_CATEGORIES } from '~/lib/pm-categories';

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

const SECTIONS: SiteMapSection[] = [
  {
    title: 'Catalog',
    blurb: 'Browse the product catalog by category.',
    links: [
      { label: 'Home', href: '/dev/preview' },
      ...PM_CATEGORIES.map((c) => ({
        label: c.label,
        href: c.href,
      })),
    ],
  },
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

export default function SiteMapPage() {
  return (
    <PmLegalLayout
      eyebrow="Site map"
      title="Browse the Site."
      meta={`${SECTIONS.reduce((n, s) => n + s.links.length, 0)} pages across ${SECTIONS.length} sections`}
    >
      <p>
        Every working route on platinummicro.com, grouped by section. If
        you can't find what you're looking for, the search bar at the top
        of every page covers the full product catalog. The contact page
        lists direct phone and email for sales, support, and billing.
      </p>

      {SECTIONS.map((section) => (
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
