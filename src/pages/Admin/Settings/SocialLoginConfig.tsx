import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm, UseFormRegister } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Input,
  Label,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@evoapi/design-system';
import { toast } from 'sonner';
import { Loader2, Lock, LockOpen, X } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { adminConfigService } from '@/services/admin/adminConfigService';
import { extractError } from '@/utils/apiHelpers';
import type { AdminConfigData } from '@/types/admin/adminConfig';

// --- Schema factories with i18n ---

function createGoogleOauthSchema(t: (key: string) => string) {
  return z.object({
    GOOGLE_OAUTH_CLIENT_ID: z.string().min(1, t('socialLogin.validation.clientIdRequired')),
    GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional().nullable(),
    GOOGLE_OAUTH_CALLBACK_URL: z.string().url(t('socialLogin.validation.callbackUrlInvalid')).or(z.literal('')),
  });
}

function createMicrosoftSchema(t: (key: string) => string) {
  return z.object({
    AZURE_APP_ID: z.string().min(1, t('socialLogin.validation.appIdRequired')),
    AZURE_APP_SECRET: z.string().optional().nullable(),
  });
}

type GoogleOauthFormData = z.infer<ReturnType<typeof createGoogleOauthSchema>>;
type MicrosoftFormData = z.infer<ReturnType<typeof createMicrosoftSchema>>;

type GoogleFieldKey = keyof GoogleOauthFormData;
type MicrosoftFieldKey = keyof MicrosoftFormData;

const GOOGLE_DEFAULTS: GoogleOauthFormData = {
  GOOGLE_OAUTH_CLIENT_ID: '',
  GOOGLE_OAUTH_CLIENT_SECRET: null,
  GOOGLE_OAUTH_CALLBACK_URL: '',
};

const MICROSOFT_DEFAULTS: MicrosoftFormData = {
  AZURE_APP_ID: '',
  AZURE_APP_SECRET: null,
};

const GOOGLE_SECRET_FIELDS = ['GOOGLE_OAUTH_CLIENT_SECRET'];
const MICROSOFT_SECRET_FIELDS = ['AZURE_APP_SECRET'];

function isSecretMasked(value: unknown): boolean {
  return typeof value === 'string' && value.includes('••••');
}

function buildGoogleFormValues(data: Record<string, unknown>): GoogleOauthFormData {
  const formValues: Record<string, unknown> = { ...GOOGLE_DEFAULTS };
  for (const [key, value] of Object.entries(data)) {
    if (GOOGLE_SECRET_FIELDS.includes(key)) {
      formValues[key] = isSecretMasked(value) ? '' : (value ?? '');
    } else {
      formValues[key] = value ?? formValues[key] ?? '';
    }
  }
  return formValues as GoogleOauthFormData;
}

function buildMicrosoftFormValues(data: Record<string, unknown>): MicrosoftFormData {
  const formValues: Record<string, unknown> = { ...MICROSOFT_DEFAULTS };
  for (const [key, value] of Object.entries(data)) {
    if (MICROSOFT_SECRET_FIELDS.includes(key)) {
      formValues[key] = isSecretMasked(value) ? '' : (value ?? '');
    } else {
      formValues[key] = value ?? formValues[key] ?? '';
    }
  }
  return formValues as MicrosoftFormData;
}

// --- SecretField subcomponent ---

interface SecretFieldProps<T extends Record<string, unknown>> {
  fieldName: string & keyof T;
  label: string;
  placeholder: string;
  register: UseFormRegister<T>;
  secretModified: Record<string, boolean>;
  onSecretModifiedChange: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  secretConfigured: Record<string, boolean>;
  onClear: () => void;
  sectionKey: string;
  t: (key: string) => string;
}

function SecretField<T extends Record<string, unknown>>({
  fieldName,
  label,
  placeholder,
  register,
  secretModified,
  onSecretModifiedChange,
  secretConfigured,
  onClear,
  sectionKey,
  t,
}: SecretFieldProps<T>) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={fieldName}>{label}</Label>
        {!secretModified[fieldName] && (
          secretConfigured[fieldName] ? (
            <span className="inline-flex items-center gap-1 text-xs text-green-600">
              <Lock className="h-3 w-3" />
              {t(`socialLogin.${sectionKey}.secretConfigured`)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-sidebar-foreground/50">
              <LockOpen className="h-3 w-3" />
              {t(`socialLogin.${sectionKey}.secretNotConfigured`)}
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
          {...register(fieldName as Parameters<typeof register>[0], {
            onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
              onSecretModifiedChange((prev) => ({ ...prev, [fieldName]: e.target.value.length > 0 })),
          })}
        />
        {secretConfigured[fieldName] && !secretModified[fieldName] && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-sidebar-accent text-sidebar-foreground/50 hover:text-sidebar-foreground"
            title={t(`socialLogin.${sectionKey}.clearSecret`)}
            aria-label={t(`socialLogin.${sectionKey}.clearSecret`)}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// --- Main component ---

export default function SocialLoginConfig() {
  const { t } = useLanguage('adminSettings');
  const [loading, setLoading] = useState(true);
  const [savingGoogle, setSavingGoogle] = useState(false);
  const [savingMicrosoft, setSavingMicrosoft] = useState(false);
  const [googleSecretModified, setGoogleSecretModified] = useState<Record<string, boolean>>({});
  const [googleSecretConfigured, setGoogleSecretConfigured] = useState<Record<string, boolean>>({});
  const [microsoftSecretModified, setMicrosoftSecretModified] = useState<Record<string, boolean>>({});
  const [microsoftSecretConfigured, setMicrosoftSecretConfigured] = useState<Record<string, boolean>>({});

  const googleSchema = useMemo(() => createGoogleOauthSchema(t), [t]);
  const microsoftSchema = useMemo(() => createMicrosoftSchema(t), [t]);

  const googleForm = useForm<GoogleOauthFormData>({
    resolver: zodResolver(googleSchema),
    defaultValues: GOOGLE_DEFAULTS,
  });

  const microsoftForm = useForm<MicrosoftFormData>({
    resolver: zodResolver(microsoftSchema),
    defaultValues: MICROSOFT_DEFAULTS,
  });

  const updateGoogleSecretStatus = (data: Record<string, unknown>) => {
    const configured: Record<string, boolean> = {};
    for (const key of GOOGLE_SECRET_FIELDS) {
      configured[key] = isSecretMasked(data[key]);
    }
    setGoogleSecretConfigured(configured);
    setGoogleSecretModified({});
  };

  const updateMicrosoftSecretStatus = (data: Record<string, unknown>) => {
    const configured: Record<string, boolean> = {};
    for (const key of MICROSOFT_SECRET_FIELDS) {
      configured[key] = isSecretMasked(data[key]);
    }
    setMicrosoftSecretConfigured(configured);
    setMicrosoftSecretModified({});
  };

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const [googleData, microsoftData] = await Promise.all([
        adminConfigService.getConfig('google_oauth'),
        adminConfigService.getConfig('microsoft'),
      ]);
      updateGoogleSecretStatus(googleData);
      googleForm.reset(buildGoogleFormValues(googleData));
      updateMicrosoftSecretStatus(microsoftData);
      microsoftForm.reset(buildMicrosoftFormValues(microsoftData));
    } catch {
      toast.error(t('socialLogin.messages.loadError'));
    } finally {
      setLoading(false);
    }
  }, [googleForm, microsoftForm, t]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const onSubmitGoogle = async (formData: GoogleOauthFormData) => {
    setSavingGoogle(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(formData)) {
        if (GOOGLE_SECRET_FIELDS.includes(key)) {
          if (!googleSecretModified[key] || value === '') {
            payload[key] = null;
          } else {
            payload[key] = value;
          }
        } else {
          payload[key] = value;
        }
      }

      const data = await adminConfigService.saveConfig('google_oauth', payload as AdminConfigData);
      updateGoogleSecretStatus(data);
      googleForm.reset(buildGoogleFormValues(data));
      toast.success(t('socialLogin.google.saveSuccess'));
    } catch (error) {
      const errorInfo = extractError(error);
      toast.error(t('socialLogin.google.saveError'), {
        description: errorInfo.message,
      });
    } finally {
      setSavingGoogle(false);
    }
  };

  const onSubmitMicrosoft = async (formData: MicrosoftFormData) => {
    setSavingMicrosoft(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(formData)) {
        if (MICROSOFT_SECRET_FIELDS.includes(key)) {
          if (!microsoftSecretModified[key] || value === '') {
            payload[key] = null;
          } else {
            payload[key] = value;
          }
        } else {
          payload[key] = value;
        }
      }

      const data = await adminConfigService.saveConfig('microsoft', payload as AdminConfigData);
      updateMicrosoftSecretStatus(data);
      microsoftForm.reset(buildMicrosoftFormValues(data));
      toast.success(t('socialLogin.microsoft.saveSuccess'));
    } catch (error) {
      const errorInfo = extractError(error);
      toast.error(t('socialLogin.microsoft.saveError'), {
        description: errorInfo.message,
      });
    } finally {
      setSavingMicrosoft(false);
    }
  };

  const handleClearGoogleSecret = (fieldName: GoogleFieldKey) => {
    googleForm.setValue(fieldName, '');
    setGoogleSecretModified((prev) => ({ ...prev, [fieldName]: true }));
  };

  const handleClearMicrosoftSecret = (fieldName: MicrosoftFieldKey) => {
    microsoftForm.setValue(fieldName, '');
    setMicrosoftSecretModified((prev) => ({ ...prev, [fieldName]: true }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <section>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-sidebar-foreground">{t('socialLogin.title')}</h3>
        <p className="text-sm text-sidebar-foreground/70 mt-1">{t('socialLogin.description')}</p>
      </div>

      {/* Google OAuth Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">{t('socialLogin.google.cardTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={googleForm.handleSubmit(onSubmitGoogle)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="GOOGLE_OAUTH_CLIENT_ID">{t('socialLogin.google.fields.clientId')}</Label>
              <Input
                id="GOOGLE_OAUTH_CLIENT_ID"
                placeholder={t('socialLogin.google.placeholders.clientId')}
                {...googleForm.register('GOOGLE_OAUTH_CLIENT_ID')}
              />
              {googleForm.formState.errors.GOOGLE_OAUTH_CLIENT_ID && (
                <p className="text-xs text-destructive">{googleForm.formState.errors.GOOGLE_OAUTH_CLIENT_ID.message}</p>
              )}
            </div>

            <SecretField<GoogleOauthFormData>
              fieldName="GOOGLE_OAUTH_CLIENT_SECRET"
              label={t('socialLogin.google.fields.clientSecret')}
              placeholder={t('socialLogin.google.placeholders.clientSecret')}
              register={googleForm.register}
              secretModified={googleSecretModified}
              onSecretModifiedChange={setGoogleSecretModified}
              secretConfigured={googleSecretConfigured}
              onClear={() => handleClearGoogleSecret('GOOGLE_OAUTH_CLIENT_SECRET')}
              sectionKey="google"
              t={t}
            />

            <div className="space-y-2">
              <Label htmlFor="GOOGLE_OAUTH_CALLBACK_URL">{t('socialLogin.google.fields.callbackUrl')}</Label>
              <Input
                id="GOOGLE_OAUTH_CALLBACK_URL"
                placeholder={t('socialLogin.google.placeholders.callbackUrl')}
                {...googleForm.register('GOOGLE_OAUTH_CALLBACK_URL')}
              />
              {googleForm.formState.errors.GOOGLE_OAUTH_CALLBACK_URL && (
                <p className="text-xs text-destructive">{googleForm.formState.errors.GOOGLE_OAUTH_CALLBACK_URL.message}</p>
              )}
            </div>

            <div className="pt-2">
              <Button type="submit" disabled={savingGoogle}>
                {savingGoogle && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {savingGoogle ? t('socialLogin.saving') : t('socialLogin.save')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Microsoft / Azure Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('socialLogin.microsoft.cardTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={microsoftForm.handleSubmit(onSubmitMicrosoft)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="AZURE_APP_ID">{t('socialLogin.microsoft.fields.appId')}</Label>
              <Input
                id="AZURE_APP_ID"
                placeholder={t('socialLogin.microsoft.placeholders.appId')}
                {...microsoftForm.register('AZURE_APP_ID')}
              />
              {microsoftForm.formState.errors.AZURE_APP_ID && (
                <p className="text-xs text-destructive">{microsoftForm.formState.errors.AZURE_APP_ID.message}</p>
              )}
            </div>

            <SecretField<MicrosoftFormData>
              fieldName="AZURE_APP_SECRET"
              label={t('socialLogin.microsoft.fields.appSecret')}
              placeholder={t('socialLogin.microsoft.placeholders.appSecret')}
              register={microsoftForm.register}
              secretModified={microsoftSecretModified}
              onSecretModifiedChange={setMicrosoftSecretModified}
              secretConfigured={microsoftSecretConfigured}
              onClear={() => handleClearMicrosoftSecret('AZURE_APP_SECRET')}
              sectionKey="microsoft"
              t={t}
            />

            <div className="pt-2">
              <Button type="submit" disabled={savingMicrosoft}>
                {savingMicrosoft && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {savingMicrosoft ? t('socialLogin.saving') : t('socialLogin.save')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
