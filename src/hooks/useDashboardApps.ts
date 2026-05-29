import { useState, useEffect, useCallback, useRef } from 'react';
import { integrationsService } from '@/services/integrations';
import { DashboardApp } from '@/types/integrations';
import type { DashboardAppsResponse } from '@/types/integrations';

type DashboardAppsDisplayType = 'sidebar' | 'conversation' | 'all';

interface UseDashboardAppsOptions {
  /**
   * Auto-load apps on mount
   * Set to false to manually trigger load (better for performance)
   * @default true
   */
  autoLoad?: boolean;

  /**
   * Delay in ms before auto-loading
   * Useful to defer non-critical loads
   * @default 0
   */
  loadDelay?: number;

  /**
   * Filter applied to the returned dashboard apps.
   * @default 'sidebar'
   */
  displayType?: DashboardAppsDisplayType;
}

const DISPLAY_TYPES: DashboardAppsDisplayType[] = ['sidebar', 'conversation', 'all'];

// Cache global para evitar múltiplas chamadas
const dashboardAppsCache = new Map<DashboardAppsDisplayType, DashboardApp[] | null>(
  DISPLAY_TYPES.map(type => [type, null]),
);
const dashboardAppsPromise = new Map<DashboardAppsDisplayType, Promise<DashboardAppsResponse> | null>(
  DISPLAY_TYPES.map(type => [type, null]),
);

const filterDashboardApps = (
  apps: DashboardApp[],
  displayType: DashboardAppsDisplayType,
): DashboardApp[] => {
  if (displayType === 'all') {
    return apps;
  }

  return apps.filter(app => app.display_type === displayType);
};

/**
 * Hook to load and manage dashboard apps.
 * Defaults to `displayType = 'sidebar'` for menu integration, but can also load
 * `conversation` apps for the chat tabs.
 *
 * ⚡ Usa cache global para evitar múltiplas chamadas simultâneas
 *
 * @param options - Configuration options
 * @returns Dashboard apps state and actions
 */
export function useDashboardApps(options: UseDashboardAppsOptions = {}) {
  const { autoLoad = true, loadDelay = 0, displayType = 'sidebar' } = options;
  const [apps, setApps] = useState<DashboardApp[]>(dashboardAppsCache.get(displayType) ?? []);
  const [loading, setLoading] = useState(autoLoad);
  const [error, setError] = useState<Error | null>(null);

  // ⚡ Proteção: evitar múltiplas chamadas
  const loadCalledRef = useRef(false);

  const loadApps = useCallback(async () => {
    const cachedApps = dashboardAppsCache.get(displayType);
    if (cachedApps != null) {
      setApps(cachedApps);
      setLoading(false);
      return;
    }

    // ⚡ Se já está carregando, aguarda a promise existente
    const existingPromise = dashboardAppsPromise.get(displayType);
    if (existingPromise) {
      try {
        const result = await existingPromise;
        const filteredApps = filterDashboardApps(result.data, displayType);
        setApps(filteredApps);
        setLoading(false);
      } catch (err) {
        setError(err as Error);
        setLoading(false);
      }
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const requestPromise = integrationsService.getDashboardApps();
      dashboardAppsPromise.set(displayType, requestPromise);

      const response = await requestPromise;

      const filteredApps = filterDashboardApps(response.data, displayType);

      dashboardAppsCache.set(displayType, filteredApps);
      setApps(filteredApps);
    } catch (err) {
      console.error('Error loading dashboard apps:', err);
      setError(err as Error);
      setApps([]);
      dashboardAppsCache.set(displayType, null);
    } finally {
      setLoading(false);
      dashboardAppsPromise.delete(displayType);
    }
  }, [displayType]);

  useEffect(() => {
    if (!autoLoad) {
      setLoading(false);
      return;
    }

    // ⚡ Proteção: carregar apenas uma vez por instância
    if (loadCalledRef.current) return;

    if (loadDelay > 0) {
      const timer = setTimeout(() => {
        loadCalledRef.current = true;
        loadApps();
      }, loadDelay);
      return () => clearTimeout(timer);
    }

    loadCalledRef.current = true;
    loadApps();
  }, [loadApps, autoLoad, loadDelay]);

  return {
    apps,
    loading,
    error,
    reload: loadApps,
  };
}
