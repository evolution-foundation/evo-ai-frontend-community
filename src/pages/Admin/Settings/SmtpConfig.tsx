import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
  Switch,
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
import type { MailerType, AdminConfigData } from '@/types/admin/adminConfig';

// --- Schema factory with i18n ---

function createSchemas(t: (key: string) => string) {
  const smtpSchema = z.object({
    MAILER_TYPE: z.literal('smtp'),
    SMTP_ADDRESS: z.string().min(1, t('email.validation.hostRequired')),
    SMTP_PORT: z.coerce.number().min(1, t('email.validation.portMin')).max(65535, t('email.validation.portMax')),
    SMTP_USERNAME: z.string().optional().default(''),
    SMTP_PASSWORD_SECRET: z.string().optional().nullable(),
    SMTP_AUTHENTICATION: z.enum(['plain', 'login', 'cram_md5']).default('login'),
    SMTP_DOMAIN: z.string().optional().default(''),
    SMTP_ENABLE_STARTTLS_AUTO: z.boolean().default(true),
    SMTP_OPENSSL_VERIFY_MODE: z.enum(['none', 'peer']).default('peer'),
    MAILER_SENDER_EMAIL: z.string().email(t('email.validation.emailRequired')),
  });

  const bmsSchema = z.object({
    MAILER_TYPE: z.literal('bms'),
    BMS_API_SECRET: z.string().optional().nullable(),
    BMS_IPPOOL: z.string().default('default'),
    MAILER_SENDER_EMAIL: z.string().email(t('email.validation.emailRequired')),
  });

  const resendSchema = z.object({
    MAILER_TYPE: z.literal('resend'),
    RESEND_API_SECRET: z.string().optional().nullable(),
    MAILER_SENDER_EMAIL: z.string().email(t('email.validation.emailRequired')),
  });

  const emailConfigSchema = z.discriminatedUnion('MAILER_TYPE', [smtpSchema, bmsSchema, resendSchema]);

  return { smtpSchema, bmsSchema, resendSchema, emailConfigSchema };
}

type EmailFormData = z.infer<ReturnType<typeof createSchemas>['emailConfigSchema']>;
type SmtpFormData = z.infer<ReturnType<typeof createSchemas>['smtpSchema']>;
type BmsFormData = z.infer<ReturnType<typeof createSchemas>['bmsSchema']>;
type ResendFormData = z.infer<ReturnType<typeof createSchemas>['resendSchema']>;

// Union of all possible field keys across all provider schemas.
// RHF Path<EmailFormData> only includes shared fields since EmailFormData is a
// discriminated union; this alias lets us reference variant-specific fields safely.
type EmailFieldKey = keyof SmtpFormData | keyof BmsFormData | keyof ResendFormData;

const SMTP_DEFAULTS: SmtpFormData = {
  MAILER_TYPE: 'smtp',
  SMTP_ADDRESS: '',
  SMTP_PORT: 587,
  SMTP_USERNAME: '',
  SMTP_PASSWORD_SECRET: null,
  SMTP_AUTHENTICATION: 'login',
  SMTP_DOMAIN: '',
  SMTP_ENABLE_STARTTLS_AUTO: true,
  SMTP_OPENSSL_VERIFY_MODE: 'peer',
  MAILER_SENDER_EMAIL: '',
};

const BMS_DEFAULTS: BmsFormData = {
  MAILER_TYPE: 'bms',
  BMS_API_SECRET: null,
  BMS_IPPOOL: 'default',
  MAILER_SENDER_EMAIL: '',
};

const RESEND_DEFAULTS: ResendFormData = {
  MAILER_TYPE: 'resend',
  RESEND_API_SECRET: null,
  MAILER_SENDER_EMAIL: '',
};

const SECRET_FIELDS = ['SMTP_PASSWORD_SECRET', 'BMS_API_SECRET', 'RESEND_API_SECRET'];

function isSecretMasked(value: unknown): boolean {
  return typeof value === 'string' && value.includes('••••');
}

function getDefaults(type: MailerType): EmailFormData {
  switch (type) {
    case 'bms': return BMS_DEFAULTS;
    case 'resend': return RESEND_DEFAULTS;
    default: return SMTP_DEFAULTS;
  }
}

function buildFormValues(data: Record<string, unknown>, type: MailerType): EmailFormData {
  const formValues: Record<string, unknown> = { ...getDefaults(type) };
  for (const [key, value] of Object.entries(data)) {
    if (SECRET_FIELDS.includes(key)) {
      formValues[key] = isSecretMasked(value) ? '' : (value ?? '');
    } else if (key === 'SMTP_PORT') {
      formValues[key] = Number(value) || 587;
    } else if (key === 'SMTP_ENABLE_STARTTLS_AUTO') {
      formValues[key] = value === true || value === 'true';
    } else {
      formValues[key] = value ?? formValues[key] ?? '';
    }
  }
  formValues.MAILER_TYPE = type;
  return formValues as EmailFormData;
}

export default function SmtpConfig() {
  const { t } = useLanguage('adminSettings');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [secretModified, setSecretModified] = useState<Record<string, boolean>>({});
  const [secretConfigured, setSecretConfigured] = useState<Record<string, boolean>>({});
  const [serverData, setServerData] = useState<Record<string, unknown>>({});

  const { emailConfigSchema } = useMemo(() => createSchemas(t), [t]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EmailFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(emailConfigSchema) as any,
    defaultValues: SMTP_DEFAULTS,
  });

  const mailerType = watch('MAILER_TYPE');

  const updateSecretStatus = (data: Record<string, unknown>) => {
    const configured: Record<string, boolean> = {};
    for (const key of SECRET_FIELDS) {
      configured[key] = isSecretMasked(data[key]);
    }
    setSecretConfigured(configured);
    setSecretModified({});
  };

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminConfigService.getConfig('smtp');
      setServerData(data);

      const type = (data.MAILER_TYPE as MailerType) || 'smtp';
      updateSecretStatus(data);
      reset(buildFormValues(data, type));
    } catch (error) {
      toast.error(t('email.messages.loadError'));
    } finally {
      setLoading(false);
    }
  }, [reset, t]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleProviderChange = (newType: MailerType) => {
    const senderEmail = (serverData.MAILER_SENDER_EMAIL as string) || '';
    const defaults = { ...getDefaults(newType), MAILER_SENDER_EMAIL: senderEmail };
    reset(defaults);
    setSecretModified({});
  };

  const onSubmit = async (formData: EmailFormData) => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(formData)) {
        if (SECRET_FIELDS.includes(key) && !secretModified[key]) {
          payload[key] = null; // preserve existing on backend
        } else {
          payload[key] = value;
        }
      }

      const data = await adminConfigService.saveConfig('smtp', payload as AdminConfigData);
      setServerData(data);
      updateSecretStatus(data);
      reset(buildFormValues(data, mailerType));

      toast.success(t('email.messages.saveSuccess'));
    } catch (error) {
      const errorInfo = extractError(error);
      toast.error(t('email.messages.saveError'), {
        description: errorInfo.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const result = await adminConfigService.testConnection('smtp');
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(t('email.testFailed'), { description: result.message });
      }
    } catch (error) {
      toast.error(t('email.testError'));
    } finally {
      setTesting(false);
    }
  };

  const handleSecretChange = (fieldName: string, value: string) => {
    setSecretModified((prev) => ({ ...prev, [fieldName]: value.length > 0 }));
  };

  const handleClearSecret = (fieldName: string) => {
    setValue(fieldName as EmailFieldKey, '');
    setSecretModified((prev) => ({ ...prev, [fieldName]: true }));
  };

  const renderSecretField = (fieldName: string, label: string, placeholder: string) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={fieldName}>{label}</Label>
        {!secretModified[fieldName] && (
          secretConfigured[fieldName] ? (
            <span className="inline-flex items-center gap-1 text-xs text-green-600">
              <Lock className="h-3 w-3" />
              {t('email.secretConfigured')}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-sidebar-foreground/50">
              <LockOpen className="h-3 w-3" />
              {t('email.secretNotConfigured')}
            </span>
          )
        )}
      </div>
      <div className="relative">
        <Input
          id={fieldName}
          type="password"
          placeholder={placeholder}
          {...register(fieldName as EmailFieldKey, {
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => handleSecretChange(fieldName, e.target.value),
          })}
        />
        {secretConfigured[fieldName] && !secretModified[fieldName] && (
          <button
            type="button"
            onClick={() => handleClearSecret(fieldName)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-sidebar-accent text-sidebar-foreground/50 hover:text-sidebar-foreground"
            title={t('email.clearSecret')}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-sidebar-foreground">{t('email.title')}</h2>
        <p className="text-sm text-sidebar-foreground/70 mt-1">{t('email.description')}</p>
      </div>

      {/* Runtime-not-applied warning — see Linear EVO-1049. Until that ships,
          values saved here are persisted but the Rails apps continue reading
          SMTP_* from ENV at boot time. */}
      <div className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
        <strong className="font-semibold">{t('email.envWarning.title')}</strong>{' '}
        {t('email.envWarning.body')}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('email.provider.label')}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-5">
            {/* Provider selector — driven by RHF Controller */}
            <div className="space-y-2">
              <Label>{t('email.provider.label')}</Label>
              <Controller
                name="MAILER_TYPE"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => handleProviderChange(v as MailerType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="smtp">{t('email.provider.smtp')}</SelectItem>
                      <SelectItem value="bms">{t('email.provider.bms')}</SelectItem>
                      <SelectItem value="resend">{t('email.provider.resend')}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* SMTP fields */}
            {mailerType === 'smtp' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="SMTP_ADDRESS">{t('email.fields.host')}</Label>
                    <Input
                      id="SMTP_ADDRESS"
                      placeholder={t('email.placeholders.host')}
                      {...register('SMTP_ADDRESS' as EmailFieldKey)}
                    />
                    {(errors as Record<string, { message?: string }>).SMTP_ADDRESS && (
                      <p className="text-xs text-destructive">{(errors as Record<string, { message?: string }>).SMTP_ADDRESS?.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="SMTP_PORT">{t('email.fields.port')}</Label>
                    <Input
                      id="SMTP_PORT"
                      type="number"
                      placeholder={t('email.placeholders.port')}
                      {...register('SMTP_PORT' as EmailFieldKey)}
                    />
                    {(errors as Record<string, { message?: string }>).SMTP_PORT && (
                      <p className="text-xs text-destructive">{(errors as Record<string, { message?: string }>).SMTP_PORT?.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="SMTP_USERNAME">{t('email.fields.username')}</Label>
                    <Input
                      id="SMTP_USERNAME"
                      placeholder={t('email.placeholders.username')}
                      {...register('SMTP_USERNAME' as EmailFieldKey)}
                    />
                  </div>
                  {renderSecretField('SMTP_PASSWORD_SECRET', t('email.fields.password'), t('email.placeholders.password'))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="SMTP_AUTHENTICATION">{t('email.fields.authentication')}</Label>
                    <Controller
                      name={'SMTP_AUTHENTICATION' as EmailFieldKey}
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value as string | undefined} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="plain">plain</SelectItem>
                            <SelectItem value="login">login</SelectItem>
                            <SelectItem value="cram_md5">cram_md5</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="SMTP_DOMAIN">{t('email.fields.domain')}</Label>
                    <Input
                      id="SMTP_DOMAIN"
                      placeholder={t('email.placeholders.domain')}
                      {...register('SMTP_DOMAIN' as EmailFieldKey)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 pt-6">
                    <Controller
                      name={'SMTP_ENABLE_STARTTLS_AUTO' as EmailFieldKey}
                      control={control}
                      render={({ field }) => (
                        <Switch
                          checked={!!field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                    <Label>{t('email.fields.starttls')}</Label>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="SMTP_OPENSSL_VERIFY_MODE">{t('email.fields.sslVerifyMode')}</Label>
                    <Controller
                      name={'SMTP_OPENSSL_VERIFY_MODE' as EmailFieldKey}
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value as string | undefined} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">none</SelectItem>
                            <SelectItem value="peer">peer</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>
              </>
            )}

            {/* BMS fields */}
            {mailerType === 'bms' && (
              <>
                {renderSecretField('BMS_API_SECRET', t('email.fields.apiKey'), t('email.placeholders.apiKey'))}
                <div className="space-y-2">
                  <Label htmlFor="BMS_IPPOOL">{t('email.fields.ipPool')}</Label>
                  <Input
                    id="BMS_IPPOOL"
                    placeholder={t('email.placeholders.ipPool')}
                    {...register('BMS_IPPOOL' as EmailFieldKey)}
                  />
                </div>
              </>
            )}

            {/* Resend fields */}
            {mailerType === 'resend' && (
              renderSecretField('RESEND_API_SECRET', t('email.fields.apiKey'), t('email.placeholders.apiKey'))
            )}

            {/* Sender email — always visible */}
            <div className="space-y-2">
              <Label htmlFor="MAILER_SENDER_EMAIL">{t('email.fields.senderEmail')}</Label>
              <Input
                id="MAILER_SENDER_EMAIL"
                type="email"
                placeholder={t('email.placeholders.senderEmail')}
                {...register('MAILER_SENDER_EMAIL')}
              />
              {errors.MAILER_SENDER_EMAIL && (
                <p className="text-xs text-destructive">{errors.MAILER_SENDER_EMAIL.message}</p>
              )}
            </div>

            {/* Actions */}
            <div className="pt-2 flex gap-3">
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {saving ? t('email.saving') : t('email.save')}
              </Button>
              <Button type="button" variant="outline" onClick={handleTestConnection} disabled={testing}>
                {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {testing ? t('email.testing') : t('email.testConnection')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
