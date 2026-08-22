import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@evoapi/design-system';
import { toast } from 'sonner';
import { User } from '@/types/users';
import { usersService } from '@/services/users';
import { useLanguage } from '@/hooks/useLanguage';
import { apiErrorMessage } from '@/utils/apiHelpers';
import { passwordProblem } from './passwordRules';

type SetPasswordModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
};

/**
 * CRM-210 — an admin sets another user's password directly.
 * The backend is the authority; this dialog only fails fast on what it can
 * check locally and shows whatever the API answers.
 */
export default function SetPasswordModal({ open, onOpenChange, user }: SetPasswordModalProps) {
  const { t } = useLanguage('users');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setPassword('');
    setConfirmation('');
    setSaving(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    if (!user) return;

    // Local mirror of the backend rule, so an obvious reject costs no round trip.
    const problem = passwordProblem(password);
    if (problem) {
      toast.error(t(problem));
      return;
    }

    if (password !== confirmation) {
      toast.error(t('setPassword.mismatch'));
      return;
    }

    setSaving(true);
    try {
      const result = await usersService.setPassword(user.id, password, confirmation);
      toast.success(t('setPassword.success', { count: result?.revoked_sessions ?? 0 }));
      handleOpenChange(false);
    } catch (error) {
      // apiErrorMessage() yields the backend's own message, or undefined for a 5xx
      // and for anything off-envelope — those fall back to the localized string.
      toast.error(apiErrorMessage(error) || t('setPassword.error'));
      setSaving(false);
    }
  };

  const canSubmit = password.length > 0 && confirmation.length > 0 && !saving;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('setPassword.title')}</DialogTitle>
          <DialogDescription>
            {t('setPassword.description', { name: user?.name ?? '' })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="set-password-new">{t('setPassword.password')}</Label>
            <Input
              id="set-password-new"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={event => setPassword(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="set-password-confirm">{t('setPassword.confirm')}</Label>
            <Input
              id="set-password-confirm"
              type="password"
              autoComplete="new-password"
              value={confirmation}
              onChange={event => setConfirmation(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>
            {t('setPassword.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {t('setPassword.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
