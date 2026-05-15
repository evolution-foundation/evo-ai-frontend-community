type ConversationLike = {
  id: string | number;
  uuid?: string | null;
};

// Match a conversation by either its canonical numeric id or its uuid.
// Both forms can arrive from the backend / WebSocket; comparing only against
// `id` silently misses payloads keyed by `uuid` (root cause of EVO-1118 C3).
export const matchesConversationId = (
  conv: ConversationLike | null | undefined,
  idStr: string,
): boolean => {
  if (!conv) return false;
  if (!idStr) return false;
  return String(conv.id) === idStr || String(conv.uuid || '') === idStr;
};
