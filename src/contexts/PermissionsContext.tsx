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
  // CRM-494 turned the trusted-empty stamps into `pending`; this closes the
  // OTHER half of the F5 race: the legs read isLoggedIn through a NON-reactive
  // useAuthStore.getState() snapshot, so when hydration flipped it nothing
  // re-ran and the legs stayed `pending` forever. Subscribing makes the flip
  // re-run the fetch effects.
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

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
  const [configStatus, setConfigStatus] = useState<FetchStatus>('pending');

  // Reset in render, not in an effect: an effect lands one commit after the render
  // where the user appears, and `isReady` would answer true in that commit over the
  // previous cycle's lists (CRM-494).
  const [permsUserId, setPermsUserId] = useState<string | undefined>(user?.id);
  if (permsUserId !== user?.id) {
    setPermsUserId(user?.id);
    setUserPermsStatus('pending');
    setAccountPermsStatus('pending');
    setConfigStatus('pending');
    setUserPermissions([]);
    setAccountPermissions([]);
    setError(null);
  }

  // Load permissions config (metadata). Keyed on the user because the provider
  // mounts before the session is restored on a reload: with empty deps this gave up
  // there and never retried, leaving `resourceActions` null for the session (CRM-494).
  useEffect(() => {
    // `pending` is both the first attempt and the retry signal; a settled status
    // means this user's catalog is already in hand.
    if (!user?.id || configStatus !== 'pending') {
      setConfigLoading(false); // a cancelled leg skips its own `finally`
      return;
    }

    let cancelled = false;

    const loadConfig = async () => {
      try {
        setConfigLoading(true);
        const config = await permissionsService.getResourceActions();
        if (cancelled) return;
        setResourceActions(config);
        setConfigStatus('loaded');
      } catch (err) {
        if (cancelled) return;
        console.error('Error loading permissions config:', err);
        setConfigStatus('failed');
      } finally {
        if (!cancelled) setConfigLoading(false);
      }
    };

    loadConfig();

    return () => {
      cancelled = true;
    };
  }, [user?.id, configStatus]);

  // Load user permissions
  useEffect(() => {
    if (!user?.id) {
      setUserPermissions([]);
      // `pending`, not `loaded`: no request went out. Stamping `loaded` over the
      // empty list made `isReady` true in the window before the session arrived,
      // and `can()` answered false for every key there (CRM-494).
      setUserPermsStatus('pending');
      setLoading(false); // a cancelled leg no longer clears it in its `finally`
      return;
    }

    // Store not hydrated yet (hard refresh inside the embed): unknown, so the
    // leg stays `pending`; the isLoggedIn dep re-runs this effect on the flip.
    if (!isLoggedIn) {
      setUserPermsStatus('pending');
      return;
    }

    // The fetch can outlive the effect. Without this flag an orphaned rejection
    // would stamp `failed` over a context a newer success already loaded.
    let cancelled = false;

    const loadUserPermissions = async () => {
      try {
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
  }, [user?.id, isLoggedIn]);

  // Load account permissions (específicas do account baseadas no AccountUser role)
  useEffect(() => {
    // Precisa ter user E a store hidratada; ver a perna de user-permissions.
    if (!isLoggedIn || !user) {
      setAccountPermissions([]);
      setAccountPermsStatus('pending');
      setLoading(false);
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
  }, [user, accountPermissions.length, isLoggedIn]);

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

    // A catalog that failed is otherwise never retried, and `isValidPermission`
    // stays permissive for the rest of the session.
    if (configStatus === 'failed') setConfigStatus('pending');

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
  }, [user?.id, configStatus]);

  // True once there is a user, the catalog fetch has settled and BOTH permission
  // fetches succeeded. Tracking the outcome rather than `!loading` keeps consumers
  // from evaluating `can()` against an empty array (CRM-164).
  // `configStatus`, not `configLoading`: a catalog fetch that never started leaves
  // `configLoading` false, which is the hole the reload window fell through
  // (CRM-494). A FAILED catalog counts as settled — `isValidPermission` then
  // accepts any key, but the grant list still decides, and blocking here would
  // deny every screen on a single catalog blip.
  const isReady = useMemo(() => {
    if (!user) return false;
    if (configStatus === 'pending') return false;
    if (loading) return false;
    return userPermsStatus === 'loaded' && accountPermsStatus === 'loaded';
  }, [configStatus, loading, user, userPermsStatus, accountPermsStatus]);

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
