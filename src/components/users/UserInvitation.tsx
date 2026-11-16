import { Badge, Button } from '@evoapi/design-system';
import { useLanguage } from '@/hooks/useLanguage';
import type { User } from '@/types/users';

export default function UserInvitation({ user, onResend }: { user: User; onResend?: (user: User) => void }) {
  const { t, currentLanguage } = useLanguage('users');
  if (user.invitation_status !== 'pending') return null;
  const sent = user.invitation_sent_at ? new Date(user.invitation_sent_at).toLocaleString(currentLanguage) : null;
  const cooldown = user.next_resend_at ? new Date(user.next_resend_at).toLocaleString(currentLanguage) : '';
  const status = user.invitation_delivery_status;
  return <div className="max-w-sm space-y-2 py-2 text-xs whitespace-normal break-words" aria-live="polite">
    <Badge variant="outline">{t('invitation.pending')}</Badge>
    <p title={Intl.DateTimeFormat().resolvedOptions().timeZone}>{sent ? t('invitation.lastSent', { date: sent }) : t('invitation.neverSent')}</p>
    {status && <p role="status">{t(`invitation.${status}`)}</p>}
    {onResend && <Button size="sm" variant="outline" disabled={!user.can_resend_invite} onClick={() => onResend(user)}>{t('invitation.resend')}</Button>}
    {onResend && !user.can_resend_invite && cooldown && <p>{t('invitation.cooldown', { time: cooldown })}</p>}
  </div>;
}
