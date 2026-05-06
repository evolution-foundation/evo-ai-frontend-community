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

type StorageServiceType = 'local' | 'amazon' | 's3_compatible';

// --- Schema factory with i18n ---

function createStorageSchema(t: (key: string) => string) {
  const cloudFields = {
    STORAGE_BUCKET_NAME: z.string().min(1, t('storage.validation.bucketRequired')),
    STORAGE_ACCESS_KEY_ID: z.string().min(1, t('storage.validation.accessKeyRequired')),
    STORAGE_ACCESS_SECRET: z.string().optional().nullable(),
    STORAGE_REGION: z.string().min(1, t('storage.validation.regionRequired')),
  };

  const localSchema = z.object({
    ACTIVE_STORAGE_SERVICE: z.literal('local'),
  });

  const amazonSchema = z.object({
    ACTIVE_STORAGE_SERVICE: z.literal('amazon'),
    ...cloudFields,
    STORAGE_ENDPOINT: z.string().optional(),
  });

  const s3CompatibleSchema = z.object({
    ACTIVE_STORAGE_SERVICE: z.literal('s3_compatible'),
    ...cloudFields,
    STORAGE_ENDPOINT: z.string().min(1, t('storage.validation.endpointRequired')),
  });

  return z.discriminatedUnion('ACTIVE_STORAGE_SERVICE', [
    localSchema,
    amazonSchema,
    s3CompatibleSchema,
  ]);
}

type StorageFormData = z.infer<ReturnType<typeof createStorageSchema>>;

type StorageFieldKey =
  | 'ACTIVE_STORAGE_SERVICE'
  | 'STORAGE_BUCKET_NAME'
  | 'STORAGE_ACCESS_KEY_ID'
  | 'STORAGE_ACCESS_SECRET'
  | 'STORAGE_REGION'
  | 'STORAGE_ENDPOINT';

const LOCAL_DEFAULTS: StorageFormData = {
  ACTIVE_STORAGE_SERVICE: 'local',
};

const AMAZON_DEFAULTS = {
  ACTIVE_STORAGE_SERVICE: 'amazon' as const,
  STORAGE_BUCKET_NAME: '',
  STORAGE_ACCESS_KEY_ID: '',
  STORAGE_ACCESS_SECRET: null,
  STORAGE_REGION: '',
  STORAGE_ENDPOINT: '',
};

const S3_COMPATIBLE_DEFAULTS = {
  ACTIVE_STORAGE_SERVICE: 's3_compatible' as const,
  STORAGE_BUCKET_NAME: '',
  STORAGE_ACCESS_KEY_ID: '',
  STORAGE_ACCESS_SECRET: null,
  STORAGE_REGION: '',
  STORAGE_ENDPOINT: '',
};

const SECRET_FIELDS = ['STORAGE_ACCESS_SECRET'];

function isSecretMasked(value: unknown): boolean {
  return typeof value === 'string' && value.includes('••••');
}

function getDefaults(type: StorageServiceType): StorageFormData {
  switch (type) {
    case 'amazon': return AMAZON_DEFAULTS;
    case 's3_compatible': return S3_COMPATIBLE_DEFAULTS;
    default: return LOCAL_DEFAULTS;
  }
}

function buildFormValues(data: Record<string, unknown>, type: StorageServiceType): StorageFormData {
  const formValues: Record<string, unknown> = { ...getDefaults(type) };
  for (const [key, value] of Object.entries(data)) {
    if (SECRET_FIELDS.includes(key)) {
      formValues[key] = isSecretMasked(value) ? '' : (value ?? '');
    } else {
      formValues[key] = value ?? formValues[key] ?? '';
    }
  }
  formValues.ACTIVE_STORAGE_SERVICE = type;
  return formValues as StorageFormData;
}

export default function StorageConfig() {
  const { t } = useLanguage('adminSettings');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [secretModified, setSecretModified] = useState<Record<string, boolean>>({});
  const [secretConfigured, setSecretConfigured] = useState<Record<string, boolean>>({});

  const storageSchema = useMemo(() => createStorageSchema(t), [t]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<StorageFormData>({
    resolver: zodResolver(storageSchema),
    defaultValues: LOCAL_DEFAULTS,
  });

  const storageService = watch('ACTIVE_STORAGE_SERVICE');
  const isCloud = storageService !== 'local';

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
      const data = await adminConfigService.getConfig('storage');


      const type = (data.ACTIVE_STORAGE_SERVICE as StorageServiceType) || 'local';
      updateSecretStatus(data);
      reset(buildFormValues(data, type));
    } catch (error) {
      toast.error(t('storage.messages.loadError'));
    } finally {
      setLoading(false);
    }
  }, [reset, t]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleProviderChange = (newType: StorageServiceType) => {
    const currentValues = watch();
    const currentIsCloud = currentValues.ACTIVE_STORAGE_SERVICE !== 'local';
    const newIsCloud = newType !== 'local';

    if (currentIsCloud && newIsCloud) {
      // Preserve shared cloud fields when switching between cloud providers
      reset({
        ...currentValues,
        ACTIVE_STORAGE_SERVICE: newType,
      } as StorageFormData);
    } else {
      reset(getDefaults(newType));
    }
    setSecretModified({});
  };

  const onSubmit = async (formData: StorageFormData) => {
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

      const data = await adminConfigService.saveConfig('storage', payload as AdminConfigData);

      updateSecretStatus(data);
      reset(buildFormValues(data, storageService));

      toast.success(t('storage.messages.saveSuccess'));
    } catch (error) {
      const errorInfo = extractError(error);
      toast.error(t('storage.messages.saveError'), {
        description: errorInfo.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const result = await adminConfigService.testConnection('storage');
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(t('storage.testFailed'), { description: result.message });
      }
    } catch (error) {
      const errorInfo = extractError(error);
      toast.error(t('storage.testError'), { description: errorInfo.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSecretChange = (fieldName: string, value: string) => {
    setSecretModified((prev) => ({ ...prev, [fieldName]: value.length > 0 }));
  };

  const handleClearSecret = (fieldName: string) => {
    setValue(fieldName as StorageFieldKey, '');
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
              {t('storage.secretConfigured')}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-sidebar-foreground/50">
              <LockOpen className="h-3 w-3" />
              {t('storage.secretNotConfigured')}
            </span>
          )
        )}
      </div>
      <div className="relative">
        <Input
          id={fieldName}
          type="password"
          placeholder={placeholder}
          {...register(fieldName as StorageFieldKey, {
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => handleSecretChange(fieldName, e.target.value),
          })}
        />
        {secretConfigured[fieldName] && !secretModified[fieldName] && (
          <button
            type="button"
            onClick={() => handleClearSecret(fieldName)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-sidebar-accent text-sidebar-foreground/50 hover:text-sidebar-foreground"
            title={t('storage.clearSecret')}
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
        <h2 className="text-xl font-semibold text-sidebar-foreground">{t('storage.title')}</h2>
        <p className="text-sm text-sidebar-foreground/70 mt-1">{t('storage.description')}</p>
      </div>

      {/* Runtime-not-applied warning — see Linear EVO-1050. Until that ships,
          values saved here are persisted but the Rails apps continue reading
          ACTIVE_STORAGE_SERVICE / provider env vars at boot time. */}
      <div className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
        <strong className="font-semibold">{t('storage.envWarning.title')}</strong>{' '}
        {t('storage.envWarning.body')}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('storage.provider.label')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Provider selector */}
            <div className="space-y-2">
              <Controller
                name="ACTIVE_STORAGE_SERVICE"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => handleProviderChange(v as StorageServiceType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local">{t('storage.provider.local')}</SelectItem>
                      <SelectItem value="amazon">{t('storage.provider.amazon')}</SelectItem>
                      <SelectItem value="s3_compatible">{t('storage.provider.s3Compatible')}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Cloud storage fields */}
            {isCloud && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="STORAGE_BUCKET_NAME">{t('storage.fields.bucketName')}</Label>
                  <Input
                    id="STORAGE_BUCKET_NAME"
                    placeholder={t('storage.placeholders.bucketName')}
                    {...register('STORAGE_BUCKET_NAME' as StorageFieldKey)}
                  />
                  {(errors as Record<string, { message?: string }>).STORAGE_BUCKET_NAME && (
                    <p className="text-xs text-destructive">{(errors as Record<string, { message?: string }>).STORAGE_BUCKET_NAME?.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="STORAGE_ACCESS_KEY_ID">{t('storage.fields.accessKeyId')}</Label>
                    <Input
                      id="STORAGE_ACCESS_KEY_ID"
                      placeholder={t('storage.placeholders.accessKeyId')}
                      {...register('STORAGE_ACCESS_KEY_ID' as StorageFieldKey)}
                    />
                    {(errors as Record<string, { message?: string }>).STORAGE_ACCESS_KEY_ID && (
                      <p className="text-xs text-destructive">{(errors as Record<string, { message?: string }>).STORAGE_ACCESS_KEY_ID?.message}</p>
                    )}
                  </div>
                  {renderSecretField('STORAGE_ACCESS_SECRET', t('storage.fields.accessSecret'), t('storage.placeholders.accessSecret'))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="STORAGE_REGION">{t('storage.fields.region')}</Label>
                    <Input
                      id="STORAGE_REGION"
                      placeholder={t('storage.placeholders.region')}
                      {...register('STORAGE_REGION' as StorageFieldKey)}
                    />
                    {(errors as Record<string, { message?: string }>).STORAGE_REGION && (
                      <p className="text-xs text-destructive">{(errors as Record<string, { message?: string }>).STORAGE_REGION?.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="STORAGE_ENDPOINT">{t('storage.fields.endpoint')}</Label>
                    <Input
                      id="STORAGE_ENDPOINT"
                      placeholder={t('storage.placeholders.endpoint')}
                      {...register('STORAGE_ENDPOINT' as StorageFieldKey)}
                    />
                    {storageService === 's3_compatible' && (errors as Record<string, { message?: string }>).STORAGE_ENDPOINT && (
                      <p className="text-xs text-destructive">{(errors as Record<string, { message?: string }>).STORAGE_ENDPOINT?.message}</p>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Actions */}
            <div className="pt-2 flex gap-3">
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {saving ? t('storage.saving') : t('storage.save')}
              </Button>
              {isCloud && (
                <Button type="button" variant="outline" onClick={handleTestConnection} disabled={testing}>
                  {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {testing ? t('storage.testing') : t('storage.testConnection')}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
