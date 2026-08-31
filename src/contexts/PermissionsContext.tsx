import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useAuthStore } from '@/store/authStore';
import { permissionsService } from '@/services/permissions';
import PermissionsLoadFailure from '@/components/permissions/PermissionsLoadFailure';
import type { ResourceActionsResponse } from '@/types/auth';

interface PermissionsContextValue {
  // Permissões
  userPermissions: string[];
  accountPermissions: string[];

  // Métodos de verificação
  can: (resource: string, action: string, type?: 'account' | 'user') => boolean;
  canAny: (permissions: string[], type?: 'account' | 'user') => boolean;
  canAll: (permissions: string[], type?: 'account' | 'user') => boolean;

  // Estado
  loading: boolean;
  isReady: boolean;
  loadFailed: boolean;
  error: string | null;

  // Métodos utilitários
  refreshPermissions: () => Promise<void>;
  createPermission: (resource: string, action: string) => string;
  isValidPermission: (permission: string) => boolean;
  getPermissionDisplayName: (permission: string) => string;
}

type FetchStatus = 'pending' | 'loaded' | 'failed';

export const PermissionsContext = createContext<PermissionsContextValue | undefined>(undefined);

interface PermissionsProviderProps {
  children: React.ReactNode;
  // Whether a failed load replaces the tree with the failure panel (CRM-164).
  // Default true for the embedded shell, which mounts this provider but not
  // RouterGuard. The standalone app opts out — see App.tsx.
  blockOnLoadFailure?: boolean;
}

export const PermissionsProvider: React.FC<PermissionsProviderProps> = ({
  children,
  blockOnLoadFailure = true,
}) => {
  const { user } = useAuth();

  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [accountPermissions, setAccountPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Outcome of each permission fetch. Only `loaded` means the list can be
  // trusted, including a legitimately empty one: `pending` covers the render
  // before the fetch effect runs, `failed` an empty list that is really a load
  // error and not a denial (CRM-164).
  const [userPermsStatus, setUserPermsStatus] = useState<FetchStatus>('pending');
  const [accountPermsStatus, setAccountPermsStatus] = useState<FetchStatus>('pending');

  // Config state
  const [resourceActions, setResourceActions] = useState<ResourceActionsResponse | null>(null);
  const [configLoading, setConfigLoading] = useState(false);

  // Reset on user change so the next user's fetch cycle runs before `isReady`
  // flips back to true.
  useEffect(() => {
    setUserPermsStatus('pending');
    setAccountPermsStatus('pending');
  }, [user?.id]);

  // Load permissions config (metadata)
  useEffect(() => {

    const loadConfig = async () => {
      const isAuthenticated = useAuthStore.getState().isLoggedIn;
      if (!isAuthenticated) return;

      try {
        setConfigLoading(true);
        const config = await permissionsService.getResourceActions();
        setResourceActions(config);
      } catch (err) {
        console.error('Error loading permissions config:', err);
      } finally {
        setConfigLoading(false);
      }
    };

    loadConfig();
  }, []);

  // Load user permissions
  useEffect(() => {
    if (!user?.id) {
      setUserPermissions([]);
      setUserPermsStatus('loaded');
      setLoading(false); // a cancelled leg no longer clears it in its `finally`
      return;
    }

    // The fetch can outlive the effect. Without this flag an orphaned rejection
    // would stamp `failed` over a context a newer success already loaded.
    let cancelled = false;

    const loadUserPermissions = async () => {
      try {
        const isAuthenticated = useAuthStore.getState().isLoggedIn;
        if (!isAuthenticated) {
          if (cancelled) return;
          setUserPermissions([]);
          setUserPermsStatus('loaded');
          return;
        }

        setLoading(true);
        setError(null);
        const permissions = await permissionsService.getUserPermissions();
        if (cancelled) return;
        setUserPermissions(permissions);
        setUserPermsStatus('loaded');
      } catch (error) {
        if (cancelled) return;
        console.error('Erro ao carregar permissões do usuário:', error);
        setError('Erro ao carregar permissões do usuário');
        setUserPermissions([]);
        setUserPermsStatus('failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadUserPermissions();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Load account permissions (específicas do account baseadas no AccountUser role)
  useEffect(() => {
    // Verificar autenticação primeiro - precisa ter user também
    const isAuthenticated = useAuthStore.getState().isLoggedIn;
    if (!isAuthenticated || !user) {
      setAccountPermissions([]);
      setAccountPermsStatus('loaded');
      setLoading(false); // see the user-permissions effect
      return;
    }

    // ⚡ Proteção: não carregar se já tem permissões (evita recarregar desnecessariamente)
    if (accountPermissions.length > 0) {
      setAccountPermsStatus('loaded');
      setLoading(false);
      return;
    }

    // See the user-permissions effect.
    let cancelled = false;

    const loadAccountPermissions = async () => {
      try {
        const isAuthenticated = useAuthStore.getState().isLoggedIn;

        if (!isAuthenticated) {
          if (cancelled) return;
          setAccountPermissions([]);
          setAccountPermsStatus('loaded');
          return;
        }

        setLoading(true);
        setError(null);
        const permissions = await permissionsService.getAccountPermissions();

        if (cancelled) return;
        setAccountPermissions(permissions);
        setAccountPermsStatus('loaded');
      } catch (error) {
        if (cancelled) return;
        console.error('Erro ao carregar permissões do account:', error);
        setError('Erro ao carregar permissões do account');
        setAccountPermissions([]);
        setAccountPermsStatus('failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadAccountPermissions();

    return () => {
      cancelled = true;
    };
  }, [user, accountPermissions.length]);

  const createPermission = useCallback((resource: string, action: string): string => {
    return `${resource}.${action}`;
  }, []);

  const isValidPermission = useCallback(
    (permission: string): boolean => {
      if (!resourceActions) return true; // Se não tiver config, aceita
      return resourceActions.data?.all_permissions?.some(p => p.key === permission) || false;
    },
    [resourceActions],
  );

  const getPermissionDisplayName = useCallback(
    (permission: string): string => {
      if (!resourceActions) return permission;
      const perm = resourceActions.data?.all_permissions?.find(p => p.key === permission);
      return perm?.display_name || permission;
    },
    [resourceActions],
  );

  // Data-driven by design: the answer comes only from the granted permission
  // list. Do NOT add a role short-circuit (e.g. "super_admin sees everything") —
  // the backend has no such bypass either (its resource gate and /permissions
  // are row-based), so a UI shortcut would render controls the API then 403s.
  // Guarded by PermissionsContext.spec.tsx.
  const can = useCallback(
    (resource: string, action: string, type: 'account' | 'user' = 'account'): boolean => {
      const permission = createPermission(resource, action);
      const permissionsArray = type === 'user' ? userPermissions : accountPermissions;

      // Se ainda está carregando e não há permissões, aguardar
      if (loading && permissionsArray.length === 0) {
        return false;
      }

      // Se não está carregando mas não há permissões, retornar false
      if (permissionsArray.length === 0) {
        return false;
      }

      if (error && permissionsArray.length > 0) {
        const hasPermission = permissionsArray.includes(permission);
        return hasPermission;
      }

      if (!error && !isValidPermission(permission)) {
        return false;
      }

      const hasPermission = permissionsArray.includes(permission);
      return hasPermission;
    },
    [
      createPermission,
      userPermissions,
      accountPermissions,
      error,
      isValidPermission,
      loading,
    ],
  );

  const canAny = useCallback(
    (permissions: string[], type: 'account' | 'user' = 'account'): boolean => {
      const permissionsArray = type === 'user' ? userPermissions : accountPermissions;
      return permissions.some(permission => permissionsArray.includes(permission));
    },
    [userPermissions, accountPermissions],
  );

  const canAll = useCallback(
    (permissions: string[], type: 'account' | 'user' = 'account'): boolean => {
      const permissionsArray = type === 'user' ? userPermissions : accountPermissions;
      return permissions.every(permission => permissionsArray.includes(permission));
    },
    [userPermissions, accountPermissions],
  );

  const refreshPermissions = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    // allSettled, not sequential awaits: a rejected user fetch used to skip the
    // account one, so a retry could never refresh a stale account list. A failed
    // leg keeps its last list — `isReady` is false either way.
    const [userResult, accountResult] = await Promise.allSettled([
      permissionsService.getUserPermissions(true),
      permissionsService.getAccountPermissions(true),
    ]);

    if (userResult.status === 'fulfilled') {
      setUserPermissions(userResult.value);
      setUserPermsStatus('loaded');
    } else {
      console.error('Erro ao recarregar permissões do usuário:', userResult.reason);
      setUserPermsStatus('failed');
    }

    if (accountResult.status === 'fulfilled') {
      setAccountPermissions(accountResult.value);
      setAccountPermsStatus('loaded');
    } else {
      console.error('Erro ao recarregar permissões do account:', accountResult.reason);
      setAccountPermsStatus('failed');
    }

    if (userResult.status === 'rejected' || accountResult.status === 'rejected') {
      setError('Erro ao recarregar permissões');
    }

    setLoading(false);
  }, [user?.id]);

  // True once user, config and BOTH fetches succeeded. Tracking the outcome
  // rather than `!loading` keeps consumers from evaluating `can()` against an
  // empty array — before the fetch effect fires, or after it failed (CRM-164).
  const isReady = useMemo(() => {
    if (!user) return false;
    if (configLoading) return false;
    if (loading) return false;
    return userPermsStatus === 'loaded' && accountPermsStatus === 'loaded';
  }, [configLoading, loading, user, userPermsStatus, accountPermsStatus]);

  // Both must settle first: `loading` is one shared flag that the faster fetch
  // clears, so reporting on the first rejection flashed the panel mid-boot.
  const permissionsSettled = userPermsStatus !== 'pending' && accountPermsStatus !== 'pending';
  const loadFailed =
    permissionsSettled && (userPermsStatus === 'failed' || accountPermsStatus === 'failed');

  const value: PermissionsContextValue = {
    userPermissions,
    accountPermissions,
    can,
    canAny,
    canAll,
    loading: loading || configLoading,
    isReady,
    loadFailed,
    error,
    refreshPermissions,
    createPermission,
    isValidPermission,
    getPermissionDisplayName,
  };

  return (
    <PermissionsContext.Provider value={value}>
      {loadFailed && blockOnLoadFailure ? <PermissionsLoadFailure /> : children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = (): PermissionsContextValue => {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
};
