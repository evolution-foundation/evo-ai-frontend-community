import { ChannelTypeId } from '@/types/channels/providers';

/**
 * What each channel TYPE can do, independent of any connected inbox. Drives the
 * capability chips on the Channels overview cards. Extracted from the `Canais`
 * prototype; `web_widget` and `api` are conversation-only channels (locked
 * decision 2026-07-12 — they neither publish nor run campaigns).
 */
export type ChannelCapability = 'publishing' | 'conversations' | 'campaigns';

export const CHANNEL_CAPABILITIES: Record<ChannelTypeId, ChannelCapability[]> = {
  instagram: ['publishing', 'conversations'],
  facebook: ['publishing', 'conversations', 'campaigns'],
  whatsapp: ['conversations', 'campaigns'],
  email: ['campaigns', 'conversations'],
  sms: ['campaigns'],
  telegram: ['conversations'],
  web_widget: ['conversations'],
  api: ['conversations'],
};
