import { describe, expect, it } from 'vitest';
import { CONVERSATION_SEGMENTS, getActiveSegmentId } from './conversationSegmentsHelpers';
import { convertBaseFiltersToConversationFilters } from '@/utils/chat/filterAdapters';
import { shouldUseAdvancedFilters, convertFiltersToUrlParams } from '@/utils/chat/filterConverters';
import type { ConversationFilter } from '@/types/chat/api';

// The "unanswered" chip has to match the sidebar badge and reach the backend through
// the path that can filter it.
describe('conversationSegmentsHelpers — unanswered (EVO-1963)', () => {
  const cf = (key: string, value: string): ConversationFilter =>
    ({ attribute_key: key, filter_operator: 'equal_to', values: [value] } as unknown as ConversationFilter);

  const unanswered = CONVERSATION_SEGMENTS.find(s => s.id === 'unanswered')!;

  it('has an unanswered segment', () => {
    expect(unanswered).toBeDefined();
    expect(unanswered.preset.map(f => `${f.attributeKey}=${f.values}`)).toEqual(['unanswered=true']);
  });

  // A multi-row preset goes to POST /filter, which has no `unanswered` attribute.
  it('routes through the GET path, not POST /filter (single-row preset)', () => {
    const apiFilters = convertBaseFiltersToConversationFilters(unanswered.preset);
    expect(shouldUseAdvancedFilters(apiFilters)).toBe(false);
    expect(convertFiltersToUrlParams(apiFilters).unanswered).toBe(true);
  });

  it('every segment preset routes through the GET path', () => {
    for (const segment of CONVERSATION_SEGMENTS) {
      const apiFilters = convertBaseFiltersToConversationFilters(segment.preset);
      expect(shouldUseAdvancedFilters(apiFilters)).toBe(false);
    }
  });

  it('detects the unanswered segment from active filters', () => {
    expect(getActiveSegmentId([cf('unanswered', 'true')])).toBe('unanswered');
  });

  it('does not confuse unread with unanswered', () => {
    expect(getActiveSegmentId([cf('unread', 'true')])).toBe('unread');
  });
});
