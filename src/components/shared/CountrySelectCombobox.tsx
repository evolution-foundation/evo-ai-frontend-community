import { useState } from 'react';
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@evoapi/design-system';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CountryOption {
  value?: string;
  label: string;
  divider?: boolean;
}

interface CountrySelectComboboxProps {
  value?: string;
  options: CountryOption[];
  onChange: (value: string | undefined) => void;
  disabled?: boolean;
  className?: string;
  // Passed by react-phone-number-input for its default flag renderer; this
  // combobox draws its own emoji flag instead (see destructuring below).
  iconComponent?: React.ElementType;
}

// Two-letter ISO code -> emoji flag, via the same regional-indicator-symbol
// trick react-phone-number-input's own unicodeFlags option uses internally.
const flagEmoji = (countryCode: string): string =>
  countryCode
    .toUpperCase()
    .replace(/./g, char => String.fromCodePoint(127397 + char.charCodeAt(0)));

// Replaces react-phone-number-input's default CountrySelect (a bare native
// <select>, unstyleable and inconsistent across browsers/OSes) with a
// searchable combobox that matches the rest of the app. Passed in as the
// `countrySelectComponent` prop, so it receives the same {value, options,
// onChange} contract the native one does.
export function CountrySelectCombobox({
  value,
  options,
  onChange,
  disabled,
  className,
  // Only the default CountrySelectWithIcon renders a flag via this — this
  // combobox draws its own emoji flag, so the prop is accepted (the library
  // always passes it) but intentionally unused, to keep it out of `...rest`
  // and off the native <button> element it would otherwise land on.
  iconComponent: _iconComponent,
  ...rest
}: CountrySelectComboboxProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find(option => !option.divider && option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('h-9 w-18 justify-start gap-1 px-2', className)}
          {...rest}
        >
          <span aria-hidden="true">{selected?.value ? flagEmoji(selected.value) : '🌐'}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search country..." />
          <CommandEmpty>No country found.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {options
              .filter((option): option is CountryOption & { value: string } => !option.divider && !!option.value)
              .map(option => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <span aria-hidden="true" className="mr-2">
                    {flagEmoji(option.value)}
                  </span>
                  <span className="flex-1">{option.label}</span>
                  {option.value === value && <Check className="h-4 w-4" />}
                </CommandItem>
              ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default CountrySelectCombobox;
