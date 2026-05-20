import { useState, useEffect } from 'react';
import InboxesService from '@/services/channels/inboxesService';
import chatService from '@/services/chat/chatService';
import { labelsService } from '@/services/contacts/labelsService';
import { Inbox } from '@/types/channels/inbox';
import type { Pipeline } from '@/types/chat/api';
import type { Label } from '@/types/settings';

interface FilterOption {
  label: string;
  value: string;
}

interface FilterOptions {
  inboxes: FilterOption[];
  teams: FilterOption[];
  labels: FilterOption[];
  pipelines: FilterOption[];
  contacts: FilterOption[];
  loading: boolean;
  error: string | null;
}

interface UseFilterOptionsParams {
  enabled?: boolean;
}

export const useFilterOptions = (params: UseFilterOptionsParams = {}): FilterOptions => {
  const { enabled = true } = params;

  const [options, setOptions] = useState<FilterOptions>({
    inboxes: [],
    teams: [],
    labels: [],
    pipelines: [],
    contacts: [],
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!enabled) return;

    const loadOptions = async () => {
      setOptions(prev => ({ ...prev, loading: true, error: null }));

      try {
        // Nota: carregamento de contatos removido para evitar query pesada no backend
        // (query sem LIMIT causava statement timeout no PostgreSQL)
        const [inboxesResponse, pipelinesResponse, labelsResponse] =
          await Promise.allSettled([
            InboxesService.list(),
            chatService.getAvailablePipelines(),
            labelsService.getLabels({ per_page: 200 }),
          ]);

        const inboxes: Array<{ label: string; value: string }> = [];
        if (inboxesResponse.status === 'fulfilled') {
          inboxes.push(
            ...inboxesResponse.value.data.map((inbox: Inbox) => {
              const channelTypeName =
                inbox.channel_type?.split('::')[1] || inbox.channel_type || 'Unknown';
              return {
                label: `${inbox.name} (${channelTypeName})`,
                value: inbox.id.toString(),
              };
            }),
          );
        }

        const pipelines: Array<{ label: string; value: string }> = [];
        if (pipelinesResponse.status === 'fulfilled') {
          const pipelinesData = pipelinesResponse.value || [];
          if (Array.isArray(pipelinesData)) {
            pipelines.push(
              ...pipelinesData.map((pipeline: Pipeline) => ({
                label: pipeline.name,
                value: pipeline.id.toString(),
              })),
            );
          }
        }

        const teams: FilterOption[] = [];
        const labels: FilterOption[] = [];
        if (labelsResponse.status === 'fulfilled') {
          const labelsData = labelsResponse.value?.data ?? [];
          if (Array.isArray(labelsData)) {
            labels.push(
              ...labelsData.map((label: Label) => ({
                label: label.title,
                value: label.title,
              })),
            );
          }
        }

        // contacts removido: query sem LIMIT causava timeout no PostgreSQL
        const contacts: FilterOption[] = [];

        setOptions({
          inboxes,
          teams,
          labels,
          pipelines,
          contacts,
          loading: false,
          error: null,
        });

      } catch (error) {
        console.error('Erro ao carregar opções de filtro:', error);
        setOptions(prev => ({
          ...prev,
          loading: false,
          error: 'Erro ao carregar opções de filtro',
        }));
      }
    };

    loadOptions();
  }, [enabled]);

  return options;
};
