'use server';

/**
 * forgot-password server action
 * -----------------------------
 * Two-step flow:
 *
 *   1. Look up the email via BC's V3 REST customers endpoint
 *      (`/v3/customers?email:in=<email>`). If no customer exists, surface a
 *      clear "no account with that email" error so the user isn't waiting on
 *      an email that will never arrive.
 *
 *   2. If the customer exists, call BC's `customer.requestResetPassword`
 *      Storefront GraphQL mutation. BC sends an email with a magic link
 *      back to `/dev/preview/account/reset-password`.
 *
 * Note: the prior version followed the standard "always pretend success"
 * security pattern (prevents email enumeration). Anuj explicitly asked for
 * the UX-clearer behaviour — for a B2B distributor with named accounts the
 * enumeration concern is lower than the wasted-wait UX cost.
 *
 * On true success → redirect to `/dev/preview/account/forgot/sent?email=…`.
 */

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { BigCommerceGQLError } from '@bigcommerce/catalyst-client';
import { client } from '~/client';
import { graphql } from '~/client/graphql';

const ResetPasswordMutation = graphql(`
  mutation PmRequestResetPasswordMutation($input: RequestResetPasswordInput!) {
    customer {
      requestResetPassword(input: $input) {
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

const schema = z.object({
  email: z.string().trim().min(1, 'Email is required.').email('Enter a valid email address.'),
});

export type ForgotPasswordState = {
  ok: boolean;
  message?: string;
  fieldErrors?: { email?: string };
  /** Echo the submitted value back so the input doesn't lose what the user typed. */
  email?: string;
};

const SERVICE_UNAVAILABLE =
  "Couldn't send the reset email right now. Try again or call (877) PMG-4YOU.";

const NO_ACCOUNT_MESSAGE =
  "There's no account on this email. Create one or use a different email.";

/**
 * Look up a customer by email via BC's V3 REST API. Returns true if at least
 * one customer matches. Throws on transport or auth failures so the action
 * can surface a service-unavailable error rather than falsely claim
 * "account not found".
 */
async function customerExists(email: string): Promise<boolean> {
  const storeHash = process.env.BIGCOMMERCE_STORE_HASH;
  const accessToken = process.env.BIGCOMMERCE_ACCESS_TOKEN;

  if (!storeHash || !accessToken) {
    throw new Error(
      'BIGCOMMERCE_STORE_HASH and BIGCOMMERCE_ACCESS_TOKEN must be set for customer lookup.',
    );
  }

  const url = `https://api.bigcommerce.com/stores/${storeHash}/v3/customers?email:in=${encodeURIComponent(email)}`;

  const res = await fetch(url, {
    headers: {
      'X-Auth-Token': accessToken,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Customer lookup failed: HTTP ${res.status}`);
  }

  const json = (await res.json()) as { data?: unknown[] };
  return Array.isArray(json.data) && json.data.length > 0;
}

export async function forgotPasswordAction(
  _prev: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const parsed = schema.safeParse({ email: formData.get('email') });

  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return {
      ok: false,
      fieldErrors: { email: flat.fieldErrors.email?.[0] },
      email:
        typeof formData.get('email') === 'string'
          ? String(formData.get('email'))
          : '',
    };
  }

  const { email } = parsed.data;

  // ---- Step 1: existence check ------------------------------------------
  let exists = false;
  try {
    exists = await customerExists(email);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[forgot-password] customer lookup failed:', error);
    return {
      ok: false,
      message: SERVICE_UNAVAILABLE,
      email,
    };
  }

  if (!exists) {
    return {
      ok: false,
      fieldErrors: { email: NO_ACCOUNT_MESSAGE },
      email,
    };
  }

  // ---- Step 2: request reset email --------------------------------------
  // Path BC stitches into the magic link.
  const redirectPath = `/dev/preview/account/reset-password`;

  try {
    const response = await client.fetch({
      document: ResetPasswordMutation,
      variables: {
        input: {
          email,
          path: redirectPath,
        },
      },
      fetchOptions: { cache: 'no-store' },
    });

    const result = response.data.customer.requestResetPassword;

    if (result.errors.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(
        '[forgot-password] BC mutation reported errors:',
        result.errors.map((e) => e.message).join('; '),
      );
      return { ok: false, message: SERVICE_UNAVAILABLE, email };
    }
  } catch (error) {
    if (error instanceof BigCommerceGQLError) {
      // eslint-disable-next-line no-console
      console.error(
        '[forgot-password] BigCommerceGQLError:',
        error.errors.map((e) => e.message).join('; '),
      );
    } else if (error instanceof Error) {
      // eslint-disable-next-line no-console
      console.error('[forgot-password] transport error:', error.message);
    } else {
      // eslint-disable-next-line no-console
      console.error('[forgot-password] unknown error:', error);
    }
    return { ok: false, message: SERVICE_UNAVAILABLE, email };
  }

  redirect(
    `/dev/preview/account/forgot/sent?email=${encodeURIComponent(email)}`,
  );
}
