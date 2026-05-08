/**
 * /dev/preview/account
 * --------------------
 * Sign-in page. Single page heading, two purposes side-by-side separated by
 * a vertical hairline rather than competing card surfaces.
 *
 * The form on the right is wired to Catalyst's Auth.js `signIn('password')`
 * flow via `_actions/sign-in.ts`. Form UI lives in
 * `_components/sign-in-shell.tsx` (client) so we can use `useActionState`
 * for inline error rendering + a "Signing in…" pending state.
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { getPmSessionCustomer } from '~/lib/pm-session-server';
import { AccountShell } from './account-shell';
import { SignInShell } from './_components/sign-in-shell';

const NEW_CUSTOMER_BENEFITS = [
  'Check out faster',
  'Save multiple shipping addresses',
  'Access your order history',
  'Track new orders',
  'Save items to your lists',
];

interface SignInPageProps {
  // Cross-flow notifications:
  //   ?registered=1     → after Register agent's success redirect
  //   ?passwordReset=1  → after Reset agent's success redirect
  searchParams: Promise<{
    registered?: string;
    passwordReset?: string;
  }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const sp = await searchParams;

  // If the user is already signed in, the sign-in page is a no-op — bounce
  // them straight to the profile so the back button doesn't strand them on
  // a form they don't need.
  const customer = await getPmSessionCustomer();
  if (customer) {
    redirect('/dev/preview/account/profile');
  }

  const banner =
    sp.passwordReset === '1'
      ? 'Password updated. Sign in with your new password.'
      : sp.registered === '1'
        ? 'Account created. Sign in to get started.'
        : null;

  return (
    <AccountShell customer={customer}>
      <main className="bg-pm-paper">
        <div className="mx-auto max-w-[1040px] px-6 py-20 lg:py-24">
          {banner && (
            <div className="mb-10 flex items-start gap-3 rounded-md border border-pm-success/30 bg-pm-success-bg px-4 py-3 text-[14px] text-pm-success">
              <CheckCircle2
                size={18}
                strokeWidth={2}
                className="mt-0.5 shrink-0"
              />
              <span>{banner}</span>
            </div>
          )}
          {/* ===== Two purposes =====
              - gap-0 on md so we can manage the gutter ourselves with equal
                padding on both columns (divider sits between, equidistant).
              - md:items-start so the LEFT column does NOT stretch when the
                right column grows (e.g. with form errors). Without this,
                error messages on the right would drag the Create Account
                button down on the left.
              - md:min-h-[420px] on both columns puts them at the same baseline
                height in the no-error state — Create Account and Sign In land
                at the exact same Y. With errors, the right column expands past
                this min while the left stays parked. */}
          <div className="grid grid-cols-1 gap-12 md:grid-cols-2 md:items-start md:gap-0">
            {/* LEFT — New customer */}
            <aside className="flex flex-col md:min-h-[420px] md:pr-16">
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-pm-tan">
                New customer?
              </div>
              <h2 className="mt-2 text-[28px] font-bold leading-[1.15] tracking-[-0.018em] text-pm-ink-900">
                Open a business account.
              </h2>
              <p className="mt-3 text-[14px] leading-[1.55] text-pm-ink-700">
                Open an account and you&apos;ll be able to:
              </p>

              <ul className="mt-4 flex flex-col gap-2 text-[14px] leading-[1.5] text-pm-ink-700">
                {NEW_CUSTOMER_BENEFITS.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2.5">
                    <span
                      aria-hidden
                      className="mt-2 h-1 w-1 shrink-0 rounded-full bg-pm-terracotta"
                    />
                    {benefit}
                  </li>
                ))}
              </ul>

              {/* Bottom action group. mt-auto on this wrapper pushes BOTH the
                  button and its legal note to the bottom of the column. The
                  RIGHT column ends with the same [submit][legal-note] pair
                  inside its form (gap-5 + mt-1 between them = 24px), so the
                  two CTAs land at the same Y. We mirror that recipe here. */}
              <div className="mt-auto flex flex-col gap-5">
                <Link
                  href="/dev/preview/account/register"
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-pm-terracotta px-4 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-pm-terracotta-light"
                >
                  Create Account
                  <ArrowRight size={15} strokeWidth={2.5} />
                </Link>
                <p className="mt-1 text-center text-[12px] leading-[1.55] text-pm-ink-500">
                  By signing up, you agree to Platinum Micro&apos;s{' '}
                  <Link
                    href="/dev/preview/legal/terms-conditions"
                    className="font-semibold text-pm-navy-mid underline-offset-2 transition-colors hover:text-pm-navy-light hover:underline"
                  >
                    Terms
                  </Link>{' '}
                  and{' '}
                  <Link
                    href="/dev/preview/legal/privacy-policy"
                    className="font-semibold text-pm-navy-mid underline-offset-2 transition-colors hover:text-pm-navy-light hover:underline"
                  >
                    Privacy Policy
                  </Link>
                  .
                </p>
              </div>
            </aside>

            {/* RIGHT — sign-in form */}
            <div className="flex flex-col md:min-h-[420px] md:border-l md:border-pm-ink-200 md:pl-16">
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-pm-tan">
                Returning customer
              </div>
              <h1 className="mt-2 text-[28px] font-bold leading-[1.15] tracking-[-0.018em] text-pm-ink-900">
                Sign in to your account.
              </h1>

              {/* Form lives in a client wrapper so we can use useActionState
                  to render server-action errors + a pending submit state.
                  The wrapper preserves the exact field labels, button copy,
                  and "Forgot password?" link from the original layout, and
                  uses `mt-auto` on the submit so it still vertically aligns
                  with the LEFT column's Create Account CTA. */}
              <SignInShell />
            </div>
          </div>
        </div>
      </main>
    </AccountShell>
  );
}
