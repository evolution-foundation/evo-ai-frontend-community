import { useState, useEffect } from 'react';
import InboxesService from '@/services/channels/inboxesService';
import chatService from '@/services/chat/chatService';
import { contactsService } from '@/services/contacts/contactsService';
import { labelsService } from '@/services/contacts/labelsService';
import { Inbox } from '@/types/channels/inbox';
import type { Pipeline } from '@/types/chat/api';
import type { Contact } from '@/types/contacts/contact';
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
  /**
   * Se false, não carrega dados automaticamente
   * Útil para carregar apenas quando modal é aberto
   * @default true
   */
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
        // ✅ Carregar inboxes, pipelines, contatos e labels em paralelo.
        // Labels: per_page: 200 evita truncamento silencioso para contas com
        // mais de 20 labels (default da paginação do /labels endpoint).
        const [inboxesResponse, pipelinesResponse, contactsResponse, labelsResponse] =
          await Promise.allSettled([
            InboxesService.list(),
            chatService.getAvailablePipelines(),
            contactsService.getContacts({ per_page: 100, sort: 'last_activity_at', order: 'desc' }),
            labelsService.getLabels({ per_page: 200 }),
          ]);

        // ✅ Processar inboxes
        const inboxes: Array<{ label: string; value: string }> = [];
        if (inboxesResponse.status === 'fulfilled') {
          inboxes.push(
            ...inboxesResponse.value.data.map((inbox: Inbox) => {
              // Extrair o nome do tipo do canal (ex: "Channel::Whatsapp" -> "WhatsApp")
              const channelTypeName =
                inbox.channel_type?.split('::')[1] || inbox.channel_type || 'Unknown';
              return {
                label: `${inbox.name} (${channelTypeName})`,
                value: inbox.id.toString(),
              };
            }),
          );
        }

        // ✅ Processar pipelines
        const pipelines: Array<{ label: string; value: string }> = [];
        if (pipelinesResponse.status === 'fulfilled') {
          // O chatService já processa a resposta e retorna Pipeline[]
          const pipelinesData = pipelinesResponse.value || [];

          if (Array.isArray(pipelinesData)) {
            pipelines.push(
              ...pipelinesData.map((pipeline: Pipeline) => ({
                label: pipeline.name,
                value: pipeline.id.toString(),
              })),
            );
          } else {
            console.warn('⚠️ Pipelines data não é um array:', pipelinesData);
          }
        }

        const teams: FilterOption[] = [];
        const labels: FilterOption[] = [];
        if (labelsResponse.status === 'fulfilled') {
          const labelsData = labelsResponse.value?.data ?? [];
          if (Array.isArray(labelsData)) {
            // Value = label.title to match filter_service#tag_filter_query, which
            // compares against tags.name. Using label.id (UUID) here would never hit.
            labels.push(
              ...labelsData.map((label: Label) => ({
                label: label.title,
                value: label.title,
              })),
            );
          }
        }

        const contacts: FilterOption[] = [];
        if (contactsResponse.status === 'fulfilled') {
          const contactsData = contactsResponse.value?.data ?? [];
          if (Array.isArray(contactsData)) {
            contacts.push(
              ...contactsData.map((contact: Contact) => {
                const identifier = contact.email || contact.phone_number || contact.identifier || '';
                const label = identifier ? `${contact.name} (${identifier})` : contact.name;
                return {
                  label,
                  value: String(contact.id),
                };
              }),
            );
          }
        }

        setOptions({
          inboxes,
          teams,
          labels,
          pipelines,
          contacts,
          loading: false,
          error: null,
        });

        // ✅ Log de erros individuais sem falhar o hook
        if (inboxesResponse.status === 'rejected') {
          console.warn('Erro ao carregar inboxes:', inboxesResponse.reason);
        }
        if (pipelinesResponse.status === 'rejected') {
          console.warn('Erro ao carregar pipelines:', pipelinesResponse.reason);
        }
        if (contactsResponse.status === 'rejected') {
          console.warn('Erro ao carregar contatos:', contactsResponse.reason);
        }
        if (labelsResponse.status === 'rejected') {
          console.warn('Erro ao carregar labels:', labelsResponse.reason);
        }
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
