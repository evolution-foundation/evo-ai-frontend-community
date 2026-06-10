import { useEffect, useMemo, useState } from 'react';
import api from '@/services/core/api';
import { Inbox, InboxConnectionState } from '@/types/channels/inbox';
import { normalizeChannelTypeId, LiveStatusOverlay } from '@/utils/channelStatus';

// connectionState values reported by the Evolution API (v2 uses `state`,
// older payloads use `status`).
const EVOLUTION_STATE_MAP: Record<string, InboxConnectionState> = {
  open: 'connected',
  connected: 'connected',
  connecting: 'pending',
  close: 'disconnected',
  closed: 'disconnected',
  disconnected: 'disconnected',
};

function evolutionInstanceName(inbox: Inbox): string | undefined {
  const config = inbox.provider_config as Record<string, unknown> | undefined;
  const name = config?.instance_name ?? config?.instanceName ?? config?.instance;
  return typeof name === 'string' && name.length > 0 ? name : undefined;
}

/**
 * Only WhatsApp inboxes on the `evolution` provider have a CRM-side live
 * proxy (`GET /evolution/instances?instanceName=...`, credentials resolved
 * server-side). Every other type renders the stored state from `/inboxes` —
 * the explicit degrade required by EVO-1674.
 */
export function isLiveCheckable(inbox: Inbox): boolean {
  return (
    normalizeChannelTypeId(inbox.channel_type) === 'whatsapp' &&
    inbox.provider === 'evolution' &&
    evolutionInstanceName(inbox) !== undefined
  );
}

export interface LiveChannelStatus {
  /** Freshly fetched state per inbox id; overlays the stored /inboxes state. */
  states: LiveStatusOverlay;
  /** Inboxes with a live check in flight. */
  loadingIds: Set<string>;
  /** Inboxes whose live check failed — stored state remains authoritative. */
  failedIds: Set<string>;
}

/**
 * Live connectivity overlay for the channel hub (EVO-1674). Fires one
 * connection-state probe per live-checkable inbox on mount/refresh; failures
 * only mark the inbox as not-live-verified, never break the hub.
 */
export default function useLiveChannelStatus(inboxes: Inbox[]): LiveChannelStatus {
  const [states, setStates] = useState<LiveStatusOverlay>({});
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());

  const targetsKey = useMemo(
    () =>
      inboxes
        .filter(isLiveCheckable)
        .map(inbox => `${inbox.id}:${evolutionInstanceName(inbox)}`)
        .join(','),
    [inboxes],
  );

  useEffect(() => {
    const targets = inboxes.filter(isLiveCheckable);
    if (targets.length === 0) {
      setStates({});
      setLoadingIds(new Set());
      setFailedIds(new Set());
      return undefined;
    }

    let cancelled = false;
    setStates({});
    setFailedIds(new Set());
    setLoadingIds(new Set(targets.map(inbox => String(inbox.id))));

    targets.forEach(inbox => {
      const id = String(inbox.id);
      api
        .get('/evolution/instances', { params: { instanceName: evolutionInstanceName(inbox) } })
        .then(response => {
          if (cancelled) return;
          const instance = (response.data?.data?.instance ?? {}) as Record<string, unknown>;
          const raw = String(instance.state ?? instance.status ?? '').toLowerCase();
          const mapped = EVOLUTION_STATE_MAP[raw];
          if (mapped) {
            setStates(prev => ({ ...prev, [id]: mapped }));
          } else {
            // Proxy's own fallback ('unknown') or unexpected payload.
            setFailedIds(prev => new Set(prev).add(id));
          }
        })
        .catch(() => {
          if (!cancelled) setFailedIds(prev => new Set(prev).add(id));
        })
        .finally(() => {
          if (cancelled) return;
          setLoadingIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        });
    });

    return () => {
      cancelled = true;
    };
    // targetsKey captures the identity of the live-checkable set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetsKey]);

  return { states, loadingIds, failedIds };
}
