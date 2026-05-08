export interface PmFormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'tel' | 'number';
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
  /** Server-side validation error rendered below the input */
  error?: string;
  /** Small helper text under the input */
  hint?: string;
  defaultValue?: string;
}
