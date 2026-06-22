import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox,
} from '@evoapi/design-system';
import type { CustomAttributeDefinition } from '@/types/settings';

interface Props {
  attribute: CustomAttributeDefinition;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const NUMERIC_TYPES = ['number', 'currency', 'percent'];

// Renders the value editor for a custom attribute based on its display type.
// The value is always handled as a string (the automation action stores it
// verbatim; backend casts at read/query time), mirroring the journey panel.
export default function CustomAttributeValueInput({ attribute, value, onChange, placeholder }: Props) {
  const type = attribute.attribute_display_type;

  if (type === 'checkbox') {
    return (
      <Checkbox
        checked={value === 'true'}
        onCheckedChange={(checked) => onChange(checked === true ? 'true' : 'false')}
        aria-label={attribute.attribute_display_name}
      />
    );
  }

  if (type === 'list') {
    return (
      <Select value={value || ''} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {(attribute.attribute_values ?? []).map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  const inputType = NUMERIC_TYPES.includes(type)
    ? 'number'
    : type === 'date'
      ? 'date'
      : type === 'datetime'
        ? 'datetime-local'
        : type === 'link'
          ? 'url'
          : 'text';

  return (
    <Input
      type={inputType}
      step={type === 'currency' ? '0.01' : undefined}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}
