/**
 * /dev/preview/legal/terms-conditions
 * Source: live platinummicro.com/terms-conditions, lightly tightened for our voice.
 */

import { PmLegalLayout } from '~/components/pm-legal-layout';

export const metadata = {
  title: 'Terms & Conditions — Platinum Micro',
  description: "Platinum Micro's terms of sale, payment, warranty, and dispute resolution.",
};

export default function TermsConditionsPage() {
  return (
    <PmLegalLayout
      eyebrow="Legal"
      title="Terms & Conditions"
      meta="Effective: 2026 · Governed by California law"
    >
      <p>
        These Terms & Conditions govern every purchase from Platinum Micro,
        Inc. (<strong>platinummicro.com</strong>). By accepting delivery you
        agree to be bound by them. If anything below conflicts with the
        invoice you receive, the invoice takes precedence.
      </p>

      <h2>Backorders</h2>
      <p>
        Platinum Micro does not sell back-ordered merchandise. Out-of-stock
        items are never intentionally charged at purchase. If a rare
        inventory discrepancy or damaged-goods claim prevents fulfilment,
        your payment is refunded in full along with any fees.
      </p>

      <h2>Order Cancellation</h2>
      <p>
        Cancellation requests must be received before <strong>2:00pm PST</strong>.
        Call <strong>+1 (818) 505-6853</strong> during business hours —
        cancellation requests sent only by email may not be received in time.
        Refunds take 1–2 business days to process.
      </p>

      <h2>Payment Methods</h2>
      <ul>
        <li>Visa, Mastercard, American Express, Discover</li>
        <li>PayPal</li>
        <li>Amazon Payments</li>
        <li>Trade credit (B2B accounts, with approved application)</li>
      </ul>

      <h2>Product Listings</h2>
      <p>
        Product descriptions are informational and not a substitute for your
        own research. Platinum Micro strives for accuracy, but occasional
        human errors may occur and every spec cannot be guaranteed complete.
      </p>
      <p>
        Platinum Micro reserves the right to refuse orders for
        incorrectly priced items. The customer remains ultimately
        responsible for the purchase decision.
      </p>

      <h2>Purchasing Agreement</h2>
      <p>
        Platinum Micro offers a 30-day satisfaction replacement or refund
        guarantee on most purchases. The following items are non-returnable:
      </p>
      <ul>
        <li>Open software and downloadable products</li>
        <li>Software product key cards</li>
        <li>Online subscription software</li>
        <li>LG monitors and displays</li>
        <li>GIGABYTE motherboards</li>
        <li>FORTINET networking hardware</li>
        <li>Toys, cosmetics, apparel, bedding</li>
        <li>Items with DOT shipping restrictions</li>
      </ul>

      <h2>Sales Tax</h2>
      <p>
        Sales tax applies only to California orders, based on local rates.
        Tax-exempt customers should send their certification to{' '}
        <a href="mailto:tax-exempt@platinummicro.com">
          tax-exempt@platinummicro.com
        </a>
        .
      </p>

      <h2>Electronic Waste Recycling Act</h2>
      <p>
        California's Electronic Waste Recycling Act requires collection fees
        on covered display devices:
      </p>
      <ul>
        <li>4″ – 15″ display: $8.00</li>
        <li>15″ – 35″ display: $16.00</li>
        <li>35″ and larger display: $25.00</li>
      </ul>

      <h2>Payment Terms</h2>
      <p>
        Orders are not binding until accepted and payment is received.
        Past-due balances accrue interest at 1.5% per month or the highest
        legal rate, whichever is lower. Shipping and handling are included
        in the final invoice total.
      </p>

      <h2>Price Protection</h2>
      <p>
        Customers agree to the listed price at purchase. Price adjustments
        are unavailable after shipment, but if Platinum Micro is notified
        before the order ships, an adjustment can be made.
      </p>

      <h2>Title & Risk of Loss</h2>
      <p>
        Products ship F.O.B. — title and risk of loss pass to the customer
        upon carrier delivery (except software). Platinum Micro is not
        responsible for delivery delays caused by events beyond reasonable
        control.
      </p>

      <h2>Warranties</h2>
      <p>
        Manufacturer warranties pass through to the customer. Platinum Micro
        makes no representation or express warranty beyond what is stated in
        this document, and disclaims implied warranties of merchantability
        and fitness for a particular purpose.
      </p>

      <h2>Limitation of Liability</h2>
      <p>
        Platinum Micro's maximum liability is limited to the purchase price
        of the products sold. Platinum Micro is not liable for third-party
        claims, service interruptions, or consequential damages.
      </p>

      <h2>Governing Law & Jurisdiction</h2>
      <p>
        Disputes are governed by California law and resolved in Los Angeles
        County state courts. Customers waive rights to contest this
        jurisdiction and must file claims within one year of the applicable
        invoice date.
      </p>

      <h2>Severability, Waiver, Entire Agreement</h2>
      <p>
        If any provision becomes invalid, it is modified to the closest
        valid result under California law. Failure to enforce a provision
        does not constitute waiver unless made in writing. These terms,
        together with the invoice, constitute the entire agreement and
        supersede prior communications.
      </p>

      <h2>Questions?</h2>
      <p>
        Call <strong>+1 (818) 505-6853</strong> Monday–Friday, 7am–5pm PT, or
        email{' '}
        <a href="mailto:admin@platinummicro.com">admin@platinummicro.com</a>.
      </p>
    </PmLegalLayout>
  );
}
