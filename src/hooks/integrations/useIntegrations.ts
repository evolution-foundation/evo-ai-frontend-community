import i18n from '@/i18n/config';
import { useTranslation as useUiTranslation } from 'react-i18next';
import { useState, useEffect, useCallback } from 'react';
import { Integration } from '@/types/integrations';
import { integrationsService } from '@/services/integrations';
import { toast } from 'sonner';

interface UseIntegrationsOptions {
  autoLoad?: boolean;
  category?: string;
}

interface UseIntegrationsReturn {
  integrations: Integration[];
  loading: boolean;
  error: string | null;
  loadIntegrations: () => Promise<void>;
  toggleIntegration: (integration: Integration) => Promise<void>;
  filterByCategory: (category: string) => Integration[];
  searchIntegrations: (query: string) => Integration[];
  getIntegrationById: (id: string) => Integration | undefined;
  refreshIntegration: (id: string) => Promise<void>;
}

export function useIntegrations(options: UseIntegrationsOptions = {}): UseIntegrationsReturn {
  const { t: tUi } = useUiTranslation();
  const { autoLoad = true, category } = options;
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadIntegrations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await integrationsService.getIntegrations();
      setIntegrations(response.data);
    } catch (err) {
      const errorMessage = tUi("integrations:messages.loadError");
      setError(errorMessage);
      console.error('Error loading integrations:', err);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [tUi]);

  const toggleIntegration = useCallback(
    async (integration: Integration) => {
      try {
        if (integration.enabled) {
          // Special handling for OAuth integrations
          if (['slack', 'hubspot', 'linear', 'shopify'].includes(integration.id)) {
            await integrationsService.deleteIntegration(integration.id);
          } else {
            await integrationsService.toggleIntegration(integration.id, false);
          }
          toast.success(i18n.t("interface:dynamic.integrationDisconnected", { integration: integration.name }));
        } else {
          // Check if it's an OAuth integration that needs redirect
          if (integration.action && integration.action.startsWith('http')) {
            // OAuth flow - redirect to provider
            window.location.href = integration.action;
            return;
          } else {
            await integrationsService.toggleIntegration(integration.id, true);
            toast.success(i18n.t("interface:dynamic.integrationConnected", { integration: integration.name }));
          }
        }

        // Reload integrations
        await loadIntegrations();
      } catch (err) {
        console.error('Error toggling integration:', err);
        toast.error(tUi("integrations:messages.toggleError"));
        throw err;
      }
    },
    [loadIntegrations, tUi],
  );

  const filterByCategory = useCallback(
    (categoryFilter: string) => {
      if (categoryFilter === 'all') return integrations;

      const CATEGORY_MAP: Record<string, string> = {
        bms: 'crm',
        leadsquared: 'crm',
        hubspot: 'crm',
        slack: 'communication',
        dyte: 'communication',
        google_translate: 'communication',
        linear: 'productivity',
        shopify: 'productivity',
        openai: 'ai',
        dialogflow: 'ai',
        webhook: 'custom',
        dashboard_apps: 'custom',
        oauth_applications: 'custom',
      };

      return integrations.filter(integration => {
        const integrationCategory = CATEGORY_MAP[integration.id] || 'custom';
        return integrationCategory === categoryFilter;
      });
    },
    [integrations],
  );

  const searchIntegrations = useCallback(
    (query: string) => {
      if (!query.trim()) return integrations;

      const searchQuery = query.toLowerCase();
      return integrations.filter(
        integration =>
          integration.name.toLowerCase().includes(searchQuery) ||
          integration.description.toLowerCase().includes(searchQuery),
      );
    },
    [integrations],
  );

  const getIntegrationById = useCallback(
    (id: string) => {
      return integrations.find(integration => integration.id === id);
    },
    [integrations],
  );

  const refreshIntegration = useCallback(async (id: string) => {
    try {
      const response = await integrationsService.getIntegration(id);
      setIntegrations(prev =>
        prev.map(integration => (integration.id === id ? response : integration)),
      );
    } catch (err) {
      console.error('Error refreshing integration:', err);
      toast.error(tUi("interface:useintegrations.couldNotUpdateIntegration"));
      throw err;
    }
  }, [tUi]);

  useEffect(() => {
    if (autoLoad) {
      loadIntegrations();
    }
  }, [autoLoad, loadIntegrations]);

  return {
    integrations: category ? filterByCategory(category) : integrations,
    loading,
    error,
    loadIntegrations,
    toggleIntegration,
    filterByCategory,
    searchIntegrations,
    getIntegrationById,
    refreshIntegration,
  };
}
