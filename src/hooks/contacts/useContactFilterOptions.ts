import { useState, useEffect } from 'react';
import { labelsService } from '@/services/contacts/labelsService';
import { contactsService } from '@/services/contacts/contactsService';
import type { Label } from '@/types/settings';

interface FilterOption {
  label: string;
  value: string;
}

interface ContactFilterOptions {
  labels: FilterOption[];
  companies: FilterOption[];
  loading: boolean;
}

interface UseContactFilterOptionsParams {
  enabled?: boolean;
}

/**
 * Loads the dynamic options for the Contacts advanced filter (labels and
 * companies). Mirrors the labels block of useFilterOptions (conversations)
 * but without the conversation-only lists (inboxes/teams/pipelines/contacts).
 */
export const useContactFilterOptions = (
  params: UseContactFilterOptionsParams = {},
): ContactFilterOptions => {
  const { enabled = true } = params;
  const [options, setOptions] = useState<ContactFilterOptions>({
    labels: [],
    companies: [],
    loading: false,
  });

  useEffect(() => {
    if (!enabled) return;
    let active = true;

    const load = async () => {
      setOptions(prev => ({ ...prev, loading: true }));
      const [labelsResult, companiesResult] = await Promise.allSettled([
        labelsService.getLabels({ per_page: 200 }),
        contactsService.getCompaniesList(),
      ]);

      // value = label.title to match filter_service tag query (compares tags.name).
      const labelData = labelsResult.status === 'fulfilled' ? (labelsResult.value?.data ?? []) : [];
      const labels = Array.isArray(labelData)
        ? labelData.map((label: Label) => ({ label: label.title, value: label.title }))
        : [];
      if (labelsResult.status === 'rejected') {
        console.warn('Erro ao carregar labels para o filtro de contatos:', labelsResult.reason);
      }

      // value = company id (UUID) to match filter_service company query (contact_companies.company_id).
      const companyData = companiesResult.status === 'fulfilled' ? companiesResult.value : [];
      const companies = Array.isArray(companyData)
        ? companyData.map(company => ({ label: company.name, value: company.id }))
        : [];
      if (companiesResult.status === 'rejected') {
        console.warn('Erro ao carregar empresas para o filtro de contatos:', companiesResult.reason);
      }

      if (active) setOptions({ labels, companies, loading: false });
    };

    load();
    return () => {
      active = false;
    };
  }, [enabled]);

  return options;
};
