import { describe, expect, it } from 'vitest';
import { canForward } from './forward';
import type { Message } from '@/types/chat/api';

const message = (extra: Partial<Message> = {}) =>
  ({ id: 'm1', content: 'Olá!', message_type: 'incoming', status: 'sent', private: false, attachments: [], content_attributes: {}, ...extra }) as unknown as Message;
const file = (file_type: string, data_url = 'https://example.test/f') => ({ file_type, data_url }) as unknown as Message['attachments'][number];
const contact = (...phones: string[]) => ({ name: 'Ana', phones, organization: null });

describe('canForward', () => {
  it.each([
    ['received text', {}],
    ['sent text', { message_type: 'outgoing' as const }],
    ['image without caption', { content: '', attachments: [file('image')] }],
    ['audio, video and file', { content: '', attachments: [file('audio'), file('video'), file('file')] }],
    ['contact card with a full phone', { content_attributes: { shared_contacts: [contact('+55 11 99999-0001')] } }],
    ['card with one usable phone among masked ones', { content_attributes: { shared_contacts: [contact('+*********0003', '+5511999990001')] } }],
  ])('accepts %s', (_label, extra) => expect(canForward(message(extra))).toBe(true));

  it.each([
    ['private note', { private: true }],
    ['activity', { message_type: 'activity' as const }],
    ['failed message', { status: 'failed' as const }],
    ['message being sent', { status: 'progress' as const }],
    ['deleted', { content_attributes: { deleted: true } }],
    ['revoked by the contact', { content_attributes: { revoked_by_contact: true } }],
    ['old reaction bubble', { content_attributes: { is_reaction: true } }],
    ['unsupported', { content_attributes: { is_unsupported: true } }],
    ['media never downloaded', { content_attributes: { media_unavailable: true } }],
    ['location', { attachments: [file('location')] }],
    ['reel among images', { attachments: [file('image'), file('ig_reel')] }],
    ['attachment without stored file', { attachments: [file('image', '')] }],
    ['card with a masked phone only', { content_attributes: { shared_contacts: [contact('+55119****0001')] } }],
    ['card where one contact has a short phone', { content_attributes: { shared_contacts: [contact('+5511999990001'), contact('190')] } }],
    ['nothing to send', { content: '  ' }],
  ])('refuses %s', (_label, extra) => expect(canForward(message(extra))).toBe(false));
});
