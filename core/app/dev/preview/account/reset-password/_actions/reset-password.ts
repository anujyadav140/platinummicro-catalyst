'use server';

/**
 * reset-password server action
 * ----------------------------
 * Completes the password reset flow that began on
 * /dev/preview/account/forgot. The user lands here from the magic link in the
 * BC reset email, which carries `?token=...&c=...` (BC's standard query
 * parameters used by Catalyst's stock change-password page).
 *
 * We forward `token` + `customerEntityId` as hidden inputs from the page so
 * the action receives them via FormData. We then call BC's
 * `customer.resetPassword` mutation (the same one Catalyst's stock
 * change-password action uses — see
 * core/app/[locale]/(default)/(auth)/change-password/_actions/change-password.ts).
 *
 * On success → redirect to `/dev/preview/account?passwordReset=1` so the
 * sign-in page can show a confirmation banner.
 * On failure → return a structured state for the form to render.
 */

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { BigCommerceGQLError } from '@bigcommerce/catalyst-client';
import { client } from '~/client';
import { graphql } from '~/client/graphql';

const ResetPasswordMutation = graphql(`
  mutation PmResetPasswordMutation($input: ResetPasswordInput!) {
    customer {
      resetPassword(input: $input) {
        __typename
        errors {
          __typename
          ... on Error {
            message
          }
        }
      }
    }
  }
`);

const schema = z
  .object({
    token: z.string().trim().min(1, 'Missing reset token.'),
    customerEntityId: z
      .string()
      .trim()
      .min(1, 'Missing customer id.')
      .regex(/^\d+$/, 'Invalid customer id.'),
    password: z
      .string()
      .min(8, 'At least 8 characters, including a number.')
      .regex(/[0-9]/, 'At least 8 characters, including a number.'),
    confirmPassword: z.string().min(1, 'Confirm your new password.'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: "Passwords don't match.",
  });

export type ResetPasswordState = {
  ok: boolean;
  /** Top-level form error (bad token / expired / API failure). */
  message?: string;
  /** Field-level validation errors. */
  fieldErrors?: { password?: string; confirmPassword?: string };
  /** Marks the link itself as unusable so the UI can swap to a "request a new one" prompt. */
  linkInvalid?: boolean;
};

const INVALID_LINK_MESSAGE =
  'This reset link is invalid or has expired. Request a new one.';

/**
 * Heuristic: BigCommerce returns generic strings for token failures. We
 * surface those as a "request a new one" state rather than a generic error.
 */
function looksLikeInvalidToken(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('token') ||
    m.includes('expired') ||
    m.includes('invalid') ||
    m.includes('not found')
  );
}

export async function resetPasswordAction(
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const parsed = schema.safeParse({
    token: formData.get('token'),
    customerEntityId: formData.get('customerEntityId'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!parsed.success) {
    const flat = parsed.error.flatten();

    // Token / customerEntityId arrive as hidden inputs; if they're missing
    // it's a tampered URL or a stale page — treat as invalid link.
    if (flat.fieldErrors.token || flat.fieldErrors.customerEntityId) {
      return { ok: false, linkInvalid: true, message: INVALID_LINK_MESSAGE };
    }

    return {
      ok: false,
      fieldErrors: {
        password: flat.fieldErrors.password?.[0],
        confirmPassword: flat.fieldErrors.confirmPassword?.[0],
      },
    };
  }

  const { token, customerEntityId, password } = parsed.data;

  try {
    const response = await client.fetch({
      document: ResetPasswordMutation,
      variables: {
        input: {
          token,
          customerEntityId: Number(customerEntityId),
          newPassword: password,
        },
      },
      fetchOptions: { cache: 'no-store' },
    });

    const result = response.data.customer.resetPassword;

    if (result.errors.length > 0) {
      const message = result.errors.map((e) => e.message).join(' ');

      if (looksLikeInvalidToken(message)) {
        return { ok: false, linkInvalid: true, message: INVALID_LINK_MESSAGE };
      }

      return { ok: false, message };
    }
  } catch (error) {
    if (error instanceof BigCommerceGQLError) {
      const joined = error.errors.map((e) => e.message).join(' ');

      // 401/403 from a misconfigured token still hits us here.
      // TODO(production): widen the storefront token's customer-write scope
      // so customer.resetPassword succeeds on the live channel.
      // eslint-disable-next-line no-console
      console.error('[reset-password] BigCommerceGQLError:', joined);

      if (looksLikeInvalidToken(joined)) {
        return { ok: false, linkInvalid: true, message: INVALID_LINK_MESSAGE };
      }

      return {
        ok: false,
        message:
          "Couldn't update your password right now. Try again or call (877) PMG-4YOU.",
      };
    }

    if (error instanceof Error) {
      // eslint-disable-next-line no-console
      console.error('[reset-password] transport error:', error.message);
    } else {
      // eslint-disable-next-line no-console
      console.error('[reset-password] unknown error:', error);
    }

    return {
      ok: false,
      message:
        "Couldn't update your password right now. Try again or call (877) PMG-4YOU.",
    };
  }

  // Success — bounce to sign-in with a banner flag.
  redirect('/dev/preview/account?passwordReset=1');
}
