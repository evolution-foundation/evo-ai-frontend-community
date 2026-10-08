import type { FieldErrorTable } from '@/utils/apiHelpers';

/** Codes from CustomAttributeDefinition's validations, keyed to the modal's messages (namespace `customAttributes`). */
export const CUSTOM_ATTRIBUTE_FIELD_ERRORS: FieldErrorTable = {
  attribute_display_name: {
    blank: 'modal.fields.displayName.errors.required',
  },
  attribute_key: {
    taken: 'modal.fields.attributeKey.errors.taken',
    key_conflict: 'modal.fields.attributeKey.errors.reserved',
    blank: 'modal.fields.attributeKey.errors.required',
  },
  attribute_values: {
    blank: 'modal.fields.listValues.errors.required',
  },
  regex_pattern: {
    invalid: 'modal.fields.regexPattern.errors.invalid',
  },
};
