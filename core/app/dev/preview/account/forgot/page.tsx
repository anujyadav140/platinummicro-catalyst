/**
 * /dev/preview/account/forgot
 * ---------------------------
 * Request a password-reset email. User submits their address, BigCommerce
 * sends a magic link, then we drop them on the /forgot/sent confirmation.
 */

import type { Metadata } from 'next';
import { getPmSessionCustomer } from '~/lib/pm-session-server';
import { AccountShell } from '../account-shell';
import { ForgotPasswordForm } from './forgot-shell';

export const metadata: Metadata = {
  title: 'Forgot password — Platinum Micro',
  description: 'Request a password reset link for your Platinum Micro account.',
};

export default async function ForgotPasswordPage() {
  const customer = await getPmSessionCustomer();

  return (
    <AccountShell customer={customer}>
      <main className="bg-pm-paper">
        <div className="mx-auto flex max-w-[480px] flex-col px-6 py-20 lg:py-24">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-pm-tan">
            Forgot password
          </div>
          <h1 className="mt-2 text-[28px] font-bold leading-[1.15] tracking-[-0.018em] text-pm-ink-900">
            Reset your password.
          </h1>
          <p className="mt-3 text-[14px] leading-[1.55] text-pm-ink-700">
            Enter the email address tied to your Platinum Micro account. A secure
            link to set a new password will be sent to you. The link expires in 1 hour.
          </p>

          <ForgotPasswordForm />
        </div>
      </main>
    </AccountShell>
  );
}
