import { describe, expect, it } from 'vitest';
import {
  buildChannelTypeStatuses,
  deriveInboxStatus,
  normalizeChannelTypeId,
} from './channelStatus';
import { Inbox } from '@/types/channels/inbox';
import { ChannelType } from '@/types/channels/providers';

const inbox = (overrides: Partial<Inbox>): Inbox =>
  ({ id: 'i', name: 'n', channel_id: 'c', channel_type: 'whatsapp', ...overrides }) as Inbox;

const types: ChannelType[] = [
  { id: 'whatsapp', name: 'WhatsApp', description: '', type: 'whatsapp' },
  { id: 'email', name: 'Email', description: '', type: 'email' },
  { id: 'sms', name: 'SMS', description: '', type: 'sms' },
];

describe('normalizeChannelTypeId', () => {
  it('maps Rails STI class names to catalog ids', () => {
    expect(normalizeChannelTypeId('Channel::Whatsapp')).toBe('whatsapp');
    expect(normalizeChannelTypeId('Channel::WebWidget')).toBe('web_widget');
    expect(normalizeChannelTypeId('Channel::TwilioSms')).toBe('sms');
    expect(normalizeChannelTypeId('Channel::FacebookPage')).toBe('facebook');
  });

  it('maps snake_case and already-normalized variants', () => {
    expect(normalizeChannelTypeId('whatsapp_cloud')).toBe('whatsapp');
    expect(normalizeChannelTypeId('web_widget')).toBe('web_widget');
    expect(normalizeChannelTypeId('sms')).toBe('sms');
  });

  it('returns undefined for unknown or empty types', () => {
    expect(normalizeChannelTypeId('Channel::Twitter')).toBeUndefined();
    expect(normalizeChannelTypeId('')).toBeUndefined();
    expect(normalizeChannelTypeId(undefined)).toBeUndefined();
  });
});

describe('deriveInboxStatus', () => {
  it('flags reauthorization as attention', () => {
    expect(deriveInboxStatus(inbox({ reauthorization_required: true }))).toBe('attention');
  });

  it('treats a configured inbox without reauth as active', () => {
    expect(deriveInboxStatus(inbox({ reauthorization_required: false }))).toBe('active');
    expect(deriveInboxStatus(inbox({}))).toBe('active');
  });
});

describe('buildChannelTypeStatuses', () => {
  it('marks a type with no inboxes as available', () => {
    const result = buildChannelTypeStatuses(types, []);
    expect(result.every(r => r.status === 'available')).toBe(true);
    expect(result.every(r => r.total === 0)).toBe(true);
  });

  it('aggregates active and attention counts per type', () => {
    const result = buildChannelTypeStatuses(types, [
      inbox({ id: 'w1', channel_type: 'Channel::Whatsapp' }),
      inbox({ id: 'w2', channel_type: 'whatsapp', reauthorization_required: true }),
      inbox({ id: 'e1', channel_type: 'Channel::Email' }),
    ]);
    const whatsapp = result.find(r => r.type.type === 'whatsapp')!;
    const email = result.find(r => r.type.type === 'email')!;
    const sms = result.find(r => r.type.type === 'sms')!;

    expect(whatsapp).toMatchObject({ total: 2, activeCount: 1, attentionCount: 1, status: 'attention' });
    expect(email).toMatchObject({ total: 1, activeCount: 1, attentionCount: 0, status: 'active' });
    expect(sms).toMatchObject({ total: 0, status: 'available' });
  });

  it('ignores inboxes whose type is not in the catalog', () => {
    const result = buildChannelTypeStatuses(types, [
      inbox({ id: 't1', channel_type: 'Channel::Twitter' }),
    ]);
    expect(result.reduce((sum, r) => sum + r.total, 0)).toBe(0);
  });
});
