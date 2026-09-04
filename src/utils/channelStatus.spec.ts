import { describe, expect, it } from 'vitest';
import {
  buildChannelTypeStatuses,
  deriveInboxStatus,
  formatLastSync,
  normalizeChannelTypeId,
  resolveInboxConnectionState,
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

describe('resolveInboxConnectionState', () => {
  it('prefers the live overlay over the API state', () => {
    const target = inbox({ id: 'w1', connection_state: 'disconnected' });
    expect(resolveInboxConnectionState(target, { w1: 'connected' })).toBe('connected');
  });

  it('uses the API connection_state when no overlay exists', () => {
    expect(resolveInboxConnectionState(inbox({ connection_state: 'pending' }))).toBe('pending');
  });

  it('falls back to the legacy reauthorization flag for pre-EVO-1674 payloads', () => {
    expect(resolveInboxConnectionState(inbox({ reauthorization_required: true }))).toBe('error');
    expect(resolveInboxConnectionState(inbox({}))).toBe('unknown');
  });
});

describe('deriveInboxStatus', () => {
  it('maps real connection states to hub statuses', () => {
    expect(deriveInboxStatus(inbox({ connection_state: 'connected' }))).toBe('active');
    expect(deriveInboxStatus(inbox({ connection_state: 'pending' }))).toBe('attention');
    expect(deriveInboxStatus(inbox({ connection_state: 'disconnected' }))).toBe('error');
    expect(deriveInboxStatus(inbox({ connection_state: 'error' }))).toBe('error');
  });

  it('rolls a QR session establishing up into attention, same as pending (CRM-490)', () => {
    expect(deriveInboxStatus(inbox({ connection_state: 'connecting' }))).toBe('attention');
  });

  it('treats unmonitored (unknown) channels as active — explicit degrade, not broken', () => {
    expect(deriveInboxStatus(inbox({ connection_state: 'unknown', health_source: 'none' }))).toBe('active');
  });

  it('flags an unknown channel that does have a health source — nothing confirmed the connection', () => {
    expect(deriveInboxStatus(inbox({ connection_state: 'unknown', health_source: 'stored_flag' }))).toBe(
      'attention',
    );
    expect(deriveInboxStatus(inbox({ connection_state: 'unknown', health_source: 'provider_event' }))).toBe(
      'attention',
    );
  });

  it('keeps pre-EVO-1674 payloads, which carry no health source, on active', () => {
    expect(deriveInboxStatus(inbox({}))).toBe('active');
  });
});

describe('buildChannelTypeStatuses', () => {
  it('marks a type with no inboxes as available', () => {
    const result = buildChannelTypeStatuses(types, []);
    expect(result.every(r => r.status === 'available')).toBe(true);
    expect(result.every(r => r.total === 0)).toBe(true);
  });

  it('aggregates active, attention and error counts per type', () => {
    const result = buildChannelTypeStatuses(types, [
      inbox({ id: 'w1', channel_type: 'Channel::Whatsapp', connection_state: 'connected' }),
      inbox({ id: 'w2', channel_type: 'whatsapp', connection_state: 'disconnected' }),
      inbox({ id: 'w3', channel_type: 'whatsapp', connection_state: 'pending' }),
      inbox({ id: 'e1', channel_type: 'Channel::Email', connection_state: 'connected' }),
    ]);
    const whatsapp = result.find(r => r.type.type === 'whatsapp')!;
    const email = result.find(r => r.type.type === 'email')!;
    const sms = result.find(r => r.type.type === 'sms')!;

    expect(whatsapp).toMatchObject({
      total: 3,
      activeCount: 1,
      attentionCount: 1,
      errorCount: 1,
      status: 'error',
    });
    expect(email).toMatchObject({ total: 1, activeCount: 1, errorCount: 0, status: 'active' });
    expect(sms).toMatchObject({ total: 0, status: 'available' });
  });

  it('applies the live overlay before aggregating', () => {
    const result = buildChannelTypeStatuses(
      types,
      [inbox({ id: 'w1', channel_type: 'Channel::Whatsapp', connection_state: 'connected' })],
      { w1: 'disconnected' },
    );
    const whatsapp = result.find(r => r.type.type === 'whatsapp')!;

    expect(whatsapp.status).toBe('error');
    expect(whatsapp.inboxStates[0].state).toBe('disconnected');
  });

  it('reports a type whose every inbox lacks a health signal as unmonitored, not active', () => {
    const result = buildChannelTypeStatuses(types, [
      inbox({ id: 's1', channel_type: 'Channel::Sms', connection_state: 'unknown', health_source: 'none' }),
    ]);
    const sms = result.find(r => r.type.type === 'sms')!;

    expect(sms.inboxStates[0].unmonitored).toBe(true);
    expect(sms.status).toBe('unmonitored');
    // The verdict is label-only: the per-inbox counts stay as they were, so the
    // "needs attention" counters are not inflated by a missing signal.
    expect(sms.activeCount).toBe(1);
    expect(sms.attentionCount).toBe(0);
    expect(sms.errorCount).toBe(0);
  });

  it('keeps a type active when only part of it lacks a health signal', () => {
    const result = buildChannelTypeStatuses(types, [
      inbox({ id: 'w1', channel_type: 'Channel::Whatsapp', connection_state: 'connected' }),
      inbox({ id: 'w2', channel_type: 'Channel::Whatsapp', connection_state: 'unknown', health_source: 'none' }),
    ]);
    const whatsapp = result.find(r => r.type.type === 'whatsapp')!;
    expect(whatsapp.status).toBe('active');
  });

  it('lets a real fault outrank a missing signal', () => {
    const result = buildChannelTypeStatuses(types, [
      inbox({ id: 's1', channel_type: 'Channel::Sms', connection_state: 'unknown', health_source: 'none' }),
      inbox({ id: 's2', channel_type: 'Channel::Sms', connection_state: 'disconnected' }),
    ]);
    const sms = result.find(r => r.type.type === 'sms')!;
    expect(sms.status).toBe('error');
  });

  it('does not badge a token-based channel green while nothing confirms its connection', () => {
    const result = buildChannelTypeStatuses(types, [
      inbox({
        id: 'w1',
        channel_type: 'Channel::Whatsapp',
        connection_state: 'unknown',
        health_source: 'stored_flag',
      }),
    ]);
    const whatsapp = result.find(r => r.type.type === 'whatsapp')!;

    expect(whatsapp).toMatchObject({ total: 1, activeCount: 0, attentionCount: 1, status: 'attention' });
    expect(whatsapp.inboxStates[0].unmonitored).toBe(false);
  });

  it('ignores inboxes whose type is not in the catalog', () => {
    const result = buildChannelTypeStatuses(types, [
      inbox({ id: 't1', channel_type: 'Channel::Twitter' }),
    ]);
    expect(result.reduce((sum, r) => sum + r.total, 0)).toBe(0);
  });
});

describe('formatLastSync', () => {
  it('returns null when there is no timestamp', () => {
    expect(formatLastSync(null, 'en')).toBeNull();
    expect(formatLastSync(undefined, 'en')).toBeNull();
  });

  it('formats a recent timestamp as relative time', () => {
    const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 5 * 60;
    expect(formatLastSync(fiveMinutesAgo, 'en')).toMatch(/5 minutes ago/);
  });
});
