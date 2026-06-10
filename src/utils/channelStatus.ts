import { Inbox, InboxConnectionState } from '@/types/channels/inbox';
import { ChannelType, ChannelTypeId } from '@/types/channels/providers';

/**
 * Channel health used by the Channels overview hub.
 *
 * Since EVO-1674 the `/inboxes` API exposes the REAL connection state
 * (`connection_state` / `health_source` / `last_sync`), event-fed per channel
 * type on the backend. The hub renders that state — optionally overlaid by a
 * live Evolution instance check (`useLiveChannelStatus`) — instead of deriving
 * it from `reauthorization_required` alone.
 */
export type ChannelHealthStatus = 'active' | 'attention' | 'error' | 'available';

/** Live overlay map (inbox id -> freshly fetched state) from useLiveChannelStatus. */
export type LiveStatusOverlay = Record<string, InboxConnectionState>;

export interface InboxConnectionInfo {
  inbox: Inbox;
  state: InboxConnectionState;
  /** True when the channel type has no health signal at all (explicit degrade). */
  unmonitored: boolean;
}

export interface ChannelTypeStatus {
  type: ChannelType;
  inboxes: Inbox[];
  /** Per-inbox resolved connectivity, in the order of `inboxes`. */
  inboxStates: InboxConnectionInfo[];
  total: number;
  activeCount: number;
  attentionCount: number;
  errorCount: number;
  status: ChannelHealthStatus;
}

// Maps the many shapes an `inbox.channel_type` can take (Rails STI class names
// like 'Channel::Whatsapp', snake_case, or already-normalized ids) onto the
// catalog `ChannelTypeId`. Keys are normalized: 'Channel::' stripped, lowercased,
// spaces and underscores removed.
const NORMALIZED_TYPE_MAP: Record<string, ChannelTypeId> = {
  webwidget: 'web_widget',
  website: 'web_widget',
  whatsapp: 'whatsapp',
  whatsappcloud: 'whatsapp',
  whatsapp360dialog: 'whatsapp',
  facebook: 'facebook',
  facebookpage: 'facebook',
  instagram: 'instagram',
  telegram: 'telegram',
  sms: 'sms',
  twiliosms: 'sms',
  email: 'email',
  api: 'api',
};

export function normalizeChannelTypeId(channelType?: string | null): ChannelTypeId | undefined {
  if (!channelType) return undefined;
  const key = channelType.replace('Channel::', '').toLowerCase().replace(/[\s_]/g, '');
  return NORMALIZED_TYPE_MAP[key];
}

/**
 * The real connection state of an inbox: live overlay wins, then the
 * API-provided state, then a legacy fallback for payloads predating EVO-1674.
 */
export function resolveInboxConnectionState(
  inbox: Inbox,
  live?: LiveStatusOverlay,
): InboxConnectionState {
  const liveState = live?.[String(inbox.id)];
  if (liveState) return liveState;
  if (inbox.connection_state) return inbox.connection_state;
  return inbox.reauthorization_required ? 'error' : 'unknown';
}

/**
 * Hub-level status of a single configured inbox. A configured inbox is never
 * `available` — that only applies to a channel TYPE with no inboxes at all.
 * `unknown` counts as active: it means the type has no health signal
 * (explicit degrade), not that the channel is broken.
 */
export function deriveInboxStatus(
  inbox: Inbox,
  live?: LiveStatusOverlay,
): Exclude<ChannelHealthStatus, 'available'> {
  const state = resolveInboxConnectionState(inbox, live);
  if (state === 'error' || state === 'disconnected') return 'error';
  if (state === 'pending') return 'attention';
  return 'active';
}

/**
 * Build the per-type status summary that drives the overview hub. Every catalog
 * type is represented (even with zero inboxes), so new channel types added to
 * `getChannelTypes()` surface automatically.
 */
export function buildChannelTypeStatuses(
  channelTypes: ChannelType[],
  inboxes: Inbox[],
  live?: LiveStatusOverlay,
): ChannelTypeStatus[] {
  return channelTypes.map(type => {
    const matched = inboxes.filter(inbox => normalizeChannelTypeId(inbox.channel_type) === type.type);
    const inboxStates: InboxConnectionInfo[] = matched.map(inbox => ({
      inbox,
      state: resolveInboxConnectionState(inbox, live),
      unmonitored: inbox.health_source === 'none',
    }));

    const errorCount = matched.filter(inbox => deriveInboxStatus(inbox, live) === 'error').length;
    const attentionCount = matched.filter(inbox => deriveInboxStatus(inbox, live) === 'attention').length;
    const activeCount = matched.length - errorCount - attentionCount;

    let status: ChannelHealthStatus = 'available';
    if (matched.length > 0) {
      if (errorCount > 0) status = 'error';
      else if (attentionCount > 0) status = 'attention';
      else status = 'active';
    }

    return {
      type,
      inboxes: matched,
      inboxStates,
      total: matched.length,
      activeCount,
      attentionCount,
      errorCount,
      status,
    };
  });
}

/**
 * Compact relative timestamp for `last_sync` (epoch seconds), localized via
 * Intl. Returns null when there is nothing to show.
 */
export function formatLastSync(epochSeconds: number | null | undefined, locale: string): string | null {
  if (!epochSeconds) return null;

  const diffMs = epochSeconds * 1000 - Date.now();
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const absMs = Math.abs(diffMs);

  if (absMs < 60_000) return rtf.format(Math.round(diffMs / 1000), 'second');
  if (absMs < 3_600_000) return rtf.format(Math.round(diffMs / 60_000), 'minute');
  if (absMs < 86_400_000) return rtf.format(Math.round(diffMs / 3_600_000), 'hour');
  return rtf.format(Math.round(diffMs / 86_400_000), 'day');
}
