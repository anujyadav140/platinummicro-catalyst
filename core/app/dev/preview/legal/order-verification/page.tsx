/**
 * /dev/preview/legal/order-verification
 * Source: live platinummicro.com/order-verification (NoFraud FAQ).
 */

import { PmLegalLayout } from '~/components/pm-legal-layout';

export const metadata = {
  title: 'Order Verification — Platinum Micro',
  description: 'How NoFraud helps verify orders and what to do when contacted.',
};

export default function OrderVerificationPage() {
  return (
    <PmLegalLayout
      eyebrow="Buyer support"
      title="Order verification"
      meta="Why a second confirmation is sometimes needed before shipping."
    >
      <p>
        Platinum Micro partners with{' '}
        <strong>
          <a href="https://www.nofraud.com" target="_blank" rel="noreferrer">
            NoFraud
          </a>
        </strong>
        , an independent fraud-prevention service, to screen high-risk
        transactions before they ship. Verification protects both the
        cardholder and the merchant, and most legitimate orders never
        trigger the process. If your order does, NoFraud will reach out by
        email, phone, or text — here is what to expect.
      </p>

      <h2>Who is NoFraud?</h2>
      <p>
        NoFraud is a fraud-prevention solution for e-commerce businesses.
        It screens transactions and flags risky activity so businesses can
        verify with the cardholder before fulfilling the order — protecting
        both consumers and merchants.
      </p>

      <h2>Why am I being contacted?</h2>
      <p>
        Your purchase displayed unusual patterns, or the transaction
        showed elevated risk markers. NoFraud reaches out only to confirm
        that the authorized cardholder made the purchase. There is no
        suggestion of wrongdoing — verification is a routine precaution.
      </p>

      <h2>What happens after I confirm the transaction?</h2>
      <p>
        Once you confirm, there is nothing else for you to do — unless a
        fraud analyst has explicitly asked for additional information.
        Your order is released for processing as soon as the response is
        received.
      </p>

      <h2>Will NoFraud ever ask for sensitive personal information?</h2>
      <p>
        <strong>No.</strong> NoFraud will never ask you for your full
        credit-card number, social-security number, or any other
        personally identifiable information. If anyone claiming to be
        from NoFraud asks for these, that is a fraud attempt — hang up
        and contact Platinum Micro at the number below.
      </p>

      <h2>Will my order be delayed?</h2>
      <p>
        In most cases, your order is released as soon as the verification
        response is received. Verification is typically completed within
        the same business day.
      </p>

      <h2>I did not make the transaction. What now?</h2>
      <p>
        If you receive a verification request for an order you did not
        place — and no one with access to your card or payment account
        placed it either — take the following steps immediately:
      </p>
      <ul>
        <li>Contact your financial institution to report unauthorized activity.</li>
        <li>Review your account for additional fraudulent charges.</li>
        <li>Your bank will likely freeze the compromised card and issue a replacement.</li>
        <li>
          Email{' '}
          <a href="mailto:admin@platinummicro.com">admin@platinummicro.com</a>{' '}
          so the order can be voided.
        </li>
      </ul>

      <h2>Questions?</h2>
      <p>
        Call <strong>+1 (818) 505-6853</strong> Monday–Friday,
        7am–5pm PT, or email{' '}
        <a href="mailto:admin@platinummicro.com">admin@platinummicro.com</a>.
      </p>
    </PmLegalLayout>
  );
}
