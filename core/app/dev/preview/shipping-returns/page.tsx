/**
 * /dev/preview/shipping-returns
 * Real content from platinummicro.com/shipping-returns, tightened to our voice.
 */

import { PmLegalLayout } from '~/components/pm-legal-layout';

export const metadata = {
  title: 'Shipping & Returns — Platinum Micro',
  description:
    'Shipping methods, transit times, return windows, and the RMA process.',
};

export default function ShippingReturnsPage() {
  return (
    <PmLegalLayout
      eyebrow="Logistics"
      title="Shipping &amp; returns."
      meta="Free shipping on the continental U.S. · 30-day returns"
    >
      <p>
        Platinum Micro ships from Sylmar, California, partners with multiple
        carriers, and processes orders Monday through Friday. The policies
        below are the ones written into every order and invoice.
      </p>

      <h2>Free shipping</h2>
      <p>
        Free shipping on all items to the continental United States.
        Alaska, Hawaii, and U.S. territories require expedited shipping
        with additional charges. Orders may arrive in multiple shipments.
      </p>

      <h2>Service area</h2>
      <p>
        Platinum Micro ships to the 48 continental U.S. states, Alaska,
        Hawaii, and U.S. territories only. <strong>International shipping
        is not available</strong> at this time — non-U.S. buyers should
        contact Business Development for partner-channel options.
      </p>

      <h2>Shipment timeline</h2>
      <p>
        Orders are shipped as soon as possible, typically within 1–2
        business days after payment is confirmed. Processing happens
        Monday–Friday only. Once a package is handed off, transit time is
        out of Platinum Micro&apos;s hands.
      </p>

      <h2>Shipping methods</h2>
      <ul>
        <li>
          <strong>Free Budget Shipping</strong> — 8–14 business days transit,
          plus 1–2 business days processing
        </li>
        <li>
          <strong>USPS Priority</strong> — 3–7 business days transit, plus
          1–2 business days processing
        </li>
      </ul>

      <h2>Tracking</h2>
      <p>
        Track packages directly with the carrier:
      </p>
      <ul>
        <li>
          <a href="https://www.ups.com/WebTracking/" target="_blank" rel="noreferrer">
            UPS tracking
          </a>
        </li>
        <li>
          <a href="https://tools.usps.com/go/TrackConfirmAction_input" target="_blank" rel="noreferrer">
            USPS tracking
          </a>
        </li>
      </ul>

      <h2>Returns</h2>
      <p>
        All items ship brand new with manufacturer warranty. Bulk and OEM
        products lack retail packaging and accessories but carry full
        warranties. Platinum Micro is not responsible for physical damage,
        misuse, or anything that voids the manufacturer warranty.
      </p>
      <p>
        Non-returnable items: open software, digital downloads, software
        keycards, online subscriptions, and products from LG, GIGABYTE, and
        FORTINET.
      </p>

      <h3>Window &amp; timeline</h3>
      <ul>
        <li>30-day return / exchange policy from purchase date</li>
        <li>RMA numbers are valid for 10 business days from issue</li>
        <li>RMA processing takes 5–7 business days after receipt</li>
        <li>Refunds issued within 7 business days of receiving the returned merchandise</li>
      </ul>

      <h3>Fees &amp; costs</h3>
      <ul>
        <li>15% restocking fee on all returns for refund</li>
        <li>No restocking fee on RMA replacements of defective items</li>
        <li>Original shipping costs are non-refundable</li>
        <li>Platinum Micro covers return shipping only on defective-merchandise exchanges</li>
      </ul>

      <h3>How to return</h3>
      <p>
        Contact Platinum Micro for an RMA number <strong>before</strong>{' '}
        shipping anything back. Every return must have a valid carrier
        tracking number — UPS, FedEx, or USPS. No advance replacements
        are offered.
      </p>

      <h2>Return address</h2>
      <p>
        Platinum Micro, Inc.<br />
        15815 Monte Street, Suite 103<br />
        Sylmar, CA 91342<br />
        United States<br />
        Toll Free: <strong>(877) PMG-4YOU</strong>
      </p>
    </PmLegalLayout>
  );
}
