'use client';

/**
 * ForgotPasswordForm
 * ------------------
 * Client wrapper that owns the email input + submit lifecycle via
 * useActionState. The server action either redirects to the "sent"
 * confirmation page or returns a validation/transport error to render
 * inline.
 */

import Link from 'next/link';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { ArrowRight } from 'lucide-react';

import {
  forgotPasswordAction,
  type ForgotPasswordState,
} from './_actions/forgot-password';

const initialState: ForgotPasswordState = { ok: true };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 flex w-full items-center justify-center gap-2 rounded-md bg-pm-terracotta px-4 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-pm-terracotta-light disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? 'Sending…' : 'Send reset link'}
      {!pending && <ArrowRight size={15} strokeWidth={2.5} />}
    </button>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(forgotPasswordAction, initialState);

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-5" noValidate>
      <label className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold uppercase tracking-[0.06em] text-pm-ink-500">
          Email address
        </span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          defaultValue={state.email ?? ''}
          aria-invalid={Boolean(state.fieldErrors?.email)}
          aria-describedby={state.fieldErrors?.email ? 'forgot-email-error' : undefined}
          className="rounded-md border border-pm-ink-300 bg-white px-4 py-3 text-[15px] text-pm-ink-900 outline-none transition-all focus:border-pm-navy-light focus:shadow-[0_0_0_3px_rgba(46,109,180,0.15)] aria-[invalid=true]:border-pm-terracotta aria-[invalid=true]:focus:shadow-[0_0_0_3px_rgba(193,86,57,0.15)]"
        />
        {state.fieldErrors?.email ? (
          <span
            id="forgot-email-error"
            className="text-[13px] font-medium text-pm-terracotta"
          >
            {state.fieldErrors.email}
          </span>
        ) : null}
      </label>

      {state.message ? (
        <div
          role="alert"
          className="rounded-md border border-pm-terracotta/40 bg-pm-terracotta/5 px-3 py-2.5 text-[13px] leading-[1.45] text-pm-terracotta"
        >
          {state.message}
        </div>
      ) : null}

      <SubmitButton />

      <div className="mt-1 flex items-center justify-between text-[14px] text-pm-ink-700">
        <span>Remembered it?</span>
        <Link
          href="/dev/preview/account"
          className="font-semibold text-pm-navy-mid underline-offset-2 transition-colors hover:text-pm-navy-light hover:underline"
        >
          Sign in
        </Link>
      </div>
    </form>
  );
}
