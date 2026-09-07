import { useTranslation as useUiTranslation } from 'react-i18next';
import { useState, useEffect, useCallback } from 'react';
import { Role } from '@/types/auth';
import { fetchRoles, fetchRolesFull } from '@/services/rbac';

interface UseRolesOptions {
  autoLoad?: boolean;
  loadFull?: boolean;
  type?: 'user' | 'account';
}

export default function useRoles(options: UseRolesOptions = {}) {
  const { t: tUi } = useUiTranslation();
  const { autoLoad = true, loadFull = false, type } = options;

  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRolesData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const filters = type ? { type } : undefined;
      const response = loadFull ? await fetchRolesFull(filters) : await fetchRoles(filters);
      // fetchRoles returns RoleResponse (PaginatedResponse), fetchRolesFull may return different structure
      const roles = Array.isArray(response.data) ? response.data : Array.isArray(response) ? response : [];
      setRoles(roles);
    } catch (error) {
      console.error('Erro ao buscar roles:', error);
      setError(error instanceof Error ? error.message : tUi("customMcpServers:test.unknownError"));
    } finally {
      setLoading(false);
    }
  }, [loadFull, type, tUi]);

  useEffect(() => {
    if (autoLoad) {
      fetchRolesData();
    }
  }, [autoLoad, fetchRolesData]);

  return {
    roles,
    loading,
    error,
    refetch: fetchRolesData,
  };
}
