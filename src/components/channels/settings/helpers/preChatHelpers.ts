import i18n from '@/i18n/config';
import type { PreChatField } from '@/types/settings';

export type { PreChatField };

export interface PreChatFormOptions {
  pre_chat_message: string;
  pre_chat_fields: PreChatField[];
}

export interface CustomAttribute {
  id: string;
  attribute_key: string;
  attribute_display_name: string;
  attribute_display_type: string;
  attribute_values?: string[];
  attribute_model: string;
  regex_pattern?: string;
  regex_cue?: string;
}

// Standard field definitions
export const getStandardFieldKeys = (language?: string) => ({
  emailAddress: {
    key: 'EMAIL_ADDRESS',
    label: i18n.t('channels:settings.preChatHelpers.standardFields.email.label', { lng: language }),
    placeholder: i18n.t('channels:settings.preChatHelpers.standardFields.email.placeholder', { lng: language }),
  },
  fullName: {
    key: 'FULL_NAME',
    label: i18n.t('channels:settings.preChatHelpers.standardFields.fullName.label', { lng: language }),
    placeholder: i18n.t('channels:settings.preChatHelpers.standardFields.fullName.placeholder', { lng: language }),
  },
  phoneNumber: {
    key: 'PHONE_NUMBER',
    label: i18n.t('channels:settings.preChatHelpers.standardFields.phoneNumber.label', { lng: language }),
    placeholder: i18n.t('channels:settings.preChatHelpers.standardFields.phoneNumber.placeholder', { lng: language }),
  },
});

// Standard field types
export const FIELD_TYPES = {
  TEXT: 'text',
  EMAIL: 'email',
  NUMBER: 'number',
  URL: 'url',
  DATE: 'date',
  CHECKBOX: 'checkbox',
  SELECT: 'select',
  TEXTAREA: 'textarea',
} as const;

// Default pre-chat fields
export const getDefaultPreChatFields = (language?: string): PreChatField[] => {
  const standardFields = getStandardFieldKeys(language);
  return [
    {
      name: 'fullName',
      type: FIELD_TYPES.TEXT,
      label: standardFields.fullName.label,
      placeholder: standardFields.fullName.placeholder,
      required: true,
      enabled: true,
      field_type: 'standard' as const,
    },
    {
      name: 'emailAddress',
      type: FIELD_TYPES.EMAIL,
      label: standardFields.emailAddress.label,
      placeholder: standardFields.emailAddress.placeholder,
      required: true,
      enabled: true,
      field_type: 'standard' as const,
    },
    {
      name: 'phoneNumber',
      type: FIELD_TYPES.TEXT,
      label: standardFields.phoneNumber.label,
      placeholder: standardFields.phoneNumber.placeholder,
      required: false,
      enabled: false,
      field_type: 'standard' as const,
    },
  ];
};

// Get label with translations
export const getLabel = ({ key, label, language }: { key: string; label: string; language?: string }): string => {
  const standardFields = getStandardFieldKeys(language);
  const field = standardFields[key as keyof typeof standardFields];
  return field ? field.label : label;
};

// Get placeholder with translations
export const getPlaceHolder = ({ key, placeholder, label, language }: { key: string; placeholder: string; label?: string; language?: string }): string => {
  const standardFields = getStandardFieldKeys(language);
  const field = standardFields[key as keyof typeof standardFields];
  if (field && field.placeholder) return field.placeholder;
  return placeholder || label || placeholder;
};

// Convert custom attributes to pre-chat fields
export const getCustomFields = ({
  standardFields,
  customAttributes,
}: {
  standardFields: { pre_chat_fields: PreChatField[] };
  customAttributes: CustomAttribute[];
}): PreChatField[] => {
  const customFields: PreChatField[] = [];
  const { pre_chat_fields: preChatFields } = standardFields;

  customAttributes.forEach(attribute => {
    const itemExist = preChatFields.find(
      item => item.name === attribute.attribute_key
    );

    if (!itemExist) {
      customFields.push({
        label: attribute.attribute_display_name,
        placeholder: attribute.attribute_display_name,
        name: attribute.attribute_key,
        type: attribute.attribute_display_type as PreChatField['type'],
        values: attribute.attribute_values,
        field_type: attribute.attribute_model as PreChatField['field_type'],
        regex_pattern: attribute.regex_pattern,
        regex_cue: attribute.regex_cue,
        required: false,
        enabled: false,
      });
    }
  });

  return customFields;
};

// Format pre-chat fields with proper labels and placeholders
export const getFormattedPreChatFields = ({ preChatFields, language }: { preChatFields: PreChatField[]; language?: string }): PreChatField[] => {
  return preChatFields.map(item => {
    const formattedLabel = getLabel({
      key: item.name,
      label: item.label || item.name,
      language,
    });
    return {
      ...item,
      label: formattedLabel,
      placeholder: getPlaceHolder({
        key: item.name,
        placeholder: item.placeholder || '',
        label: formattedLabel,
        language,
      }),
    };
  });
};

// Main function to get pre-chat fields configuration
export const getPreChatFields = ({
  preChatFormOptions = {},
  customAttributes = [],
  language,
}: {
  preChatFormOptions?: Partial<PreChatFormOptions>;
  customAttributes?: CustomAttribute[];
  language?: string;
}): PreChatFormOptions => {
  const { pre_chat_message = '', pre_chat_fields = getDefaultPreChatFields(language) } = preChatFormOptions;

  const formattedPreChatFields = getFormattedPreChatFields({
    preChatFields: pre_chat_fields,
    language,
  });

  const customFields = getCustomFields({
    standardFields: { pre_chat_fields: formattedPreChatFields },
    customAttributes,
  });

  const allFields = [...formattedPreChatFields, ...customFields];

  return {
    pre_chat_message,
    pre_chat_fields: allFields,
  };
};

// Helper to check if field is editable
export const isFieldEditable = (item: PreChatField): boolean => {
  return !!getStandardFieldKeys()[item.name as keyof ReturnType<typeof getStandardFieldKeys>] || !item.enabled;
};

// Validate field configuration
export const validateField = (field: PreChatField): string[] => {
  const errors: string[] = [];

  if (!field.name) {
    errors.push(i18n.t('channels:settings.preChatHelpers.validation.fieldNameRequired'));
  }

  if (!field.label) {
    errors.push(i18n.t('channels:settings.preChatHelpers.validation.labelRequired'));
  }

  if (field.type === FIELD_TYPES.SELECT && (!field.values || field.values.length === 0)) {
    errors.push(i18n.t('channels:settings.preChatHelpers.validation.selectFieldOptionsRequired'));
  }

  return errors;
};

// Get field type options for UI
export const getFieldTypeOptions = () => [
  { label: i18n.t('channels:settings.preChatHelpers.fieldTypes.text'), value: FIELD_TYPES.TEXT },
  { label: i18n.t('channels:settings.preChatHelpers.fieldTypes.email'), value: FIELD_TYPES.EMAIL },
  { label: i18n.t('channels:settings.preChatHelpers.fieldTypes.number'), value: FIELD_TYPES.NUMBER },
  { label: i18n.t('channels:settings.preChatHelpers.fieldTypes.url'), value: FIELD_TYPES.URL },
  { label: i18n.t('channels:settings.preChatHelpers.fieldTypes.date'), value: FIELD_TYPES.DATE },
  { label: i18n.t('channels:settings.preChatHelpers.fieldTypes.checkbox'), value: FIELD_TYPES.CHECKBOX },
  { label: i18n.t('channels:settings.preChatHelpers.fieldTypes.select'), value: FIELD_TYPES.SELECT },
  { label: i18n.t('channels:settings.preChatHelpers.fieldTypes.textarea'), value: FIELD_TYPES.TEXTAREA },
];
