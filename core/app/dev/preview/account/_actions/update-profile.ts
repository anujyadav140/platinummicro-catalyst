'use server';

/**
 * updateProfileAction
 * --------------------
 * Wires the Account Settings form to BC's customer storefront mutations:
 *
 *   - `customer.updateCustomer` for name / company / phone (the email
 *     field on this mutation is read-only on BC's side, so we don't
 *     send it; users change email via a separate verification flow).
 *   - `customer.changePassword` when the user fills in the current +
 *     new password fields. Skipped when both are blank.
 *
 * Returns a `UpdateProfileState` for `useActionState` so the form can
 * render a banner, per-field errors, and pending state without any
 * client-side guesswork. On success we `revalidatePath` so the form
 * re-reads the freshly-updated profile.
 */

import { revalidatePath } from 'next/cache';

import { auth } from '~/auth';
import { client } from '~/client';
import { graphql } from '~/client/graphql';

const SETTINGS_PATH = '/dev/preview/account/settings';

const UpdateCustomerMutation = graphql(`
  mutation PmUpdateCustomerMutation($input: UpdateCustomerInput!) {
    customer {
      updateCustomer(input: $input) {
        errors {
          __typename
          ... on CustomerNotLoggedInError {
            message
          }
          ... on ValidationError {
            message
            path
          }
          ... on CustomerDoesNotExistError {
            message
          }
        }
        customer {
          entityId
          firstName
          lastName
          company
          phone
          email
        }
      }
    }
  }
`);

const ChangePasswordMutation = graphql(`
  mutation PmChangePasswordMutation($input: ChangePasswordInput!) {
    customer {
      changePassword(input: $input) {
        errors {
          __typename
          ... on CustomerNotLoggedInError {
            message
          }
          ... on CustomerPasswordError {
            message
          }
          ... on ValidationError {
            message
            path
          }
        }
      }
    }
  }
`);

export interface UpdateProfileState {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
}

const EMPTY_FORM_FIELDS = {
  checkboxes: [],
  multipleChoices: [],
  numbers: [],
  dates: [],
  passwords: [],
  multilineTexts: [],
  texts: [],
};

function pull(fd: FormData, key: string): string | undefined {
  const raw = fd.get(key);
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function flattenErrors(errors: ReadonlyArray<{ message?: string }>): string {
  return errors.map((e) => e.message).filter(Boolean).join(' · ');
}

export async function updateProfileAction(
  _prevState: UpdateProfileState | null,
  formData: FormData,
): Promise<UpdateProfileState> {
  const session = await auth().catch(() => null);
  const customerAccessToken = session?.user?.customerAccessToken;
  if (!customerAccessToken) {
    return { ok: false, message: 'Sign in to update your profile.' };
  }

  // Parse the profile fields. firstName + lastName are required;
  // company / phone are optional. Email is read-only on BC's side.
  const firstName = pull(formData, 'firstName');
  const lastName = pull(formData, 'lastName');
  const company = pull(formData, 'company');
  const phone = pull(formData, 'phone');

  // Password fields — all three must be present together for a change.
  const currentPassword = pull(formData, 'currentPassword');
  const newPassword = pull(formData, 'password');
  const confirmPassword = pull(formData, 'confirmPassword');

  const fieldErrors: Record<string, string> = {};
  if (!firstName) fieldErrors.firstName = 'First name is required.';
  if (!lastName) fieldErrors.lastName = 'Last name is required.';

  // If ANY password field is filled, all three must be valid.
  const passwordChangeAttempted = Boolean(
    currentPassword || newPassword || confirmPassword,
  );
  if (passwordChangeAttempted) {
    if (!currentPassword) {
      fieldErrors.currentPassword =
        'Enter your current password to confirm the change.';
    }
    if (!newPassword) {
      fieldErrors.password = 'New password is required.';
    } else if (newPassword.length < 8) {
      fieldErrors.password = 'New password must be at least 8 characters.';
    }
    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      fieldErrors.confirmPassword = 'New passwords do not match.';
    }
    if (newPassword && !confirmPassword) {
      fieldErrors.confirmPassword = 'Please confirm the new password.';
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: 'Please fix the errors below.', fieldErrors };
  }

  /* ============== 1. Profile (name / company / phone) ============== */
  try {
    const response = await client.fetch({
      document: UpdateCustomerMutation,
      customerAccessToken,
      fetchOptions: { cache: 'no-store' },
      variables: {
        input: {
          firstName,
          lastName,
          company: company ?? '',
          phone: phone ?? '',
          formFields: EMPTY_FORM_FIELDS,
        },
      },
    });

    if (response.errors && response.errors.length > 0) {
      return { ok: false, message: flattenErrors(response.errors) };
    }

    const data = response.data as {
      customer?: {
        updateCustomer?: {
          errors: Array<{ __typename?: string; message?: string }>;
          customer?: { entityId: number } | null;
        };
      };
    };
    const result = data.customer?.updateCustomer;
    if (result?.errors && result.errors.length > 0) {
      return { ok: false, message: flattenErrors(result.errors) };
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[updateProfileAction] profile update failed:', error);
    return {
      ok: false,
      message: "Couldn't save your profile. Try again or contact your account manager.",
    };
  }

  /* ============== 2. Password change (optional) ============== */
  if (passwordChangeAttempted && currentPassword && newPassword) {
    try {
      const response = await client.fetch({
        document: ChangePasswordMutation,
        customerAccessToken,
        fetchOptions: { cache: 'no-store' },
        variables: {
          input: {
            currentPassword,
            newPassword,
          },
        },
      });

      if (response.errors && response.errors.length > 0) {
        return {
          ok: false,
          message: `Profile saved, but password change failed: ${flattenErrors(response.errors)}`,
        };
      }

      const data = response.data as {
        customer?: {
          changePassword?: {
            errors: Array<{ __typename?: string; message?: string }>;
          };
        };
      };
      const result = data.customer?.changePassword;
      if (result?.errors && result.errors.length > 0) {
        // Surface the BC error against the currentPassword field if it's
        // a "wrong current password" scenario; otherwise as a banner.
        const msg = flattenErrors(result.errors);
        const looksLikeWrongCurrent = /current.*password|incorrect/i.test(msg);
        return {
          ok: false,
          message: looksLikeWrongCurrent
            ? 'Your current password is incorrect.'
            : `Profile saved, but password change failed: ${msg}`,
          fieldErrors: looksLikeWrongCurrent
            ? { currentPassword: 'Current password is incorrect.' }
            : undefined,
        };
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[updateProfileAction] password change failed:', error);
      return {
        ok: false,
        message: "Profile saved, but couldn't change the password. Try again.",
      };
    }
  }

  revalidatePath(SETTINGS_PATH);
  return {
    ok: true,
    message: passwordChangeAttempted
      ? 'Profile and password updated.'
      : 'Profile updated.',
  };
}
