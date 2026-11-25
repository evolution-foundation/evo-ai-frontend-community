import { describe, expect, it } from 'vitest';
import { canReactTo, groupReactions, isOlderThanLastMessage, setMyReaction, supportsReactions } from './reactions';
import type { Conversation, Message, MessageReaction } from '@/types/chat/api';

const contact: MessageReaction = { emoji: '👍', from: 'contact', user_id: null, at: 1 };
const mine: MessageReaction = { emoji: '👍', from: 'me', user_id: 'u1', at: 2 };
const message = (extra: Record<string, unknown> = {}) =>
  ({ id: 'm1', source_id: 'wa1', message_type: 'incoming', private: false, status: 'sent', content_attributes: {}, ...extra }) as unknown as Message;

describe('reactions', () => {
  it('groups by emoji, counting and flagging my own', () => {
    expect(groupReactions([contact, mine])).toEqual([{ emoji: '👍', count: 2, mine: true }]);
    expect(groupReactions([contact, { ...mine, emoji: '❤️' }])).toEqual([
      { emoji: '👍', count: 1, mine: false },
      { emoji: '❤️', count: 1, mine: true },
    ]);
    expect(groupReactions(undefined)).toEqual([]);
  });

  it('replaces or removes only my reaction', () => {
    const other = { ...mine, emoji: '😂' };
    expect(setMyReaction([contact, mine], other)).toEqual([contact, other]);
    expect(setMyReaction([contact, mine], null)).toEqual([contact]);
    expect(setMyReaction(undefined, mine)).toEqual([mine]);
  });

  it('only allows delivered, non private conversation messages', () => {
    expect(canReactTo(message())).toBe(true);
    expect(canReactTo(message({ message_type: 'outgoing' }))).toBe(true);
    expect(canReactTo(message({ source_id: null }))).toBe(false);
    expect(canReactTo(message({ private: true }))).toBe(false);
    expect(canReactTo(message({ message_type: 'activity' }))).toBe(false);
    expect(canReactTo(message({ content_attributes: { is_reaction: true } }))).toBe(false);
  });

  it('is only supported on WhatsApp Evolution', () => {
    const conversation = (channel_type: string, provider?: string) => ({ inbox: { channel_type, provider } }) as unknown as Conversation;
    expect(supportsReactions(conversation('Channel::Whatsapp', 'evolution'))).toBe(true);
    expect(supportsReactions(conversation('Channel::Whatsapp'), 'evolution')).toBe(true);
    expect(supportsReactions(conversation('Channel::Whatsapp', 'evolution_go'))).toBe(false);
    expect(supportsReactions(conversation('Channel::Instagram', 'evolution'))).toBe(false);
    expect(supportsReactions(null)).toBe(false);
  });

  it('detects updates to a message older than the conversation last one', () => {
    const conversation = { last_non_activity_message: { id: 'm9', created_at: '2000' } } as unknown as Conversation;
    expect(isOlderThanLastMessage(conversation, message({ created_at: 1000 }))).toBe(true);
    expect(isOlderThanLastMessage(conversation, message({ id: 'm9', created_at: 2000 }))).toBe(false);
    expect(isOlderThanLastMessage(conversation, message({ created_at: 3000 }))).toBe(false);
    expect(isOlderThanLastMessage({} as Conversation, message({ created_at: 1000 }))).toBe(false);
  });
});
