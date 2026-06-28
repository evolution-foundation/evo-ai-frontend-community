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

// --- Types ---

type InboundService = 'relay' | 'mailgun' | 'mandrill' | 'sendgrid';

// --- Schema factory with i18n ---

function createSchema(t: (key: string) => string) {
  const relaySchema = z.object({
    RAILS_INBOUND_EMAIL_SERVICE: z.literal('relay'),
    RAILS_INBOUND_EMAIL_PASSWORD_SECRET: z.string().optional().nullable(),
    MAILER_INBOUND_EMAIL_DOMAIN: z.string().min(1, t('inboundEmail.validation.domainRequired')),
  });

  const mailgunSchema = z.object({
    RAILS_INBOUND_EMAIL_SERVICE: z.literal('mailgun'),
    MAILGUN_SIGNING_SECRET: z.string().optional().nullable(),
    MAILER_INBOUND_EMAIL_DOMAIN: z.string().min(1, t('inboundEmail.validation.domainRequired')),
  });

  const mandrillSchema = z.object({
    RAILS_INBOUND_EMAIL_SERVICE: z.literal('mandrill'),
    MANDRILL_API_SECRET: z.string().optional().nullable(),
    MAILER_INBOUND_EMAIL_DOMAIN: z.string().min(1, t('inboundEmail.validation.domainRequired')),
  });

  const sendgridSchema = z.object({
    RAILS_INBOUND_EMAIL_SERVICE: z.literal('sendgrid'),
    RAILS_INBOUND_EMAIL_PASSWORD_SECRET: z.string().optional().nullable(),
    MAILER_INBOUND_EMAIL_DOMAIN: z.string().min(1, t('inboundEmail.validation.domainRequired')),
  });

  const inboundEmailSchema = z.discriminatedUnion('RAILS_INBOUND_EMAIL_SERVICE', [
    relaySchema,
    mailgunSchema,
    mandrillSchema,
    sendgridSchema,
  ]);

  return { inboundEmailSchema };
}

type InboundEmailFormData = z.infer<ReturnType<typeof createSchema>['inboundEmailSchema']>;

type InboundEmailFieldKey =
  | 'RAILS_INBOUND_EMAIL_SERVICE'
  | 'RAILS_INBOUND_EMAIL_PASSWORD_SECRET'
  | 'MAILER_INBOUND_EMAIL_DOMAIN'
  | 'MAILGUN_SIGNING_SECRET'
  | 'MANDRILL_API_SECRET';

const RELAY_DEFAULTS: InboundEmailFormData = {
  RAILS_INBOUND_EMAIL_SERVICE: 'relay',
  RAILS_INBOUND_EMAIL_PASSWORD_SECRET: null,
  MAILER_INBOUND_EMAIL_DOMAIN: '',
};

const SECRET_FIELDS = ['RAILS_INBOUND_EMAIL_PASSWORD_SECRET', 'MAILGUN_SIGNING_SECRET', 'MANDRILL_API_SECRET'];

function isSecretMasked(value: unknown): boolean {
  return typeof value === 'string' && value.includes('••••');
}

function getDefaults(service: InboundService): InboundEmailFormData {
  switch (service) {
    case 'mailgun':
      return { RAILS_INBOUND_EMAIL_SERVICE: 'mailgun', MAILGUN_SIGNING_SECRET: null, MAILER_INBOUND_EMAIL_DOMAIN: '' };
    case 'mandrill':
      return { RAILS_INBOUND_EMAIL_SERVICE: 'mandrill', MANDRILL_API_SECRET: null, MAILER_INBOUND_EMAIL_DOMAIN: '' };
    case 'sendgrid':
      return { RAILS_INBOUND_EMAIL_SERVICE: 'sendgrid', RAILS_INBOUND_EMAIL_PASSWORD_SECRET: null, MAILER_INBOUND_EMAIL_DOMAIN: '' };
    default:
      return { ...RELAY_DEFAULTS };
  }
}

function buildFormValues(data: Record<string, unknown>, service: InboundService): InboundEmailFormData {
  const formValues: Record<string, unknown> = { ...getDefaults(service) };
  for (const [key, value] of Object.entries(data)) {
    if (SECRET_FIELDS.includes(key)) {
      formValues[key] = isSecretMasked(value) ? '' : (value ?? '');
    } else {
      formValues[key] = value ?? formValues[key] ?? '';
    }
  }
  formValues.RAILS_INBOUND_EMAIL_SERVICE = service;
  return formValues as InboundEmailFormData;
}

export default function InboundEmailConfig() {
  const { t } = useLanguage('adminSettings');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [secretModified, setSecretModified] = useState<Record<string, boolean>>({});
  const [secretConfigured, setSecretConfigured] = useState<Record<string, boolean>>({});
  const [serverData, setServerData] = useState<Record<string, unknown>>({});

  const { inboundEmailSchema } = useMemo(() => createSchema(t), [t]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<InboundEmailFormData>({
    resolver: zodResolver(inboundEmailSchema),
    defaultValues: RELAY_DEFAULTS,
  });

  const service = watch('RAILS_INBOUND_EMAIL_SERVICE');

  const updateSecretStatus = useCallback((data: Record<string, unknown>) => {
    const configured: Record<string, boolean> = {};
    for (const key of SECRET_FIELDS) {
      configured[key] = isSecretMasked(data[key]);
    }
    setSecretConfigured(configured);
    setSecretModified({});
  }, []);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminConfigService.getConfig('inbound_email');
      setServerData(data);

      const svc = (data.RAILS_INBOUND_EMAIL_SERVICE as InboundService) || 'relay';
      updateSecretStatus(data);
      reset(buildFormValues(data, svc));
    } catch {
      toast.error(t('inboundEmail.messages.loadError'));
    } finally {
      setLoading(false);
    }
  }, [reset, t, updateSecretStatus]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleServiceChange = (newService: InboundService) => {
    const domain = (serverData.MAILER_INBOUND_EMAIL_DOMAIN as string) || '';
    const defaults = { ...getDefaults(newService), MAILER_INBOUND_EMAIL_DOMAIN: domain };
    reset(defaults);
    setSecretModified({});
  };

  const onSubmit = async (formData: InboundEmailFormData) => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(formData)) {
        if (SECRET_FIELDS.includes(key) && !secretModified[key]) {
          payload[key] = null;
        } else {
          payload[key] = value;
        }
      }

      const data = await adminConfigService.saveConfig('inbound_email', payload as AdminConfigData);
      setServerData(data);
      updateSecretStatus(data);
      reset(buildFormValues(data, service));

      toast.success(t('inboundEmail.messages.saveSuccess'));
    } catch (error) {
      const errorInfo = extractError(error);
      toast.error(t('inboundEmail.messages.saveError'), {
        description: errorInfo.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSecretChange = (fieldName: string, value: string) => {
    setSecretModified((prev) => ({ ...prev, [fieldName]: value.length > 0 }));
  };

  const handleClearSecret = (fieldName: string) => {
    setValue(fieldName as InboundEmailFieldKey, '');
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
              {t('inboundEmail.secretConfigured')}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-sidebar-foreground/50">
              <LockOpen className="h-3 w-3" />
              {t('inboundEmail.secretNotConfigured')}
            </span>
          )
        )}
      </div>
      <div className="relative">
        <Input
          id={fieldName}
          type="password"
          placeholder={placeholder}
          {...register(fieldName as InboundEmailFieldKey, {
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => handleSecretChange(fieldName, e.target.value),
          })}
        />
        {secretConfigured[fieldName] && !secretModified[fieldName] && (
          <button
            type="button"
            onClick={() => handleClearSecret(fieldName)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-sidebar-accent text-sidebar-foreground/50 hover:text-sidebar-foreground"
            title={t('inboundEmail.clearSecret')}
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
    <section>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-sidebar-foreground">{t('inboundEmail.title')}</h3>
        <p className="text-sm text-sidebar-foreground/70 mt-1">{t('inboundEmail.description')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('inboundEmail.provider.label')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Service selector */}
            <div className="space-y-2">
              <Label>{t('inboundEmail.provider.label')}</Label>
              <Controller
                name="RAILS_INBOUND_EMAIL_SERVICE"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => handleServiceChange(v as InboundService)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relay">{t('inboundEmail.provider.relay')}</SelectItem>
                      <SelectItem value="mailgun">{t('inboundEmail.provider.mailgun')}</SelectItem>
                      <SelectItem value="mandrill">{t('inboundEmail.provider.mandrill')}</SelectItem>
                      <SelectItem value="sendgrid">{t('inboundEmail.provider.sendgrid')}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Relay fields */}
            {service === 'relay' && (
              renderSecretField('RAILS_INBOUND_EMAIL_PASSWORD_SECRET', t('inboundEmail.fields.password'), t('inboundEmail.placeholders.password'))
            )}

            {/* Mailgun fields */}
            {service === 'mailgun' && (
              renderSecretField('MAILGUN_SIGNING_SECRET', t('inboundEmail.fields.mailgunSigningKey'), t('inboundEmail.placeholders.mailgunSigningKey'))
            )}

            {/* Mandrill fields */}
            {service === 'mandrill' && (
              renderSecretField('MANDRILL_API_SECRET', t('inboundEmail.fields.mandrillApiKey'), t('inboundEmail.placeholders.mandrillApiKey'))
            )}

            {/* SendGrid fields */}
            {service === 'sendgrid' && (
              renderSecretField('RAILS_INBOUND_EMAIL_PASSWORD_SECRET', t('inboundEmail.fields.password'), t('inboundEmail.placeholders.password'))
            )}

            {/* Domain — always visible */}
            <div className="space-y-2">
              <Label htmlFor="MAILER_INBOUND_EMAIL_DOMAIN">{t('inboundEmail.fields.domain')}</Label>
              <Input
                id="MAILER_INBOUND_EMAIL_DOMAIN"
                placeholder={t('inboundEmail.placeholders.domain')}
                {...register('MAILER_INBOUND_EMAIL_DOMAIN' as InboundEmailFieldKey)}
              />
              {'MAILER_INBOUND_EMAIL_DOMAIN' in errors && errors.MAILER_INBOUND_EMAIL_DOMAIN && (
                <p className="text-xs text-destructive">{errors.MAILER_INBOUND_EMAIL_DOMAIN.message}</p>
              )}
            </div>

            {/* Actions */}
            <div className="pt-2 flex gap-3">
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {saving ? t('inboundEmail.saving') : t('inboundEmail.save')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
