import { useState, useEffect, useCallback, useMemo } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@evoapi/design-system';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { adminConfigService } from '@/services/admin/adminConfigService';
import { extractError } from '@/utils/apiHelpers';
import type { AdminConfigData } from '@/types/admin/adminConfig';
import { listApiKeys } from '@/services/agents';
import { isChatCompletionsCompatible, isOpenAICompatible } from '@/constants/aiProviders';
import type { ApiKey } from '@/types/agents';

const AUTOMATIC_CREDENTIAL = 'automatic';

// inbox_assist and memory_compression build chat-completions requests, so any
// chat-completions-compatible provider can serve them; the other consumers
// (audio transcription, knowledge embedding) build OpenAI-shaped
// embeddings/transcription requests and need the narrower OpenAI-compatible
// set. Mirrors the same distinction in Ai::ConsumerCompatibility.
const CHAT_CONSUMERS = new Set(['inbox_assist', 'memory_compression']);

// --- Schema factory with i18n ---

function createOpenAISchema(_t: (key: string) => string) {
  return z.object({
    OPENAI_API_URL: z.string().optional(),
      OPENAI_MODEL: z.string().optional(),
    OPENAI_ENABLE_AUDIO_TRANSCRIPTION: z.union([z.boolean(), z.string()]).optional(),
    OPENAI_AUDIO_TRANSCRIPTION_MODEL: z.string().optional(),
    KNOWLEDGE_EMBEDDING_MODEL: z.string().optional(),
    MEMORY_COMPRESSION_MODEL: z.string().optional(),
    INBOX_ASSIST_CREDENTIAL_ID: z.string().optional(),
    AUDIO_TRANSCRIPTION_CREDENTIAL_ID: z.string().optional(),
    KNOWLEDGE_EMBEDDING_CREDENTIAL_ID: z.string().optional(),
    MEMORY_COMPRESSION_CREDENTIAL_ID: z.string().optional(),
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
  OPENAI_AUDIO_TRANSCRIPTION_MODEL: '',
  KNOWLEDGE_EMBEDDING_MODEL: '',
  MEMORY_COMPRESSION_MODEL: '',
  INBOX_ASSIST_CREDENTIAL_ID: '',
  AUDIO_TRANSCRIPTION_CREDENTIAL_ID: '',
  KNOWLEDGE_EMBEDDING_CREDENTIAL_ID: '',
  MEMORY_COMPRESSION_CREDENTIAL_ID: '',
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [credentials, setCredentials] = useState<ApiKey[]>([]);
  const [credentialsError, setCredentialsError] = useState(false);

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

  const loadCredentials = useCallback(async () => {
    try {
      const keys = await listApiKeys(1, 100, { active: true });
      setCredentials(keys);
      setCredentialsError(false);
    } catch (error) {
      // Non-fatal to the rest of the page — the dropdowns still work, just
      // with only "Automatic" available — but this must not fail silently:
      // an admin staring at empty dropdowns with real credentials configured
      // needs to know this is a fetch error, not "no credentials exist."
      console.error('Failed to load credentials for the AI feature pickers:', error);
      setCredentials([]);
      setCredentialsError(true);
    }
  }, []);

  useEffect(() => {
    loadConfig();
    loadCredentials();
  }, [loadConfig, loadCredentials]);

  const eligibleCredentials = (consumerKey: string) =>
    credentials.filter(c => {
      const providerOk = CHAT_CONSUMERS.has(consumerKey)
        ? (c.chat_completions_compatible ?? isChatCompletionsCompatible(c.provider))
        : (c.openai_compatible ?? isOpenAICompatible(c.provider));
      const restrictionOk = !c.allowed_consumers?.length || c.allowed_consumers.includes(consumerKey);
      return providerOk && restrictionOk;
    });

  const modelOverrideField = (
    fieldName: 'KNOWLEDGE_EMBEDDING_MODEL' | 'MEMORY_COMPRESSION_MODEL' | 'OPENAI_AUDIO_TRANSCRIPTION_MODEL',
    id: string,
    labelKey: string,
    hintKey: string,
    placeholder: string,
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{t(labelKey)}</Label>
      <Input id={id} placeholder={placeholder} {...register(fieldName)} />
      <p className="text-xs text-muted-foreground">{t(hintKey)}</p>
    </div>
  );

  const credentialSelectField = (
    fieldName:
      | 'INBOX_ASSIST_CREDENTIAL_ID'
      | 'AUDIO_TRANSCRIPTION_CREDENTIAL_ID'
      | 'KNOWLEDGE_EMBEDDING_CREDENTIAL_ID'
      | 'MEMORY_COMPRESSION_CREDENTIAL_ID',
    consumerKey: string,
    id: string,
    labelKey: string,
  ) => (
    <Controller
      name={fieldName}
      control={control}
      render={({ field }) => (
        <div className="space-y-1.5">
          <Label htmlFor={id}>{t(labelKey)}</Label>
          <Select
            value={field.value || AUTOMATIC_CREDENTIAL}
            onValueChange={value => field.onChange(value === AUTOMATIC_CREDENTIAL ? '' : value)}
          >
            <SelectTrigger id={id}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={AUTOMATIC_CREDENTIAL}>{t('openai.credentialSelect.automatic')}</SelectItem>
              {eligibleCredentials(consumerKey).map(cred => (
                <SelectItem key={cred.id} value={cred.id}>
                  {cred.name} ({cred.provider})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    />
  );

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
        {credentialsError && (
          <p className="text-sm text-destructive mt-2">{t('openai.credentialSelect.loadError')}</p>
        )}
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

            {credentialSelectField(
              'INBOX_ASSIST_CREDENTIAL_ID',
              'inbox_assist',
              'openai-inbox-assist-credential',
              'openai.credentialSelect.inboxAssist',
            )}

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

            {modelOverrideField(
              'OPENAI_AUDIO_TRANSCRIPTION_MODEL',
              'openai-audio-transcription-model',
              'openai.fields.audioTranscriptionModel',
              'openai.hints.audioTranscriptionModel',
              'whisper-1',
            )}
            {credentialSelectField(
              'AUDIO_TRANSCRIPTION_CREDENTIAL_ID',
              'audio_transcription',
              'openai-audio-transcription-credential',
              'openai.credentialSelect.audioTranscription',
            )}
          </CardContent>
        </Card>

        {/* AI Feature Models */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('openai.sections.aiFeatureModels')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {modelOverrideField(
              'KNOWLEDGE_EMBEDDING_MODEL',
              'openai-embedding-model',
              'openai.fields.knowledgeEmbeddingModel',
              'openai.hints.knowledgeEmbeddingModel',
              'text-embedding-3-small',
            )}
            {credentialSelectField(
              'KNOWLEDGE_EMBEDDING_CREDENTIAL_ID',
              'knowledge_embedding',
              'openai-embedding-credential',
              'openai.credentialSelect.knowledgeEmbedding',
            )}
            {modelOverrideField(
              'MEMORY_COMPRESSION_MODEL',
              'openai-memory-compression-model',
              'openai.fields.memoryCompressionModel',
              'openai.hints.memoryCompressionModel',
              'gpt-4o-mini',
            )}
            {credentialSelectField(
              'MEMORY_COMPRESSION_CREDENTIAL_ID',
              'memory_compression',
              'openai-memory-compression-credential',
              'openai.credentialSelect.memoryCompression',
            )}
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
