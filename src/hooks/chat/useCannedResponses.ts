import { useTranslation as useUiTranslation } from 'react-i18next';
import { useState, useEffect, useCallback } from 'react';
import { cannedResponsesService } from '@/services/cannedResponses/cannedResponsesService';
import type { CannedResponse } from '@/types/knowledge';

interface UseCannedResponsesOptions {
  enabled?: boolean;
}

interface UseCannedResponsesReturn {
  cannedResponses: CannedResponse[];
  isLoading: boolean;
  error: string | null;
  searchCannedResponses: (query: string) => CannedResponse[];
  reloadCannedResponses: () => Promise<void>;
}

/**
 * Hook customizado para gerenciar canned responses
 *
 * Features:
 * - Cache local das respostas prontas
 * - Busca/filtro em tempo real
 * - Reload manual quando necessário
 */
export const useCannedResponses = ({
  enabled = true,
}: UseCannedResponsesOptions): UseCannedResponsesReturn => {
  const { t: tUi } = useUiTranslation();
  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar canned responses ao montar o componente
  const loadCannedResponses = useCallback(async () => {
    if (!enabled) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await cannedResponsesService.getCannedResponses();
      setCannedResponses(response.data);
    } catch (err) {
      console.error('Error loading canned responses:', err);
      setError(tUi("interface:usecannedresponses.couldNotLoadCannedResponses"));
      setCannedResponses([]);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, tUi]);

  useEffect(() => {
    loadCannedResponses();
  }, [loadCannedResponses]);

  // Função de busca/filtro otimizada
  const searchCannedResponses = useCallback(
    (query: string): CannedResponse[] => {
      if (!query.trim()) {
        return cannedResponses;
      }

      const normalizedQuery = query.toLowerCase().trim();

      return cannedResponses.filter(cannedResponse => {
        const matchesShortCode = cannedResponse.short_code.toLowerCase().includes(normalizedQuery);
        const matchesContent = cannedResponse.content.toLowerCase().includes(normalizedQuery);

        return matchesShortCode || matchesContent;
      });
    },
    [cannedResponses],
  );

  // Função para recarregar manualmente
  const reloadCannedResponses = useCallback(async () => {
    await loadCannedResponses();
  }, [loadCannedResponses]);

  return {
    cannedResponses,
    isLoading,
    error,
    searchCannedResponses,
    reloadCannedResponses,
  };
};
