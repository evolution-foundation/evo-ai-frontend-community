import { useTranslation as useUiTranslation } from 'react-i18next';
import { useState, useEffect, useCallback } from 'react';
import { contactsService } from '@/services/contacts';

interface ContactPipelineInfo {
  pipeline: {
    id: string;
    name: string;
    pipeline_type: string;
  };
  stage: {
    id: string;
    name: string;
    color: string;
    position: number;
    stage_type: number;
  };
  item: {
    id: string;
    item_id: string;
    type: string;
    entered_at: number;
    notes: string | null;
  };
}

// Cache global para armazenar os pipelines de cada contato
const pipelinesCache = new Map<string, ContactPipelineInfo[]>();
const loadingCache = new Map<string, Promise<ContactPipelineInfo[]>>();

// Limpar cache após 5 minutos
const CACHE_TTL = 5 * 60 * 1000;
const cacheTimestamps = new Map<string, number>();

function getCacheKey(contactId: string): string {
  return `${contactId}`;
}

function isCacheValid(cacheKey: string): boolean {
  const timestamp = cacheTimestamps.get(cacheKey);
  if (!timestamp) return false;
  return Date.now() - timestamp < CACHE_TTL;
}

export function useContactPipelinesCache(contactId: string) {
  const { t: tUi } = useUiTranslation();
  const [pipelines, setPipelines] = useState<ContactPipelineInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const cacheKey = getCacheKey(contactId);

  useEffect(() => {
    if (!contactId) {
      setIsLoading(false);
      return;
    }

    const loadPipelines = async () => {
      // Verificar se está no cache e ainda é válido
      if (isCacheValid(cacheKey) && pipelinesCache.has(cacheKey)) {
        setPipelines(pipelinesCache.get(cacheKey)!);
        setIsLoading(false);
        return;
      }

      // Verificar se já está carregando
      if (loadingCache.has(cacheKey)) {
        try {
          const result = await loadingCache.get(cacheKey)!;
          setPipelines(result);
          setIsLoading(false);
          return;
        } catch {
          // Continuar para tentar carregar novamente
        }
      }

      // Criar promessa de carregamento
      const loadPromise = (async (): Promise<ContactPipelineInfo[]> => {
        try {
          const data = await contactsService.getContactPipelines(contactId) as ContactPipelineInfo[];

          // Armazenar no cache
          pipelinesCache.set(cacheKey, data as ContactPipelineInfo[]);
          cacheTimestamps.set(cacheKey, Date.now());

          return data as ContactPipelineInfo[];
        } catch (err) {
          console.error('Error loading contact pipelines:', err);
          setError(err instanceof Error ? err : new Error(tUi("interface:usecontactpipelinescache.couldNotLoadPipelines")));
          setPipelines([]);
          return [];
        } finally {
          // Remover da cache de loading
          loadingCache.delete(cacheKey);
        }
      })();

      // Adicionar à cache de loading
      loadingCache.set(cacheKey, loadPromise);

      try {
        setIsLoading(true);
        const data = await loadPromise;
        setPipelines(data);
        setError(null);
      } catch (err) {
        console.error('Error loading contact pipelines:', err);
        setError(err instanceof Error ? err : new Error(tUi("interface:usecontactpipelinescache.couldNotLoadPipelines")));
        setPipelines([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadPipelines();
  }, [contactId, cacheKey, tUi]);

  // Função para invalidar o cache
  const invalidateCache = useCallback(() => {
    pipelinesCache.delete(cacheKey);
    cacheTimestamps.delete(cacheKey);
    loadingCache.delete(cacheKey);
  }, [cacheKey]);

  return {
    pipelines,
    isLoading,
    error,
    invalidateCache,
  };
}

// Função para limpar todo o cache (útil quando pipelines são atualizados)
export function clearAllPipelinesCache() {
  pipelinesCache.clear();
  cacheTimestamps.clear();
  loadingCache.clear();
}

// Função para invalidar cache de um contato específico
export function invalidateContactPipelinesCache(contactId: string) {
  const cacheKey = getCacheKey(contactId);
  pipelinesCache.delete(cacheKey);
  cacheTimestamps.delete(cacheKey);
  loadingCache.delete(cacheKey);
}
