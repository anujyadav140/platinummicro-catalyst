/**
 * /dev/preview/contact
 * Source: live platinummicro.com/contact-us. The OG page is mostly a contact
 * form — no per-department inboxes were published, so we expose the single
 * verified channel (phone + admin@) and link to the legal pages for
 * specialized topics.
 */

import { PmLegalLayout } from '~/components/pm-legal-layout';

export const metadata = {
  title: 'Contact Platinum Micro',
  description:
    'Reach the Platinum Micro team — phone, email, hours, and address.',
};

export default function ContactPage() {
  return (
    <PmLegalLayout
      eyebrow="Talk to a specialist"
      title="Talk to Platinum Micro."
      meta="Mon–Fri · 7am – 5pm PT · Sylmar, California"
    >
      <p>
        Questions about an order, a quote, or anything else? Reach the
        Platinum Micro team directly. The fastest path is the toll-free
        line during business hours; email is checked all day.
      </p>

      <h2>By phone</h2>
      <p>
        <strong>(877) PMG-4YOU</strong> — toll free, Monday–Friday,{' '}
        7:00am – 5:00pm Pacific. Calls go to a real person; cancellations and
        time-sensitive order changes should be made by phone (email may
        not be received in time).
      </p>

      <h2>By email</h2>
      <p>
        <a href="mailto:admin@platinummicro.com">admin@platinummicro.com</a>{' '}
        — for general inquiries, quote requests, account questions, and
        return-related help.
      </p>
      <p>
        For tax-exempt certification, send documentation to{' '}
        <a href="mailto:tax-exempt@platinummicro.com">
          tax-exempt@platinummicro.com
        </a>
        .
      </p>

      <h2>Mailing address</h2>
      <p>
        Platinum Micro, Inc.<br />
        15815 Monte Street, Suite 103<br />
        Sylmar, CA 91342<br />
        United States
      </p>

      <h2>What you might want instead</h2>
      <ul>
        <li>
          Order tracking, return windows, RMA process →{' '}
          <a href="/dev/preview/shipping-returns">Shipping &amp; returns</a>
        </li>
        <li>
          Verification call about your order →{' '}
          <a href="/dev/preview/legal/order-verification">Order verification</a>
        </li>
        <li>
          Account sign-in / password reset →{' '}
          <a href="/dev/preview/account">Sign in</a>
        </li>
        <li>
          Cooperative contracts (OMNIA / NASPO), public-sector procurement,
          quote-by-BOM → call Business Development at the number above
        </li>
      </ul>

      <h2>Business Development &amp; Partnerships</h2>
      <p>
        Distributors, manufacturers, and institutional buyers can reach
        Business Development at the same toll-free number — ask the
        operator for the BD desk, or include &ldquo;BD&rdquo; in the subject of any
        email to <a href="mailto:admin@platinummicro.com">admin@platinummicro.com</a>.
      </p>
    </PmLegalLayout>
  );
}
