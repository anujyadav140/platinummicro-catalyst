/**
 * /dev/preview/legal/privacy-policy
 * Source: live platinummicro.com/privacy-policy, tightened to our voice.
 */

import { PmLegalLayout } from '~/components/pm-legal-layout';

export const metadata = {
  title: 'Privacy Policy — Platinum Micro',
  description: 'How Platinum Micro collects, uses, and protects customer information.',
};

export default function PrivacyPolicyPage() {
  return (
    <PmLegalLayout
      eyebrow="Legal"
      title="Privacy Policy"
      meta="Effective: 2026"
    >
      <p>
        Platinum Micro, Inc. takes customer privacy seriously. This policy
        explains what information is collected, why it's collected, and how
        it's protected. Platinum Micro does not share, rent, or sell your
        information to others in any way different from what is disclosed
        below.
      </p>

      <h2>Why information is collected</h2>
      <p>
        Information is collected to deliver the complete Platinum Micro
        experience — easy product discovery, quick checkout, and rapid
        order fulfilment and delivery. Platinum Micro may also reach out
        about promotions, new offerings, or policy updates relevant to your
        account.
      </p>

      <h2>What is collected</h2>
      <p>
        Only information you voluntarily provide via email, account
        registration, or direct contact. Typical fields include:
      </p>
      <ul>
        <li>Name, company, and contact details</li>
        <li>Billing and shipping addresses</li>
        <li>Order history and transaction records</li>
        <li>Communication you send to Platinum Micro (support tickets, quote requests)</li>
      </ul>

      <h2>How information is shared</h2>
      <p>
        Platinum Micro does not sell or rent your information. Information
        is shared only when required to complete a transaction — for
        example, sending shipping addresses to carriers, or transmitting
        payment authorization to payment processors. Where applicable,
        information is also shared with the manufacturers whose warranties
        cover your purchase.
      </p>

      <h2>How information is secured</h2>
      <p>
        Sensitive data in transit is protected by TLS encryption — verifiable
        by the lock icon and{' '}
        <strong>https://</strong> prefix in your browser. Servers holding
        personally identifiable information are kept in secured environments,
        and access is restricted to employees with a legitimate
        job-related need.
      </p>
      <p>
        Payment cards are processed by PCI-DSS Level 1 service providers —
        Platinum Micro never stores raw card numbers on its own servers.
      </p>

      <h2>Cookies & Analytics</h2>
      <p>
        Cookies and similar technologies are used to keep your shopping
        cart populated, remember preferences, and analyze how the site
        is used. You can disable cookies in your browser, though some
        features may not function correctly without them.
      </p>

      <h2>Your Choices</h2>
      <ul>
        <li>
          You can update your account contact details and address book at
          any time via your customer dashboard.
        </li>
        <li>
          You can opt out of marketing email by clicking the unsubscribe
          link in any message sent.
        </li>
        <li>
          You can request a copy or deletion of your personal data by
          emailing the address below.
        </li>
      </ul>

      <h2>Contact</h2>
      <p>
        For privacy-related questions or requests, contact Platinum Micro at{' '}
        <strong>+1 (818) 505-6853</strong> or{' '}
        <a href="mailto:admin@platinummicro.com">admin@platinummicro.com</a>.
      </p>
    </PmLegalLayout>
  );
}
