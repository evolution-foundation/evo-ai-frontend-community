import { describe, expect, it } from 'vitest';
import { CONVERSATION_SEGMENTS, getActiveSegmentId } from './conversationSegmentsHelpers';
import type { ConversationFilter } from '@/types/chat/api';

// EVO-1963: the "Não respondidas" chip must scope to the current user + awaiting
// reply, matching the sidebar badge, and be round-trippable through getActiveSegmentId.
describe('conversationSegmentsHelpers — unanswered (EVO-1963)', () => {
  const cf = (key: string, value: string): ConversationFilter =>
    ({ attribute_key: key, filter_operator: 'equal_to', values: [value] } as unknown as ConversationFilter);

  it('has an unanswered segment scoped to me + awaiting reply', () => {
    const seg = CONVERSATION_SEGMENTS.find(s => s.id === 'unanswered');
    expect(seg).toBeDefined();
    const pairs = seg!.preset.map(f => `${f.attributeKey}=${f.values}`);
    expect(pairs).toContain('assignee_type=me');
    expect(pairs).toContain('unanswered=true');
  });

  it('detects the unanswered segment from active filters (me + unanswered)', () => {
    expect(getActiveSegmentId([cf('assignee_type', 'me'), cf('unanswered', 'true')])).toBe('unanswered');
  });

  it('does not confuse unread with unanswered', () => {
    expect(getActiveSegmentId([cf('unread', 'true')])).toBe('unread');
  });
});
