import { useState } from 'react';
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@evoapi/design-system';
import { Play, ChevronDown, Loader2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { testCustomTool } from '@/services/agents/customToolsService';
import type { CustomToolTestResponse } from '@/types/ai';

/** Shared between Custom Tools (EVO-1790) and Custom MCP (EVO-1791) UIs. */
export interface TestRequestButtonProps {
  mode: 'create' | 'edit';
  toolId?: string;
  onResult?: (result: CustomToolTestResponse['test_result']) => void;
  disabled?: boolean;
}

type TestResult = CustomToolTestResponse['test_result'];

const statusColor = (code: number): string => {
  if (code >= 200 && code < 300) return 'text-emerald-600';
  if (code >= 300 && code < 400) return 'text-sky-600';
  if (code >= 400 && code < 500) return 'text-amber-600';
  if (code >= 500) return 'text-destructive';
  return 'text-muted-foreground';
};

const formatBody = (raw: unknown): string => {
  if (raw === null || raw === undefined) return '';
  if (typeof raw === 'string') {
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      return raw;
    }
  }
  try {
    return JSON.stringify(raw, null, 2);
  } catch {
    return String(raw);
  }
};

export default function TestRequestButton({
  mode,
  toolId,
  onResult,
  disabled = false,
}: TestRequestButtonProps) {
  const { t } = useLanguage('customTools');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [responseBody, setResponseBody] = useState<unknown>(null);
  const [headersOpen, setHeadersOpen] = useState(false);

  const isCreateMode = mode === 'create';
  const buttonDisabled = disabled || loading || isCreateMode || !toolId;

  const handleClick = async () => {
    if (!toolId) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setResponseBody(null);
    try {
      const resp = await testCustomTool(toolId);
      setResult(resp.test_result);
      const body = (resp as unknown as Record<string, unknown>).body
        ?? (resp.test_result as unknown as Record<string, unknown>).body;
      setResponseBody(body ?? null);
      onResult?.(resp.test_result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || t('testRequest.error'));
    } finally {
      setLoading(false);
    }
  };

  const button = (
    <Button
      type="button"
      variant="outline"
      onClick={handleClick}
      disabled={buttonDisabled}
      aria-label={t('testRequest.button')}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Play className="h-4 w-4 mr-2" />
      )}
      {loading ? t('testRequest.testing') : t('testRequest.button')}
    </Button>
  );

  return (
    <div className="space-y-3" data-testid="test-request-button-root">
      {isCreateMode ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0}>{button}</span>
            </TooltipTrigger>
            <TooltipContent>
              {t('testRequest.disabledTooltipCreateMode')}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        button
      )}

      {error && (
        <div className="rounded border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {result && (
        <div
          className="rounded border bg-muted/20 p-3 space-y-2 text-sm"
          data-testid="test-request-result"
        >
          <div className="flex items-center gap-4">
            <div>
              <span className="text-muted-foreground">
                {t('testRequest.statusCode')}:{' '}
              </span>
              <span className={`font-semibold ${statusColor(result.status_code)}`}>
                {result.status_code}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">
                {t('testRequest.responseTime')}:{' '}
              </span>
              <span className="font-medium">{Math.round(result.response_time * 1000)}ms</span>
            </div>
          </div>

          {result.error && (
            <div className="text-destructive text-xs">{result.error}</div>
          )}

          {result.headers && Object.keys(result.headers).length > 0 && (
            <Collapsible open={headersOpen} onOpenChange={setHeadersOpen}>
              <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <ChevronDown
                  className={`h-3 w-3 transition-transform ${
                    headersOpen ? 'rotate-180' : ''
                  }`}
                />
                {t('testRequest.responseHeaders')} ({Object.keys(result.headers).length})
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1 rounded bg-background/60 p-2 font-mono text-xs space-y-1">
                {Object.entries(result.headers).map(([k, v]) => (
                  <div key={k}>
                    <span className="text-muted-foreground">{k}:</span>{' '}
                    <span>{v}</span>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {responseBody !== null && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">
                {t('testRequest.responseBody')}
              </div>
              <pre className="rounded bg-background/60 p-2 font-mono text-xs overflow-x-auto max-h-64">
                {formatBody(responseBody)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
