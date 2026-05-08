export interface PmFormSelectOption {
  value: string;
  label: string;
}

export interface PmFormSelectProps {
  label: string;
  name: string;
  options: PmFormSelectOption[];
  required?: boolean;
  defaultValue?: string;
  error?: string;
  placeholder?: string;
}
