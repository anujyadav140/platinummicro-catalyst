'use client';

/**
 * AddressForm
 * -----------
 * BC-backed inline form for create + edit. Posts to one of two server
 * actions:
 *
 *   - mode="create" → createAddressAction
 *   - mode="edit"   → updateAddressAction (with hidden addressId field)
 *
 * Uses useActionState so per-field errors and pending state are handled
 * server-side without any local mirror state. On a successful action the
 * server `revalidatePath`s the addresses route and the parent page
 * re-renders with fresh data, at which point the parent calls onSaved
 * (driven by the action result) to close the form.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { ArrowRight, Info, MapPin, X } from 'lucide-react';

import {
  createAddressAction,
  updateAddressAction,
  type AddressActionState,
} from '../../_actions/addresses';

const INITIAL: AddressActionState = { ok: true };

export interface AddressFormDefaults {
  firstName?: string;
  lastName?: string;
  company?: string;
  street1?: string;
  street2?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
}

export interface AddressFormProps {
  mode: 'create' | 'edit';
  /** When mode === 'edit' this is BC's address entityId. */
  addressId?: number;
  defaults?: AddressFormDefaults;
  onCancel: () => void;
  /** Fires after the server action succeeds and revalidation kicks in. */
  onSaved: () => void;
}

export function AddressForm({
  mode,
  addressId,
  defaults = {},
  onCancel,
  onSaved,
}: AddressFormProps) {
  const action = mode === 'edit' ? updateAddressAction : createAddressAction;
  const [state, formAction] = useActionState(action, INITIAL);

  // After a successful server action, the parent page revalidates and
  // re-renders with fresh data. Notify the parent so it can close the
  // form. We watch `state.ok` flipping to true with no message (success
  // state) and fire onSaved exactly once per success.
  const successKey = state.ok && !state.message ? 'success' : 'idle';
  useEffect(() => {
    if (state.ok && !state.message && Object.keys(state).length === 1) {
      // Initial state is { ok: true } — that's NOT a success, just initial.
      // We distinguish post-action success because useActionState replaces
      // state with the resolved AddressActionState which is a fresh object.
      // Use a ref-style guard via an effect deps trick: only fire when
      // the state object reference changes from the initial constant.
    }
  }, [state]);

  // Simpler reliable signal: when `state` is no longer the INITIAL constant
  // and `state.ok` is true with no message, it was a successful action.
  useEffect(() => {
    if (state !== INITIAL && state.ok && !state.message) {
      onSaved();
    }
    // We deliberately exclude onSaved from the dep list so we only react
    // to state changes, not parent re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form
      action={formAction}
      className="rounded-md border border-pm-ink-200 bg-white p-6 shadow-sm"
    >
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MapPin size={16} strokeWidth={1.75} className="text-pm-navy-mid" />
          <h2 className="text-[16px] font-bold tracking-tight text-pm-ink-900">
            {mode === 'edit' ? 'Edit address' : 'Add a new address'}
          </h2>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel"
          className="flex h-8 w-8 items-center justify-center rounded-md text-pm-ink-500 transition-colors hover:bg-pm-ink-100 hover:text-pm-ink-900"
        >
          <X size={14} strokeWidth={2} />
        </button>
      </header>

      {/* Hidden addressId for edit mode — server reads this from FormData. */}
      {mode === 'edit' && addressId !== undefined && (
        <input type="hidden" name="addressId" value={addressId} />
      )}

      {/* Top-level message — fires on validation or BC errors. */}
      {state.message && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-3 rounded-md border border-pm-tan/40 bg-pm-tan-pale px-4 py-3 text-[13px] leading-[1.5] text-pm-ink-800"
        >
          <Info size={16} strokeWidth={2} className="mt-0.5 shrink-0 text-pm-tan" />
          <span>{state.message}</span>
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
        <Field
          label="First name"
          name="firstName"
          required
          defaultValue={defaults.firstName ?? ''}
          error={state.fieldErrors?.firstName}
        />
        <Field
          label="Last name"
          name="lastName"
          required
          defaultValue={defaults.lastName ?? ''}
          error={state.fieldErrors?.lastName}
        />
        <Field
          label="Company"
          name="company"
          defaultValue={defaults.company ?? ''}
        />
        <Field
          label="Phone"
          name="phone"
          type="tel"
          defaultValue={defaults.phone ?? ''}
        />
        <Field
          label="Address line 1"
          name="street1"
          required
          wide
          defaultValue={defaults.street1 ?? ''}
          error={state.fieldErrors?.street1}
        />
        <Field
          label="Address line 2"
          name="street2"
          wide
          defaultValue={defaults.street2 ?? ''}
          placeholder="Apt, suite, unit (optional)"
        />
        <Field
          label="City"
          name="city"
          required
          defaultValue={defaults.city ?? ''}
          error={state.fieldErrors?.city}
        />
        <Field
          label="State / region"
          name="region"
          required
          defaultValue={defaults.region ?? ''}
          error={state.fieldErrors?.region}
        />
        <Field
          label="Postal code"
          name="postalCode"
          required
          defaultValue={defaults.postalCode ?? ''}
          error={state.fieldErrors?.postalCode}
        />
        <Field
          label="Country"
          name="country"
          required
          defaultValue={defaults.country ?? 'United States'}
        />
      </div>

      <div className="mt-6 flex items-center justify-end gap-2 border-t border-pm-ink-100 pt-5">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-4 py-2 text-[13px] font-semibold text-pm-ink-500 transition-colors hover:bg-pm-ink-100 hover:text-pm-ink-900"
        >
          Cancel
        </button>
        <SubmitButton mode={mode} />
      </div>
    </form>
  );
}

/* =============================== Sub-components ========================== */

function Field({
  label,
  name,
  required,
  type = 'text',
  defaultValue,
  placeholder,
  wide,
  error,
}: {
  label: string;
  name: string;
  required?: boolean;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  wide?: boolean;
  error?: string;
}) {
  const id = `addr-${name}`;
  const hasError = Boolean(error);
  return (
    <label
      htmlFor={id}
      className={`flex flex-col gap-1.5 ${wide ? 'sm:col-span-2' : ''}`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-bold text-pm-ink-900">{label}</span>
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
        placeholder={placeholder}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError ? `${id}-error` : undefined}
        className={`rounded-md border bg-white px-3 py-2.5 text-[14px] text-pm-ink-900 outline-none transition-all placeholder:text-pm-ink-400 focus:shadow-[0_0_0_3px_rgba(46,109,180,0.15)] ${
          hasError
            ? 'border-pm-danger focus:border-pm-danger focus:shadow-[0_0_0_3px_rgba(166,61,47,0.18)]'
            : 'border-pm-ink-300 focus:border-pm-navy-light'
        }`}
      />
      {hasError && (
        <span id={`${id}-error`} className="text-[12px] font-medium text-pm-danger">
          {error}
        </span>
      )}
    </label>
  );
}

function SubmitButton({ mode }: { mode: 'create' | 'edit' }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="inline-flex items-center gap-1.5 rounded-md bg-pm-terracotta px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-pm-terracotta-light disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending
        ? mode === 'edit'
          ? 'Saving…'
          : 'Adding…'
        : mode === 'edit'
          ? 'Save changes'
          : 'Add address'}
      {pending ? null : <ArrowRight size={12} strokeWidth={2.5} />}
    </button>
  );
}
