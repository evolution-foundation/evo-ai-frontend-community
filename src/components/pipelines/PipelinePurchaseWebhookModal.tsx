import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@evoapi/design-system';
import { Check, Copy, Link2, Loader2 } from 'lucide-react';
import {
  purchaseWebhooksService,
  type PurchaseWebhookProvidersPayload,
  type PurchaseWebhookUrlPayload,
} from '@/services/purchaseWebhooks/purchaseWebhooksService';
import type { Pipeline } from '@/types/analytics';

interface PipelinePurchaseWebhookModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipeline: Pipeline | null;
}

/**
 * "Webhook de compra" for a single pipeline — opened from the board's ⋮ menu,
 * next to the capture forms. The operator picks a configured payment platform
 * (credentials live on the integrations screen), the backend mints the signed
 * URL bound to THIS pipeline, and the modal hands it over with copy-to-clipboard.
 */
export default function PipelinePurchaseWebhookModal({
  open,
  onOpenChange,
  pipeline,
}: PipelinePurchaseWebhookModalProps) {
  const { t } = useLanguage('pipelines');

  const [payload, setPayload] = useState<PurchaseWebhookProvidersPayload | null>(null);
  const [provider, setProvider] = useState('');
  const [product, setProduct] = useState('');
  const [result, setResult] = useState<PurchaseWebhookUrlPayload | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const providerLabel = (slug: string) => slug.charAt(0).toUpperCase() + slug.slice(1);

  // The URL is signed over provider+pipeline+product; the moment any of them
  // moves, what is on screen belongs to a different destination. Drop it, or
  // the operator copies a URL the ingress will 401 with no visible reason.
  const clearResult = () => {
    setResult(null);
    setCopied(false);
  };

  const loadProviders = useCallback(async () => {
    try {
      const data = await purchaseWebhooksService.providers();
      setPayload(data);
      // A platform whose credential was removed between two openings must not
      // stay selected: it would look pickable and mint-ready, and only the
      // backend's 422 would say otherwise.
      setProvider((current) => {
        const stillUsable = data.providers.some((p) => p.provider === current && p.configured);
        return stillUsable ? current : (data.providers.find((p) => p.configured)?.provider ?? '');
      });
    } catch {
      toast.error(t('purchaseWebhook.loadError'));
      setPayload({ providers: [], destination_secret_configured: false });
      setProvider('');
    }
  }, [t]);

  useEffect(() => {
    if (!open) return;
    clearResult();
    void loadProviders();
  }, [open, loadProviders]);

  const selected = payload?.providers.find((p) => p.provider === provider);
  const destinationMissing =
    !!selected?.requires_destination_secret && payload !== null && !payload.destination_secret_configured;

  const generate = async () => {
    if (!pipeline?.id || !selected?.configured) return;
    setGenerating(true);
    setResult(null);
    try {
      setResult(
        await purchaseWebhooksService.mintUrl({
          provider,
          pipelineId: pipeline.id,
          product: product.trim() || undefined,
        }),
      );
    } catch (error: unknown) {
      // Distinct reasons per refusal (no stages, no credential, destination
      // secret missing) — the generic fallback leaves the operator stuck.
      const msg = (error as { response?: { data?: { error?: { message?: string } } } })?.response
        ?.data?.error?.message;
      toast.error(msg || t('purchaseWebhook.mintError'));
    } finally {
      setGenerating(false);
    }
  };

  const copyUrl = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.url);
      setCopied(true);
      toast.success(t('purchaseWebhook.copied'));
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Blocked clipboard (non-secure origin) silently did nothing; say so.
      toast.error(t('purchaseWebhook.copyError'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('purchaseWebhook.title')}</DialogTitle>
          <DialogDescription>
            {t('purchaseWebhook.subtitle', { pipeline: pipeline?.name ?? '' })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>{t('purchaseWebhook.platform')}</Label>
            <Select
              value={provider}
              onValueChange={(value) => {
                setProvider(value);
                clearResult();
              }}
              disabled={payload === null}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    payload === null
                      ? t('purchaseWebhook.loadingPlatforms')
                      : t('purchaseWebhook.platformPlaceholder')
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {(payload?.providers ?? []).map((p) => (
                  <SelectItem key={p.provider} value={p.provider} disabled={!p.configured}>
                    {providerLabel(p.provider)}
                    {!p.configured && ` — ${t('purchaseWebhook.notConfigured')}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{t('purchaseWebhook.credentialsHint')}</p>
            {destinationMissing && (
              <p className="text-xs text-destructive">{t('purchaseWebhook.destinationRequired')}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>{t('purchaseWebhook.product')}</Label>
            <Input
              value={product}
              onChange={(e) => {
                setProduct(e.target.value);
                clearResult();
              }}
              placeholder={t('purchaseWebhook.productPlaceholder')}
            />
          </div>

          {result && (
            <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-3">
              <p className="text-xs font-semibold text-foreground">
                {result.host_kind === 'whitelabel'
                  ? t('purchaseWebhook.urlWhitelabel')
                  : t('purchaseWebhook.urlGlobal')}
              </p>
              <div className="flex items-start gap-2 min-w-0">
                <code className="min-w-0 flex-1 break-all whitespace-pre-wrap rounded-md bg-background border border-border px-2 py-1.5 text-[11px] font-mono leading-5">
                  {result.url}
                </code>
                <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={copyUrl}>
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? t('purchaseWebhook.copiedShort') : t('purchaseWebhook.copy')}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                {t('purchaseWebhook.regenerateHint')}
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              onClick={generate}
              disabled={generating || !selected?.configured || !pipeline?.id || destinationMissing}
              className="gap-1.5"
            >
              {generating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Link2 className="h-3.5 w-3.5" />
              )}
              {t('purchaseWebhook.generate')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
