import { DEFAULT_BASE_FILTER, type BaseFilter } from '@/types/core/filters';
import type { ConversationFilter } from '@/types/chat/api';

// Lab (Experimento #1): WhatsApp/CRM-style primary navigation modeled as preset
// filters. Each segment is just a BaseFilter[] fed through the existing
// applyFilters seam (useFilterHandlers -> FiltersContext.applyFilters), so it
// persiste, mantém o realtime matcher coerente e roteia pra GET barato. Os chips
// são mutuamente exclusivos (single-select); clicar no ativo volta pro All.

export type ConversationSegmentId = 'open' | 'pending' | 'resolved' | 'unread' | 'groups';

export interface ConversationSegment {
  id: ConversationSegmentId;
  /** i18n key in the `chat` namespace. */
  labelKey: string;
  /** Preset applied via the existing filter pipeline when the chip is clicked. */
  preset: BaseFilter[];
}

const statusFilter = (value: string): BaseFilter => ({
  ...DEFAULT_BASE_FILTER,
  attributeKey: 'status',
  filterOperator: 'equal_to',
  values: value,
});

// unread / is_group: eixos de navegação (não-status) mapeados pra params GET em
// convertFiltersToUrlParams. status ausente é injetado como 'all' lá, então estas
// views abrangem todos os status (ex.: "Não lidas" = não lidas em qualquer status).
const boolFilter = (attributeKey: 'unread' | 'is_group'): BaseFilter => ({
  ...DEFAULT_BASE_FILTER,
  attributeKey,
  filterOperator: 'equal_to',
  values: 'true',
});

export const CONVERSATION_SEGMENTS: ConversationSegment[] = [
  { id: 'open', labelKey: 'chatSidebar.segments.open', preset: [statusFilter('open')] },
  { id: 'pending', labelKey: 'chatSidebar.segments.pending', preset: [statusFilter('pending')] },
  { id: 'resolved', labelKey: 'chatSidebar.segments.resolved', preset: [statusFilter('resolved')] },
  { id: 'unread', labelKey: 'chatSidebar.segments.unread', preset: [boolFilter('unread')] },
  { id: 'groups', labelKey: 'chatSidebar.segments.groups', preset: [boolFilter('is_group')] },
];

// "All" = nenhum chip marcado (status=all). Aplicado ao clicar no chip já ativo
// (toggle-off) e como visão padrão. getActiveSegmentId retorna null aqui.
export const ALL_SEGMENT_PRESET: BaseFilter[] = [statusFilter('all')];

const hasFilter = (active: ConversationFilter[], key: string, value: string): boolean =>
  active.some(
    f =>
      f.attribute_key === key &&
      f.filter_operator === 'equal_to' &&
      (Array.isArray(f.values) ? f.values.map(String).includes(value) : String(f.values) === value),
  );

/**
 * Derive which segment the current GLOBAL activeFilters represent so the matching
 * chip can be highlighted. O eixo STATUS é refletido mesmo quando filtros avançados
 * o acompanham (Opção 1: chip de status preserva o avançado). unread/groups são
 * CHIP_ONLY e nunca coexistem com avançado, então exigem seleção única. Returns
 * null para All (status=all) ou filtro avançado sem status reconhecível.
 */
export const getActiveSegmentId = (active: ConversationFilter[]): ConversationSegmentId | null => {
  if (!active || active.length === 0) return null;
  if (active.length === 1 && hasFilter(active, 'unread', 'true')) return 'unread';
  if (active.length === 1 && hasFilter(active, 'is_group', 'true')) return 'groups';
  // status coexiste com avançado — não guardar por length, senão o chip clicado
  // não acende (e não dá pra desligar) quando há um filtro avançado ativo.
  if (hasFilter(active, 'status', 'pending')) return 'pending';
  if (hasFilter(active, 'status', 'resolved')) return 'resolved';
  if (hasFilter(active, 'status', 'open')) return 'open';
  return null;
};
