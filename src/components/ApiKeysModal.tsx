import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@evoapi/design-system';
import { ExternalLink, KeyRound } from 'lucide-react';

export const AI_CREDENTIALS_ROUTE = '/settings/ai-credentials';

interface ApiKeysModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApiKeysChange?: () => void;
}

/**
 * Credentials are registered on the AI Credentials settings page, the single
 * source of truth. This modal used to keep its own CRUD against the same
 * registry, which is exactly the duplication EVO-2250 removes. Selecting a
 * credential still happens in the callers, so only the CRUD moved.
 */
export function ApiKeysModal({ open, onOpenChange, onApiKeysChange }: ApiKeysModalProps) {
  const { t } = useLanguage('aiCredentials');
  const navigate = useNavigate();

  // Callers reload their selectable credentials through this callback. Leaving
  // for the credentials page is the moment the list can go stale, so signal it.
  const goToCredentials = () => {
    onOpenChange(false);
    onApiKeysChange?.();
    navigate(AI_CREDENTIALS_ROUTE);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 rounded-[18px] p-6 shadow-[0_24px_60px_rgba(15,23,35,.28)] sm:max-w-[470px]">
        <DialogHeader>
          <DialogTitle className="text-[18px] font-bold text-foreground">{t('title')}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <span className="flex size-12 items-center justify-center rounded-[12px] bg-primary/10 text-primary">
            <KeyRound className="size-6" aria-hidden="true" />
          </span>
          <p className="max-w-sm text-sm text-muted-foreground">{t('empty.description')}</p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            className="h-auto rounded-[9px] border-border bg-card px-[18px] py-2.5 text-sm font-semibold text-foreground shadow-none hover:bg-muted"
            onClick={() => onOpenChange(false)}
          >
            {t('actions.cancel')}
          </Button>
          <Button
            className="h-auto rounded-[9px] px-[18px] py-[11px] text-sm font-semibold shadow-md shadow-primary/25 hover:bg-primary hover:brightness-90"
            onClick={goToCredentials}
          >
            <ExternalLink className="mr-2 size-4" />
            {t('title')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
