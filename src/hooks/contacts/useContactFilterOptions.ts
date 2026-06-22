import { useState, useEffect } from 'react';
import { labelsService } from '@/services/contacts/labelsService';
import type { Label } from '@/types/settings';

interface FilterOption {
  label: string;
  value: string;
}

interface ContactFilterOptions {
  labels: FilterOption[];
  loading: boolean;
}

interface UseContactFilterOptionsParams {
  enabled?: boolean;
}

/**
 * Loads the dynamic options for the Contacts advanced filter. Only labels are
 * dynamic today; mirrors the labels block of useFilterOptions (conversations)
 * but without the conversation-only lists (inboxes/teams/pipelines/contacts).
 */
export const useContactFilterOptions = (
  params: UseContactFilterOptionsParams = {},
): ContactFilterOptions => {
  const { enabled = true } = params;
  const [options, setOptions] = useState<ContactFilterOptions>({ labels: [], loading: false });

  useEffect(() => {
    if (!enabled) return;
    let active = true;

    const load = async () => {
      setOptions(prev => ({ ...prev, loading: true }));
      try {
        const response = await labelsService.getLabels({ per_page: 200 });
        const data = response?.data ?? [];
        // value = label.title to match filter_service tag query (compares tags.name).
        const labels = Array.isArray(data)
          ? data.map((label: Label) => ({ label: label.title, value: label.title }))
          : [];
        if (active) setOptions({ labels, loading: false });
      } catch (error) {
        console.warn('Erro ao carregar labels para o filtro de contatos:', error);
        if (active) setOptions({ labels: [], loading: false });
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [enabled]);

  return options;
};
