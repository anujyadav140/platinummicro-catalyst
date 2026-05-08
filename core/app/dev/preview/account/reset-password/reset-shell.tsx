'use client';

/**
 * ResetShell — client form for choosing a new password.
 * ------------------------------------------------------
 * Wraps the visible form for /dev/preview/account/reset-password. Receives
 * the validated `token` + `customerEntityId` from the server entry as props
 * and forwards them as hidden inputs so the server action can pick them up
 * from FormData (no client-side props leaking through Server Action args).
 *
 * State machine:
 * - `idle`            → form, button enabled
 * - `pending`         → useFormStatus shows on the submit button
 * - `linkInvalid`     → top-level "request a new one" prompt replaces fields
 * - field errors      → inline under the input
 * - top-level message → renders a banner above the form
 */

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import {
  resetPasswordAction,
  type ResetPasswordState,
} from './_actions/reset-password';

const INITIAL: ResetPasswordState = { ok: false };

export function ResetShell({
  token,
  customerEntityId,
}: {
  token: string;
  customerEntityId: string;
}) {
  const [state, formAction] = useActionState(resetPasswordAction, INITIAL);

  // Token came back from BC as bad/expired — replace the form with a
  // recoverable "request a new one" prompt rather than letting the user
  // keep retyping a password into a broken flow.
  if (state.linkInvalid) {
    return <InvalidLink message={state.message} />;
  }

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-5" noValidate>
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="customerEntityId" value={customerEntityId} />

      {state.message ? (
        <div
          role="alert"
          className="rounded-md border border-pm-terracotta/40 bg-pm-terracotta-pale px-4 py-3 text-[14px] leading-[1.5] text-pm-ink-800"
        >
          {state.message}
        </div>
      ) : null}

      <label className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold uppercase tracking-[0.06em] text-pm-ink-500">
          New password
        </span>
        <input
          type="password"
          name="password"
          required
          autoComplete="new-password"
          aria-describedby="reset-password-hint"
          aria-invalid={Boolean(state.fieldErrors?.password)}
          className="rounded-md border border-pm-ink-300 bg-white px-4 py-3 text-[15px] text-pm-ink-900 outline-none transition-all focus:border-pm-navy-light focus:shadow-[0_0_0_3px_rgba(46,109,180,0.15)]"
        />
        <span id="reset-password-hint" className="text-[12px] text-pm-ink-500">
          At least 8 characters, including a number.
        </span>
        {state.fieldErrors?.password ? (
          <span className="text-[13px] font-medium text-pm-terracotta">
            {state.fieldErrors.password}
          </span>
        ) : null}
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold uppercase tracking-[0.06em] text-pm-ink-500">
          Confirm password
        </span>
        <input
          type="password"
          name="confirmPassword"
          required
          autoComplete="new-password"
          aria-invalid={Boolean(state.fieldErrors?.confirmPassword)}
          className="rounded-md border border-pm-ink-300 bg-white px-4 py-3 text-[15px] text-pm-ink-900 outline-none transition-all focus:border-pm-navy-light focus:shadow-[0_0_0_3px_rgba(46,109,180,0.15)]"
        />
        {state.fieldErrors?.confirmPassword ? (
          <span className="text-[13px] font-medium text-pm-terracotta">
            {state.fieldErrors.confirmPassword}
          </span>
        ) : null}
      </label>

      <SubmitButton />

      <p className="text-center text-[14px] text-pm-ink-500">
        Remember it?{' '}
        <Link
          href="/dev/preview/account"
          className="font-semibold text-pm-navy-mid underline-offset-2 transition-colors hover:text-pm-navy-light hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 flex w-full items-center justify-center gap-2 rounded-md bg-pm-terracotta px-4 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-pm-terracotta-light disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? 'Updating…' : 'Update password'}
      {pending ? null : <ArrowRight size={15} strokeWidth={2.5} />}
    </button>
  );
}

export function InvalidLink({ message }: { message?: string }) {
  return (
    <div className="mt-8 flex flex-col gap-5">
      <div
        role="alert"
        className="rounded-md border border-pm-terracotta/40 bg-pm-terracotta-pale px-4 py-3 text-[14px] leading-[1.5] text-pm-ink-800"
      >
        {message ?? 'This reset link is invalid or has expired.'}
      </div>

      <Link
        href="/dev/preview/account/forgot"
        className="flex w-full items-center justify-center gap-2 rounded-md bg-pm-terracotta px-4 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-pm-terracotta-light"
      >
        Request a new one
        <ArrowRight size={15} strokeWidth={2.5} />
      </Link>

      <p className="text-center text-[14px] text-pm-ink-500">
        Remember it?{' '}
        <Link
          href="/dev/preview/account"
          className="font-semibold text-pm-navy-mid underline-offset-2 transition-colors hover:text-pm-navy-light hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
