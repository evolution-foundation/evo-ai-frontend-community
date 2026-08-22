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
import { extractError } from '@/utils/apiHelpers';
import { passwordProblem } from './passwordRules';

type SetPasswordModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
};

/**
 * CRM-210 — an admin sets another user's password directly.
 *
 * The backend is the authority here: it gates on users.reset_password AND
 * users.manage, refuses self-service and super_admin escalation, enforces the
 * model's complexity rule, and revokes the target's login sessions. This dialog
 * only does the local mismatch check (so the user is not charged a round trip
 * for a typo) and surfaces whatever the API answers.
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

    // CRM-210 review (M2): mirror the backend's rule so the admin is not charged
    // a round trip to be told what we already know. The backend stays the
    // authority — Devise's password_length (8..128) plus User#password_complexity
    // (lower, upper, digit, special) — this only fails fast on the obvious cases.
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
      // The API carries the actionable reason (weak password, forbidden target,
      // missing permission) — showing it beats a generic failure message.
      //
      // Read through extractError(), the house helper. The first version reached
      // for `data.message` and then `data.error`, which is wrong twice over: the
      // auth's error_response answers `{ success:false, error:{ code, message },
      // meta }`, so `data.message` never exists, and `data.error` is an OBJECT —
      // truthy, so it short-circuited the generic fallback and handed the object
      // to toast(). React 19 then throws "Objects are not valid as a React
      // child" from the <Toaster/> in App.tsx, and with no ErrorBoundary above
      // it that unmounts the root: a white screen, on the MOST likely paths
      // (weak password 422, self 403, super_admin target 403).
      const { message } = extractError(error);
      toast.error(message || t('setPassword.error'));
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
