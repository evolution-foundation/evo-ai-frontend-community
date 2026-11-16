import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { User } from '@/types/users';

// Only notify transitions observed in this screen, never historical deliveries.
export function useInvitationPolling(users: User[], enabled: boolean, refresh: () => Promise<void>, t: (key: string) => string) {
  const tracked = useRef(new Set<string>());
  const seen = useRef(new Set<string>());
  const refreshRef = useRef(refresh);
  const tRef = useRef(t);
  refreshRef.current = refresh;
  tRef.current = t;
  const processing = users.some(user => ['queued', 'sending'].includes(user.invitation_delivery_status || ''));
  useEffect(() => {
    if (!enabled) return;
    for (const user of users) {
      const id = user.invitation_request_id;
      const status = user.invitation_delivery_status;
      if (!id || !status) continue;
      if (['queued', 'sending'].includes(status)) tracked.current.add(id);
      if (tracked.current.has(id) && !seen.current.has(id) && ['sent', 'failed', 'uncertain', 'cancelled'].includes(status)) {
        seen.current.add(id);
        if (status === 'sent') toast.success(tRef.current('invitation.sent'));
        else toast.error(tRef.current(`invitation.${status}`));
      }
    }
  }, [users, enabled]);
  useEffect(() => {
    if (!enabled) return;
    let busy = false;
    let disposed = false;
    const refreshVisible = async () => {
      if (disposed || busy || document.visibilityState !== 'visible') return;
      busy = true;
      try { await refreshRef.current(); } finally { busy = false; }
    };
    const focus = () => { void refreshVisible(); };
    window.addEventListener('focus', focus);
    document.addEventListener('visibilitychange', focus);
    const start = Date.now();
    const timer = processing ? window.setInterval(() => {
      if (Date.now() - start >= 120000) {
        window.clearInterval(timer);
        toast.info(tRef.current('invitation.timeout'));
      } else void refreshVisible();
    }, 5000) : undefined;
    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener('focus', focus);
      document.removeEventListener('visibilitychange', focus);
    };
  }, [enabled, processing]);
  return (id: string) => { tracked.current.add(id); };
}
