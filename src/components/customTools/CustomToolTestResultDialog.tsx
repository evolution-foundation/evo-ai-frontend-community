import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@evoapi/design-system';
import { CheckCircle2, XCircle, ChevronDown, Clock, Activity } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import type { CustomTool, CustomToolTestResponse } from '@/types/ai';

type TestResult = CustomToolTestResponse['test_result'] & {
  body?: unknown;
};

interface CustomToolTestResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tool: CustomTool | null;
  result: TestResult | null;
}

const statusColor = (code: number | undefined): string => {
  if (!code) return 'text-muted-foreground';
  if (code >= 200 && code < 300) return 'text-emerald-600';
  if (code >= 300 && code < 400) return 'text-sky-600';
  if (code >= 400 && code < 500) return 'text-amber-600';
  return 'text-destructive';
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

export default function CustomToolTestResultDialog({
  open,
  onOpenChange,
  tool,
  result,
}: CustomToolTestResultDialogProps) {
  const { t } = useLanguage('customTools');
  const [headersOpen, setHeadersOpen] = useState(false);

  const isSuccess = !!result?.success;
  const hasStatusCode = !!result?.status_code;
  const hasHeaders =
    !!result?.headers && Object.keys(result.headers).length > 0;
  const hasBody = result?.body !== undefined && result?.body !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-xl flex items-center gap-2">
            {isSuccess ? (
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            ) : (
              <XCircle className="h-6 w-6 text-destructive" />
            )}
            <span>
              {isSuccess
                ? t('testResult.titleSuccess')
                : t('testResult.titleError')}
            </span>
          </DialogTitle>
          {tool && (
            <p className="text-sm text-muted-foreground pt-1">
              {tool.method} · {tool.name}
            </p>
          )}
        </DialogHeader>

        <div className="overflow-y-auto max-h-[calc(85vh-100px)] px-6 py-4 space-y-4">
          {tool && (
            <div className="text-xs font-mono text-muted-foreground bg-muted/30 rounded px-3 py-2 break-all">
              {tool.endpoint}
            </div>
          )}

          {/* Top metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded border bg-muted/20 px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Activity className="h-3.5 w-3.5" />
                {t('testResult.statusCode')}
              </div>
              <div className={`text-lg font-semibold ${statusColor(result?.status_code)}`}>
                {hasStatusCode ? result?.status_code : '—'}
              </div>
            </div>
            <div className="rounded border bg-muted/20 px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Clock className="h-3.5 w-3.5" />
                {t('testResult.responseTime')}
              </div>
              <div className="text-lg font-semibold">
                {result?.response_time !== undefined && result.response_time > 0
                  ? `${Math.round(result.response_time * 1000)}ms`
                  : '—'}
              </div>
            </div>
          </div>

          {/* Error message */}
          {!isSuccess && result?.error && (
            <div className="rounded border border-destructive/40 bg-destructive/10 p-3">
              <p className="text-xs font-semibold text-destructive mb-1">
                {t('testResult.errorLabel')}
              </p>
              <p className="text-sm text-destructive break-words">
                {result.error}
              </p>
            </div>
          )}

          {/* Headers */}
          {hasHeaders && (
            <Collapsible open={headersOpen} onOpenChange={setHeadersOpen}>
              <CollapsibleTrigger className="flex items-center gap-1 text-sm font-medium hover:text-foreground">
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${headersOpen ? 'rotate-180' : ''}`}
                />
                {t('testResult.responseHeaders')} ({Object.keys(result!.headers).length})
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 rounded border bg-muted/20 p-3 font-mono text-xs space-y-1">
                {Object.entries(result!.headers).map(([k, v]) => (
                  <div key={k} className="break-all">
                    <span className="text-muted-foreground">{k}:</span>{' '}
                    <span>{v}</span>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Body */}
          {hasBody && (
            <div>
              <p className="text-sm font-medium mb-1.5">
                {t('testResult.responseBody')}
              </p>
              <pre className="rounded border bg-muted/20 p-3 font-mono text-xs overflow-x-auto max-h-72">
                {formatBody(result?.body)}
              </pre>
            </div>
          )}

          {/* No data hint */}
          {!isSuccess && !result?.error && !hasStatusCode && (
            <p className="text-sm text-muted-foreground italic">
              {t('testResult.noData')}
            </p>
          )}
        </div>

        <div className="flex justify-end px-6 py-3 border-t bg-muted/20">
          <Button onClick={() => onOpenChange(false)}>
            {t('testResult.close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
