/**
 * PmFormSelect
 * ------------
 * Native `<select>` styled to match `PmFormField`. Used for country / state /
 * province pickers in the register and address forms.
 *
 * Server component — uses the native control so it works without JS and
 * lets each consuming form decide whether it needs hydration. A subtle
 * chevron is layered behind the select so we don't depend on the platform
 * caret style.
 */

import { ChevronDown } from 'lucide-react';

import type { PmFormSelectProps } from './pm-form-select.types';

export function PmFormSelect({
  label,
  name,
  options,
  required = false,
  defaultValue,
  error,
  placeholder,
}: PmFormSelectProps) {
  const fieldId = `pm-select-${name}`;
  const errorId = `${fieldId}-error`;
  const showRequiredEyebrow = required && !error;

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
      <div className="relative">
        <select
          id={fieldId}
          name={name}
          required={required}
          defaultValue={defaultValue ?? ''}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`min-h-[44px] w-full appearance-none rounded-md border bg-white px-4 py-3 pr-10 text-base sm:text-[15px] text-pm-ink-900 outline-none transition-all focus:shadow-[0_0_0_3px_rgba(46,109,180,0.15)] ${
            error
              ? 'border-pm-danger focus:border-pm-danger'
              : 'border-pm-ink-300 focus:border-pm-navy-light'
          }`}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden
          size={16}
          strokeWidth={1.75}
          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-pm-ink-500"
        />
      </div>
      {error && (
        <p id={errorId} className="mt-1.5 text-[13px] text-pm-danger">
          {error}
        </p>
      )}
    </div>
  );
}
