/**
 * Standard result type returned by every PM auth server action.
 *
 * Forms expect either `{ ok: true, data }` (used to redirect / show success)
 * or `{ ok: false, message, fieldErrors? }` so the page can render an inline
 * banner plus per-field error states without each action inventing its own
 * shape.
 */

import type { ZodError } from 'zod';

export type PmActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

export function pmOk<T = void>(data: T): PmActionResult<T> {
  return { ok: true, data };
}

export function pmFail<T = void>(
  message: string,
  fieldErrors?: Record<string, string[]>,
): PmActionResult<T> {
  return { ok: false, message, fieldErrors };
}

export function formatZodErrors(error: ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '_form';
    const list = fieldErrors[key] ?? [];
    list.push(issue.message);
    fieldErrors[key] = list;
  }

  return fieldErrors;
}
