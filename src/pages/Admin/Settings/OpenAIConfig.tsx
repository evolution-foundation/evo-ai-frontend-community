import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
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
  Switch,
  Textarea,
} from '@evoapi/design-system';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { AI_CREDENTIALS_ROUTE } from '@/components/ApiKeysModal';
import { adminConfigService } from '@/services/admin/adminConfigService';
import { extractError } from '@/utils/apiHelpers';
import type { AdminConfigData } from '@/types/admin/adminConfig';

// --- Schema factory with i18n ---

function createOpenAISchema(_t: (key: string) => string) {
  return z.object({
    OPENAI_API_URL: z.string().optional(),
      OPENAI_MODEL: z.string().optional(),
    OPENAI_ENABLE_AUDIO_TRANSCRIPTION: z.union([z.boolean(), z.string()]).optional(),
    OPENAI_PROMPT_REPLY: z.string().optional(),
    OPENAI_PROMPT_SUMMARY: z.string().optional(),
    OPENAI_PROMPT_REPHRASE: z.string().optional(),
    OPENAI_PROMPT_FIX_GRAMMAR: z.string().optional(),
    OPENAI_PROMPT_SHORTEN: z.string().optional(),
    OPENAI_PROMPT_EXPAND: z.string().optional(),
    OPENAI_PROMPT_FRIENDLY: z.string().optional(),
    OPENAI_PROMPT_FORMAL: z.string().optional(),
    OPENAI_PROMPT_SIMPLIFY: z.string().optional(),
  });
}

type OpenAIFormData = z.infer<ReturnType<typeof createOpenAISchema>>;

const DEFAULTS: OpenAIFormData = {
  OPENAI_API_URL: '',
  OPENAI_MODEL: '',
  OPENAI_ENABLE_AUDIO_TRANSCRIPTION: false,
  OPENAI_PROMPT_REPLY: '',
  OPENAI_PROMPT_SUMMARY: '',
  OPENAI_PROMPT_REPHRASE: '',
  OPENAI_PROMPT_FIX_GRAMMAR: '',
  OPENAI_PROMPT_SHORTEN: '',
  OPENAI_PROMPT_EXPAND: '',
  OPENAI_PROMPT_FRIENDLY: '',
  OPENAI_PROMPT_FORMAL: '',
  OPENAI_PROMPT_SIMPLIFY: '',
};

// The AI credential moved to Settings > AI Credentials (EVO-2250). With no
// secret left on this screen, the masking machinery it required went with it —
// URL, model, toggle and the nine prompts are plain config.

const PROMPT_FIELDS = [
  'OPENAI_PROMPT_REPLY',
  'OPENAI_PROMPT_SUMMARY',
  'OPENAI_PROMPT_REPHRASE',
  'OPENAI_PROMPT_FIX_GRAMMAR',
  'OPENAI_PROMPT_SHORTEN',
  'OPENAI_PROMPT_EXPAND',
  'OPENAI_PROMPT_FRIENDLY',
  'OPENAI_PROMPT_FORMAL',
  'OPENAI_PROMPT_SIMPLIFY',
] as const;

function toBool(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value === 'true';
  return false;
}

function buildFormValues(data: Record<string, unknown>): OpenAIFormData {
  const formValues: Record<string, unknown> = { ...DEFAULTS };
  for (const [key, value] of Object.entries(data)) {
    formValues[key] = value ?? formValues[key] ?? '';
  }
  return formValues as OpenAIFormData;
}

export default function OpenAIConfig() {
  const { t } = useLanguage('adminSettings');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const openaiSchema = useMemo(() => createOpenAISchema(t), [t]);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<OpenAIFormData>({
    resolver: zodResolver(openaiSchema),
    defaultValues: DEFAULTS,
  });

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminConfigService.getConfig('openai');
      reset(buildFormValues(data));
    } catch (error) {
      toast.error(t('openai.messages.loadError'));
    } finally {
      setLoading(false);
    }
  }, [reset, t]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const onSubmit = async (formData: OpenAIFormData) => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { ...formData };

      const data = await adminConfigService.saveConfig('openai', payload as AdminConfigData);
      reset(buildFormValues(data));

      toast.success(t('openai.messages.saveSuccess'));
    } catch (error) {
      const errorInfo = extractError(error);
      toast.error(t('openai.messages.saveError'), {
        description: errorInfo.message,
      });
    } finally {
      setSaving(false);
    }
  };


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
        <h2 className="text-xl font-semibold text-sidebar-foreground">{t('openai.title')}</h2>
        <p className="text-sm text-sidebar-foreground/70 mt-1">{t('openai.description')}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Connection Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('openai.connection.cardTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="OPENAI_API_URL">{t('openai.connection.fields.apiUrl')}</Label>
              <Input
                id="OPENAI_API_URL"
                placeholder={t('openai.connection.placeholders.apiUrl')}
                {...register('OPENAI_API_URL')}
              />
              {errors.OPENAI_API_URL && (
                <p className="text-xs text-destructive">{errors.OPENAI_API_URL.message}</p>
              )}
            </div>

            <div className="rounded-lg border p-3 space-y-1">
              <p className="text-sm">{t('openai.connection.credentialMoved')}</p>
              <Button
                type="button"
                variant="link"
                className="px-0 h-auto text-sm"
                onClick={() => navigate(AI_CREDENTIALS_ROUTE)}
              >
                {t('openai.connection.goToCredentials')}
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="OPENAI_MODEL">{t('openai.connection.fields.model')}</Label>
              <Input
                id="OPENAI_MODEL"
                placeholder={t('openai.connection.placeholders.model')}
                {...register('OPENAI_MODEL')}
              />
              {errors.OPENAI_MODEL && (
                <p className="text-xs text-destructive">{errors.OPENAI_MODEL.message}</p>
              )}
            </div>

            <Controller
              name="OPENAI_ENABLE_AUDIO_TRANSCRIPTION"
              control={control}
              render={({ field }) => (
                <div className="flex items-center justify-between">
                  <Label htmlFor="OPENAI_ENABLE_AUDIO_TRANSCRIPTION">
                    {t('openai.connection.fields.audioTranscription')}
                  </Label>
                  <Switch
                    id="OPENAI_ENABLE_AUDIO_TRANSCRIPTION"
                    checked={toBool(field.value)}
                    onCheckedChange={field.onChange}
                  />
                </div>
              )}
            />
          </CardContent>
        </Card>

        {/* AI Prompts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('openai.prompts.cardTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {PROMPT_FIELDS.map((fieldName) => (
              <div key={fieldName} className="space-y-2">
                <Label htmlFor={fieldName}>{t(`openai.prompts.fields.${fieldName}`)}</Label>
                <Textarea
                  id={fieldName}
                  rows={4}
                  placeholder={t(`openai.prompts.placeholders.${fieldName}`)}
                  {...register(fieldName)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="pt-2">
          <Button type="submit" disabled={saving} aria-label={t('openai.save')}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {saving ? t('openai.saving') : t('openai.save')}
          </Button>
        </div>
      </form>
    </div>
  );
}
