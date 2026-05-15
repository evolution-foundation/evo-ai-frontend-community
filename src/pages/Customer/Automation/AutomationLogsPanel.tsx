import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@evoapi/design-system';
import { RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { automationService } from '@/services/automation/automationService';
import type {
  AutomationRuleRun,
  AutomationRuleRunStatus,
  AutomationRuleRunStep,
} from '@/types/automation';

interface Props {
  automationRuleId: string;
}

const STATUS_FILTERS: { value: string; labelKey: string }[] = [
  { value: 'all', labelKey: 'logs.filters.all' },
  { value: 'matched', labelKey: 'logs.filters.matched' },
  { value: 'no_match', labelKey: 'logs.filters.no_match' },
  { value: 'skipped', labelKey: 'logs.filters.skipped' },
  { value: 'error', labelKey: 'logs.filters.error' },
];

const STATUS_STYLES: Record<AutomationRuleRunStatus, string> = {
  matched: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  no_match: 'bg-muted/40 text-muted-foreground border border-border',
  skipped: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  error: 'bg-red-500/15 text-red-400 border border-red-500/30',
};

const STEP_LEVEL_STYLES: Record<AutomationRuleRunStep['level'], string> = {
  info: 'text-foreground',
  success: 'text-emerald-400',
  warn: 'text-amber-400',
  error: 'text-red-400',
};

function formatDateTime(iso?: string) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}

function formatDuration(ms?: number) {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export default function AutomationLogsPanel({ automationRuleId }: Props) {
  const { t } = useLanguage('automation');
  const [runs, setRuns] = useState<AutomationRuleRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: { status?: string; per_page: number } = { per_page: 50 };
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await automationService.getAutomationRuns(automationRuleId, params);
      setRuns(res.data ?? []);
    } catch (e) {
      setError((e as Error)?.message ?? 'error');
    } finally {
      setLoading(false);
    }
  }, [automationRuleId, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{t('logs.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('logs.description')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {t(opt.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {t('logs.refresh')}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-md border border-red-500/30 bg-red-500/10 text-sm text-red-400">
          {error}
        </div>
      )}

      {!loading && runs.length === 0 && (
        <div className="p-6 text-center text-sm text-muted-foreground border border-dashed rounded-md">
          {t('logs.empty')}
        </div>
      )}

      <div className="space-y-2">
        {runs.map((run) => {
          const isOpen = expanded.has(run.id);
          return (
            <div key={run.id} className="border rounded-md bg-muted/20">
              <button
                type="button"
                onClick={() => toggleExpanded(run.id)}
                className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-muted/40"
              >
                <div className="flex items-center gap-3">
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded ${STATUS_STYLES[run.status]}`}>
                    {t(`logs.status.${run.status}`)}
                  </span>
                  <span className="text-sm">{run.event_name}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{formatDuration(run.duration_ms)}</span>
                  <span>{formatDateTime(run.started_at)}</span>
                </div>
              </button>

              {isOpen && (
                <div className="border-t px-4 py-3 space-y-3 text-sm">
                  {run.error_message && (
                    <div className="p-2 rounded border border-red-500/30 bg-red-500/10 text-red-400 text-xs">
                      {run.error_message}
                    </div>
                  )}

                  <div>
                    <h4 className="text-xs font-medium uppercase text-muted-foreground mb-1">
                      {t('logs.detail.timeline')}
                    </h4>
                    <ol className="space-y-2">
                      {run.steps.map((step, idx) => (
                        <li key={idx} className="flex gap-3">
                          <span className="text-xs text-muted-foreground w-20 shrink-0">
                            {formatDateTime(step.at)}
                          </span>
                          <div className="flex-1">
                            <div className={`text-sm ${STEP_LEVEL_STYLES[step.level]}`}>
                              {step.label}
                            </div>
                            {step.data && Object.keys(step.data).length > 0 && (
                              <pre className="mt-1 text-xs bg-background/50 border rounded p-2 overflow-x-auto">
                                {JSON.stringify(step.data, null, 2)}
                              </pre>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {run.payload && Object.keys(run.payload).length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium uppercase text-muted-foreground mb-1">
                        {t('logs.detail.payload')}
                      </h4>
                      <pre className="text-xs bg-background/50 border rounded p-2 overflow-x-auto">
                        {JSON.stringify(run.payload, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
