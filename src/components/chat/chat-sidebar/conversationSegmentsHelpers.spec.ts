import { describe, expect, it } from 'vitest';
import { CONVERSATION_SEGMENTS, getActiveSegmentId } from './conversationSegmentsHelpers';
import { convertBaseFiltersToConversationFilters } from '@/utils/chat/filterAdapters';
import { shouldUseAdvancedFilters, convertFiltersToUrlParams } from '@/utils/chat/filterConverters';
import type { ConversationFilter } from '@/types/chat/api';

// EVO-1963: o chip "Não respondidas" tem que bater com o badge da sidebar E chegar no
// backend pela via que sabe filtrá-lo.
describe('conversationSegmentsHelpers — unanswered (EVO-1963)', () => {
  const cf = (key: string, value: string): ConversationFilter =>
    ({ attribute_key: key, filter_operator: 'equal_to', values: [value] } as unknown as ConversationFilter);

  const unanswered = CONVERSATION_SEGMENTS.find(s => s.id === 'unanswered')!;

  it('has an unanswered segment', () => {
    expect(unanswered).toBeDefined();
    expect(unanswered.preset.map(f => `${f.attributeKey}=${f.values}`)).toEqual(['unanswered=true']);
  });

  // O bug que isto trava: o preset original tinha 2 linhas (assignee_type=me +
  // unanswered=true). shouldUseAdvancedFilters devolve true pra qualquer preset com
  // mais de uma linha, então o chip ia pro POST /conversations/filter — onde
  // `unanswered` não é atributo conhecido e a resposta é 400 InvalidAttribute.
  // O recorte "minhas" mora no backend (ConversationFinder#apply_unanswered_filter).
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
