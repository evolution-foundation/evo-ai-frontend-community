import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
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
import { Loader2, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { adminConfigService } from '@/services/admin/adminConfigService';
import type { AdminConfigData } from '@/types/admin/adminConfig';
import { useGlobalConfig } from '@/contexts/GlobalConfigContext';
import { extractError } from '@/utils/apiHelpers';
import {
  evolutionHubService,
  type HubPlan,
  type MetaAppOptions,
  type HubChannel,
} from '@/services/integrations';

const CONFIG_TYPE = 'evolution_hub';
const MASKED = '••••';

function errorMessage(e: unknown, fallback: string): string {
  const info = extractError(e);
  return info?.message || fallback;
}

function generateSecret(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

const schema = z.object({
  EVOLUTION_HUB_ENABLED: z.union([z.string(), z.boolean()]).optional(),
  EVOLUTION_HUB_URL: z.string().url('URL inválida').or(z.literal('')),
  EVOLUTION_HUB_API_KEY: z.string().optional().nullable(),
  EVOLUTION_HUB_WEBHOOK_SECRET: z.string().optional().nullable(),
});

type FormData = z.infer<typeof schema>;

const DEFAULTS: FormData = {
  EVOLUTION_HUB_ENABLED: 'false',
  EVOLUTION_HUB_URL: '',
  EVOLUTION_HUB_API_KEY: null,
  EVOLUTION_HUB_WEBHOOK_SECRET: null,
};

function isMasked(v: unknown): boolean {
  return typeof v === 'string' && v.includes(MASKED);
}

export default function EvolutionHubConfig() {
  const { t } = useLanguage('adminSettings');
  const { refresh } = useGlobalConfig() as unknown as { refresh?: () => Promise<void> };
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [webhookSecretConfigured, setWebhookSecretConfigured] = useState(false);
  const [apiKeyTouched, setApiKeyTouched] = useState(false);
  const [secretTouched, setSecretTouched] = useState(false);

  // "Configuração detectada no Hub": preview de plano + Meta Apps +
  // canais que o admin tem no Evolution Hub. Carregado on-demand
  // (clique no botão "Atualizar") porque envolve 3 chamadas serial-ish
  // que podem demorar se o Hub estiver lento, e a tela já abre rápida.
  const [hubPreview, setHubPreview] = useState<{
    plan: HubPlan | null;
    options: MetaAppOptions | null;
    channels: HubChannel[];
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULTS,
  });

  const enabledValue = watch('EVOLUTION_HUB_ENABLED');
  const enabledBool =
    enabledValue === true || enabledValue === 'true';

  useEffect(() => {
    (async () => {
      try {
        const data = await adminConfigService.getConfig(CONFIG_TYPE);
        const cfg = (data ?? {}) as Record<string, unknown>;
        setApiKeyConfigured(isMasked(cfg.EVOLUTION_HUB_API_KEY));
        setWebhookSecretConfigured(isMasked(cfg.EVOLUTION_HUB_WEBHOOK_SECRET));
        reset({
          EVOLUTION_HUB_ENABLED: String(cfg.EVOLUTION_HUB_ENABLED ?? 'false'),
          EVOLUTION_HUB_URL: (cfg.EVOLUTION_HUB_URL as string) ?? '',
          EVOLUTION_HUB_API_KEY: null,
          EVOLUTION_HUB_WEBHOOK_SECRET: null,
        });
      } catch (e) {
        toast.error(errorMessage(e, t('evolutionHub.messages.loadError')));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (values: FormData) => {
    setSaving(true);
    try {
      const payload: AdminConfigData = {
        EVOLUTION_HUB_ENABLED: String(values.EVOLUTION_HUB_ENABLED),
        EVOLUTION_HUB_URL: values.EVOLUTION_HUB_URL || '',
      };
      // Preserve existing secrets when the field wasn't touched.
      if (apiKeyTouched) {
        payload.EVOLUTION_HUB_API_KEY = values.EVOLUTION_HUB_API_KEY ?? '';
      }
      if (secretTouched) {
        payload.EVOLUTION_HUB_WEBHOOK_SECRET = values.EVOLUTION_HUB_WEBHOOK_SECRET ?? '';
      }
      await adminConfigService.saveConfig(CONFIG_TYPE, payload);
      toast.success(t('evolutionHub.messages.saved'));
      if (refresh) await refresh();
      setApiKeyTouched(false);
      setSecretTouched(false);
      if (payload.EVOLUTION_HUB_API_KEY) setApiKeyConfigured(true);
      if (payload.EVOLUTION_HUB_WEBHOOK_SECRET) setWebhookSecretConfigured(true);
    } catch (e) {
      toast.error(errorMessage(e, t('evolutionHub.messages.saveError')));
    } finally {
      setSaving(false);
    }
  };

  const onTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await adminConfigService.testConnection(CONFIG_TYPE);
      setTestResult({
        ok: Boolean(result?.success),
        message: String(result?.message ?? t('evolutionHub.messages.testUnknown')),
      });
    } catch (e) {
      setTestResult({ ok: false, message: errorMessage(e, t('evolutionHub.messages.testError')) });
    } finally {
      setTesting(false);
    }
  };

  // Carrega "configuração detectada" (plano + Meta Apps + canais) do Hub.
  // Promise.allSettled pra que uma falha (ex.: endpoint de channels)
  // não impeça mostrar plano/options. UI mostra o que conseguiu obter
  // e error inline pra que faltou.
  const loadHubPreview = async () => {
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const [planRes, optionsRes, channelsRes] = await Promise.allSettled([
        evolutionHubService.getPlan(),
        evolutionHubService.getMetaAppOptions(),
        evolutionHubService.listChannels(),
      ]);
      setHubPreview({
        plan: planRes.status === 'fulfilled' ? planRes.value : null,
        options: optionsRes.status === 'fulfilled' ? optionsRes.value : null,
        channels: channelsRes.status === 'fulfilled' ? channelsRes.value : [],
      });
      const fails = [planRes, optionsRes, channelsRes].filter((r) => r.status === 'rejected');
      if (fails.length === 3) {
        setPreviewError(
          errorMessage((fails[0] as PromiseRejectedResult).reason, 'Falha ao consultar Evolution Hub'),
        );
      } else if (fails.length > 0) {
        setPreviewError(
          `Algumas informações não puderam ser carregadas (${fails.length} de 3). Verifique a API URL e o token.`,
        );
      }
    } finally {
      setPreviewLoading(false);
    }
  };

  // Auto-load do preview quando a integração já está configurada e ativa.
  // Carrega só uma vez na entrada da tela — admin clica "Atualizar"
  // pra refetch depois.
  useEffect(() => {
    if (!loading && enabledBool && apiKeyConfigured && !hubPreview && !previewLoading) {
      loadHubPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, enabledBool, apiKeyConfigured]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-3xl">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{t('evolutionHub.title')}</h1>
        <p className="text-muted-foreground">{t('evolutionHub.description')}</p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('evolutionHub.sections.connection')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between border rounded-md p-3">
              <div>
                <Label htmlFor="enabled" className="text-base">
                  {t('evolutionHub.fields.enabled')}
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('evolutionHub.fields.enabledHelp')}
                </p>
              </div>
              <input
                id="enabled"
                type="checkbox"
                checked={enabledBool}
                onChange={(e) => {
                  const next = e.target.checked;
                  setValue('EVOLUTION_HUB_ENABLED', next ? 'true' : 'false');
                  if (next && !webhookSecretConfigured && !secretTouched) {
                    setValue('EVOLUTION_HUB_WEBHOOK_SECRET', generateSecret());
                    setSecretTouched(true);
                  }
                }}
                className="h-5 w-5"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">{t('evolutionHub.fields.url')}</Label>
              <Input
                id="url"
                placeholder="https://api.evohub.ai"
                {...register('EVOLUTION_HUB_URL')}
              />
              {errors.EVOLUTION_HUB_URL && (
                <p className="text-sm text-destructive">{errors.EVOLUTION_HUB_URL.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey">
                {t('evolutionHub.fields.apiKey')}
                {apiKeyConfigured && !apiKeyTouched && (
                  <span className="ml-2 text-xs text-muted-foreground">({t('evolutionHub.fields.secretSet')})</span>
                )}
              </Label>
              <Input
                id="apiKey"
                type="password"
                placeholder={apiKeyConfigured ? MASKED.repeat(4) : 'evh_pk_...'}
                {...register('EVOLUTION_HUB_API_KEY', {
                  onChange: () => setApiKeyTouched(true),
                })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhookSecret">
                {t('evolutionHub.fields.webhookSecret')}
                {webhookSecretConfigured && !secretTouched && (
                  <span className="ml-2 text-xs text-muted-foreground">({t('evolutionHub.fields.secretSet')})</span>
                )}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="webhookSecret"
                  type="password"
                  placeholder={webhookSecretConfigured ? MASKED.repeat(4) : t('evolutionHub.fields.webhookSecretPlaceholder')}
                  {...register('EVOLUTION_HUB_WEBHOOK_SECRET', {
                    onChange: () => setSecretTouched(true),
                  })}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setValue('EVOLUTION_HUB_WEBHOOK_SECRET', generateSecret());
                    setSecretTouched(true);
                  }}
                  title={t('evolutionHub.actions.generateSecret')}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('evolutionHub.fields.webhookSecretHelp')}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {t('evolutionHub.actions.save')}
          </Button>

          <Button type="button" variant="outline" onClick={onTest} disabled={testing}>
            {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {t('evolutionHub.actions.test')}
          </Button>
        </div>

        {testResult && (
          <div
            className={`flex items-start gap-2 rounded-md border p-3 text-sm ${
              testResult.ok ? 'border-green-500/30 bg-green-500/10' : 'border-destructive/30 bg-destructive/10'
            }`}
          >
            {testResult.ok ? (
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}
      </form>

      {/* Configuração detectada no Hub — só renderiza quando integração
          está habilitada E API key salva. Mostra plano + Meta Apps +
          canais que o admin tem do outro lado pra confirmar que a
          conexão está OK antes de criar inboxes. */}
      {enabledBool && apiKeyConfigured && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Configuração detectada no Evolution Hub</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadHubPreview}
              disabled={previewLoading}
            >
              {previewLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2">Atualizar</span>
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {previewError && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                <span>{previewError}</span>
              </div>
            )}

            {/* Plano */}
            <section>
              <h3 className="text-sm font-semibold mb-2">Plano atual</h3>
              {hubPreview?.plan ? (
                <div className="rounded-md border p-3 text-sm space-y-1">
                  <div>
                    <span className="font-medium">{hubPreview.plan.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">({hubPreview.plan.slug})</span>
                  </div>
                  {hubPreview.plan.description && (
                    <p className="text-xs text-muted-foreground">{hubPreview.plan.description}</p>
                  )}
                  <div className="text-xs text-muted-foreground pt-2">
                    Meta App compartilhada: <strong>{hubPreview.plan.allow_shared_meta_app ? 'sim' : 'não'}</strong>{' '}
                    · Meta App própria (BYO): <strong>{hubPreview.plan.allow_own_meta_app ? 'sim' : 'não'}</strong>{' '}
                    · Total de canais: <strong>{hubPreview.plan.max_channels_total ?? 'ilimitado'}</strong>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {previewLoading ? 'Carregando…' : 'Sem dados.'}
                </p>
              )}
            </section>

            {/* Meta Apps disponíveis */}
            <section>
              <h3 className="text-sm font-semibold mb-2">Meta Apps disponíveis</h3>
              {hubPreview?.options ? (
                <ul className="space-y-2">
                  {hubPreview.options.allowed_modes.includes('shared') && (
                    <li className="rounded-md border p-3 text-sm">
                      <span className="font-medium">Meta App da Evolution (Cloud)</span>
                      <span className="ml-2 text-xs text-muted-foreground">compartilhada</span>
                    </li>
                  )}
                  {hubPreview.options.byo_credentials.map((c) => (
                    <li key={c.id} className="rounded-md border p-3 text-sm">
                      <span className="font-medium">{c.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">própria (BYO) · {c.app_id}</span>
                    </li>
                  ))}
                  {hubPreview.options.allowed_modes.length === 0 && (
                    <li className="text-sm text-muted-foreground">
                      Nenhuma Meta App disponível. Cadastre uma no Evolution Hub para começar a criar canais.
                    </li>
                  )}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {previewLoading ? 'Carregando…' : 'Sem dados.'}
                </p>
              )}
            </section>

            {/* Canais já existentes */}
            <section>
              <h3 className="text-sm font-semibold mb-2">
                Canais já criados no Hub{' '}
                {hubPreview && (
                  <span className="text-xs text-muted-foreground font-normal">
                    ({hubPreview.channels.length})
                  </span>
                )}
              </h3>
              {hubPreview && hubPreview.channels.length > 0 ? (
                <ul className="space-y-2">
                  {hubPreview.channels.slice(0, 10).map((ch) => (
                    <li key={ch.id} className="rounded-md border p-3 text-sm flex items-center justify-between">
                      <div>
                        <span className="text-xs font-mono uppercase text-muted-foreground mr-2">[{ch.type}]</span>
                        <span className="font-medium">{ch.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{ch.status}</span>
                    </li>
                  ))}
                  {hubPreview.channels.length > 10 && (
                    <li className="text-xs text-muted-foreground text-center">
                      + {hubPreview.channels.length - 10} canais
                    </li>
                  )}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {previewLoading ? 'Carregando…' : 'Nenhum canal criado ainda.'}
                </p>
              )}
            </section>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
