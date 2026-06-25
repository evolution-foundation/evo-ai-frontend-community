import { useState, useEffect, useCallback } from 'react';
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
import { INTEGRATIONS, type IntegrationDef } from './integrationsCatalog';

// --- Schema ---

const integrationSchema = z.object({
  clientId: z.string().optional(),
  clientSecret: z.string().optional().nullable(),
});

type IntegrationFormData = z.infer<typeof integrationSchema>;

const DEFAULTS: IntegrationFormData = {
  clientId: '',
  clientSecret: null,
};

function isSecretMasked(value: unknown): boolean {
  return typeof value === 'string' && value.includes('••••');
}

function buildFormValues(data: Record<string, unknown>, def: IntegrationDef): IntegrationFormData {
  const secretValue = data[def.clientSecretKey];
  return {
    clientId: (data[def.clientIdKey] as string) ?? '',
    clientSecret: isSecretMasked(secretValue) ? '' : ((secretValue as string) ?? ''),
  };
}

// --- SecretField subcomponent ---

interface SecretFieldProps {
  fieldName: 'clientSecret';
  label: string;
  placeholder: string;
  register: UseFormRegister<IntegrationFormData>;
  secretModified: boolean;
  onSecretModifiedChange: (modified: boolean) => void;
  secretConfigured: boolean;
  onClear: () => void;
  sectionKey: string;
  t: (key: string) => string;
}

function SecretField({
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
}: SecretFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={`${sectionKey}-${fieldName}`}>{label}</Label>
        {!secretModified && (
          secretConfigured ? (
            <span className="inline-flex items-center gap-1 text-xs text-green-600">
              <Lock className="h-3 w-3" />
              {t('integrations.secretConfigured')}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-sidebar-foreground/50">
              <LockOpen className="h-3 w-3" />
              {t('integrations.secretNotConfigured')}
            </span>
          )
        )}
      </div>
      <div className="relative">
        <Input
          id={`${sectionKey}-${fieldName}`}
          type="password"
          autoComplete="off"
          placeholder={placeholder}
          {...register(fieldName, {
            onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
              onSecretModifiedChange(e.target.value.length > 0),
          })}
        />
        {secretConfigured && !secretModified && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-sidebar-accent text-sidebar-foreground/50 hover:text-sidebar-foreground"
            title={t('integrations.clearSecret')}
            aria-label={t('integrations.clearSecret')}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// --- Integration Section (self-contained: owns its own form + state) ---
//
// One `useForm` lives here, per rendered section. This is what lets the page
// scale to any number of INTEGRATIONS without N hand-written useForm calls in
// the parent (which would violate the Rules of Hooks if generated dynamically).

interface IntegrationSectionProps {
  def: IntegrationDef;
  initialData: AdminConfigData;
  t: (key: string) => string;
}

function IntegrationSection({ def, initialData, t }: IntegrationSectionProps) {
  const form = useForm<IntegrationFormData>({
    resolver: zodResolver(integrationSchema),
    defaultValues: DEFAULTS,
  });
  const [saving, setSaving] = useState(false);
  const [secretModified, setSecretModified] = useState(false);
  const [secretConfigured, setSecretConfigured] = useState(false);

  // Re-seed the form whenever the parent (re)loads config from the backend.
  useEffect(() => {
    const secretValue = initialData[def.clientSecretKey];
    setSecretConfigured(isSecretMasked(secretValue));
    setSecretModified(false);
    form.reset(buildFormValues(initialData, def));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- form is a stable useForm instance
  }, [initialData, def]);

  const onSave = async (formData: IntegrationFormData) => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        [def.clientIdKey]: formData.clientId,
      };

      if (!secretModified || formData.clientSecret === '') {
        payload[def.clientSecretKey] = null;
      } else {
        payload[def.clientSecretKey] = formData.clientSecret;
      }

      const data = await adminConfigService.saveConfig(def.configType, payload as AdminConfigData);
      const secretValue = data[def.clientSecretKey];
      setSecretConfigured(isSecretMasked(secretValue));
      setSecretModified(false);
      form.reset(buildFormValues(data, def));
      toast.success(t(`integrations.${def.key}.saveSuccess`));
    } catch (error) {
      const errorInfo = extractError(error);
      toast.error(t(`integrations.${def.key}.saveError`), {
        description: errorInfo.message,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base">{t(`integrations.${def.key}.cardTitle`)}</CardTitle>
      </CardHeader>
      <CardContent>
        <form data-testid={`${def.key}-form`} onSubmit={form.handleSubmit(onSave)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor={`${def.key}-clientId`}>{t(`integrations.${def.key}.fields.clientId`)}</Label>
            <Input
              id={`${def.key}-clientId`}
              placeholder={t(`integrations.${def.key}.placeholders.clientId`)}
              {...form.register('clientId')}
            />
          </div>

          <SecretField
            fieldName="clientSecret"
            label={t(`integrations.${def.key}.fields.clientSecret`)}
            placeholder={t(`integrations.${def.key}.placeholders.clientSecret`)}
            register={form.register}
            secretModified={secretModified}
            onSecretModifiedChange={setSecretModified}
            secretConfigured={secretConfigured}
            onClear={() => {
              form.setValue('clientSecret', '');
              setSecretModified(true);
            }}
            sectionKey={def.key}
            t={t}
          />

          <div className="pt-2">
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? t('integrations.saving') : t('integrations.save')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// --- Main component ---

export default function IntegrationsConfig() {
  const { t } = useLanguage('adminSettings');
  const [loading, setLoading] = useState(true);
  const [configs, setConfigs] = useState<Record<string, AdminConfigData>>({});

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.all(
        INTEGRATIONS.map((def) => adminConfigService.getConfig(def.configType)),
      );
      const next: Record<string, AdminConfigData> = {};
      INTEGRATIONS.forEach((def, i) => {
        next[def.key] = results[i];
      });
      setConfigs(next);
    } catch {
      toast.error(t('integrations.messages.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

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
        <h2 className="text-xl font-semibold text-sidebar-foreground">{t('integrations.title')}</h2>
        <p className="text-sm text-sidebar-foreground/70 mt-1">{t('integrations.description')}</p>
      </div>

      {INTEGRATIONS.map((def) => {
        const initialData = configs[def.key];
        if (!initialData) return null;
        return (
          <IntegrationSection
            key={def.key}
            def={def}
            initialData={initialData}
            t={t}
          />
        );
      })}
    </div>
  );
}
