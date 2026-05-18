/**
 * PmFormField
 * -----------
 * Reusable labelled text input used by every PM auth form. Honours the
 * locked design-system type scale: 13px uppercase tracked label, 15px input
 * text, 13px error.
 *
 * The eyebrow-styled "Required" indicator on the label only appears when the
 * field is required AND there is no error — once an error is showing, the
 * error message is the more useful signal.
 *
 * Stays a server component: no client-side state, just markup. Forms wire
 * their own onSubmit / server action.
 */

import type { PmFormFieldProps } from './pm-form-field.types';

export function PmFormField({
  label,
  name,
  type = 'text',
  required = false,
  placeholder,
  autoComplete,
  error,
  hint,
  defaultValue,
}: PmFormFieldProps) {
  const fieldId = `pm-field-${name}`;
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;
  const showRequiredEyebrow = required && !error;

  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') ||
    undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label
          htmlFor={fieldId}
          className="text-[13px] font-semibold uppercase tracking-[0.06em] text-pm-ink-500"
        >
          {label}
        </label>
        {showRequiredEyebrow && (
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-pm-tan">
            Required
          </span>
        )}
      </div>
      <input
        id={fieldId}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`min-h-[44px] w-full rounded-md border bg-white px-4 py-3 text-base sm:text-[15px] text-pm-ink-900 outline-none transition-all placeholder:text-pm-ink-400 focus:shadow-[0_0_0_3px_rgba(46,109,180,0.15)] ${
          error
            ? 'border-pm-danger focus:border-pm-danger'
            : 'border-pm-ink-300 focus:border-pm-navy-light'
        }`}
      />
      {error ? (
        <p id={errorId} className="mt-1.5 text-[13px] text-pm-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1 text-[12px] leading-[1.4] text-pm-ink-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
