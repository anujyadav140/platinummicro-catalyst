'use client';

/**
 * RegisterForm — client component
 * -------------------------------
 * Renders the 14 registration fields plus the required Terms checkbox and
 * the optional Exclusive Offers checkbox. Wired to the
 * `pmDevRegisterAction` server action through `useActionState` so error
 * banners and per-field errors stay in sync with the form state without
 * needing a separate state machine.
 *
 * Country / State coupling: when Country = US or CA we render a
 * `<select>` populated from `~/lib/pm-countries`'s `getStatesForCountry()`.
 * For any other country (or none chosen) we render a free-text input so
 * international addresses still go through.
 *
 * Design language is taken straight from `04-design-system.md` and
 * `06-type-scale.md` — small uppercase tracked labels, 15px input text,
 * terracotta primary CTA at the bottom. Do NOT swap to BigCommerce-stock
 * markup; Anuj has called out the diff from BC layout multiple times.
 *
 * TODO(shared-infra): swap inline label/input markup for a `<PmFormField>`
 * primitive once Auth-Infra's `core/components/pm-form-field/` lands.
 */

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useActionState, useId, useMemo, useState } from 'react';

import {
  PM_COUNTRIES,
  PM_DEFAULT_COUNTRY,
  getStatesForCountry,
} from '~/lib/pm-countries';
import type { PmActionResult } from '~/lib/pm-auth-result';

import { pmDevRegisterAction } from '../_actions/register';

type ActionResult = PmActionResult<{ email: string }> | null;

const labelClass =
  'text-[13px] font-semibold uppercase tracking-[0.06em] text-pm-ink-500';
const inputClass =
  'rounded-md border border-pm-ink-300 bg-white px-4 py-3 text-[15px] text-pm-ink-900 outline-none transition-all focus:border-pm-navy-light focus:shadow-[0_0_0_3px_rgba(46,109,180,0.15)]';
const inputErrorClass =
  'rounded-md border border-pm-terracotta bg-white px-4 py-3 text-[15px] text-pm-ink-900 outline-none transition-all focus:border-pm-terracotta focus:shadow-[0_0_0_3px_rgba(166,61,47,0.15)]';
const helpTextClass = 'text-[12px] font-medium text-pm-ink-500';
const errorTextClass = 'text-[12px] font-medium text-pm-terracotta';
const requiredMarkClass = 'ml-1 text-pm-terracotta';

function FieldErrors({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <span role="alert" className={errorTextClass}>
      {errors[0]}
    </span>
  );
}

export function RegisterForm() {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    pmDevRegisterAction,
    null,
  );

  const [countryCode, setCountryCode] = useState<string>(PM_DEFAULT_COUNTRY);
  const states = useMemo(() => getStatesForCountry(countryCode), [countryCode]);
  const banner = state && !state.ok ? state.message : null;
  const fieldErrors = state && !state.ok ? state.fieldErrors ?? {} : {};

  // Stable id for aria-describedby on the password helper.
  const pwHelpId = useId();

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-5" noValidate>
      {banner ? (
        <div
          role="alert"
          className="rounded-md border border-pm-terracotta bg-pm-terracotta-pale px-4 py-3 text-[14px] font-medium text-pm-ink-900"
        >
          {banner}
        </div>
      ) : null}

      {/* ===== Account credentials ===== */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className={labelClass}>
            Email Address<span className={requiredMarkClass}>*</span>
          </span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="you@company.com"
            className={fieldErrors.email ? inputErrorClass : inputClass}
            aria-invalid={Boolean(fieldErrors.email)}
          />
          <FieldErrors errors={fieldErrors.email} />
        </label>
        <label className="flex flex-col gap-2">
          <span className={labelClass}>
            Phone Number<span className={requiredMarkClass}>*</span>
          </span>
          <input
            type="tel"
            name="phone"
            required
            autoComplete="tel"
            placeholder="(555) 555-5555"
            className={fieldErrors.phone ? inputErrorClass : inputClass}
            aria-invalid={Boolean(fieldErrors.phone)}
          />
          <FieldErrors errors={fieldErrors.phone} />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className={labelClass}>
            Password<span className={requiredMarkClass}>*</span>
          </span>
          <input
            type="password"
            name="password"
            required
            autoComplete="new-password"
            aria-describedby={pwHelpId}
            className={fieldErrors.password ? inputErrorClass : inputClass}
            aria-invalid={Boolean(fieldErrors.password)}
          />
          <span id={pwHelpId} className={helpTextClass}>
            At least 8 characters, with a letter and a number.
          </span>
          <FieldErrors errors={fieldErrors.password} />
        </label>
        <label className="flex flex-col gap-2">
          <span className={labelClass}>
            Confirm Password<span className={requiredMarkClass}>*</span>
          </span>
          <input
            type="password"
            name="confirmPassword"
            required
            autoComplete="new-password"
            className={fieldErrors.confirmPassword ? inputErrorClass : inputClass}
            aria-invalid={Boolean(fieldErrors.confirmPassword)}
          />
          <FieldErrors errors={fieldErrors.confirmPassword} />
        </label>
      </div>

      {/* ===== Identity ===== */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className={labelClass}>
            First Name<span className={requiredMarkClass}>*</span>
          </span>
          <input
            type="text"
            name="firstName"
            required
            autoComplete="given-name"
            className={fieldErrors.firstName ? inputErrorClass : inputClass}
            aria-invalid={Boolean(fieldErrors.firstName)}
          />
          <FieldErrors errors={fieldErrors.firstName} />
        </label>
        <label className="flex flex-col gap-2">
          <span className={labelClass}>
            Last Name<span className={requiredMarkClass}>*</span>
          </span>
          <input
            type="text"
            name="lastName"
            required
            autoComplete="family-name"
            className={fieldErrors.lastName ? inputErrorClass : inputClass}
            aria-invalid={Boolean(fieldErrors.lastName)}
          />
          <FieldErrors errors={fieldErrors.lastName} />
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className={labelClass}>Company Name</span>
        <input
          type="text"
          name="company"
          autoComplete="organization"
          placeholder="Optional"
          className={fieldErrors.company ? inputErrorClass : inputClass}
          aria-invalid={Boolean(fieldErrors.company)}
        />
        <FieldErrors errors={fieldErrors.company} />
      </label>

      {/* ===== Address ===== */}
      <label className="flex flex-col gap-2">
        <span className={labelClass}>
          Address Line 1<span className={requiredMarkClass}>*</span>
        </span>
        <input
          type="text"
          name="address1"
          required
          autoComplete="address-line1"
          className={fieldErrors.address1 ? inputErrorClass : inputClass}
          aria-invalid={Boolean(fieldErrors.address1)}
        />
        <FieldErrors errors={fieldErrors.address1} />
      </label>

      <label className="flex flex-col gap-2">
        <span className={labelClass}>Address Line 2</span>
        <input
          type="text"
          name="address2"
          autoComplete="address-line2"
          placeholder="Apt, suite, floor (optional)"
          className={fieldErrors.address2 ? inputErrorClass : inputClass}
          aria-invalid={Boolean(fieldErrors.address2)}
        />
        <FieldErrors errors={fieldErrors.address2} />
      </label>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className={labelClass}>
            Country<span className={requiredMarkClass}>*</span>
          </span>
          <select
            name="countryCode"
            required
            autoComplete="country"
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            className={fieldErrors.countryCode ? inputErrorClass : inputClass}
            aria-invalid={Boolean(fieldErrors.countryCode)}
          >
            {PM_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
          <FieldErrors errors={fieldErrors.countryCode} />
        </label>
        <label className="flex flex-col gap-2">
          <span className={labelClass}>
            State / Province<span className={requiredMarkClass}>*</span>
          </span>
          {states.length > 0 ? (
            <select
              name="stateOrProvince"
              required
              autoComplete="address-level1"
              defaultValue=""
              className={fieldErrors.stateOrProvince ? inputErrorClass : inputClass}
              aria-invalid={Boolean(fieldErrors.stateOrProvince)}
            >
              <option value="" disabled>
                Select…
              </option>
              {states.map((s) => (
                <option key={s.code} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              name="stateOrProvince"
              required
              autoComplete="address-level1"
              placeholder="State, province, or region"
              className={fieldErrors.stateOrProvince ? inputErrorClass : inputClass}
              aria-invalid={Boolean(fieldErrors.stateOrProvince)}
            />
          )}
          <FieldErrors errors={fieldErrors.stateOrProvince} />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className={labelClass}>
            Suburb / City<span className={requiredMarkClass}>*</span>
          </span>
          <input
            type="text"
            name="city"
            required
            autoComplete="address-level2"
            className={fieldErrors.city ? inputErrorClass : inputClass}
            aria-invalid={Boolean(fieldErrors.city)}
          />
          <FieldErrors errors={fieldErrors.city} />
        </label>
        <label className="flex flex-col gap-2">
          <span className={labelClass}>
            Zip / Postcode<span className={requiredMarkClass}>*</span>
          </span>
          <input
            type="text"
            name="postalCode"
            required
            autoComplete="postal-code"
            className={fieldErrors.postalCode ? inputErrorClass : inputClass}
            aria-invalid={Boolean(fieldErrors.postalCode)}
          />
          <FieldErrors errors={fieldErrors.postalCode} />
        </label>
      </div>

      {/* ===== Consents ===== */}
      <label className="mt-1 inline-flex items-start gap-2.5 text-[13px] leading-[1.55] text-pm-ink-700">
        <input
          type="checkbox"
          name="exclusiveOffers"
          className="mt-0.5 h-4 w-4 rounded border-pm-ink-300 accent-pm-terracotta"
        />
        <span>
          Send me exclusive offers, new product alerts, and curated public-sector
          deal sheets.
        </span>
      </label>

      <label className="inline-flex items-start gap-2.5 text-[13px] leading-[1.55] text-pm-ink-700">
        <input
          type="checkbox"
          name="terms"
          required
          className="mt-0.5 h-4 w-4 rounded border-pm-ink-300 accent-pm-terracotta"
          aria-invalid={Boolean(fieldErrors.terms)}
        />
        <span>
          I agree to Platinum Micro&apos;s{' '}
          <Link
            href="/dev/preview/legal/terms-conditions"
            className="font-semibold text-pm-navy-mid hover:text-pm-navy-light"
          >
            Terms
          </Link>{' '}
          and{' '}
          <Link
            href="/dev/preview/legal/privacy-policy"
            className="font-semibold text-pm-navy-mid hover:text-pm-navy-light"
          >
            Privacy Policy
          </Link>
          .<span className={requiredMarkClass}>*</span>
        </span>
      </label>
      <FieldErrors errors={fieldErrors.terms} />

      <button
        type="submit"
        disabled={pending}
        className="mt-3 inline-flex items-center justify-center gap-2 rounded-md bg-pm-terracotta px-4 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-pm-terracotta-light disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? 'Creating account…' : 'Create account'}
        {!pending ? <ArrowRight size={15} strokeWidth={2.5} /> : null}
      </button>

      <p className={helpTextClass}>
        Approval typically within one business day. Confirmation will arrive by
        email when your account is active.
      </p>
    </form>
  );
}
