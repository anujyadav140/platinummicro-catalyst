/**
 * /dev/preview/account/reset-password
 * -----------------------------------
 * Landing page for the password-reset magic link. The user got here from the
 * BC password-reset email triggered by /dev/preview/account/forgot.
 *
 * Search params from BC's link historically use the short keys `?c=` (customer
 * entity id) and `?t=` (token) — see Catalyst's stock
 * core/app/[locale]/(default)/(auth)/change-password/page.tsx. We accept the
 * long-form names too (`?customerEntityId=`, `?token=`) so the page works
 * whether BC swaps formats or a tester crafts the URL by hand.
 *
 * If either piece is missing we render an "invalid link" state with a path
 * back to /dev/preview/account/forgot — never a redirect, so the URL stays
 * stable for support to inspect.
 *
 * No auth gating: the token IS the auth. BC validates it inside
 * `customer.resetPassword`.
 */

import type { Metadata } from 'next';
import { getPmSessionCustomer } from '~/lib/pm-session-server';
import { AccountShell } from '../account-shell';
import { ResetShell, InvalidLink } from './reset-shell';

export const metadata: Metadata = {
  title: 'Reset password',
};

interface Props {
  // Next 15: searchParams is async.
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function pickFirst(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function ResetPasswordPage({ searchParams }: Props) {
  const params = await searchParams;

  // Accept both BC's short keys and the explicit long names.
  const token = pickFirst(params.token) ?? pickFirst(params.t);
  const customerEntityId =
    pickFirst(params.customerEntityId) ??
    pickFirst(params.c) ??
    pickFirst(params.customer_entity_id);

  const linkOk =
    typeof token === 'string' &&
    token.length > 0 &&
    typeof customerEntityId === 'string' &&
    /^\d+$/.test(customerEntityId);

  const customer = await getPmSessionCustomer();

  return (
    <AccountShell customer={customer}>
      <main className="bg-pm-paper">
        <div className="mx-auto flex max-w-[480px] flex-col px-6 py-20 lg:py-24">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-pm-tan">
            Reset password
          </div>
          <h1 className="mt-2 text-[28px] font-bold leading-[1.15] tracking-[-0.018em] text-pm-ink-900">
            Choose a new password.
          </h1>
          <p className="mt-3 text-[14px] leading-[1.55] text-pm-ink-700">
            {linkOk
              ? "Pick something you don't use elsewhere. You'll be signed in after updating."
              : "That reset link couldn't be read. Request a new one and a fresh link will be emailed to you."}
          </p>

          {linkOk ? (
            <ResetShell token={token} customerEntityId={customerEntityId} />
          ) : (
            <InvalidLink message="Invalid reset link. The token is missing or malformed." />
          )}
        </div>
      </main>
    </AccountShell>
  );
}
