'use server';

/**
 * Sign-in server action for /dev/preview/account
 * -----------------------------------------------
 * Validates the form against `pmSignInFormSchema` (sibling Auth-Infra), then
 * delegates to Catalyst's existing Auth.js `signIn('password', ...)` provider
 * (see `core/auth/index.ts`), which calls BigCommerce's `LoginMutation` under
 * the hood.
 *
 * Returns a `PmActionResult<never>` so the client form (`sign-in-shell.tsx`)
 * can show a banner and per-field errors via `useActionState`. On success we
 * `redirect()` to the customer area before returning.
 *
 * Honest expectation: the storefront-channel JWT we minted may not include
 * the customer-auth scope BigCommerce requires for password login. If the
 * call fails with 401/403 / Auth.js `CredentialsSignin`, we surface a
 * generic "couldn't reach our authentication service" message and the
 * scope can be upgraded later — wiring stays correct.
 */

import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';

import { signIn } from '~/auth';
import { getCartId } from '~/lib/cart';
import {
  pmSignInFormSchema,
  type PmSignInFormValues,
} from '~/lib/pm-auth-validation';
import {
  formatZodErrors,
  pmFail,
  type PmActionResult,
} from '~/lib/pm-auth-result';

const GENERIC_INVALID_MESSAGE = 'Email or password is incorrect.';
// TODO(production): the Storefront JWT may need additional customer-auth scope
// — if BigCommerce returns 401/403 on the LoginMutation we fall through to
// this message instead of the credentials-mismatch one.
const SERVICE_UNREACHABLE_MESSAGE =
  "We couldn't reach our authentication service. Try again or call (877) PMG-4YOU.";

export type SignInState = PmActionResult<never> | null;

export async function signInAction(
  _prevState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const raw: Partial<PmSignInFormValues> = {
    email: (formData.get('email') ?? '').toString(),
    password: (formData.get('password') ?? '').toString(),
  };

  const parsed = pmSignInFormSchema.safeParse(raw);

  if (!parsed.success) {
    return pmFail('Please fix the errors below.', formatZodErrors(parsed.error));
  }

  const cartId = await getCartId();

  try {
    await signIn('password', {
      email: parsed.data.email,
      password: parsed.data.password,
      cartId,
      redirect: false,
    });
  } catch (error) {
    // Always log the raw error so we can debug from the dev server console.
    // Auth.js sometimes obscures the underlying BC GraphQL error inside
    // `error.cause?.err`; we walk that chain to surface every available
    // signal (type, message, BC GQL errors array if present).
    // eslint-disable-next-line no-console
    console.error('[sign-in] caught error', {
      isAuthError: error instanceof AuthError,
      authErrorType: error instanceof AuthError ? error.type : undefined,
      message: error instanceof Error ? error.message : String(error),
      causeErr:
        error instanceof AuthError && error.cause?.err
          ? {
              name: error.cause.err.name,
              message: error.cause.err.message,
              stack: error.cause.err.stack,
              // BigCommerceGQLError attaches the raw GQL errors array
              // here under .errors. Surface it so we can see permission
              // / scope / mutation issues.
              gqlErrors: (error.cause.err as { errors?: unknown }).errors,
            }
          : undefined,
      raw: error,
    });

    // Auth.js wraps the BigCommerceGQLError in a CallbackRouteError.
    if (error instanceof AuthError) {
      if (error.type === 'CredentialsSignin') {
        return pmFail(GENERIC_INVALID_MESSAGE);
      }

      if (error.type === 'CallbackRouteError') {
        const cause = error.cause?.err;
        const message = cause?.message ?? '';

        if (message.includes('Invalid credentials')) {
          return pmFail(GENERIC_INVALID_MESSAGE);
        }

        // 401/403 from the storefront API surfaces here when the JWT scope
        // is missing the customer-auth permission. Treat as service-level.
        // TODO(production): the Storefront JWT may need additional
        // customer-auth scope — see `core/auth/index.ts` LoginMutation.
        return pmFail(SERVICE_UNREACHABLE_MESSAGE);
      }

      return pmFail(SERVICE_UNREACHABLE_MESSAGE);
    }

    return pmFail(SERVICE_UNREACHABLE_MESSAGE);
  }

  // Auth.js succeeded — redirect to the customer profile.
  // `redirect()` throws NEXT_REDIRECT, which Next.js catches; do not wrap.
  redirect('/dev/preview/account/profile');
}
