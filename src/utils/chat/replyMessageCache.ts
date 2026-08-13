import { Message } from '@/types/chat/api';
import { chatService } from '@/services/chat/chatService';

// Module-level (not React state) cache of messages fetched individually to
// resolve a "reply preview" that points outside the currently loaded page of
// a conversation. Shared across every MessageBubble instance so multiple
// replies to the same older message only trigger one network request, and
// survives remounts within the session (no reason to refetch an immutable
// past message).
const cache = new Map<string, Message>();
const inFlight = new Map<string, Promise<Message | null>>();

export function getCachedReplyMessage(messageId: string): Message | undefined {
  return cache.get(messageId);
}

// Fetches a message by id and caches it. Dedupes concurrent callers for the
// same id (common: several bubbles in the same batch replying to one older
// message all mount around the same time). Resolves null on failure (e.g.
// the message was deleted) rather than throwing - callers show the existing
// "no content" fallback in that case.
export function fetchReplyMessage(
  conversationId: string,
  messageId: string,
): Promise<Message | null> {
  const cached = cache.get(messageId);
  if (cached) return Promise.resolve(cached);

  const pending = inFlight.get(messageId);
  if (pending) return pending;

  const request = chatService
    .getMessage(conversationId, messageId)
    .then(message => {
      cache.set(messageId, message);
      return message;
    })
    .catch(() => null)
    .finally(() => {
      inFlight.delete(messageId);
    });

  inFlight.set(messageId, request);
  return request;
}
