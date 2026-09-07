import React, { ReactNode } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Button,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Checkbox,
  RadioGroup,
  RadioGroupItem,
  Separator,
} from '@evoapi/design-system';


export type FormFieldType =
  | 'text'
  | 'email'
  | 'password'
  | 'number'
  | 'tel'
  | 'url'
  | 'textarea'
  | 'select'
  | 'multiselect'
  | 'switch'
  | 'checkbox'
  | 'radio'
  | 'custom';

export interface FormFieldOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface FormField {
  key: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: unknown) => string | null;
  };
  options?: FormFieldOption[];
  defaultValue?: unknown;
  render?: (field: FormField, value: unknown, onChange: (value: unknown) => void, error?: string) => ReactNode;
  show?: (values: Record<string, unknown>) => boolean;
  width?: 'full' | 'half' | 'third' | 'quarter';
  section?: string;
}

export interface FormSection {
  key: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export interface BaseFormProps {
  fields: FormField[];
  sections?: FormSection[];
  values: Record<string, unknown>;
  errors?: Record<string, string>;
  onChange: (key: string, value: unknown) => void;
  onSubmit: (values: Record<string, unknown>) => void;
  onCancel?: () => void;
  loading?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  showCancel?: boolean;
  className?: string;
  formClassName?: string;
  children?: ReactNode;
}

export default function BaseForm({
  fields,
  sections = [],
  values,
  errors = {},
  onChange,
  onSubmit,
  onCancel,
  loading = false,
  submitLabel,
  cancelLabel,
  showCancel = true,
  className = '',
  formClassName = '',
  children,
}: BaseFormProps) {
  const { t } = useLanguage('common');
  const finalSubmitLabel = submitLabel || t('base.buttons.save');
  const finalCancelLabel = cancelLabel || t('base.buttons.cancel');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(values);
  };

  const validateField = (field: FormField, value: unknown): string | null => {
    if (field.required && (value === null || value === undefined || value === '')) {
      return t('base.form.required', { field: field.label });
    }

    if (field.validation) {
      const { min, max, minLength, maxLength, pattern, custom } = field.validation;

      if (typeof value === 'string') {
        if (minLength && value.length < minLength) {
          return t('base.form.minLength', { field: field.label, min: minLength });
        }
        if (maxLength && value.length > maxLength) {
          return t('base.form.maxLength', { field: field.label, max: maxLength });
        }
        if (pattern && !pattern.test(value)) {
          return t('base.form.invalidFormat', { field: field.label });
        }
      }

      if (typeof value === 'number') {
        if (min !== undefined && value < min) {
          return t('base.form.minValue', { field: field.label, min });
        }
        if (max !== undefined && value > max) {
          return t('base.form.maxValue', { field: field.label, max });
        }
      }

      if (custom) {
        const customError = custom(value);
        if (customError) return customError;
      }
    }

    return null;
  };

  const renderField = (field: FormField) => {
    const value = values[field.key] ?? field.defaultValue ?? '';
    const stringValue = String(value || '');
    const error = errors[field.key] || validateField(field, value);

    if (field.show && !field.show(values)) {
      return null;
    }

    const fieldProps = {
      id: field.key,
      disabled: field.disabled || loading,
      className: error ? 'border-destructive' : '',
    };

    const renderFieldInput = () => {
      switch (field.type) {
        case 'textarea':
          return (
            <Textarea
              {...fieldProps}
              value={stringValue}
              onChange={(e) => onChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              rows={3}
            />
          );

        case 'select':
          return (
            <Select
              value={stringValue}
              onValueChange={(v) => onChange(field.key, v)}
              disabled={field.disabled || loading}
            >
              <SelectTrigger className={error ? 'border-destructive' : ''}>
                <SelectValue placeholder={field.placeholder} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map(option => (
                  <SelectItem
                    key={option.value}
                    value={option.value.toString()}
                    disabled={option.disabled}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );

        case 'switch':
          return (
            <Switch
              checked={!!value}
              onCheckedChange={(checked) => onChange(field.key, checked)}
              disabled={field.disabled || loading}
            />
          );

        case 'checkbox':
          return (
            <Checkbox
              checked={!!value}
              onCheckedChange={(checked) => onChange(field.key, checked)}
              disabled={field.disabled || loading}
            />
          );

        case 'radio':
          return (
            <RadioGroup
              value={stringValue}
              onValueChange={(v) => onChange(field.key, v)}
              disabled={field.disabled || loading}
            >
              {field.options?.map(option => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem
                    value={option.value.toString()}
                    id={`${field.key}-${option.value}`}
                    disabled={option.disabled}
                  />
                  <Label htmlFor={`${field.key}-${option.value}`}>
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          );

        case 'custom':
          if (field.render) {
            return field.render(field, value, (v) => onChange(field.key, v), error || undefined);
          }
          return null;

        default:
          return (
            <Input
              {...fieldProps}
              type={field.type}
              value={stringValue}
              onChange={(e) => onChange(field.key, e.target.value)}
              placeholder={field.placeholder}
            />
          );
      }
    };

    const widthClass = {
      full: 'col-span-full',
      half: 'col-span-full md:col-span-1',
      third: 'col-span-full md:col-span-1 lg:col-span-1',
      quarter: 'col-span-full sm:col-span-1',
    }[field.width || 'full'];

    return (
      <div key={field.key} className={`space-y-2 ${widthClass}`}>
        <Label htmlFor={field.key}>
          {field.label}
          {field.required && <span className="text-destructive ml-1">{t('base.form.requiredMark')}</span>}
        </Label>
        {renderFieldInput()}
        {field.description && (
          <p className="text-sm text-muted-foreground">{field.description}</p>
        )}
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
    );
  };

  const renderFieldsBySection = () => {
    if (sections.length === 0) {
      // No sections defined, render all fields in a grid
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.map(renderField)}
        </div>
      );
    }

    // Render fields grouped by sections
    const fieldsBySection: Record<string, FormField[]> = {};
    const fieldsWithoutSection: FormField[] = [];

    fields.forEach(field => {
      if (field.section) {
        if (!fieldsBySection[field.section]) {
          fieldsBySection[field.section] = [];
        }
        fieldsBySection[field.section].push(field);
      } else {
        fieldsWithoutSection.push(field);
      }
    });

    return (
      <div className="space-y-6">
        {/* Fields without section */}
        {fieldsWithoutSection.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fieldsWithoutSection.map(renderField)}
          </div>
        )}

        {/* Sections */}
        {sections.map((section, index) => {
          const sectionFields = fieldsBySection[section.key] || [];
          if (sectionFields.length === 0) return null;

          return (
            <div key={section.key}>
              {index > 0 || fieldsWithoutSection.length > 0 && <Separator />}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {section.icon}
                  <div>
                    <h3 className="text-lg font-semibold">{section.title}</h3>
                    {section.description && (
                      <p className="text-sm text-muted-foreground">{section.description}</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sectionFields.map(renderField)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={className}>
      <form onSubmit={handleSubmit} className={`space-y-6 ${formClassName}`}>
        {renderFieldsBySection()}

        {children}

        <div className="flex gap-3 pt-4">
          {showCancel && onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
              className="flex-1"
            >
              {finalCancelLabel}
            </Button>
          )}
          <Button
            type="submit"
            disabled={loading}
            className="bg-primary hover:bg-primary/85 text-primary-foreground border-0 font-semibold flex-1"
          >
            {loading ? t('base.form.saving') : finalSubmitLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}
