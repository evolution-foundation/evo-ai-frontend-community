/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFilterHandlers } from '../useFilterHandlers';

// Shape mirrors DEFAULT_FILTER from FiltersContext (status = open).
const DEFAULT_FILTER = {
  attribute_key: 'status',
  filter_operator: 'equal_to',
  values: ['open'],
  query_operator: 'and',
};

const mockConversations = vi.hoisted(() => ({
  setConversations: vi.fn(),
  loadConversations: vi.fn().mockResolvedValue(undefined),
}));

const mockFilters = vi.hoisted(() => ({
  setFilters: vi.fn(),
  applyFilters: vi.fn(),
  applySearch: vi.fn(),
  state: { activeFilters: [] as any[], searchTerm: '' },
}));

const mockStorage = vi.hoisted(() => ({
  clearConversationFilters: vi.fn(),
  saveConversationFilters: vi.fn(),
}));

vi.mock('@/contexts/chat/ChatContext', () => ({
  useChatContext: () => ({ conversations: mockConversations, filters: mockFilters }),
}));

vi.mock('@/contexts/chat/FiltersContext', () => ({
  DEFAULT_FILTER: {
    attribute_key: 'status',
    filter_operator: 'equal_to',
    values: ['open'],
    query_operator: 'and',
  },
}));

vi.mock('@/utils/storage/filtersStorage', () => mockStorage);

vi.mock('@/utils/chat/filterAdapters', () => ({
  convertBaseFiltersToConversationFilters: vi.fn((f: any) => f),
}));

describe('useFilterHandlers — handleClearFilters (EVO-1939)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resets the GLOBAL activeFilters to the default open filter (so badge + realtime matcher clear)', async () => {
    const { result } = renderHook(() => useFilterHandlers());

    await result.current.handleClearFilters();

    expect(mockFilters.setFilters).toHaveBeenCalledTimes(1);
    expect(mockFilters.setFilters).toHaveBeenCalledWith([DEFAULT_FILTER]);
  });

  it('clears persisted filters and reloads only open conversations', async () => {
    const { result } = renderHook(() => useFilterHandlers());

    await result.current.handleClearFilters();

    expect(mockStorage.clearConversationFilters).toHaveBeenCalledTimes(1);
    expect(mockConversations.loadConversations).toHaveBeenCalledWith({ status: 'open' });
  });
});
