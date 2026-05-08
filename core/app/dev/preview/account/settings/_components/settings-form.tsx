'use client';

/**
 * SettingsForm
 * ------------
 * Account Settings form, redesigned as ONE card with hairline-divided
 * sections instead of 3 stacked sub-cards. Contents preserved:
 *
 *   1. Profile      — first name, last name, company, phone, email
 *   2. Password     — current, new, confirm
 *   3. Communications — Exclusive offers checkbox
 *
 * "Update details" footer is anchored inside the same card so the eye
 * runs sections → button without leaving the chrome.
 *
 * Defaults come from the parent server page, which now reads the full
 * BC customer profile (so company + phone are populated for users who
 * provided them at registration — fixes the "looks empty" complaint).
 */
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { ArrowRight, CheckCircle2, Info } from 'lucide-react';

import {
  updateProfileAction,
  type UpdateProfileState,
} from '../../_actions/update-profile';

// `ok: true` with no message is the initial / no-action state. Once the
// form posts and the action returns, ok+message means success and the
// banner renders green; ok=false means error and renders tan/danger.
const INITIAL: UpdateProfileState = { ok: true };

export interface SettingsFormProps {
  defaults: {
    firstName: string;
    lastName: string;
    company: string;
    phone: string;
    email: string;
  };
}

export function SettingsForm({ defaults }: SettingsFormProps) {
  const [state, formAction] = useActionState(updateProfileAction, INITIAL);

  return (
    <form
      action={formAction}
      className="overflow-hidden rounded-md border border-pm-ink-200 bg-white shadow-sm"
      noValidate
    >
      {/* Top banner — green on success, tan on error/info */}
      {state.message && state.ok && (
        <div
          role="status"
          className="flex items-start gap-3 border-b border-pm-success/30 bg-pm-success-bg px-6 py-3 text-[13px] leading-[1.5] text-pm-success"
        >
          <CheckCircle2
            size={16}
            strokeWidth={2}
            className="mt-0.5 shrink-0"
          />
          <span>{state.message}</span>
        </div>
      )}
      {state.message && !state.ok && (
        <div
          role="alert"
          className="flex items-start gap-3 border-b border-pm-tan/40 bg-pm-tan-pale px-6 py-3 text-[13px] leading-[1.5] text-pm-ink-800"
        >
          <Info
            size={16}
            strokeWidth={2}
            className="mt-0.5 shrink-0 text-pm-tan"
          />
          <span>{state.message}</span>
        </div>
      )}

      {/* ===== 1. PROFILE ===== */}
      <Section
        title="Profile"
        description="Your name, contact details, and the email used to sign in."
      >
        <Grid>
          <Field
            label="First name"
            name="firstName"
            required
            defaultValue={defaults.firstName}
            error={state.fieldErrors?.firstName}
          />
          <Field
            label="Last name"
            name="lastName"
            required
            defaultValue={defaults.lastName}
            error={state.fieldErrors?.lastName}
          />
          <Field
            label="Company"
            name="company"
            defaultValue={defaults.company}
            error={state.fieldErrors?.company}
          />
          <Field
            label="Phone number"
            name="phone"
            type="tel"
            defaultValue={defaults.phone}
            error={state.fieldErrors?.phone}
          />
          <Field
            label="Email address"
            name="email"
            type="email"
            required
            wide
            defaultValue={defaults.email}
            error={state.fieldErrors?.email}
          />
        </Grid>
      </Section>

      {/* ===== 2. PASSWORD ===== */}
      <Section
        title="Password"
        description="Confirm your current password before setting a new one. Leave blank to keep your existing password."
      >
        <Grid>
          <Field
            label="Current password"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            wide
            error={state.fieldErrors?.currentPassword}
          />
          <Field
            label="New password"
            name="password"
            type="password"
            autoComplete="new-password"
            error={state.fieldErrors?.password}
          />
          <Field
            label="Confirm password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            error={state.fieldErrors?.confirmPassword}
          />
        </Grid>
      </Section>

      {/* ===== 3. COMMUNICATIONS ===== */}
      <Section
        title="Communications"
        description="Optional newsletters from Platinum Micro. You can unsubscribe any time."
      >
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            name="exclusiveOffers"
            value="yes"
            className="mt-1 h-4 w-4 shrink-0 rounded border-pm-ink-300 accent-pm-terracotta focus:ring-2 focus:ring-pm-terracotta/40"
          />
          <span className="flex flex-col gap-0.5">
            <span className="text-[14px] font-semibold text-pm-ink-900">
              Exclusive offers
            </span>
            <span className="text-[13px] leading-[1.5] text-pm-ink-500">
              I would like to receive occasional updates and offers — typically
              one or two emails per month.
            </span>
          </span>
        </label>
      </Section>

      {/* ===== Footer ===== */}
      <footer className="flex items-center justify-end gap-3 border-t border-pm-ink-100 bg-pm-paper px-6 py-4">
        <SubmitButton />
      </footer>
    </form>
  );
}

/* ============================== Sub-components =========================== */

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-pm-ink-100 px-6 py-7 last:border-b-0">
      <header className="mb-5 flex flex-col gap-1">
        <h2 className="text-[15px] font-bold tracking-tight text-pm-ink-900">
          {title}
        </h2>
        {description && (
          <p className="max-w-[640px] text-[13px] leading-[1.5] text-pm-ink-500">
            {description}
          </p>
        )}
      </header>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
      {children}
    </div>
  );
}

function Field({
  label,
  name,
  required,
  type = 'text',
  defaultValue,
  autoComplete,
  wide,
  error,
}: {
  label: string;
  name: string;
  required?: boolean;
  type?: string;
  defaultValue?: string;
  autoComplete?: string;
  wide?: boolean;
  error?: string;
}) {
  const id = `settings-${name}`;
  const hasError = Boolean(error);
  return (
    <label
      htmlFor={id}
      className={`flex flex-col gap-1.5 ${wide ? 'sm:col-span-2' : ''}`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-pm-ink-500">
          {label}
        </span>
        {required && (
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-pm-tan">
            Required
          </span>
        )}
      </div>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError ? `${id}-error` : undefined}
        className={`rounded-md border bg-white px-3 py-2.5 text-[14px] text-pm-ink-900 outline-none transition-all placeholder:text-pm-ink-400 focus:shadow-[0_0_0_3px_rgba(46,109,180,0.15)] ${
          hasError
            ? 'border-pm-danger focus:border-pm-danger focus:shadow-[0_0_0_3px_rgba(166,61,47,0.18)]'
            : 'border-pm-ink-300 focus:border-pm-navy-light'
        }`}
      />
      {hasError && (
        <span
          id={`${id}-error`}
          className="text-[12px] font-medium text-pm-danger"
        >
          {error}
        </span>
      )}
    </label>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="inline-flex items-center gap-2 rounded-md bg-pm-terracotta px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-pm-terracotta-light disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-pm-terracotta"
    >
      {pending ? 'Updating…' : 'Update details'}
      {pending ? null : <ArrowRight size={14} strokeWidth={2.5} />}
    </button>
  );
}
