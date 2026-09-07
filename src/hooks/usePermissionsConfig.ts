import { useTranslation as useUiTranslation } from 'react-i18next';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { permissionsService } from '@/services/permissions';
import type { ResourceActionsResponse, PermissionDetail } from '@/types/auth';

interface UsePermissionsConfigReturn {
  // Dados das permissões
  permissions: string[];
  resources: string[];
  actions: string[];
  permissionsWithDetails: PermissionDetail[];

  // Estado de loading/erro
  loading: boolean;
  error: string | null;

  // Métodos utilitários
  createPermission: (resource: string, action: string) => string;
  isValidPermission: (permission: string) => boolean;
  getPermissionDisplayName: (permission: string) => string;

  // Controle de cache
  refresh: () => Promise<void>;
  clearCache: () => void;
  cacheStatus: { cached: boolean; expiresIn: number };

  // Metadados
  meta: {
    totalResources: number;
    totalPermissions: number;
    lastUpdated: string | null;
  };
}

/**
 * Hook para gerenciar configurações de permissões do backend
 * Busca dinamicamente os recursos e ações do evo-auth-service
 *
 * ⚠️ DEPRECATED: Use usePermissions do PermissionsContext quando possível
 * Este hook ainda existe para compatibilidade com código legado
 */
export const usePermissionsConfig = (): UsePermissionsConfigReturn => {
  const { t: tUi } = useUiTranslation();
  const [data, setData] = useState<ResourceActionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ⚡ Proteção: evitar múltiplas chamadas simultâneas
  const fetchCalledRef = useRef(false);

  // Buscar configurações do backend
  const fetchPermissions = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      const response = await permissionsService.getResourceActions(forceRefresh);
      setData(response);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : tUi("interface:usepermissionsconfig.couldNotLoadPermissions");
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [tUi]);

  useEffect(() => {
    // ⚡ Proteção: carregar apenas uma vez por instância
    if (fetchCalledRef.current) return;

    const checkAuthAndFetch = async () => {
      const { useAuthStore } = await import('@/store/authStore');
      const isAuthenticated = useAuthStore.getState().isLoggedIn;

      if (isAuthenticated) {
        fetchCalledRef.current = true;
        await fetchPermissions();
      }
    };

    checkAuthAndFetch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Método para forçar refresh
  const refresh = useCallback(async () => {
    await fetchPermissions(true);
  }, [fetchPermissions]);

  // Limpar cache
  const clearCache = useCallback(() => {
    permissionsService.clearCache();
    fetchPermissions(true);
  }, [fetchPermissions]);

  // Status do cache
  const cacheStatus = useMemo(() => {
    return permissionsService.getCacheStatus();
  }, []);

  // Dados memoizados - TODAS as permissões disponíveis no sistema (metadata)
  const permissions = useMemo(() => {
    if (!data?.data?.all_permissions) return [];

    return data.data.all_permissions
      .map(p => {
        if (typeof p === 'string') return p;
        if (p && typeof p === 'object' && 'key' in p) return p.key;
        return null;
      })
      .filter((key): key is string => key !== null);
  }, [data]);

  const resources = useMemo(() => {
    if (!data?.data?.resources) return [];
    return Object.keys(data.data.resources);
  }, [data]);

  const actions = useMemo(() => {
    if (!data?.data?.resources) return [];

    const actionsSet = new Set<string>();
    Object.values(data.data.resources).forEach(resource => {
      if (resource && typeof resource === 'object' && 'actions' in resource) {
        Object.keys(resource.actions).forEach(action => {
          actionsSet.add(action);
        });
      }
    });

    return Array.from(actionsSet).sort();
  }, [data]);

  const permissionsWithDetails = useMemo(() => {
    return data?.data?.all_permissions || [];
  }, [data]);

  const meta = useMemo(() => {
    return {
      totalResources: data?.meta?.total_resources || 0,
      totalPermissions: data?.meta?.total_permissions || 0,
      lastUpdated: data?.meta?.last_updated || null,
    };
  }, [data]);

  // Métodos utilitários
  const createPermission = useCallback((resource: string, action: string): string => {
    return `${resource}.${action}`;
  }, []);

  const isValidPermission = useCallback((permission: string): boolean => {
    return permissions.includes(permission);
  }, [permissions]);

  const getPermissionDisplayName = useCallback((permission: string): string => {
    const permissionDetail = permissionsWithDetails.find(p => p.key === permission);
    return permissionDetail?.display_name || permission;
  }, [permissionsWithDetails]);

  return {
    // Dados
    permissions,
    resources,
    actions,
    permissionsWithDetails,

    // Estado
    loading,
    error,

    // Métodos
    createPermission,
    isValidPermission,
    getPermissionDisplayName,

    // Cache
    refresh,
    clearCache,
    cacheStatus,

    // Meta
    meta,
  };
};

export default usePermissionsConfig;
