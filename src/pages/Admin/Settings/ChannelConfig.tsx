import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm, Controller, UseFormRegister, Path } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Input,
  Label,
  Button,
  Card,
  CardContent,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@evoapi/design-system';
import { toast } from 'sonner';
import { Loader2, Lock, LockOpen, X } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { adminConfigService } from '@/services/admin/adminConfigService';
import { extractError } from '@/utils/apiHelpers';
import { refreshGlobalConfig } from '@/contexts/GlobalConfigContext';
import type { AdminConfigData } from '@/types/admin/adminConfig';

// Sentinel used when the backend reports a secret as "configured" (masked).
// The form stores this placeholder so zod's .min(1) required validation passes
// without exposing the real value; buildPayload maps it back to `null` so the
// backend preserves the existing DB value.
const SECRET_SENTINEL = '__CONFIGURED__';

// --- Schema factories ---

type T = (key: string) => string;

const required = (t: T) =>
  z.string({ required_error: t('common:validation.required') })
    .min(1, { message: t('common:validation.required') });

function createFacebookSchema(t: T) {
  return z.object({
    FB_APP_ID: required(t),
    FB_VERIFY_TOKEN: required(t),
    FB_APP_SECRET: required(t),
    FACEBOOK_API_VERSION: z.string().optional(),
    ENABLE_MESSENGER_CHANNEL_HUMAN_AGENT: z.union([z.boolean(), z.string()]).optional(),
    FB_FEED_COMMENTS_ENABLED: z.union([z.boolean(), z.string()]).optional(),
  });
}

function createWhatsappSchema(t: T) {
  return z.object({
    WP_APP_ID: required(t),
    WP_VERIFY_TOKEN: required(t),
    WP_APP_SECRET: required(t),
    WP_WHATSAPP_CONFIG_ID: required(t),
    WP_API_VERSION: z.string().optional(),
  });
}

function createInstagramSchema(t: T) {
  return z.object({
    INSTAGRAM_APP_ID: required(t),
    INSTAGRAM_APP_SECRET: required(t),
    INSTAGRAM_VERIFY_TOKEN: required(t),
    INSTAGRAM_API_VERSION: z.string().optional(),
    ENABLE_INSTAGRAM_CHANNEL_HUMAN_AGENT: z.union([z.boolean(), z.string()]).optional(),
  });
}

function createEvolutionSchema(t: T) {
  return z.object({
    EVOLUTION_API_URL: required(t),
    EVOLUTION_ADMIN_SECRET: required(t),
  });
}

function createEvolutionGoSchema(t: T) {
  return z.object({
    EVOLUTION_GO_API_URL: required(t),
    EVOLUTION_GO_ADMIN_SECRET: required(t),
  });
}

function createTwitterSchema(t: T) {
  return z.object({
    TWITTER_APP_ID: required(t),
    TWITTER_CONSUMER_KEY: required(t),
    TWITTER_CONSUMER_SECRET: required(t),
    TWITTER_ENVIRONMENT: required(t),
  });
}

type FacebookFormData = z.infer<ReturnType<typeof createFacebookSchema>>;
type WhatsAppFormData = z.infer<ReturnType<typeof createWhatsappSchema>>;
type InstagramFormData = z.infer<ReturnType<typeof createInstagramSchema>>;
type EvolutionFormData = z.infer<ReturnType<typeof createEvolutionSchema>>;
type EvolutionGoFormData = z.infer<ReturnType<typeof createEvolutionGoSchema>>;
type TwitterFormData = z.infer<ReturnType<typeof createTwitterSchema>>;

const FACEBOOK_DEFAULTS: FacebookFormData = {
  FB_APP_ID: '',
  FB_VERIFY_TOKEN: '',
  FB_APP_SECRET: '',
  FACEBOOK_API_VERSION: '',
  ENABLE_MESSENGER_CHANNEL_HUMAN_AGENT: false,
  FB_FEED_COMMENTS_ENABLED: false,
};

const WHATSAPP_DEFAULTS: WhatsAppFormData = {
  WP_APP_ID: '',
  WP_VERIFY_TOKEN: '',
  WP_APP_SECRET: '',
  WP_WHATSAPP_CONFIG_ID: '',
  WP_API_VERSION: '',
};

const INSTAGRAM_DEFAULTS: InstagramFormData = {
  INSTAGRAM_APP_ID: '',
  INSTAGRAM_APP_SECRET: '',
  INSTAGRAM_VERIFY_TOKEN: '',
  INSTAGRAM_API_VERSION: '',
  ENABLE_INSTAGRAM_CHANNEL_HUMAN_AGENT: false,
};

const EVOLUTION_DEFAULTS: EvolutionFormData = {
  EVOLUTION_API_URL: '',
  EVOLUTION_ADMIN_SECRET: '',
};

const EVOLUTION_GO_DEFAULTS: EvolutionGoFormData = {
  EVOLUTION_GO_API_URL: '',
  EVOLUTION_GO_ADMIN_SECRET: '',
};

const TWITTER_DEFAULTS: TwitterFormData = {
  TWITTER_APP_ID: '',
  TWITTER_CONSUMER_KEY: '',
  TWITTER_CONSUMER_SECRET: '',
  TWITTER_ENVIRONMENT: '',
};

// Keys with _SECRET suffix are Fernet-encrypted; API returns masked_value
const FACEBOOK_SECRET_FIELDS = ['FB_APP_SECRET'];
const WHATSAPP_SECRET_FIELDS = ['WP_APP_SECRET'];
const INSTAGRAM_SECRET_FIELDS = ['INSTAGRAM_APP_SECRET'];
const EVOLUTION_SECRET_FIELDS = ['EVOLUTION_ADMIN_SECRET'];
const EVOLUTION_GO_SECRET_FIELDS = ['EVOLUTION_GO_ADMIN_SECRET'];
const TWITTER_SECRET_FIELDS = ['TWITTER_CONSUMER_SECRET'];

const FACEBOOK_BOOLEAN_FIELDS = ['ENABLE_MESSENGER_CHANNEL_HUMAN_AGENT', 'FB_FEED_COMMENTS_ENABLED'];
const INSTAGRAM_BOOLEAN_FIELDS = ['ENABLE_INSTAGRAM_CHANNEL_HUMAN_AGENT'];

function isSecretMasked(value: unknown): boolean {
  return typeof value === 'string' && value.includes('••••');
}

function toBool(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value === 'true';
  return false;
}

function buildFormValues<TData extends Record<string, unknown>>(
  data: Record<string, unknown>,
  defaults: TData,
  secretFields: string[],
  booleanFields: string[],
): TData {
  const formValues: Record<string, unknown> = { ...defaults };
  for (const [key, value] of Object.entries(data)) {
    if (secretFields.includes(key)) {
      // Masked value from backend → fill sentinel so required-string schemas
      // don't block the admin from saving unrelated fields.
      formValues[key] = isSecretMasked(value) ? SECRET_SENTINEL : (value ?? '');
    } else if (booleanFields.includes(key)) {
      formValues[key] = toBool(value);
    } else if (isSecretMasked(value)) {
      // Defense in depth: a non-secret field should never arrive masked. If it
      // does (backend misclassification), drop to the default so validation can
      // surface the missing value instead of echoing the mask back on save.
      formValues[key] = formValues[key] ?? '';
    } else {
      formValues[key] = value ?? formValues[key] ?? '';
    }
  }
  return formValues as TData;
}

function updateSecretStatus(data: Record<string, unknown>, secretFields: string[]) {
  const configured: Record<string, boolean> = {};
  for (const key of secretFields) {
    configured[key] = isSecretMasked(data[key]);
  }
  return configured;
}

function buildPayload(
  formData: Record<string, unknown>,
  secretFields: string[],
  secretModified: Record<string, boolean>,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(formData)) {
    if (secretFields.includes(key)) {
      // Untouched secret field (whether backing sentinel or empty) → null so the
      // backend preserves its existing value. If the admin *did* type the literal
      // sentinel string themselves, secretModified[key] is true and we forward
      // it verbatim — their call.
      if (!secretModified[key] || value === '') {
        payload[key] = null;
      } else {
        payload[key] = value;
      }
    } else {
      payload[key] = value;
    }
  }
  return payload;
}

// --- SecretField subcomponent ---

interface SecretFieldProps<TData extends Record<string, unknown>> {
  fieldName: string & keyof TData;
  label: string;
  placeholder: string;
  register: UseFormRegister<TData>;
  secretModified: Record<string, boolean>;
  onSecretModifiedChange: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  secretConfigured: Record<string, boolean>;
  onClear: () => void;
  t: (key: string) => string;
  required?: boolean;
  error?: string;
}

function SecretField<TData extends Record<string, unknown>>({
  fieldName,
  label,
  placeholder,
  register,
  secretModified,
  onSecretModifiedChange,
  secretConfigured,
  onClear,
  t,
  required,
  error,
}: SecretFieldProps<TData>) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Label htmlFor={fieldName}>{label}</Label>
          {required && <span className="text-destructive ml-1" aria-hidden="true">*</span>}
        </div>
        {!secretModified[fieldName] && (
          secretConfigured[fieldName] ? (
            <span className="inline-flex items-center gap-1 text-xs text-green-600">
              <Lock className="h-3 w-3" />
              {t('channels.secretConfigured')}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-sidebar-foreground/50">
              <LockOpen className="h-3 w-3" />
              {t('channels.secretNotConfigured')}
            </span>
          )
        )}
      </div>
      <div className="relative">
        <Input
          id={fieldName}
          type="password"
          autoComplete="off"
          placeholder={placeholder}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          {...register(fieldName as Path<TData>, {
            onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
              onSecretModifiedChange((prev) => ({ ...prev, [fieldName]: e.target.value.length > 0 })),
          })}
        />
        {secretConfigured[fieldName] && !secretModified[fieldName] && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-sidebar-accent text-sidebar-foreground/50 hover:text-sidebar-foreground"
            title={t('channels.clearSecret')}
            aria-label={t('channels.clearSecret')}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// --- TextField subcomponent ---

interface TextFieldProps {
  id: string;
  label: string;
  placeholder: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: any;
  error?: { message?: string };
  type?: string;
  readOnly?: boolean;
  required?: boolean;
}

function TextField({ id, label, placeholder, register, error, type, readOnly, required }: TextFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center">
        <Label htmlFor={id}>{label}</Label>
        {required && <span className="text-destructive ml-1" aria-hidden="true">*</span>}
      </div>
      <Input
        id={id}
        placeholder={placeholder}
        type={type}
        readOnly={readOnly}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        className={readOnly ? 'bg-muted cursor-not-allowed' : undefined}
        {...register}
      />
      {error && <p className="text-xs text-destructive">{error.message}</p>}
    </div>
  );
}

// --- ChannelFormCard subcomponent ---

interface ChannelFormCardProps {
  onSubmit: () => void;
  saving: boolean;
  canSubmit: boolean;
  saveError: string | null;
  onDismissError: () => void;
  t: (key: string) => string;
  children: React.ReactNode;
}

function ChannelFormCard({ onSubmit, saving, canSubmit, saveError, onDismissError, t, children }: ChannelFormCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={onSubmit} className="space-y-5">
          {saveError && (
            <div
              role="alert"
              className="flex items-start justify-between gap-3 rounded-md border-2 border-destructive bg-destructive/20 p-4 text-sm font-medium text-destructive shadow-sm"
            >
              <span className="whitespace-pre-wrap break-words select-text">{saveError}</span>
              <button
                type="button"
                onClick={onDismissError}
                aria-label={t('channels.dismissError')}
                className="shrink-0 rounded p-0.5 text-destructive hover:bg-destructive/20"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {children}
          <div className="pt-2">
            <Button type="submit" disabled={saving || !canSubmit}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? t('channels.saving') : t('channels.save')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// --- Toggle field subcomponent ---

interface ToggleFieldProps {
  name: string;
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: any;
}

function ToggleField({ name, label, control }: ToggleFieldProps) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <div className="flex items-center justify-between">
          <Label htmlFor={name}>{label}</Label>
          <Switch
            id={name}
            checked={toBool(field.value)}
            onCheckedChange={field.onChange}
          />
        </div>
      )}
    />
  );
}

// --- Main component ---

export default function ChannelConfig() {
  const { t } = useLanguage('adminSettings');
  const [loading, setLoading] = useState(true);
  const [savingFacebook, setSavingFacebook] = useState(false);
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);
  const [savingInstagram, setSavingInstagram] = useState(false);
  const [savingEvolution, setSavingEvolution] = useState(false);
  const [savingEvolutionGo, setSavingEvolutionGo] = useState(false);
  const [savingTwitter, setSavingTwitter] = useState(false);

  const [fbSecretModified, setFbSecretModified] = useState<Record<string, boolean>>({});
  const [fbSecretConfigured, setFbSecretConfigured] = useState<Record<string, boolean>>({});
  const [wpSecretModified, setWpSecretModified] = useState<Record<string, boolean>>({});
  const [wpSecretConfigured, setWpSecretConfigured] = useState<Record<string, boolean>>({});
  const [igSecretModified, setIgSecretModified] = useState<Record<string, boolean>>({});
  const [igSecretConfigured, setIgSecretConfigured] = useState<Record<string, boolean>>({});
  const [evoSecretModified, setEvoSecretModified] = useState<Record<string, boolean>>({});
  const [evoSecretConfigured, setEvoSecretConfigured] = useState<Record<string, boolean>>({});
  const [evoGoSecretModified, setEvoGoSecretModified] = useState<Record<string, boolean>>({});
  const [evoGoSecretConfigured, setEvoGoSecretConfigured] = useState<Record<string, boolean>>({});
  const [twSecretModified, setTwSecretModified] = useState<Record<string, boolean>>({});
  const [twSecretConfigured, setTwSecretConfigured] = useState<Record<string, boolean>>({});

  const [fbSaveError, setFbSaveError] = useState<string | null>(null);
  const [wpSaveError, setWpSaveError] = useState<string | null>(null);
  const [igSaveError, setIgSaveError] = useState<string | null>(null);
  const [evoSaveError, setEvoSaveError] = useState<string | null>(null);
  const [evoGoSaveError, setEvoGoSaveError] = useState<string | null>(null);
  const [twSaveError, setTwSaveError] = useState<string | null>(null);

  const facebookSchema = useMemo(() => createFacebookSchema(t), [t]);
  const whatsappSchema = useMemo(() => createWhatsappSchema(t), [t]);
  const instagramSchema = useMemo(() => createInstagramSchema(t), [t]);
  const evolutionSchema = useMemo(() => createEvolutionSchema(t), [t]);
  const evolutionGoSchema = useMemo(() => createEvolutionGoSchema(t), [t]);
  const twitterSchema = useMemo(() => createTwitterSchema(t), [t]);

  const facebookForm = useForm<FacebookFormData>({
    resolver: zodResolver(facebookSchema),
    defaultValues: FACEBOOK_DEFAULTS,
    mode: 'onChange',
  });

  const whatsappForm = useForm<WhatsAppFormData>({
    resolver: zodResolver(whatsappSchema),
    defaultValues: WHATSAPP_DEFAULTS,
    mode: 'onChange',
  });

  const instagramForm = useForm<InstagramFormData>({
    resolver: zodResolver(instagramSchema),
    defaultValues: INSTAGRAM_DEFAULTS,
    mode: 'onChange',
  });

  const evolutionForm = useForm<EvolutionFormData>({
    resolver: zodResolver(evolutionSchema),
    defaultValues: EVOLUTION_DEFAULTS,
    mode: 'onChange',
  });

  const evolutionGoForm = useForm<EvolutionGoFormData>({
    resolver: zodResolver(evolutionGoSchema),
    defaultValues: EVOLUTION_GO_DEFAULTS,
    mode: 'onChange',
  });

  const twitterForm = useForm<TwitterFormData>({
    resolver: zodResolver(twitterSchema),
    defaultValues: TWITTER_DEFAULTS,
    mode: 'onChange',
  });

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const [fbData, wpData, igData, evoData, evoGoData, twData] = await Promise.all([
        adminConfigService.getConfig('facebook'),
        adminConfigService.getConfig('whatsapp'),
        adminConfigService.getConfig('instagram'),
        adminConfigService.getConfig('evolution'),
        adminConfigService.getConfig('evolution_go'),
        adminConfigService.getConfig('twitter'),
      ]);

      setFbSecretConfigured(updateSecretStatus(fbData, FACEBOOK_SECRET_FIELDS));
      setFbSecretModified({});
      facebookForm.reset(buildFormValues(fbData, FACEBOOK_DEFAULTS, FACEBOOK_SECRET_FIELDS, FACEBOOK_BOOLEAN_FIELDS));

      setWpSecretConfigured(updateSecretStatus(wpData, WHATSAPP_SECRET_FIELDS));
      setWpSecretModified({});
      whatsappForm.reset(buildFormValues(wpData, WHATSAPP_DEFAULTS, WHATSAPP_SECRET_FIELDS, []));

      setIgSecretConfigured(updateSecretStatus(igData, INSTAGRAM_SECRET_FIELDS));
      setIgSecretModified({});
      instagramForm.reset(buildFormValues(igData, INSTAGRAM_DEFAULTS, INSTAGRAM_SECRET_FIELDS, INSTAGRAM_BOOLEAN_FIELDS));

      setEvoSecretConfigured(updateSecretStatus(evoData, EVOLUTION_SECRET_FIELDS));
      setEvoSecretModified({});
      evolutionForm.reset(buildFormValues(evoData, EVOLUTION_DEFAULTS, EVOLUTION_SECRET_FIELDS, []));

      setEvoGoSecretConfigured(updateSecretStatus(evoGoData, EVOLUTION_GO_SECRET_FIELDS));
      setEvoGoSecretModified({});
      evolutionGoForm.reset(buildFormValues(evoGoData, EVOLUTION_GO_DEFAULTS, EVOLUTION_GO_SECRET_FIELDS, []));

      setTwSecretConfigured(updateSecretStatus(twData, TWITTER_SECRET_FIELDS));
      setTwSecretModified({});
      twitterForm.reset(buildFormValues(twData, TWITTER_DEFAULTS, TWITTER_SECRET_FIELDS, []));
    } catch {
      toast.error(t('channels.messages.loadError'));
    } finally {
      setLoading(false);
    }
  }, [facebookForm, whatsappForm, instagramForm, evolutionForm, evolutionGoForm, twitterForm, t]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const onSubmitFacebook = async (formData: FacebookFormData) => {
    setSavingFacebook(true);
    setFbSaveError(null);
    try {
      const payload = buildPayload(formData as Record<string, unknown>, FACEBOOK_SECRET_FIELDS, fbSecretModified);
      const data = await adminConfigService.saveConfig('facebook', payload as AdminConfigData);
      setFbSecretConfigured(updateSecretStatus(data, FACEBOOK_SECRET_FIELDS));
      setFbSecretModified({});
      facebookForm.reset(buildFormValues(data, FACEBOOK_DEFAULTS, FACEBOOK_SECRET_FIELDS, FACEBOOK_BOOLEAN_FIELDS));
      await refreshGlobalConfig();
      toast.success(t('channels.facebook.saveSuccess'));
    } catch (error) {
      const errorInfo = extractError(error);
      setFbSaveError(errorInfo.message || t('channels.facebook.saveError'));
    } finally {
      setSavingFacebook(false);
    }
  };

  const onSubmitWhatsapp = async (formData: WhatsAppFormData) => {
    setSavingWhatsapp(true);
    setWpSaveError(null);
    try {
      const payload = buildPayload(formData as Record<string, unknown>, WHATSAPP_SECRET_FIELDS, wpSecretModified);
      const data = await adminConfigService.saveConfig('whatsapp', payload as AdminConfigData);
      setWpSecretConfigured(updateSecretStatus(data, WHATSAPP_SECRET_FIELDS));
      setWpSecretModified({});
      whatsappForm.reset(buildFormValues(data, WHATSAPP_DEFAULTS, WHATSAPP_SECRET_FIELDS, []));
      await refreshGlobalConfig();
      toast.success(t('channels.whatsapp.saveSuccess'));
    } catch (error) {
      const errorInfo = extractError(error);
      setWpSaveError(errorInfo.message || t('channels.whatsapp.saveError'));
    } finally {
      setSavingWhatsapp(false);
    }
  };

  const onSubmitInstagram = async (formData: InstagramFormData) => {
    setSavingInstagram(true);
    setIgSaveError(null);
    try {
      const payload = buildPayload(formData as Record<string, unknown>, INSTAGRAM_SECRET_FIELDS, igSecretModified);
      const data = await adminConfigService.saveConfig('instagram', payload as AdminConfigData);
      setIgSecretConfigured(updateSecretStatus(data, INSTAGRAM_SECRET_FIELDS));
      setIgSecretModified({});
      instagramForm.reset(buildFormValues(data, INSTAGRAM_DEFAULTS, INSTAGRAM_SECRET_FIELDS, INSTAGRAM_BOOLEAN_FIELDS));
      await refreshGlobalConfig();
      toast.success(t('channels.instagram.saveSuccess'));
    } catch (error) {
      const errorInfo = extractError(error);
      setIgSaveError(errorInfo.message || t('channels.instagram.saveError'));
    } finally {
      setSavingInstagram(false);
    }
  };

  const onSubmitEvolution = async (formData: EvolutionFormData) => {
    setSavingEvolution(true);
    setEvoSaveError(null);
    try {
      const payload = buildPayload(formData as Record<string, unknown>, EVOLUTION_SECRET_FIELDS, evoSecretModified);
      const data = await adminConfigService.saveConfig('evolution', payload as AdminConfigData);
      setEvoSecretConfigured(updateSecretStatus(data, EVOLUTION_SECRET_FIELDS));
      setEvoSecretModified({});
      evolutionForm.reset(buildFormValues(data, EVOLUTION_DEFAULTS, EVOLUTION_SECRET_FIELDS, []));
      await refreshGlobalConfig();
      toast.success(t('channels.evolution.saveSuccess'));
    } catch (error) {
      const errorInfo = extractError(error);
      setEvoSaveError(errorInfo.message || t('channels.evolution.saveError'));
    } finally {
      setSavingEvolution(false);
    }
  };

  const onSubmitEvolutionGo = async (formData: EvolutionGoFormData) => {
    setSavingEvolutionGo(true);
    setEvoGoSaveError(null);
    try {
      const payload = buildPayload(formData as Record<string, unknown>, EVOLUTION_GO_SECRET_FIELDS, evoGoSecretModified);
      const data = await adminConfigService.saveConfig('evolution_go', payload as AdminConfigData);
      setEvoGoSecretConfigured(updateSecretStatus(data, EVOLUTION_GO_SECRET_FIELDS));
      setEvoGoSecretModified({});
      evolutionGoForm.reset(buildFormValues(data, EVOLUTION_GO_DEFAULTS, EVOLUTION_GO_SECRET_FIELDS, []));
      await refreshGlobalConfig();
      toast.success(t('channels.evolutionGo.saveSuccess'));
    } catch (error) {
      const errorInfo = extractError(error);
      setEvoGoSaveError(errorInfo.message || t('channels.evolutionGo.saveError'));
    } finally {
      setSavingEvolutionGo(false);
    }
  };

  const onSubmitTwitter = async (formData: TwitterFormData) => {
    setSavingTwitter(true);
    setTwSaveError(null);
    try {
      const payload = buildPayload(formData as Record<string, unknown>, TWITTER_SECRET_FIELDS, twSecretModified);
      const data = await adminConfigService.saveConfig('twitter', payload as AdminConfigData);
      setTwSecretConfigured(updateSecretStatus(data, TWITTER_SECRET_FIELDS));
      setTwSecretModified({});
      twitterForm.reset(buildFormValues(data, TWITTER_DEFAULTS, TWITTER_SECRET_FIELDS, []));
      await refreshGlobalConfig();
      toast.success(t('channels.twitter.saveSuccess'));
    } catch (error) {
      const errorInfo = extractError(error);
      setTwSaveError(errorInfo.message || t('channels.twitter.saveError'));
    } finally {
      setSavingTwitter(false);
    }
  };

  const handleClearFbSecret = (fieldName: keyof FacebookFormData) => {
    facebookForm.setValue(fieldName, '', { shouldValidate: true });
    setFbSecretModified((prev) => ({ ...prev, [fieldName]: true }));
  };

  const handleClearWpSecret = (fieldName: keyof WhatsAppFormData) => {
    whatsappForm.setValue(fieldName, '', { shouldValidate: true });
    setWpSecretModified((prev) => ({ ...prev, [fieldName]: true }));
  };

  const handleClearIgSecret = (fieldName: keyof InstagramFormData) => {
    instagramForm.setValue(fieldName, '', { shouldValidate: true });
    setIgSecretModified((prev) => ({ ...prev, [fieldName]: true }));
  };

  const handleClearEvoSecret = (fieldName: keyof EvolutionFormData) => {
    evolutionForm.setValue(fieldName, '', { shouldValidate: true });
    setEvoSecretModified((prev) => ({ ...prev, [fieldName]: true }));
  };

  const handleClearEvoGoSecret = (fieldName: keyof EvolutionGoFormData) => {
    evolutionGoForm.setValue(fieldName, '', { shouldValidate: true });
    setEvoGoSecretModified((prev) => ({ ...prev, [fieldName]: true }));
  };

  const handleClearTwSecret = (fieldName: keyof TwitterFormData) => {
    twitterForm.setValue(fieldName, '', { shouldValidate: true });
    setTwSecretModified((prev) => ({ ...prev, [fieldName]: true }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // submitCount>0 gates inline error rendering; default reValidateMode ('onChange')
  // then clears/re-shows errors as the user types.
  const fbErrors = facebookForm.formState.errors;
  const fbShowErrors = facebookForm.formState.submitCount > 0;
  const wpErrors = whatsappForm.formState.errors;
  const wpShowErrors = whatsappForm.formState.submitCount > 0;
  const igErrors = instagramForm.formState.errors;
  const igShowErrors = instagramForm.formState.submitCount > 0;
  const evoErrors = evolutionForm.formState.errors;
  const evoShowErrors = evolutionForm.formState.submitCount > 0;
  const evoGoErrors = evolutionGoForm.formState.errors;
  const evoGoShowErrors = evolutionGoForm.formState.submitCount > 0;
  const twErrors = twitterForm.formState.errors;
  const twShowErrors = twitterForm.formState.submitCount > 0;

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-sidebar-foreground">{t('channels.title')}</h2>
        <p className="text-sm text-sidebar-foreground/70 mt-1">{t('channels.description')}</p>
      </div>

      <Tabs defaultValue="facebook">
        <TabsList className="flex w-full flex-wrap gap-1">
          <TabsTrigger value="facebook">{t('channels.facebook.tabTitle')}</TabsTrigger>
          <TabsTrigger value="whatsapp">{t('channels.whatsapp.tabTitle')}</TabsTrigger>
          <TabsTrigger value="instagram">{t('channels.instagram.tabTitle')}</TabsTrigger>
          <TabsTrigger value="evolution">{t('channels.evolution.tabTitle')}</TabsTrigger>
          <TabsTrigger value="evolution_go">{t('channels.evolutionGo.tabTitle')}</TabsTrigger>
          {/* Twitter tab intentionally hidden — channel deprecated in customer-facing flow.
              Form, schema and submit handler are kept below so any installation that already
              has Twitter credentials configured can still load the page without runtime errors. */}
        </TabsList>

        {/* Facebook Tab */}
        <TabsContent value="facebook" className="mt-4">
          <ChannelFormCard
            onSubmit={facebookForm.handleSubmit(onSubmitFacebook)}
            saving={savingFacebook}
            canSubmit={facebookForm.formState.isValid}
            saveError={fbSaveError}
            onDismissError={() => setFbSaveError(null)}
            t={t}
          >
            <TextField
              id="FB_APP_ID"
              label={t('channels.facebook.fields.appId')}
              placeholder={t('channels.facebook.placeholders.appId')}
              register={facebookForm.register('FB_APP_ID')}
              error={fbShowErrors ? fbErrors.FB_APP_ID : undefined}
              required
            />
            <TextField
              id="FB_VERIFY_TOKEN"
              label={t('channels.facebook.fields.verifyToken')}
              placeholder={t('channels.facebook.placeholders.verifyToken')}
              type="password"
              register={facebookForm.register('FB_VERIFY_TOKEN')}
              error={fbShowErrors ? fbErrors.FB_VERIFY_TOKEN : undefined}
              required
            />
            <SecretField<FacebookFormData>
              fieldName="FB_APP_SECRET"
              label={t('channels.facebook.fields.appSecret')}
              placeholder={t('channels.facebook.placeholders.appSecret')}
              register={facebookForm.register}
              secretModified={fbSecretModified}
              onSecretModifiedChange={setFbSecretModified}
              secretConfigured={fbSecretConfigured}
              onClear={() => handleClearFbSecret('FB_APP_SECRET')}
              t={t}
              required
              error={fbShowErrors ? fbErrors.FB_APP_SECRET?.message : undefined}
            />
            <TextField
              id="FACEBOOK_API_VERSION"
              label={t('channels.facebook.fields.apiVersion')}
              placeholder={t('channels.facebook.placeholders.apiVersion')}
              register={facebookForm.register('FACEBOOK_API_VERSION')}
              error={fbShowErrors ? fbErrors.FACEBOOK_API_VERSION : undefined}
            />
            <div className="space-y-3 rounded-md border p-4">
              <ToggleField
                name="ENABLE_MESSENGER_CHANNEL_HUMAN_AGENT"
                label={t('channels.facebook.fields.humanAgent')}
                control={facebookForm.control}
              />
              <ToggleField
                name="FB_FEED_COMMENTS_ENABLED"
                label={t('channels.facebook.fields.feedComments')}
                control={facebookForm.control}
              />
            </div>
          </ChannelFormCard>
        </TabsContent>

        {/* WhatsApp Tab */}
        <TabsContent value="whatsapp" className="mt-4">
          <ChannelFormCard
            onSubmit={whatsappForm.handleSubmit(onSubmitWhatsapp)}
            saving={savingWhatsapp}
            canSubmit={whatsappForm.formState.isValid}
            saveError={wpSaveError}
            onDismissError={() => setWpSaveError(null)}
            t={t}
          >
            <TextField
              id="WP_APP_ID"
              label={t('channels.whatsapp.fields.appId')}
              placeholder={t('channels.whatsapp.placeholders.appId')}
              register={whatsappForm.register('WP_APP_ID')}
              error={wpShowErrors ? wpErrors.WP_APP_ID : undefined}
              required
            />
            <TextField
              id="WP_VERIFY_TOKEN"
              label={t('channels.whatsapp.fields.verifyToken')}
              placeholder={t('channels.whatsapp.placeholders.verifyToken')}
              type="password"
              register={whatsappForm.register('WP_VERIFY_TOKEN')}
              error={wpShowErrors ? wpErrors.WP_VERIFY_TOKEN : undefined}
              required
            />
            <SecretField<WhatsAppFormData>
              fieldName="WP_APP_SECRET"
              label={t('channels.whatsapp.fields.appSecret')}
              placeholder={t('channels.whatsapp.placeholders.appSecret')}
              register={whatsappForm.register}
              secretModified={wpSecretModified}
              onSecretModifiedChange={setWpSecretModified}
              secretConfigured={wpSecretConfigured}
              onClear={() => handleClearWpSecret('WP_APP_SECRET')}
              t={t}
              required
              error={wpShowErrors ? wpErrors.WP_APP_SECRET?.message : undefined}
            />
            <TextField
              id="WP_WHATSAPP_CONFIG_ID"
              label={t('channels.whatsapp.fields.configId')}
              placeholder={t('channels.whatsapp.placeholders.configId')}
              register={whatsappForm.register('WP_WHATSAPP_CONFIG_ID')}
              error={wpShowErrors ? wpErrors.WP_WHATSAPP_CONFIG_ID : undefined}
              required
            />
            <TextField
              id="WP_API_VERSION"
              label={t('channels.whatsapp.fields.apiVersion')}
              placeholder={t('channels.whatsapp.placeholders.apiVersion')}
              register={whatsappForm.register('WP_API_VERSION')}
              error={wpShowErrors ? wpErrors.WP_API_VERSION : undefined}
            />
          </ChannelFormCard>
        </TabsContent>

        {/* Instagram Tab */}
        <TabsContent value="instagram" className="mt-4">
          <ChannelFormCard
            onSubmit={instagramForm.handleSubmit(onSubmitInstagram)}
            saving={savingInstagram}
            canSubmit={instagramForm.formState.isValid}
            saveError={igSaveError}
            onDismissError={() => setIgSaveError(null)}
            t={t}
          >
            <TextField
              id="INSTAGRAM_APP_ID"
              label={t('channels.instagram.fields.appId')}
              placeholder={t('channels.instagram.placeholders.appId')}
              register={instagramForm.register('INSTAGRAM_APP_ID')}
              error={igShowErrors ? igErrors.INSTAGRAM_APP_ID : undefined}
              required
            />
            <SecretField<InstagramFormData>
              fieldName="INSTAGRAM_APP_SECRET"
              label={t('channels.instagram.fields.appSecret')}
              placeholder={t('channels.instagram.placeholders.appSecret')}
              register={instagramForm.register}
              secretModified={igSecretModified}
              onSecretModifiedChange={setIgSecretModified}
              secretConfigured={igSecretConfigured}
              onClear={() => handleClearIgSecret('INSTAGRAM_APP_SECRET')}
              t={t}
              required
              error={igShowErrors ? igErrors.INSTAGRAM_APP_SECRET?.message : undefined}
            />
            <TextField
              id="INSTAGRAM_VERIFY_TOKEN"
              label={t('channels.instagram.fields.verifyToken')}
              placeholder={t('channels.instagram.placeholders.verifyToken')}
              type="password"
              register={instagramForm.register('INSTAGRAM_VERIFY_TOKEN')}
              error={igShowErrors ? igErrors.INSTAGRAM_VERIFY_TOKEN : undefined}
              required
            />
            <TextField
              id="INSTAGRAM_API_VERSION"
              label={t('channels.instagram.fields.apiVersion')}
              placeholder={t('channels.instagram.placeholders.apiVersion')}
              register={instagramForm.register('INSTAGRAM_API_VERSION')}
              readOnly
            />
            <div className="space-y-3 rounded-md border p-4">
              <ToggleField
                name="ENABLE_INSTAGRAM_CHANNEL_HUMAN_AGENT"
                label={t('channels.instagram.fields.humanAgent')}
                control={instagramForm.control}
              />
            </div>
          </ChannelFormCard>
        </TabsContent>

        {/* Evolution Tab */}
        <TabsContent value="evolution" className="mt-4">
          <ChannelFormCard
            onSubmit={evolutionForm.handleSubmit(onSubmitEvolution)}
            saving={savingEvolution}
            canSubmit={evolutionForm.formState.isValid}
            saveError={evoSaveError}
            onDismissError={() => setEvoSaveError(null)}
            t={t}
          >
            <TextField
              id="EVOLUTION_API_URL"
              label={t('channels.evolution.fields.apiUrl')}
              placeholder={t('channels.evolution.placeholders.apiUrl')}
              register={evolutionForm.register('EVOLUTION_API_URL')}
              error={evoShowErrors ? evoErrors.EVOLUTION_API_URL : undefined}
              required
            />
            <SecretField<EvolutionFormData>
              fieldName="EVOLUTION_ADMIN_SECRET"
              label={t('channels.evolution.fields.adminSecret')}
              placeholder={t('channels.evolution.placeholders.adminSecret')}
              register={evolutionForm.register}
              secretModified={evoSecretModified}
              onSecretModifiedChange={setEvoSecretModified}
              secretConfigured={evoSecretConfigured}
              onClear={() => handleClearEvoSecret('EVOLUTION_ADMIN_SECRET')}
              t={t}
              required
              error={evoShowErrors ? evoErrors.EVOLUTION_ADMIN_SECRET?.message : undefined}
            />
          </ChannelFormCard>
        </TabsContent>

        {/* Evolution Go Tab */}
        <TabsContent value="evolution_go" className="mt-4">
          <ChannelFormCard
            onSubmit={evolutionGoForm.handleSubmit(onSubmitEvolutionGo)}
            saving={savingEvolutionGo}
            canSubmit={evolutionGoForm.formState.isValid}
            saveError={evoGoSaveError}
            onDismissError={() => setEvoGoSaveError(null)}
            t={t}
          >
            <TextField
              id="EVOLUTION_GO_API_URL"
              label={t('channels.evolutionGo.fields.apiUrl')}
              placeholder={t('channels.evolutionGo.placeholders.apiUrl')}
              register={evolutionGoForm.register('EVOLUTION_GO_API_URL')}
              error={evoGoShowErrors ? evoGoErrors.EVOLUTION_GO_API_URL : undefined}
              required
            />
            <SecretField<EvolutionGoFormData>
              fieldName="EVOLUTION_GO_ADMIN_SECRET"
              label={t('channels.evolutionGo.fields.adminSecret')}
              placeholder={t('channels.evolutionGo.placeholders.adminSecret')}
              register={evolutionGoForm.register}
              secretModified={evoGoSecretModified}
              onSecretModifiedChange={setEvoGoSecretModified}
              secretConfigured={evoGoSecretConfigured}
              onClear={() => handleClearEvoGoSecret('EVOLUTION_GO_ADMIN_SECRET')}
              t={t}
              required
              error={evoGoShowErrors ? evoGoErrors.EVOLUTION_GO_ADMIN_SECRET?.message : undefined}
            />
          </ChannelFormCard>
        </TabsContent>

        {/* Twitter Tab */}
        <TabsContent value="twitter" className="mt-4">
          <ChannelFormCard
            onSubmit={twitterForm.handleSubmit(onSubmitTwitter)}
            saving={savingTwitter}
            canSubmit={twitterForm.formState.isValid}
            saveError={twSaveError}
            onDismissError={() => setTwSaveError(null)}
            t={t}
          >
            <TextField
              id="TWITTER_APP_ID"
              label={t('channels.twitter.fields.appId')}
              placeholder={t('channels.twitter.placeholders.appId')}
              register={twitterForm.register('TWITTER_APP_ID')}
              error={twShowErrors ? twErrors.TWITTER_APP_ID : undefined}
              required
            />
            <TextField
              id="TWITTER_CONSUMER_KEY"
              label={t('channels.twitter.fields.consumerKey')}
              placeholder={t('channels.twitter.placeholders.consumerKey')}
              register={twitterForm.register('TWITTER_CONSUMER_KEY')}
              error={twShowErrors ? twErrors.TWITTER_CONSUMER_KEY : undefined}
              required
            />
            <SecretField<TwitterFormData>
              fieldName="TWITTER_CONSUMER_SECRET"
              label={t('channels.twitter.fields.consumerSecret')}
              placeholder={t('channels.twitter.placeholders.consumerSecret')}
              register={twitterForm.register}
              secretModified={twSecretModified}
              onSecretModifiedChange={setTwSecretModified}
              secretConfigured={twSecretConfigured}
              onClear={() => handleClearTwSecret('TWITTER_CONSUMER_SECRET')}
              t={t}
              required
              error={twShowErrors ? twErrors.TWITTER_CONSUMER_SECRET?.message : undefined}
            />
            <TextField
              id="TWITTER_ENVIRONMENT"
              label={t('channels.twitter.fields.environment')}
              placeholder={t('channels.twitter.placeholders.environment')}
              register={twitterForm.register('TWITTER_ENVIRONMENT')}
              error={twShowErrors ? twErrors.TWITTER_ENVIRONMENT : undefined}
              required
            />
          </ChannelFormCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
