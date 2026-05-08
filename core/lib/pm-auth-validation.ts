/**
 * Zod schemas + helpers shared by every auth server action.
 *
 * Sibling agents (sign-in, register, forgot, reset) import the schemas they
 * need, parse `formData` against them, and surface errors via
 * `formatZodErrors` from `pm-auth-result`. Keeps validation rules consistent
 * and avoids each form re-deriving its own regex.
 */

import { z } from 'zod';

const passwordRequirementsMessage =
  'Password must be at least 8 characters and include a letter and a number';

export const pmEmailSchema = z
  .string({ required_error: 'Email is required' })
  .trim()
  .min(1, 'Email is required')
  .email('Enter a valid email address')
  .toLowerCase();

export const pmPasswordSchema = z
  .string({ required_error: 'Password is required' })
  .min(8, passwordRequirementsMessage)
  .max(128, 'Password is too long')
  .refine((v) => /[A-Za-z]/.test(v), passwordRequirementsMessage)
  .refine((v) => /\d/.test(v), passwordRequirementsMessage);

const phoneRegex = /^[+()\-.\s\d]{7,24}$/;

export const pmPhoneSchema = z
  .string()
  .trim()
  .regex(phoneRegex, 'Enter a valid phone number')
  .optional()
  .or(z.literal(''));

const zipRegex = /^[A-Za-z0-9][A-Za-z0-9\s-]{1,9}[A-Za-z0-9]$/;

export const pmZipSchema = z
  .string({ required_error: 'Postal code is required' })
  .trim()
  .min(3, 'Postal code is too short')
  .max(10, 'Postal code is too long')
  .regex(zipRegex, 'Enter a valid postal code');

export const pmRegisterFormSchema = z
  .object({
    firstName: z.string().trim().min(1, 'First name is required').max(80),
    lastName: z.string().trim().min(1, 'Last name is required').max(80),
    email: pmEmailSchema,
    password: pmPasswordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    company: z.string().trim().max(120).optional().or(z.literal('')),
    phone: pmPhoneSchema,
    address1: z.string().trim().min(1, 'Street address is required').max(160),
    address2: z.string().trim().max(160).optional().or(z.literal('')),
    city: z.string().trim().min(1, 'City is required').max(80),
    countryCode: z.string().trim().min(2, 'Country is required').max(2),
    stateOrProvince: z.string().trim().max(80).optional().or(z.literal('')),
    postalCode: pmZipSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type PmRegisterFormValues = z.infer<typeof pmRegisterFormSchema>;

export const pmSignInFormSchema = z.object({
  email: pmEmailSchema,
  password: z.string().min(1, 'Password is required'),
});

export type PmSignInFormValues = z.infer<typeof pmSignInFormSchema>;

export const pmForgotFormSchema = z.object({
  email: pmEmailSchema,
});

export type PmForgotFormValues = z.infer<typeof pmForgotFormSchema>;

export const pmResetFormSchema = z
  .object({
    token: z.string().trim().min(1, 'Reset token is required'),
    password: pmPasswordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type PmResetFormValues = z.infer<typeof pmResetFormSchema>;
