'use server';

/**
 * Address mutations
 * -----------------
 * Server actions wrapping BC's three customer-address GraphQL mutations:
 *
 *   - addCustomerAddress
 *   - updateCustomerAddress
 *   - deleteCustomerAddress
 *
 * Each is form-data driven so the client can use `useActionState` and
 * `<form action={...}>` without prop-drilling. Country names are mapped
 * to ISO codes from PM_COUNTRIES (BC requires `countryCode`, not the full
 * name). After every mutation we call `revalidatePath` on the addresses
 * page so the server-fetched list re-renders with fresh data.
 *
 * Replaces the localStorage-only path that previously lived in
 * pm-addresses-store. The hook surface is gone — the page now owns the
 * data, the form posts to these actions.
 */

import { revalidatePath } from 'next/cache';

import { auth } from '~/auth';
import { client } from '~/client';
import { graphql } from '~/client/graphql';
import { PM_COUNTRIES, PM_DEFAULT_COUNTRY } from '~/lib/pm-countries';

const ADDRESSES_PATH = '/dev/preview/account/addresses';

/* ============================================================================
 *  GraphQL mutations
 * ========================================================================== */

const AddAddressMutation = graphql(`
  mutation PmAddCustomerAddressMutation($input: AddCustomerAddressInput!) {
    customer {
      addCustomerAddress(input: $input) {
        errors {
          __typename
          ... on CustomerAddressCreationError {
            message
          }
          ... on CustomerNotLoggedInError {
            message
          }
          ... on ValidationError {
            message
            path
          }
        }
        address {
          entityId
        }
      }
    }
  }
`);

const UpdateAddressMutation = graphql(`
  mutation PmUpdateCustomerAddressMutation($input: UpdateCustomerAddressInput!) {
    customer {
      updateCustomerAddress(input: $input) {
        errors {
          __typename
          ... on AddressDoesNotExistError {
            message
          }
          ... on CustomerAddressUpdateError {
            message
          }
          ... on CustomerNotLoggedInError {
            message
          }
          ... on ValidationError {
            message
            path
          }
        }
        address {
          entityId
        }
      }
    }
  }
`);

const DeleteAddressMutation = graphql(`
  mutation PmDeleteCustomerAddressMutation($input: DeleteCustomerAddressInput!) {
    customer {
      deleteCustomerAddress(input: $input) {
        errors {
          __typename
          ... on CustomerAddressDeletionError {
            message
          }
          ... on CustomerNotLoggedInError {
            message
          }
        }
      }
    }
  }
`);

/* ============================================================================
 *  Types + helpers
 * ========================================================================== */

export interface AddressActionState {
  ok: boolean;
  message?: string;
  /** Field-level errors keyed by name */
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

/** Map a country name (or already-2-letter code) to a 2-letter ISO code. */
function resolveCountryCode(value: string): string {
  if (!value) return PM_DEFAULT_COUNTRY;
  const trimmed = value.trim();
  // Already a 2-letter code?
  if (trimmed.length === 2) {
    const upper = trimmed.toUpperCase();
    return PM_COUNTRIES.some((c) => c.code === upper) ? upper : PM_DEFAULT_COUNTRY;
  }
  const match = PM_COUNTRIES.find(
    (c) => c.name.toLowerCase() === trimmed.toLowerCase(),
  );
  return match?.code ?? PM_DEFAULT_COUNTRY;
}

/** Pull a single trimmed string from FormData; empty strings become undefined. */
function pullString(fd: FormData, key: string): string | undefined {
  const raw = fd.get(key);
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Pull a required string, returning undefined when blank (caller validates). */
function pullRequired(fd: FormData, key: string): string {
  return pullString(fd, key) ?? '';
}

interface AddressDraft {
  firstName: string;
  lastName: string;
  company?: string;
  street1: string;
  street2?: string;
  city: string;
  region: string;
  postalCode: string;
  countryCode: string;
  phone?: string;
}

/** Validate FormData and shape it into the BC mutation input. */
function parseDraft(fd: FormData): {
  ok: boolean;
  draft?: AddressDraft;
  fieldErrors?: Record<string, string>;
} {
  const draft: AddressDraft = {
    firstName: pullRequired(fd, 'firstName'),
    lastName: pullRequired(fd, 'lastName'),
    company: pullString(fd, 'company'),
    street1: pullRequired(fd, 'street1'),
    street2: pullString(fd, 'street2'),
    city: pullRequired(fd, 'city'),
    region: pullRequired(fd, 'region'),
    postalCode: pullRequired(fd, 'postalCode'),
    countryCode: resolveCountryCode(pullString(fd, 'country') ?? ''),
    phone: pullString(fd, 'phone'),
  };

  const fieldErrors: Record<string, string> = {};
  if (!draft.firstName) fieldErrors.firstName = 'First name is required.';
  if (!draft.lastName) fieldErrors.lastName = 'Last name is required.';
  if (!draft.street1) fieldErrors.street1 = 'Street address is required.';
  if (!draft.city) fieldErrors.city = 'City is required.';
  if (!draft.region) fieldErrors.region = 'State / region is required.';
  if (!draft.postalCode) fieldErrors.postalCode = 'Postal code is required.';

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }
  return { ok: true, draft };
}

/** Distill BC's discriminated `errors` array into a flat user-facing message. */
function flattenErrors(errors: ReadonlyArray<{ message?: string }>): string {
  if (errors.length === 0) return '';
  return errors.map((e) => e.message).filter(Boolean).join(' · ');
}

/* ============================================================================
 *  Server actions
 * ========================================================================== */

export async function createAddressAction(
  _prev: AddressActionState | null,
  formData: FormData,
): Promise<AddressActionState> {
  const session = await auth().catch(() => null);
  const customerAccessToken = session?.user?.customerAccessToken;
  if (!customerAccessToken) {
    return { ok: false, message: 'Sign in to manage addresses.' };
  }

  const parsed = parseDraft(formData);
  if (!parsed.ok || !parsed.draft) {
    return { ok: false, message: 'Please fix the errors below.', fieldErrors: parsed.fieldErrors };
  }
  const draft = parsed.draft;

  try {
    const response = await client.fetch({
      document: AddAddressMutation,
      customerAccessToken,
      fetchOptions: { cache: 'no-store' },
      variables: {
        input: {
          firstName: draft.firstName,
          lastName: draft.lastName,
          company: draft.company ?? '',
          address1: draft.street1,
          address2: draft.street2 ?? '',
          city: draft.city,
          countryCode: draft.countryCode,
          stateOrProvince: draft.region,
          phone: draft.phone ?? '',
          postalCode: draft.postalCode,
          formFields: EMPTY_FORM_FIELDS,
        },
      },
    });

    if (response.errors && response.errors.length > 0) {
      return { ok: false, message: flattenErrors(response.errors) };
    }

    const data = response.data as {
      customer?: {
        addCustomerAddress?: {
          errors: Array<{ __typename?: string; message?: string }>;
          address?: { entityId: number } | null;
        };
      };
    };
    const result = data.customer?.addCustomerAddress;
    if (result?.errors && result.errors.length > 0) {
      return { ok: false, message: flattenErrors(result.errors) };
    }

    revalidatePath(ADDRESSES_PATH);
    return { ok: true };
  } catch (error) {
    // eslint-disable-next-line no-console -- dev diagnostic
    console.error('[createAddressAction] failed:', error);
    return { ok: false, message: "Couldn't save the address. Try again or contact your account manager." };
  }
}

export async function updateAddressAction(
  _prev: AddressActionState | null,
  formData: FormData,
): Promise<AddressActionState> {
  const session = await auth().catch(() => null);
  const customerAccessToken = session?.user?.customerAccessToken;
  if (!customerAccessToken) {
    return { ok: false, message: 'Sign in to manage addresses.' };
  }

  const addressIdRaw = formData.get('addressId');
  const addressEntityId = Number(addressIdRaw);
  if (!Number.isFinite(addressEntityId) || addressEntityId <= 0) {
    return { ok: false, message: 'Address reference missing — refresh and try again.' };
  }

  const parsed = parseDraft(formData);
  if (!parsed.ok || !parsed.draft) {
    return { ok: false, message: 'Please fix the errors below.', fieldErrors: parsed.fieldErrors };
  }
  const draft = parsed.draft;

  try {
    const response = await client.fetch({
      document: UpdateAddressMutation,
      customerAccessToken,
      fetchOptions: { cache: 'no-store' },
      variables: {
        input: {
          addressEntityId,
          data: {
            firstName: draft.firstName,
            lastName: draft.lastName,
            company: draft.company ?? '',
            address1: draft.street1,
            address2: draft.street2 ?? '',
            city: draft.city,
            countryCode: draft.countryCode,
            stateOrProvince: draft.region,
            phone: draft.phone ?? '',
            postalCode: draft.postalCode,
            formFields: EMPTY_FORM_FIELDS,
          },
        },
      },
    });

    if (response.errors && response.errors.length > 0) {
      return { ok: false, message: flattenErrors(response.errors) };
    }

    const data = response.data as {
      customer?: {
        updateCustomerAddress?: {
          errors: Array<{ __typename?: string; message?: string }>;
          address?: { entityId: number } | null;
        };
      };
    };
    const result = data.customer?.updateCustomerAddress;
    if (result?.errors && result.errors.length > 0) {
      return { ok: false, message: flattenErrors(result.errors) };
    }

    revalidatePath(ADDRESSES_PATH);
    return { ok: true };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[updateAddressAction] failed:', error);
    return { ok: false, message: "Couldn't update the address. Try again or contact your account manager." };
  }
}

export async function deleteAddressAction(
  _prev: AddressActionState | null,
  formData: FormData,
): Promise<AddressActionState> {
  const session = await auth().catch(() => null);
  const customerAccessToken = session?.user?.customerAccessToken;
  if (!customerAccessToken) {
    return { ok: false, message: 'Sign in to manage addresses.' };
  }

  const addressIdRaw = formData.get('addressId');
  const addressEntityId = Number(addressIdRaw);
  if (!Number.isFinite(addressEntityId) || addressEntityId <= 0) {
    return { ok: false, message: 'Address reference missing — refresh and try again.' };
  }

  try {
    const response = await client.fetch({
      document: DeleteAddressMutation,
      customerAccessToken,
      fetchOptions: { cache: 'no-store' },
      variables: { input: { addressEntityId } },
    });

    if (response.errors && response.errors.length > 0) {
      return { ok: false, message: flattenErrors(response.errors) };
    }

    const data = response.data as {
      customer?: {
        deleteCustomerAddress?: {
          errors: Array<{ __typename?: string; message?: string }>;
        };
      };
    };
    const result = data.customer?.deleteCustomerAddress;
    if (result?.errors && result.errors.length > 0) {
      return { ok: false, message: flattenErrors(result.errors) };
    }

    revalidatePath(ADDRESSES_PATH);
    return { ok: true };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[deleteAddressAction] failed:', error);
    return { ok: false, message: "Couldn't delete the address. Try again or contact your account manager." };
  }
}
