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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <KeyRound className="h-12 w-12 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground max-w-sm">
            {t('empty.description')}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('actions.cancel')}
          </Button>
          <Button onClick={goToCredentials}>
            <ExternalLink className="mr-2 h-4 w-4" />
            {t('title')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
