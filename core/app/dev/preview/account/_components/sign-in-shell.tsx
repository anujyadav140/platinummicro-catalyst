'use client';

/**
 * SignInShell
 * -----------
 * Client wrapper around the sign-in form. Owns the `useActionState` plumbing
 * so the server action's `PmActionResult` (banner message + field errors)
 * can render alongside the existing right-column layout — without redesigning
 * the page. The static page chrome (eyebrow, heading, left column) stays in
 * `page.tsx`; this component renders only the form itself.
 *
 * The submit button shows a "Signing in…" pending state via `useFormStatus`
 * inside the same form; React 19 wires this automatically.
 */

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { signInAction, type SignInState } from '../_actions/sign-in';

const initialState: SignInState = null;

export function SignInShell() {
  const [state, formAction] = useActionState(signInAction, initialState);

  const formMessage = state && !state.ok ? state.message : null;
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const emailError = fieldErrors?.email?.[0];
  const passwordError = fieldErrors?.password?.[0];

  return (
    <form className="mt-8 flex flex-1 flex-col gap-5" action={formAction} noValidate>
      {formMessage ? (
        <div
          role="alert"
          className="rounded-md border border-pm-danger/30 bg-pm-danger/5 px-4 py-3 text-[13px] text-pm-danger"
        >
          {formMessage}
        </div>
      ) : null}

      <label className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold uppercase tracking-[0.06em] text-pm-ink-500">
          Email address
        </span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          aria-invalid={emailError ? true : undefined}
          aria-describedby={emailError ? 'sign-in-email-error' : undefined}
          className="rounded-md border border-pm-ink-300 bg-white px-4 py-3 text-[15px] text-pm-ink-900 outline-none transition-all focus:border-pm-navy-light focus:shadow-[0_0_0_3px_rgba(46,109,180,0.15)] aria-[invalid=true]:border-pm-danger"
        />
        {emailError ? (
          <span id="sign-in-email-error" className="text-[13px] text-pm-danger">
            {emailError}
          </span>
        ) : null}
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold uppercase tracking-[0.06em] text-pm-ink-500">
          Password
        </span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          aria-invalid={passwordError ? true : undefined}
          aria-describedby={passwordError ? 'sign-in-password-error' : undefined}
          className="rounded-md border border-pm-ink-300 bg-white px-4 py-3 text-[15px] text-pm-ink-900 outline-none transition-all focus:border-pm-navy-light focus:shadow-[0_0_0_3px_rgba(46,109,180,0.15)] aria-[invalid=true]:border-pm-danger"
        />
        {passwordError ? (
          <span id="sign-in-password-error" className="text-[13px] text-pm-danger">
            {passwordError}
          </span>
        ) : null}
      </label>

      <Link
        href="/dev/preview/account/forgot"
        className="self-start text-[14px] font-semibold text-pm-navy-mid underline-offset-2 transition-colors hover:text-pm-navy-light hover:underline"
      >
        Forgot password?
      </Link>

      {/* Bottom action group — mt-auto on the wrapper pushes BOTH the
          submit button and its legal note to the bottom of the form.
          Mirrors the LEFT column's bottom-wrapper structure exactly so
          the two CTAs land on the same horizontal baseline. */}
      <div className="mt-auto flex flex-col gap-5">
        <SignInSubmitButton />
        <p className="mt-1 text-center text-[12px] leading-[1.55] text-pm-ink-500">
          By signing in, you agree to Platinum Micro&apos;s{' '}
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
    </form>
  );
}

function SignInSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="flex w-full items-center justify-center gap-2 rounded-md bg-pm-terracotta px-4 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-pm-terracotta-light disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-pm-terracotta"
    >
      {pending ? 'Signing in…' : 'Sign in'}
      {pending ? null : <ArrowRight size={15} strokeWidth={2.5} />}
    </button>
  );
}
