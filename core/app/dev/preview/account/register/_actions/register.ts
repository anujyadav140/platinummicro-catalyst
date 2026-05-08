'use server';

/**
 * /dev/preview/account/register — server action
 * ---------------------------------------------
 * Validates the 14-field B2B register form with Zod (shared
 * `pmRegisterFormSchema` from `~/lib/pm-auth-validation`) and calls
 * BigCommerce's `customer.registerCustomer` mutation with an attached
 * address record so the new account ships ready to check out.
 *
 * On success: redirects to `/dev/preview/account?registered=1` so the
 * sign-in page can render the post-registration banner. We deliberately
 * do NOT auto-`signIn()` here because the dev-preview tree is not behind
 * the locale-routed `/[locale]/(auth)/` middleware that owns NextAuth.
 *
 * On failure: returns a `PmActionResult` (see `~/lib/pm-auth-result`)
 * with a banner-level `message` and per-field `fieldErrors`. The form
 * uses these via `useActionState`.
 */

import { BigCommerceGQLError } from '@bigcommerce/catalyst-client';
import { redirect } from 'next/navigation';

import { client } from '~/client';
import { graphql, type VariablesOf } from '~/client/graphql';
import {
  formatZodErrors,
  pmFail,
  type PmActionResult,
} from '~/lib/pm-auth-result';
import { pmRegisterFormSchema } from '~/lib/pm-auth-validation';

const RegisterCustomerMutation = graphql(`
  mutation PmDevPreviewRegisterCustomerMutation($input: RegisterCustomerInput!) {
    customer {
      registerCustomer(input: $input) {
        customer {
          firstName
          lastName
          email
        }
        errors {
          ... on EmailAlreadyInUseError {
            message
          }
          ... on AccountCreationDisabledError {
            message
          }
          ... on CustomerRegistrationError {
            message
          }
          ... on ValidationError {
            message
          }
        }
      }
    }
  }
`);

type RegisterCustomerInput = VariablesOf<typeof RegisterCustomerMutation>['input'];

const GENERIC_FAIL_MESSAGE =
  "We couldn't create your account right now. Please try again or call (877) PMG-4YOU.";

function readString(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === 'string' ? v : '';
}

function readBool(formData: FormData, key: string): boolean {
  const v = formData.get(key);
  return v === 'on' || v === 'true' || v === '1';
}

export async function pmDevRegisterAction(
  _prev: PmActionResult<{ email: string }> | null,
  formData: FormData,
): Promise<PmActionResult<{ email: string }>> {
  // ---- 1. Pull raw values + non-Zod gates (terms acceptance) ----
  const acceptedTerms = readBool(formData, 'terms');
  // exclusiveOffers is opt-in only; not required, captured for parity with
  // BC marketing-list flag once we wire it through.
  const _exclusiveOffers = readBool(formData, 'exclusiveOffers');

  if (!acceptedTerms) {
    return pmFail(
      'You must accept the Terms and Privacy Policy to create an account.',
      { terms: ['Accept the Terms and Privacy Policy to continue.'] },
    );
  }

  const raw = {
    email: readString(formData, 'email'),
    password: readString(formData, 'password'),
    confirmPassword: readString(formData, 'confirmPassword'),
    firstName: readString(formData, 'firstName'),
    lastName: readString(formData, 'lastName'),
    company: readString(formData, 'company'),
    phone: readString(formData, 'phone'),
    address1: readString(formData, 'address1'),
    address2: readString(formData, 'address2'),
    city: readString(formData, 'city'),
    countryCode: readString(formData, 'countryCode'),
    stateOrProvince: readString(formData, 'stateOrProvince'),
    postalCode: readString(formData, 'postalCode'),
  };

  // ---- 2. Zod parse via shared schema ----
  const parsed = pmRegisterFormSchema.safeParse(raw);

  if (!parsed.success) {
    return pmFail('Please fix the highlighted fields.', formatZodErrors(parsed.error));
  }

  const v = parsed.data;

  // ---- 3. Build BC RegisterCustomerInput with embedded address ----
  const input: RegisterCustomerInput = {
    firstName: v.firstName,
    lastName: v.lastName,
    email: v.email,
    password: v.password,
    company: v.company || undefined,
    phone: v.phone || undefined,
    address: {
      firstName: v.firstName,
      lastName: v.lastName,
      address1: v.address1,
      address2: v.address2 || undefined,
      city: v.city,
      company: v.company || undefined,
      countryCode: v.countryCode,
      stateOrProvince: v.stateOrProvince || undefined,
      phone: v.phone || undefined,
      postalCode: v.postalCode,
      formFields: {
        checkboxes: [],
        multipleChoices: [],
        numbers: [],
        dates: [],
        passwords: [],
        multilineTexts: [],
        texts: [],
      },
    },
    formFields: {
      checkboxes: [],
      multipleChoices: [],
      numbers: [],
      dates: [],
      passwords: [],
      multilineTexts: [],
      texts: [],
    },
  };

  // ---- 4. Call BC ----
  // TODO(production): customer-create needs Storefront JWT scope — the
  // sandbox token may 401/403 here. Surface a friendly fallback below.
  try {
    const response = await client.fetch({
      document: RegisterCustomerMutation,
      variables: { input },
      fetchOptions: { cache: 'no-store' },
    });

    const result = response.data.customer.registerCustomer;

    if (result.errors.length > 0) {
      const message = result.errors[0]?.message ?? GENERIC_FAIL_MESSAGE;
      const fieldErrors: Record<string, string[]> = {};
      // Best-effort: route "email" errors to the email field for inline display.
      if (/email/i.test(message)) {
        fieldErrors.email = [message];
      }
      return pmFail(message, Object.keys(fieldErrors).length ? fieldErrors : undefined);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[pmDevRegisterAction] customer create failed', error);

    if (error instanceof BigCommerceGQLError) {
      const message = error.errors[0]?.message ?? GENERIC_FAIL_MESSAGE;
      return pmFail(message);
    }

    return pmFail(GENERIC_FAIL_MESSAGE);
  }

  // ---- 5. Redirect to sign-in with success flag ----
  // `redirect()` throws — never returns — so this is the last line that runs.
  redirect('/dev/preview/account?registered=1');
}
