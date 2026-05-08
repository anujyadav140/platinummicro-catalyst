/**
 * /dev/preview/account/forgot/sent
 * --------------------------------
 * "We sent you a link" confirmation. Reads the submitted email from the
 * search-params so the message can echo it back. Doesn't reveal whether
 * the email exists in BC — both real and unknown emails land here.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail } from 'lucide-react';

import { getPmSessionCustomer } from '~/lib/pm-session-server';
import { AccountShell } from '../../account-shell';

export const metadata: Metadata = {
  title: 'Check your inbox — Platinum Micro',
  description: 'A password reset link has been sent to your email.',
};

interface Props {
  searchParams: Promise<{ email?: string }>;
}

export default async function ForgotPasswordSentPage(props: Props) {
  const { email } = await props.searchParams;
  const cleanEmail = (email ?? '').trim();
  const customer = await getPmSessionCustomer();

  return (
    <AccountShell customer={customer}>
      <main className="bg-pm-paper">
        <div className="mx-auto flex max-w-[520px] flex-col px-6 py-20 lg:py-24">
          <div
            aria-hidden
            className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-pm-terracotta/10 text-pm-terracotta"
          >
            <Mail size={22} strokeWidth={2} />
          </div>

          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-pm-tan">
            Check your inbox
          </div>
          <h1 className="mt-2 text-[28px] font-bold leading-[1.15] tracking-[-0.018em] text-pm-ink-900">
            Reset link sent.
          </h1>

          <p className="mt-3 text-[14px] leading-[1.55] text-pm-ink-700">
            A password reset link was sent
            {cleanEmail ? (
              <>
                {' '}to <span className="font-semibold text-pm-ink-900">{cleanEmail}</span>
              </>
            ) : (
              ' to the address you provided'
            )}
            . Click the link in that email to choose a new password. The link
            expires in 1 hour.
          </p>

          <p className="mt-4 text-[13px] leading-[1.5] text-pm-ink-500">
            If you don&apos;t see it within a few minutes, check your spam folder
            or confirm you used the email tied to your account.
          </p>

          <div className="mt-8 flex flex-col gap-3 border-t border-pm-ink-200 pt-6 text-[14px]">
            <div className="flex items-center justify-between text-pm-ink-700">
              <span>Didn&apos;t get it?</span>
              <Link
                href="/dev/preview/account/forgot"
                className="font-semibold text-pm-navy-mid underline-offset-2 transition-colors hover:text-pm-navy-light hover:underline"
              >
                Try a different email
              </Link>
            </div>
            <div className="flex items-center justify-between text-pm-ink-700">
              <span>Already reset?</span>
              <Link
                href="/dev/preview/account"
                className="font-semibold text-pm-navy-mid underline-offset-2 transition-colors hover:text-pm-navy-light hover:underline"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </main>
    </AccountShell>
  );
}
