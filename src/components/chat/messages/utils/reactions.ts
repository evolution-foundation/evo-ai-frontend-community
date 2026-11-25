import { MESSAGE_TYPE, type Conversation, type Message, type MessageReaction } from '@/types/chat/api';
import { normalizeToUnixSeconds } from '@/utils/time/timeHelpers';

export const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export const myReaction = (reactions?: MessageReaction[]) =>
  reactions?.find(reaction => reaction.from === 'me') ?? null;

/** Troca (ou remove, com `null`) só a minha reação; as dos outros ficam como estão. */
export const setMyReaction = (reactions: MessageReaction[] | undefined, mine: MessageReaction | null) => [
  ...(reactions ?? []).filter(reaction => reaction.from !== 'me'),
  ...(mine ? [mine] : []),
];

export const withMyReaction = (message: Message, mine: MessageReaction | null): Message => ({
  ...message,
  content_attributes: {
    ...message.content_attributes,
    reactions: setMyReaction(message.content_attributes?.reactions, mine),
  },
});

export const groupReactions = (reactions?: MessageReaction[]) => {
  const groups = new Map<string, { emoji: string; count: number; mine: boolean }>();
  (reactions ?? []).forEach(({ emoji, from }) => {
    const group = groups.get(emoji) ?? { emoji, count: 0, mine: false };
    group.count += 1;
    group.mine ||= from === 'me';
    groups.set(emoji, group);
  });
  return Array.from(groups.values());
};

/** O WhatsApp só aceita reação em mensagem de conversa que já existe lá (`source_id`). */
export const canReactTo = (message: Message) =>
  Boolean(message.source_id) &&
  !message.private &&
  (message.message_type === MESSAGE_TYPE.INCOMING || message.message_type === MESSAGE_TYPE.OUTGOING) &&
  !message.content_attributes?.is_reaction;

export const supportsReactions = (conversation: Conversation | null | undefined, inboxProvider?: string) => {
  const inbox = conversation?.inbox as { channel_type?: string; provider?: string } | undefined;
  return (
    inbox?.channel_type === 'Channel::Whatsapp' &&
    String(inbox.provider ?? inboxProvider ?? '').toLowerCase() === 'evolution'
  );
};

/** Atualização de mensagem antiga (reação, ✓✓) não pode virar a prévia da conversa. */
export const isOlderThanLastMessage = (conversation: Conversation, message: Message) => {
  const last = conversation.last_non_activity_message;
  if (!last || String(last.id) === String(message.id)) return false;
  return normalizeToUnixSeconds(last.created_at) > normalizeToUnixSeconds(message.created_at);
};
