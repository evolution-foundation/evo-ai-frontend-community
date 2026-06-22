import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@evoapi/design-system';
import { useLanguage } from '@/hooks/useLanguage';
import {
  formsService,
  PublicFormConfig,
  PublicFormField,
} from '@/services/public/formsService';

// Campo oculto anti-spam (honeypot) — bots preenchem, humanos não veem.
const HONEYPOT_FIELD = '_hp_url';

const inputClass =
  'w-full p-3 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent';

const FormPage = () => {
  const { slug } = useParams<{ slug: string }>();
  // Public anonymous page — i18n follows the visitor's detected language.
  const { t } = useLanguage('crmForms');

  const [config, setConfig] = useState<PublicFormConfig | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({ [HONEYPOT_FIELD]: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      if (!slug) return;
      setIsLoading(true);
      try {
        const result = await formsService.getForm(slug);
        setConfig(result);
      } catch (error: unknown) {
        // 404 = inexistente ou rascunho: não vazar, só "não encontrado".
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status === 404) {
          setNotFound(true);
        } else {
          setServerError(t('public.loadError'));
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchConfig();
  }, [slug, t]);

  const setValue = (key: string, value: unknown) => {
    setValues(prev => ({ ...prev, [key]: value }));
    setFieldErrors(prev => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validate = (): boolean => {
    if (!config) return false;
    const errors: Record<string, string> = {};
    config.fields.forEach(field => {
      if (field.required) {
        const value = values[field.key];
        const empty = value === undefined || value === null || String(value).trim() === '' || value === false;
        if (empty) errors[field.key] = t('public.requiredField', { label: field.label || field.key });
      }
    });
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug || !config) return;
    setServerError(null);
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await formsService.submit(slug, values);
      setSubmitted(true);
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        t('public.submitError');
      setServerError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: PublicFormField) => {
    const value = values[field.key];
    const common = {
      id: field.key,
      name: field.key,
      placeholder: field.placeholder,
      disabled: isSubmitting,
    };

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            {...common}
            value={(value as string) || ''}
            onChange={e => setValue(field.key, e.target.value)}
            className={`${inputClass} min-h-[100px]`}
          />
        );
      case 'select':
        return (
          <select
            {...common}
            value={(value as string) || ''}
            onChange={e => setValue(field.key, e.target.value)}
            className={inputClass}
          >
            <option value="">{field.placeholder || t('public.selectPlaceholder')}</option>
            {(field.options || []).map(opt => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );
      case 'checkbox':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              id={field.key}
              name={field.key}
              checked={Boolean(value)}
              disabled={isSubmitting}
              onChange={e => setValue(field.key, e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <span className="text-sm text-foreground">{field.label}</span>
          </label>
        );
      default:
        return (
          <input
            {...common}
            type={field.type || 'text'}
            value={(value as string) || ''}
            onChange={e => setValue(field.key, e.target.value)}
            className={inputClass}
          />
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <div className="w-full max-w-lg bg-card rounded-lg shadow-md border border-border p-8 text-center">
          <p className="text-lg font-medium text-foreground">{t('public.notFoundTitle')}</p>
          <p className="text-sm text-muted-foreground mt-2">{t('public.notFoundDescription')}</p>
        </div>
      </div>
    );
  }

  const accent = config?.appearance?.primary_color;

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-lg bg-card rounded-lg shadow-md border border-border">
        <div className="p-8 space-y-6">
          {config?.appearance?.logo_url && (
            <img src={config.appearance.logo_url} alt={config.title} className="h-12 object-contain" />
          )}
          {config?.appearance?.image_url && (
            <img
              src={config.appearance.image_url}
              alt={config.title}
              className="w-full rounded-lg object-cover max-h-48"
            />
          )}

          <div>
            <h1 className="text-xl font-semibold text-foreground">{config?.title}</h1>
            {config?.description && (
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{config.description}</p>
            )}
          </div>

          {submitted ? (
            <div className="p-4 rounded-lg bg-green-500/10 text-green-700 dark:text-green-400">
              <p className="text-sm font-medium">
                {config?.appearance?.success_message || t('public.successMessage')}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {serverError && (
                <div className="p-4 rounded-lg bg-destructive/10 text-destructive">
                  <p className="text-sm font-medium">{serverError}</p>
                </div>
              )}

              {config?.fields.map(field => (
                <div key={field.key}>
                  {field.type !== 'checkbox' && (
                    <label htmlFor={field.key} className="text-sm font-medium text-muted-foreground mb-2 block">
                      {field.label}
                      {field.required && <span className="text-destructive"> *</span>}
                    </label>
                  )}
                  {renderField(field)}
                  {fieldErrors[field.key] && (
                    <p className="text-xs text-destructive mt-1">{fieldErrors[field.key]}</p>
                  )}
                </div>
              ))}

              {/* Honeypot anti-spam — escondido de usuários reais */}
              <input
                type="text"
                name={HONEYPOT_FIELD}
                value={(values[HONEYPOT_FIELD] as string) || ''}
                onChange={e => setValue(HONEYPOT_FIELD, e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="hidden"
              />

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full"
                style={accent ? { backgroundColor: accent, borderColor: accent } : undefined}
              >
                {isSubmitting ? t('public.submitting') : t('public.submit')}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default FormPage;
