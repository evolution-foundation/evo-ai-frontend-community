import { useEffect, useRef, useState } from 'react';
import { getCountries, getCountryCallingCode, type Country } from 'react-phone-number-input';
import en from 'react-phone-number-input/locale/en.json';
import es from 'react-phone-number-input/locale/es.json';
import fr from 'react-phone-number-input/locale/fr.json';
import it from 'react-phone-number-input/locale/it.json';
import pt from 'react-phone-number-input/locale/pt.json';
import ptBR from 'react-phone-number-input/locale/pt-BR.json';
import { cn } from '@/lib/utils';

const COUNTRY_LABELS: Record<string, Partial<Record<Country, string>>> = {
  en,
  es,
  fr,
  it,
  pt,
  'pt-BR': ptBR,
};

interface PhoneNumberFieldProps {
  value: string;
  onChange: (value: string) => void;
  defaultCountry: Country;
  language?: string;
  disabled?: boolean;
  error?: boolean;
  placeholder?: string;
  className?: string;
}

// Split a stored E.164-ish value ("+55XXXXXXXXX") back into {country, national}
// so re-opening a form (server validation errors, edit flows) keeps the
// previously-picked country selected instead of resetting to the default.
function splitValue(value: string, countries: Country[]): { country: Country | null; national: string } {
  if (!value.startsWith('+')) return { country: null, national: value };

  const match = countries
    .map(country => ({ country, code: getCountryCallingCode(country) }))
    .filter(({ code }) => value.startsWith(`+${code}`))
    .sort((a, b) => b.code.length - a.code.length)[0];

  if (!match) return { country: null, national: value.slice(1) };
  return { country: match.country, national: value.slice(1 + match.code.length) };
}

// A plain country-code dropdown + digits input, instead of a single
// international-format text field. react-phone-number-input's combined input
// only applies `defaultCountry` on mount, so a locale that resolves
// asynchronously (after the widget config fetch) never corrects an already
//-mounted field. A separate, controlled dropdown re-renders normally on every
// prop change, so it doesn't need that workaround.
export const PhoneNumberField = ({
  value,
  onChange,
  defaultCountry,
  language = 'en',
  disabled = false,
  error = false,
  placeholder,
  className,
}: PhoneNumberFieldProps) => {
  const countries = useRef(getCountries()).current;
  const labels = COUNTRY_LABELS[language] || en;

  const initial = splitValue(value, countries);
  const [country, setCountry] = useState<Country>(initial.country || defaultCountry);
  const [national, setNational] = useState(initial.national);
  const userPickedCountry = useRef(!!initial.country);

  // Adopt a later-resolved defaultCountry (e.g. locale loads after mount),
  // but never override a country the user explicitly picked themselves.
  useEffect(() => {
    if (!userPickedCountry.current) setCountry(defaultCountry);
  }, [defaultCountry]);

  const emit = (nextCountry: Country, nextNational: string) => {
    const digits = nextNational.replace(/\D/g, '');
    onChange(digits ? `+${getCountryCallingCode(nextCountry)}${digits}` : '');
  };

  return (
    <div className={cn('flex gap-2', className)}>
      <select
        value={country}
        disabled={disabled}
        onChange={e => {
          const next = e.target.value as Country;
          userPickedCountry.current = true;
          setCountry(next);
          emit(next, national);
        }}
        className={cn(
          'flex h-9 rounded-md border border-input bg-transparent px-2 text-sm shadow-sm',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-destructive focus-visible:ring-destructive',
        )}
      >
        {countries.map(c => (
          <option key={c} value={c}>
            +{getCountryCallingCode(c)} {labels[c] || c}
          </option>
        ))}
      </select>
      <input
        type="tel"
        inputMode="numeric"
        value={national}
        disabled={disabled}
        placeholder={placeholder}
        onChange={e => {
          const next = e.target.value.replace(/[^\d\s-]/g, '');
          setNational(next);
          emit(country, next);
        }}
        className={cn(
          'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors',
          'placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'md:text-sm',
          error && 'border-destructive focus-visible:ring-destructive',
        )}
      />
    </div>
  );
};

export default PhoneNumberField;
