import React from 'react';
import PhoneInputLib, { type Country } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { cn } from '@/lib/utils';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  defaultCountry?: Country;
  disabled?: boolean;
  error?: boolean;
  placeholder?: string;
  className?: string;
  // EVO-1872 (CR4): let callers wire the expression-error aria to the inner input.
  'aria-invalid'?: React.AriaAttributes['aria-invalid'];
  'aria-describedby'?: React.AriaAttributes['aria-describedby'];
}

/**
 * PhoneInput Component
 *
 * Padronized phone input with:
 * - Country selector with flags
 * - Dynamic mask per country
 * - E.164 format output (e.g., +5531912345678)
 * - Built-in validation
 *
 * @example
 * <PhoneInput
 *   value={phone}
 *   onChange={setPhone}
 *   defaultCountry="BR"
 *   error={!!errors.phone}
 * />
 */
export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  defaultCountry = 'BR',
  disabled = false,
  error = false,
  placeholder,
  className,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
}) => {
  return (
    <PhoneInputLib
      international
      defaultCountry={defaultCountry}
      value={value || ''}
      onChange={(value) => onChange(value || '')}
      disabled={disabled}
      placeholder={placeholder}
      className={cn(
        'phone-input',
        error && 'phone-input-error',
        className
      )}
      countrySelectProps={{
        unicodeFlags: true,
        disabled,
      }}
      numberInputProps={{
        'aria-invalid': ariaInvalid,
        'aria-describedby': ariaDescribedBy,
        className: cn(
          'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
          'placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'md:text-sm',
          error && 'border-destructive focus-visible:ring-destructive'
        ),
      }}
    />
  );
};

export default PhoneInput;
