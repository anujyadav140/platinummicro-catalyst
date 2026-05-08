/**
 * /dev/preview/account/register
 * -----------------------------
 * Business account registration form. Renders the 14-field B2B sign-up
 * form with country/state coupling, validation, and a real BigCommerce
 * `customer.registerCustomer` call. Form lives in the client component
 * `<RegisterForm />` so we can use `useActionState`; the page itself
 * stays a server component for the surrounding chrome.
 *
 * Design language deliberately keeps the existing card + paper canvas
 * idiom (matches sign-in's right column at /dev/preview/account). DO NOT
 * import BC-stock layouts here — Anuj has flagged that mismatch
 * repeatedly.
 */

import Link from 'next/link';

import { getPmSessionCustomer } from '~/lib/pm-session-server';

import { AccountShell } from '../account-shell';

import { RegisterForm } from './_components/register-form';

export default async function RegisterPage() {
  const customer = await getPmSessionCustomer();

  return (
    <AccountShell customer={customer}>
      <main className="flex justify-center bg-pm-paper px-6 py-16">
        <div className="w-full max-w-[720px]">
          <div className="rounded-lg border border-pm-ink-200 bg-white p-8 shadow-sm sm:p-10">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-pm-tan">
              Create account
            </div>
            <h1 className="text-[28px] font-bold leading-[1.15] tracking-[-0.018em] text-pm-ink-900">
              Open a business account.
            </h1>
            <p className="mt-3 text-[14px] leading-[1.55] text-pm-ink-700">
              For system integrators, IT teams, education, healthcare, and
              public-sector buyers. Trade credit available with approved application.
            </p>

            <RegisterForm />
          </div>

          <p className="mt-6 text-center text-[14px] text-pm-ink-500">
            Already have an account?{' '}
            <Link
              href="/dev/preview/account"
              className="font-semibold text-pm-navy-mid transition-colors hover:text-pm-navy-light"
            >
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </AccountShell>
  );
}
