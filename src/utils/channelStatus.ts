import { Inbox } from '@/types/channels/inbox';
import { ChannelType, ChannelTypeId } from '@/types/channels/providers';

/**
 * Derived channel health used by the Channels overview hub.
 *
 * This is a FRONTEND-ONLY derivation: the `/inboxes` API does not expose live
 * connectivity (no last_sync / connection_state / health), only the
 * `reauthorization_required` flag. We therefore derive a coarse status from the
 * client data we already have instead of probing each channel at load time.
 */
export type ChannelHealthStatus = 'active' | 'attention' | 'available';

export interface ChannelTypeStatus {
  type: ChannelType;
  inboxes: Inbox[];
  total: number;
  activeCount: number;
  attentionCount: number;
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
 * Status of a single configured inbox. A configured inbox is always either
 * `active` or `attention` — `available` only applies to a channel TYPE that has
 * no configured inboxes at all.
 */
export function deriveInboxStatus(inbox: Inbox): Exclude<ChannelHealthStatus, 'available'> {
  return inbox.reauthorization_required ? 'attention' : 'active';
}

/**
 * Build the per-type status summary that drives the overview hub. Every catalog
 * type is represented (even with zero inboxes), so new channel types added to
 * `getChannelTypes()` surface automatically.
 */
export function buildChannelTypeStatuses(
  channelTypes: ChannelType[],
  inboxes: Inbox[],
): ChannelTypeStatus[] {
  return channelTypes.map(type => {
    const matched = inboxes.filter(inbox => normalizeChannelTypeId(inbox.channel_type) === type.type);
    const attentionCount = matched.filter(inbox => deriveInboxStatus(inbox) === 'attention').length;
    const activeCount = matched.length - attentionCount;

    let status: ChannelHealthStatus = 'available';
    if (matched.length > 0) {
      status = attentionCount > 0 ? 'attention' : 'active';
    }

    return {
      type,
      inboxes: matched,
      total: matched.length,
      activeCount,
      attentionCount,
      status,
    };
  });
}
