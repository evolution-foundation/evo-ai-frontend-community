import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Button,
} from '@evoapi/design-system';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import type { CustomMcpServer } from '@/types/ai';

export type CustomMCPServerTestOutcome =
  | { success: true; toolsCount: number }
  | { success: false; error: string };

interface CustomMCPServerTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  server: CustomMcpServer | null;
  /** `null` while the request is in flight. */
  outcome: CustomMCPServerTestOutcome | null;
}

export default function CustomMCPServerTestDialog({
  open,
  onOpenChange,
  server,
  outcome,
}: CustomMCPServerTestDialogProps) {
  const { t } = useLanguage('customMcpServers');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-lg flex items-center gap-2">
            {!outcome ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : outcome.success ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
            <span>
              {!outcome
                ? t('testDialog.testing')
                : outcome.success
                  ? t('testDialog.titleSuccess')
                  : t('testDialog.titleError')}
            </span>
          </DialogTitle>
          {server && (
            <DialogDescription className="text-sm text-muted-foreground pt-1 break-all">
              {server.name} · {server.url}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="px-6 py-4">
          {!outcome ? (
            <p className="text-sm text-muted-foreground">{t('testDialog.testingDescription')}</p>
          ) : outcome.success ? (
            <div className="space-y-1">
              <p className="text-sm text-foreground">{t('testDialog.successMessage')}</p>
              <p className="text-sm font-semibold text-foreground">
                {t('testDialog.toolsDiscovered', { count: outcome.toolsCount })}
              </p>
            </div>
          ) : (
            <div className="rounded border border-destructive/40 bg-destructive/10 p-3">
              <p className="text-xs font-semibold text-destructive mb-1">
                {t('testDialog.errorLabel')}
              </p>
              <p className="text-sm text-destructive break-words">{outcome.error}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end px-6 py-3 border-t bg-muted/20">
          <Button type="button" onClick={() => onOpenChange(false)}>
            {t('testDialog.close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
