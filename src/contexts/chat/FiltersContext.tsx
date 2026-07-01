import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { toast } from 'sonner';
import { chatService } from '@/services/chat/chatService';
import { extractConversationsData } from '@/utils/chat/responseHelpers';
import { ConversationFilter, QuickFilterTab, Conversation, ConversationsQuery } from '@/types/chat/api';
import { PaginationMeta } from '@/types/core';
import { useLanguage } from '@/hooks/useLanguage';
import {
  convertFiltersToApiFormat,
  convertFiltersToUrlParams,
  shouldUseAdvancedFilters,
  createSearchFilter,
  combineSearchWithFilters,
} from '@/utils/chat/filterConverters';

interface FiltersState {
  // Filters
  activeFilters: ConversationFilter[];
  quickFilterTab: QuickFilterTab;
  searchTerm: string;
  isApplyingFilters: boolean;
}

type FiltersAction =
  | { type: 'SET_ACTIVE_FILTERS'; payload: ConversationFilter[] }
  | { type: 'SET_QUICK_FILTER_TAB'; payload: QuickFilterTab }
  | { type: 'SET_SEARCH_TERM'; payload: string }
  | { type: 'SET_APPLYING_FILTERS'; payload: boolean };

// 🎯 FILTRO PADRÃO = "All": todos os status (status=all). EXPLÍCITO (nunca [])
// para o matcher de realtime fazer match-all sem vazar; status é navegação
// (chips), não filtro. Baseline do realtime + alvo do "Limpar filtros".
export const DEFAULT_FILTER: ConversationFilter = {
  attribute_key: 'status',
  filter_operator: 'equal_to',
  values: ['all'],
  query_operator: 'and',
};

const initialState: FiltersState = {
  activeFilters: [DEFAULT_FILTER],
  quickFilterTab: 'all',
  searchTerm: '',
  isApplyingFilters: false,
};

function filtersReducer(state: FiltersState, action: FiltersAction): FiltersState {
  switch (action.type) {
    case 'SET_ACTIVE_FILTERS':
      return {
        ...state,
        activeFilters: action.payload,
      };

    case 'SET_QUICK_FILTER_TAB':
      return {
        ...state,
        quickFilterTab: action.payload,
      };

    case 'SET_SEARCH_TERM':
      return {
        ...state,
        searchTerm: action.payload,
      };

    case 'SET_APPLYING_FILTERS':
      return {
        ...state,
        isApplyingFilters: action.payload,
      };

    default:
      return state;
  }
}

interface FiltersContextValue {
  state: FiltersState;

  // Filter actions
  setFilters: (filters: ConversationFilter[]) => void;
  applyFilters: (
    filters: ConversationFilter[],
    onSuccess: (conversations: Conversation[], pagination: PaginationMeta, query?: ConversationsQuery) => void,
    onError: (error: string) => void,
  ) => Promise<void>;
  applySearch: (
    searchTerm: string,
    onSuccess: (conversations: Conversation[], pagination: PaginationMeta, query?: ConversationsQuery) => void,
    onError: (error: string) => void,
  ) => Promise<void>;
  setQuickFilter: (tab: QuickFilterTab) => void;
  setSearchTerm: (term: string) => void;

  // Computed values
  hasActiveFilters: boolean;
  hasSearch: boolean;
}

const FiltersContext = createContext<FiltersContextValue | undefined>(undefined);

export function FiltersProvider({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage('chat');
  const [state, dispatch] = useReducer(filtersReducer, initialState);

  // Filter actions
  const setFilters = useCallback((filters: ConversationFilter[]) => {
    dispatch({ type: 'SET_ACTIVE_FILTERS', payload: filters });
  }, []);

  const applyFilters = useCallback(
    async (
      filters: ConversationFilter[],
      onSuccess: (conversations: Conversation[], pagination: PaginationMeta, query?: ConversationsQuery) => void,
      onError: (error: string) => void,
    ) => {
      dispatch({ type: 'SET_APPLYING_FILTERS', payload: true });
      dispatch({ type: 'SET_ACTIVE_FILTERS', payload: filters });

      try {
        if (filters.length === 0) {
          // Se não há filtros, carregar conversas normais
          const response = await chatService.getConversations();
          const { conversations, pagination } = extractConversationsData(response);
          onSuccess(conversations, pagination, { kind: 'list', params: {} });
        } else if (shouldUseAdvancedFilters(filters)) {
          // Usar filtros avançados (POST /filter)
          const filterRequest = convertFiltersToApiFormat(filters);
          const response = await chatService.filterConversations(filterRequest);
          const { conversations, pagination } = extractConversationsData(response);
          onSuccess(conversations, pagination, { kind: 'filter', request: filterRequest });
        } else {
          // Usar filtros simples (GET /conversations)
          const params = convertFiltersToUrlParams(filters);
          const response = await chatService.getConversations(params);
          const { conversations, pagination } = extractConversationsData(response);
          onSuccess(conversations, pagination, { kind: 'list', params });
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : t('contexts.filters.errors.applyFilters');
        onError(errorMessage);
        toast.error(t('contexts.filters.errors.applyFilters'), {
          description: errorMessage,
        });
      } finally {
        dispatch({ type: 'SET_APPLYING_FILTERS', payload: false });
      }
    },
    [t],
  );

  const applySearch = useCallback(
    async (
      searchTerm: string,
      onSuccess: (conversations: Conversation[], pagination: PaginationMeta, query?: ConversationsQuery) => void,
      onError: (error: string) => void,
    ) => {
      dispatch({ type: 'SET_SEARCH_TERM', payload: searchTerm });

      if (!searchTerm.trim()) {
        // Se busca vazia, recarregar com filtros ativos
        if (state.activeFilters.length > 0) {
          await applyFilters(state.activeFilters, onSuccess, onError);
        } else {
          // Carregar conversas normais
          try {
            const response = await chatService.getConversations();
            const { conversations, pagination } = extractConversationsData(response);
            onSuccess(conversations, pagination, { kind: 'list', params: {} });
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : t('contexts.filters.errors.loadConversations');
            onError(errorMessage);
          }
        }
        return;
      }

      dispatch({ type: 'SET_APPLYING_FILTERS', payload: true });

      try {
        const searchParams = createSearchFilter(searchTerm);
        let finalParams = searchParams;

        // Combinar busca com filtros ativos se houver
        if (state.activeFilters.length > 0) {
          if (shouldUseAdvancedFilters(state.activeFilters)) {
            // Para filtros avançados, incluir busca no payload
            const filterRequest = {
              ...convertFiltersToApiFormat(state.activeFilters),
              q: searchTerm,
            };
            const response = await chatService.filterConversations(filterRequest);
            const { conversations, pagination } = extractConversationsData(response);
            onSuccess(conversations, pagination, { kind: 'filter', request: filterRequest });
            return;
          } else {
            const filterParams = convertFiltersToUrlParams(state.activeFilters);
            finalParams = combineSearchWithFilters(searchParams, filterParams);
          }
        }

        const response = await chatService.getConversations(finalParams);
        const { conversations, pagination } = extractConversationsData(response);
        onSuccess(conversations, pagination, { kind: 'list', params: finalParams });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : t('contexts.filters.errors.search');
        onError(errorMessage);
        toast.error(t('contexts.filters.errors.search'), {
          description: errorMessage,
        });
      } finally {
        dispatch({ type: 'SET_APPLYING_FILTERS', payload: false });
      }
    },
    [state.activeFilters, applyFilters, t],
  );

  const setQuickFilter = useCallback((tab: QuickFilterTab) => {
    dispatch({ type: 'SET_QUICK_FILTER_TAB', payload: tab });
  }, []);

  const setSearchTerm = useCallback((term: string) => {
    dispatch({ type: 'SET_SEARCH_TERM', payload: term });
  }, []);

  // Computed values
  const hasActiveFilters = state.activeFilters.length > 0;
  const hasSearch = state.searchTerm.trim().length > 0;

  const contextValue: FiltersContextValue = {
    state,
    setFilters,
    applyFilters,
    applySearch,
    setQuickFilter,
    setSearchTerm,
    hasActiveFilters,
    hasSearch,
  };

  return <FiltersContext.Provider value={contextValue}>{children}</FiltersContext.Provider>;
}

export function useFilters() {
  const context = useContext(FiltersContext);
  if (context === undefined) {
    throw new Error('useFilters must be used within a FiltersProvider');
  }
  return context;
}
