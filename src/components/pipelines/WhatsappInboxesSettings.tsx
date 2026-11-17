import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@evoapi/design-system';
import { pipelinesService } from '@/services/pipelines';
import { useLanguage } from '@/hooks/useLanguage';
import { usePermissions } from '@/contexts/PermissionsContext';
import type { PipelineWhatsappInboxes } from '@/types/analytics';

/**
 * Números de WhatsApp autorizados a iniciar conversa a partir dos negócios do pipeline.
 * Sem nenhum número marcado, ninguém inicia conversa (padrão seguro do CRM).
 * Grava direto na API (independente do "Salvar" dos dados gerais do pipeline).
 */
export default function WhatsappInboxesSettings({ pipelineId }: { pipelineId: string }) {
  const { t } = useLanguage('pipelines');
  const { can } = usePermissions();
  const canEdit = can('pipelines', 'update');
  const [data, setData] = useState<PipelineWhatsappInboxes | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [defaultId, setDefaultId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const apply = useCallback((next: PipelineWhatsappInboxes) => {
    setData(next);
    setSelected(next.allowed.map(item => item.id));
    setDefaultId(next.default_inbox_id);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      apply(await pipelinesService.getWhatsappInboxes(pipelineId));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [pipelineId, apply]);

  useEffect(() => { void load(); }, [load]);

  const dirty = useMemo(() => {
    if (!data) return false;
    const original = data.allowed.map(item => item.id).sort().join(',');
    return original !== [...selected].sort().join(',') || (data.default_inbox_id ?? null) !== (defaultId ?? null);
  }, [data, selected, defaultId]);

  const toggle = (id: string, on: boolean) => {
    setSelected(current => {
      const next = on ? [...current, id] : current.filter(item => item !== id);
      setDefaultId(prev => (prev && next.includes(prev) ? prev : next.length === 1 ? next[0] : next[0] ?? null));
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      apply(await pipelinesService.saveWhatsappInboxes(pipelineId, selected, defaultId));
      toast.success(t('whatsappInboxes.saved'));
    } catch {
      toast.error(t('whatsappInboxes.saveError'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground" role="status"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />{t('whatsappInboxes.loading')}</p>;
  if (error || !data) {
    return (
      <div role="alert" className="space-y-2">
        <p className="text-sm text-destructive">{t('whatsappInboxes.loadError')}</p>
        <Button type="button" size="sm" variant="outline" onClick={() => void load()}>{t('whatsappInboxes.retry')}</Button>
      </div>
    );
  }

  return (
    <section className="space-y-3" aria-labelledby="whatsapp-inboxes-title" data-testid="whatsapp-inboxes-settings">
      <div>
        <h3 id="whatsapp-inboxes-title" className="text-sm font-semibold">{t('whatsappInboxes.title')}</h3>
        <p className="text-xs text-muted-foreground">{t('whatsappInboxes.help')}</p>
      </div>
      {selected.length === 0 && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs" role="note">{t('whatsappInboxes.noneWarning')}</p>
      )}
      {!canEdit && <p className="text-xs text-muted-foreground" role="note">{t('whatsappInboxes.readOnly')}</p>}
      {data.eligible.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('whatsappInboxes.noInboxes')}</p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {data.eligible.map(inbox => {
            const on = selected.includes(inbox.id);
            return (
              <li key={inbox.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
                <label className="flex min-w-0 flex-1 items-center gap-3">
                  <input
                    type="checkbox"
                    role="switch"
                    checked={on}
                    disabled={!canEdit || saving}
                    aria-label={t('whatsappInboxes.allowAria', { name: inbox.name })}
                    onChange={event => toggle(inbox.id, event.target.checked)}
                    className="h-4 w-4 shrink-0"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{inbox.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{inbox.phone_number || t('whatsappInboxes.noPhone')}</span>
                  </span>
                </label>
                <span className={`rounded-full px-2 py-0.5 text-xs ${inbox.connected ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-red-500/15 text-red-700 dark:text-red-300'}`}>
                  {inbox.connected ? t('whatsappInboxes.connected') : t('whatsappInboxes.disconnected')}
                </span>
                <label className={`flex items-center gap-1 text-xs ${on ? '' : 'opacity-40'}`}>
                  <input
                    type="radio"
                    name="whatsapp-default-inbox"
                    checked={on && defaultId === inbox.id}
                    disabled={!canEdit || !on || saving}
                    aria-label={t('whatsappInboxes.defaultAria', { name: inbox.name })}
                    onChange={() => setDefaultId(inbox.id)}
                  />
                  {t('whatsappInboxes.default')}
                </label>
              </li>
            );
          })}
        </ul>
      )}
      {canEdit && (
        <div className="flex justify-end">
          <Button type="button" size="sm" onClick={() => void save()} disabled={!dirty || saving}>
            {saving ? t('whatsappInboxes.saving') : t('whatsappInboxes.save')}
          </Button>
        </div>
      )}
    </section>
  );
}
