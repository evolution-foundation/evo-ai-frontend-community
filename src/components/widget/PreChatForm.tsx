import React, { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Textarea, Checkbox } from '@evoapi/design-system';
import { useLanguage } from '@/hooks/useLanguage';
import { PhoneInput } from '@/components/shared/PhoneInput';
import '@/components/shared/PhoneInput.css';
import { getLabel, getPlaceHolder } from '@/components/channels/settings/helpers/preChatHelpers';
import type {
  PreChatField,
  PreChatFormData,
  PreChatSubmissionData,
  WidgetConfig,
  CurrentUser,
  Campaign,
} from '@/types/settings';

interface PreChatFormProps {
  config: WidgetConfig;
  currentUser?: CurrentUser;
  activeCampaign?: Campaign;
  widgetColor?: string;
  onSubmit: (data: PreChatSubmissionData) => void;
  isLoading?: boolean;
  serverErrors?: Record<string, string[]>;
}

const SERVER_TO_FORM_FIELD: Record<string, string> = {
  email: 'emailAddress',
  phone_number: 'phoneNumber',
  name: 'fullName',
};

// Validation schema factory
const createValidationSchema = (fields: PreChatField[], hasActiveCampaign: boolean, t: (key: string) => string) => {
  const schemaFields: Record<string, z.ZodTypeAny> = {};

  fields.forEach(field => {
    let validator: z.ZodTypeAny;

    // Base validation based on type
    switch (field.type) {
      case 'email':
        validator = z.string().email(t('preChatForm.validation.invalidEmail'));
        break;
      case 'phone':
        validator = z
          .string()
          .refine(
            val => val.startsWith('+') && /^\+[1-9]\d{1,14}$/.test(val),
            t('preChatForm.validation.invalidPhone'),
          );
        break;
      case 'url':
        validator = z.string().url(t('preChatForm.validation.invalidUrl'));
        break;
      case 'number':
        validator = z
          .string()
          .refine(val => !isNaN(Number(val)), t('preChatForm.validation.invalidNumber'));
        break;
      case 'date':
        validator = z
          .string()
          .refine(val => !isNaN(Date.parse(val)), t('preChatForm.validation.invalidDate'));
        break;
      case 'checkbox':
        validator = z.boolean();
        break;
      default:
        validator = z.string();
    }

    // Apply regex pattern if provided
    if (field.regex_pattern && field.type !== 'checkbox') {
      const regex = new RegExp(field.regex_pattern);
      validator = (validator as z.ZodString).refine(
        val => regex.test(val),
        field.regex_cue || t('preChatForm.validation.invalidFormat'),
      );
    }

    // Apply required validation
    if (field.required) {
      if (field.type === 'checkbox') {
        validator = validator.refine(
          (val: boolean) => val === true,
          t('preChatForm.validation.required'),
        );
      } else {
        validator = (validator as z.ZodString).min(1, t('preChatForm.validation.required'));
      }
    } else {
      validator = validator.optional();
    }

    schemaFields[field.name] = validator;
  });

  // Add message field if no active campaign
  if (!hasActiveCampaign) {
    schemaFields.message = z.string().min(1, t('preChatForm.validation.messageRequired'));
  }

  return z.object(schemaFields);
};

// Phone input component removed - now using shared PhoneInput

export const PreChatForm: React.FC<PreChatFormProps> = ({
  config,
  currentUser = {},
  activeCampaign,
  widgetColor = '#1f93ff',
  onSubmit,
  isLoading = false,
  serverErrors,
}) => {
  const { t, currentLanguage } = useLanguage('widget');
  const [formFields, setFormFields] = useState<PreChatField[]>([]);

  const hasActiveCampaign = !!activeCampaign?.id;
  const preChatFields = config.preChatFields || [];

  // Filter fields based on current user data (like Vue widget)
  const filteredPreChatFields = useMemo(() => {
    const isUserEmailAvailable = currentUser.has_email;
    const isUserPhoneNumberAvailable = currentUser.has_phone_number;
    const isUserIdentifierAvailable = !!currentUser.identifier;
    const isUserNameAvailable = !!(
      isUserIdentifierAvailable ||
      isUserEmailAvailable ||
      isUserPhoneNumberAvailable
    );

    return preChatFields.filter(field => {
      if (isUserEmailAvailable && field.name === 'emailAddress') {
        return false;
      }
      if (isUserPhoneNumberAvailable && field.name === 'phoneNumber') {
        return false;
      }
      if (isUserNameAvailable && field.name === 'fullName') {
        return false;
      }
      return field.enabled;
    });
  }, [preChatFields, currentUser]);

  // Create validation schema
  const validationSchema = useMemo(
    () => createValidationSchema(filteredPreChatFields, hasActiveCampaign, t),
    [filteredPreChatFields, hasActiveCampaign, t],
  );

  const {
    control,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<PreChatFormData>({
    resolver: zodResolver(validationSchema),
    defaultValues: {},
  });

  useEffect(() => {
    if (!serverErrors || Object.keys(serverErrors).length === 0) return;
    Object.entries(serverErrors).forEach(([field, messages]) => {
      const formField = SERVER_TO_FORM_FIELD[field] || field;
      setError(formField as any, { type: 'server', message: messages[0] });
    });
  }, [serverErrors, setError]);

  // Standard field names that should be translated
  const STANDARD_FIELD_NAMES = ['emailAddress', 'fullName', 'phoneNumber'];

  // Translate standard field labels and placeholders
  const translatedPreChatFields = useMemo(() => {
    return filteredPreChatFields.map(field => {
      // Hybrid approach: use field_type if correct, fallback to name check
      const isStandard = field.field_type === 'standard' || STANDARD_FIELD_NAMES.includes(field.name);
      if (isStandard) {
        const translatedLabel = getLabel({
          key: field.name,
          label: field.label,
          language: currentLanguage,
        });
        const translatedPlaceholder = getPlaceHolder({
          key: field.name,
          placeholder: field.placeholder || '',
          label: translatedLabel,
          language: currentLanguage,
        });
        return {
          ...field,
          label: translatedLabel,
          placeholder: translatedPlaceholder,
        };
      }
      return field;
    });
  }, [filteredPreChatFields, currentLanguage]);

  useEffect(() => {
    setFormFields(translatedPreChatFields);
  }, [translatedPreChatFields]);

  // Get field value
  const getValue = (field: PreChatField, formData: PreChatFormData) => {
    const value = formData[field.name];
    if (field.type === 'select' && field.values && value !== undefined) {
      return field.values[Number(value)] || value;
    }
    return value || null;
  };

  // Handle form submission
  const onFormSubmit = (data: PreChatFormData) => {
    // Separate contact and conversation attributes
    const conversationCustomAttributes: Record<string, any> = {};
    const contactCustomAttributes: Record<string, any> = {};

    formFields.forEach(field => {
      const value = getValue(field, data);
      if (value !== null && value !== undefined) {
        if (field.field_type === 'conversation_attribute') {
          conversationCustomAttributes[field.name] = value;
        } else if (field.field_type === 'contact_attribute') {
          contactCustomAttributes[field.name] = value;
        }
      }
    });

    const submissionData: PreChatSubmissionData = {
      fullName: data.fullName,
      emailAddress: data.emailAddress,
      phoneNumber: data.phoneNumber,
      message: data.message,
      activeCampaignId: hasActiveCampaign ? String(activeCampaign?.id) : undefined,
      conversationCustomAttributes,
      contactCustomAttributes,
    };

    onSubmit(submissionData);
  };

  const renderField = (field: PreChatField) => {
    const fieldError = errors[field.name];
    const hasError = !!fieldError;

    switch (field.type) {
      case 'select':
        return (
          <Controller
            key={field.name}
            name={field.name as any}
            control={control}
            render={({ field: formField }) => (
              <div className="mb-4">
                <label
                  className={`text-sm font-medium mb-1 block ${
                    hasError ? 'text-red-500' : 'text-slate-700'
                  }`}
                >
                  {field.label}
                </label>
                <select
                  value={formField.value || ''}
                  onChange={e => formField.onChange(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    hasError ? 'border-red-500' : 'border-slate-300'
                  }`}
                >
                  <option value="" disabled>
                    {field.placeholder || t('preChatForm.selectOption')}
                  </option>
                  {field.values?.map((value, index) => (
                    <option key={index} value={String(index)}>
                      {value}
                    </option>
                  ))}
                </select>
                {fieldError && <p className="text-red-500 text-xs mt-1">{fieldError.message}</p>}
              </div>
            )}
          />
        );

      case 'checkbox':
        return (
          <Controller
            key={field.name}
            name={field.name as any}
            control={control}
            render={({ field: formField }) => (
              <div className="mb-4 flex items-center gap-2">
                <Checkbox
                  checked={!!formField.value}
                  onCheckedChange={formField.onChange}
                  id={field.name}
                />
                <label
                  htmlFor={field.name}
                  className={`text-sm ${hasError ? 'text-red-500' : 'text-slate-700'}`}
                >
                  {field.label}
                </label>
                {fieldError && <p className="text-red-500 text-xs">{fieldError.message}</p>}
              </div>
            )}
          />
        );

      case 'phone':
        return (
          <Controller
            key={field.name}
            name={field.name as any}
            control={control}
            render={({ field: formField }) => (
              <div className="mb-4">
                <label
                  className={`text-sm font-medium mb-1 block ${
                    hasError ? 'text-red-500' : 'text-slate-700'
                  }`}
                >
                  {field.label}
                </label>
                <PhoneInput
                  value={formField.value || ''}
                  onChange={formField.onChange}
                  placeholder={field.placeholder}
                  error={hasError}
                  defaultCountry="BR"
                />
                {fieldError && <p className="text-red-500 text-xs mt-1">{fieldError.message}</p>}
              </div>
            )}
          />
        );

      default:
        return (
          <Controller
            key={field.name}
            name={field.name as any}
            control={control}
            render={({ field: formField }) => (
              <div className="mb-4">
                <label
                  className={`text-sm font-medium mb-1 block ${
                    hasError ? 'text-red-500' : 'text-slate-700'
                  }`}
                >
                  {field.label}
                </label>
                <Input
                  type={
                    field.type === 'email'
                      ? 'email'
                      : field.type === 'date'
                      ? 'date'
                      : field.type === 'url'
                      ? 'url'
                      : 'text'
                  }
                  value={formField.value || ''}
                  onChange={e => formField.onChange(e.target.value)}
                  placeholder={field.placeholder}
                  className={hasError ? 'border-red-500' : ''}
                />
                {fieldError && <p className="text-red-500 text-xs mt-1">{fieldError.message}</p>}
              </div>
            )}
          />
        );
    }
  };

  const shouldShowHeaderMessage =
    hasActiveCampaign || (config.preChatFormEnabled && config.preChatMessage);
  const headerMessage = config.preChatFormEnabled
    ? config.preChatMessage
    : hasActiveCampaign
    ? t('preChatForm.provideDetails')
    : '';

  return (
    <div className="flex flex-col flex-1 w-full p-6 overflow-y-auto">
      {shouldShowHeaderMessage && (
        <div
          className="mb-4 text-base leading-5 text-slate-700"
          dangerouslySetInnerHTML={{ __html: headerMessage || '' }}
        />
      )}

      <form onSubmit={handleSubmit(onFormSubmit)} className="flex flex-col flex-1">
        {formFields.map(renderField)}

        {!hasActiveCampaign && (
          <Controller
            name="message"
            control={control}
            render={({ field }) => (
              <div className="mb-4">
                <label
                  className={`text-sm font-medium mb-1 block ${
                    errors.message ? 'text-red-500' : 'text-slate-700'
                  }`}
                >
                  {t('preChatForm.message')}
                </label>
                <Textarea
                  value={field.value || ''}
                  onChange={e => field.onChange(e.target.value)}
                  placeholder={t('preChatForm.messagePlaceholder')}
                  className={errors.message ? 'border-red-500' : ''}
                  rows={4}
                />
                {errors.message && (
                  <p className="text-red-500 text-xs mt-1">{errors.message.message}</p>
                )}
              </div>
            )}
          />
        )}

        <Button
          type="submit"
          disabled={isLoading}
          className="mt-3 mb-5 font-medium flex items-center justify-center gap-2"
          style={{ backgroundColor: widgetColor }}
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              {t('preChatForm.starting')}
            </>
          ) : (
            t('preChatForm.startConversation')
          )}
        </Button>
      </form>
    </div>
  );
};
