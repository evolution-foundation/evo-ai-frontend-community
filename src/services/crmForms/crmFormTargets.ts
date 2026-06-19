import type { CustomAttributeDefinition } from '@/types/settings';
import type { CrmFormField, CrmFieldType } from '@/types/crmForms';

// Maps the builder's mapping UI <-> the backend flat schema (maps_to + maps_to_key),
// keeping the set of targets the admin can pick === what the public submission accepts.

const STD = ['name', 'email', 'phone', 'company'];

export interface TargetOption {
  value: string;
  label: string;
}
export interface TargetGroup {
  label: string;
  options: TargetOption[];
}

export const NONE_TARGET = 'none';

/** Encode a field's mapping into a single select value. */
export function encodeTarget(field: CrmFormField): string {
  const mt = field.maps_to || '';
  const key = field.maps_to_key || '';
  if (!mt) return NONE_TARGET;
  if (STD.includes(mt)) return `contact:${mt}`; // legacy standard-field string
  switch (mt) {
    case 'contact':
      return `contact:${key}`;
    case 'contact_attribute':
      return `cattr:${key}`;
    case 'deal_value':
      return 'deal_value';
    case 'deal_attribute':
      return `dattr:${key}`;
    default:
      return NONE_TARGET;
  }
}

/** Decode a select value into the backend flat schema. */
export function decodeTarget(value: string): { maps_to: string; maps_to_key: string } {
  if (!value || value === NONE_TARGET) return { maps_to: '', maps_to_key: '' };
  if (value === 'deal_value') return { maps_to: 'deal_value', maps_to_key: '' };
  const [prefix, ...rest] = value.split(':');
  const key = rest.join(':');
  if (prefix === 'contact') return { maps_to: 'contact', maps_to_key: key };
  if (prefix === 'cattr') return { maps_to: 'contact_attribute', maps_to_key: key };
  if (prefix === 'dattr') return { maps_to: 'deal_attribute', maps_to_key: key };
  return { maps_to: '', maps_to_key: '' };
}

/** Grouped target options built from the available context definitions. */
export function buildTargetGroups(
  contactAttrs: CustomAttributeDefinition[],
  dealAttrs: CustomAttributeDefinition[],
): TargetGroup[] {
  return [
    {
      label: 'Contato',
      options: [
        { value: 'contact:name', label: 'Nome' },
        { value: 'contact:email', label: 'E-mail' },
        { value: 'contact:phone', label: 'Telefone' },
        { value: 'contact:company', label: 'Empresa' },
      ],
    },
    {
      label: 'Contato — campos personalizados',
      options: contactAttrs.map(a => ({
        value: `cattr:${a.attribute_key}`,
        label: a.attribute_display_name || a.attribute_key,
      })),
    },
    {
      label: 'Negócio',
      options: [{ value: 'deal_value', label: 'Valor' }],
    },
    {
      label: 'Negócio — campos personalizados',
      options: dealAttrs.map(a => ({
        value: `dattr:${a.attribute_key}`,
        label: a.attribute_display_name || a.attribute_key,
      })),
    },
  ].filter(g => g.options.length > 0);
}

/** Suggest a form field type (and options) from a custom attribute's display type. */
export function suggestFieldFromAttribute(attr: CustomAttributeDefinition): {
  type: CrmFieldType;
  options?: string[];
} {
  switch (attr.attribute_display_type) {
    case 'number':
    case 'currency':
    case 'percent':
      return { type: 'number' };
    case 'checkbox':
      return { type: 'checkbox' };
    case 'list':
      return { type: 'select', options: attr.attribute_values || [] };
    default:
      return { type: 'text' };
  }
}

/** Find the custom attribute definition behind a target value, if any. */
export function attrForTarget(
  value: string,
  contactAttrs: CustomAttributeDefinition[],
  dealAttrs: CustomAttributeDefinition[],
): CustomAttributeDefinition | undefined {
  const [prefix, ...rest] = value.split(':');
  const key = rest.join(':');
  if (prefix === 'cattr') return contactAttrs.find(a => a.attribute_key === key);
  if (prefix === 'dattr') return dealAttrs.find(a => a.attribute_key === key);
  return undefined;
}
