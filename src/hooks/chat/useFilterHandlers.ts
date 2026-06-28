import { useCallback } from 'react';
import { useChatContext } from '@/contexts/chat/ChatContext';
import { DEFAULT_FILTER } from '@/contexts/chat/FiltersContext';
import { BaseFilter } from '@/types/core';
import { convertBaseFiltersToConversationFilters } from '@/utils/chat/filterAdapters';
import { saveConversationFilters, clearConversationFilters } from '@/utils/storage/filtersStorage';

export const useFilterHandlers = () => {
  const { conversations, filters } = useChatContext();

  const handleApplyFilters = useCallback(
    async (newFilters: BaseFilter[]) => {
      // Converter BaseFilter para ConversationFilter e aplicar
      const apiFilters = convertBaseFiltersToConversationFilters(newFilters);

      return new Promise<void>((resolve, reject) => {
        filters.applyFilters(
          apiFilters,
          (conversationsResult, pagination, query) => {
            // Atualizar o estado das conversas com os resultados do filtro
            conversations.setConversations(conversationsResult, pagination, query);

            // 💾 PERSISTIR: Salvar filtros aplicados no localStorage
            saveConversationFilters(newFilters);
            resolve();
          },
          error => {
            // Erro - mostrar mensagem e rejeitar promise
            console.error('❌ Erro ao aplicar filtros:', error);
            reject(error);
          },
        );
      });
    },
    [filters, conversations],
  );

  const handleClearFilters = useCallback(async () => {
    try {
      // 🗑️ LIMPAR: Remover filtros salvos do localStorage
      clearConversationFilters();

      // EVO-1939: resetar o estado GLOBAL para o filtro padrão (status=open).
      // Sem isso o badge e o matcher de conversas em tempo real (ChatContext)
      // continuam usando os filtros antigos — o usuário "limpa" mas a UI não some.
      filters.setFilters([DEFAULT_FILTER]);

      // 🎯 FILTRO PADRÃO: Carregar apenas conversas abertas ao limpar filtros
      await conversations.loadConversations({ status: 'open' });
    } catch (error) {
      console.error('❌ Erro inesperado ao limpar filtros:', error);
    }
  }, [conversations, filters]);

  // 🔄 FUNÇÃO PARA RECARREGAR FILTROS: Reaplicar filtros atuais após mudanças
  const reloadCurrentFilters = useCallback(async () => {
    try {
      // Se há filtros ativos, reaplicar
      if (filters.state.activeFilters.length > 0) {
        await filters.applyFilters(
          filters.state.activeFilters,
          (conversationsResult, pagination, query) => {
            conversations.setConversations(conversationsResult, pagination, query);
          },
          error => {
            console.error('❌ Erro ao recarregar filtros:', error);
          },
        );
      }
      // Se há busca ativa, reaplicar busca
      else if (filters.state.searchTerm.trim().length > 0) {
        await filters.applySearch(
          filters.state.searchTerm,
          (conversationsResult, pagination, query) => {
            conversations.setConversations(conversationsResult, pagination, query);
          },
          error => {
            console.error('❌ Erro ao recarregar busca:', error);
          },
        );
      }
      // 🎯 FILTRO PADRÃO: Se não há filtros nem busca, carregar apenas conversas abertas
      else {
        await conversations.loadConversations({ status: 'open' });
      }
    } catch (error) {
      console.error('❌ Erro inesperado ao recarregar filtros:', error);
    }
  }, [filters, conversations]);

  return {
    handleApplyFilters,
    handleClearFilters,
    reloadCurrentFilters,
  };
};
