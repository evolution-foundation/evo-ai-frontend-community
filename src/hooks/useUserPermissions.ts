import { useState, useEffect, useContext } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthStore } from '@/store/authStore';
import { usePermissionsConfig } from '@/hooks/usePermissionsConfig';
import { permissionsService } from '@/services/permissions';
import { PermissionsContext } from '@/contexts/PermissionsContext';
import { ROLE_KEYS } from '@/constants/roles';

/**
 * Hook para verificar permissões do usuário logado
 * Carrega permissões dinamicamente via rotas específicas do evo-auth-service
 * Usa configurações dinâmicas do backend para validação
 *
 * ⚠️ DEPRECATED: Use usePermissions do PermissionsContext quando possível
 * Este hook ainda existe para compatibilidade com código legado
 */
export const useUserPermissions = () => {
  const { user } = useAuth();
  // Super admin (installation owner) bypasses granular permission checks — full
  // access. This is an INTENTIONAL, app-wide policy decision (product owner): the
  // installation owner always sees the full UI.
  //
  // It mirrors server truth rather than diverging from it: super_admin is granted
  // every resource action server-side via the RBAC seed/backfill migrations, so
  // the backend will not 403 the actions this bypass renders. (If a fresh
  // permission set ships without its backfill, that gap is a deploy-ordering bug
  // to fix at the source — see the auth `*_permissions_to_existing_roles`
  // migrations — not something to paper over by tightening this client gate.)
  //
  // Two implications callers should know: (1) `can/canAny/canAll` short-circuit to
  // true for super_admin; (2) `isReady` is true immediately for super_admin
  // (below), so super_admin-gated UI does not wait on the permissions fetch.
  const isSuperAdmin = user?.role?.key === ROLE_KEYS.SUPER_ADMIN;
  const {
    isValidPermission,
    createPermission,
    getPermissionDisplayName,
    loading: configLoading,
    error: configError,
  } = usePermissionsConfig();

  // Try to use PermissionsContext if available (preferred)
  // Use useContext directly to avoid conditional hook calls
  const permissionsContextValue = useContext(PermissionsContext);

  // Estados para permissões carregadas dinamicamente (fallback se PermissionsContext não disponível)
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [accountPermissions, setAccountPermissions] = useState<string[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [permissionsError, setPermissionsError] = useState<string | null>(null);

  // Use PermissionsContext if available, otherwise use local state
  const effectiveUserPermissions = permissionsContextValue
    ? permissionsContextValue.userPermissions
    : userPermissions;
  const effectiveAccountPermissions = permissionsContextValue
    ? permissionsContextValue.accountPermissions
    : accountPermissions;
  const effectiveLoading = permissionsContextValue
    ? permissionsContextValue.loading
    : permissionsLoading;
  const effectiveError = permissionsContextValue ? permissionsContextValue.error : permissionsError;

  // Carregar permissões de usuário quando user mudar (apenas se PermissionsContext não disponível)
  useEffect(() => {
    // Skip if PermissionsContext is available
    if (permissionsContextValue) return;

    if (!user?.id) {
      setUserPermissions([]);
      setPermissionsLoading(false);
      return;
    }

    const loadUserPermissions = async () => {
      try {
        const isAuthenticated = useAuthStore.getState().isLoggedIn;
        if (!isAuthenticated) {
          setUserPermissions([]);
          setPermissionsLoading(false);
          return;
        }

        setPermissionsLoading(true);
        setPermissionsError(null);
        const permissions = await permissionsService.getUserPermissions();
        setUserPermissions(permissions);
      } catch (error) {
        console.error('Erro ao carregar permissões do usuário:', error);
        setPermissionsError('Erro ao carregar permissões do usuário');
        setUserPermissions([]);
      } finally {
        setPermissionsLoading(false);
      }
    };

    loadUserPermissions();
  }, [user?.id, permissionsContextValue]);

  // Carregar permissões de account quando account atual mudar (apenas se PermissionsContext não disponível)
  useEffect(() => {
    // Skip if PermissionsContext is available
    if (permissionsContextValue) return;

    if (!user?.id) {
      setAccountPermissions([]);
      setPermissionsLoading(false);
      return;
    }

    const loadAccountPermissions = async () => {
      try {
        const isAuthenticated = useAuthStore.getState().isLoggedIn;
        if (!isAuthenticated) {
          setAccountPermissions([]);
          setPermissionsLoading(false);
          return;
        }

        setPermissionsLoading(true);
        setPermissionsError(null);
        const permissions = await permissionsService.getAccountPermissions();
        setAccountPermissions(permissions);
      } catch (err) {
        console.error('Erro ao carregar permissões do account:', err);
        setPermissionsError('Erro ao carregar permissões do account');
        setAccountPermissions([]);
      } finally {
        setPermissionsLoading(false);
      }
    };

    loadAccountPermissions();
  }, [user?.id, permissionsContextValue]);

  // Estados combinados
  const loading = configLoading || effectiveLoading;
  const error = configError || effectiveError;

  /**
   * Verifica se o usuário tem uma permissão específica
   * @param resource - Nome do recurso (ex: 'conversations', 'users', 'accounts')
   * @param action - Ação específica (ex: 'read', 'create', 'update', 'delete')
   * @param type - Tipo de permissão: 'account' (padrão) ou 'user'
   * @returns boolean
   */
  const can = (resource: string, action: string, type: 'account' | 'user' = 'account'): boolean => {
    if (isSuperAdmin) return true;
    const permission = createPermission(resource, action);
    const permissionsArray =
      type === 'user' ? effectiveUserPermissions : effectiveAccountPermissions;

    // Se ainda está carregando, retornar false para evitar bloqueios prematuros
    // Mas apenas se não houver cache (se houver cache vazio, é porque realmente não tem permissão)
    // Se PermissionsContext está pronto, não considerar como loading
    const isActuallyLoading = permissionsContextValue ? false : loading;
    if (isActuallyLoading && permissionsArray.length === 0) {
      return false;
    }

    if (permissionsArray.length === 0) {
      return false;
    }

    if (configError && permissionsArray.length > 0) {
      return permissionsArray.includes(permission);
    }

    if (!configError && !isValidPermission(permission)) {
      return false;
    }

    const hasPermission = permissionsArray.includes(permission);

    // Debug log
    if (type === 'account' && !hasPermission) {
      console.warn(
        `[Permissions] Permissão negada: ${permission}. accountPermissions tem ${
          permissionsArray.length
        } permissões. Tem ai_agents.read? ${permissionsArray.includes('ai_agents.read')}`,
      );
    }

    return hasPermission;
  };
  /**
   * Verifica se o usuário tem pelo menos uma das permissões especificadas
   * @param permissions - Array de permissões no formato ['resource.action']
   * @param type - Tipo de permissão: 'account' (padrão) ou 'user'
   * @returns boolean
   */
  const canAny = (permissions: string[], type: 'account' | 'user' = 'account'): boolean => {
    if (isSuperAdmin) return true;
    const permissionsArray =
      type === 'user' ? effectiveUserPermissions : effectiveAccountPermissions;

    if (permissionsArray.length === 0) {
      return false;
    }

    return permissions.some(permission => {
      if (configError && permissionsArray.length > 0) {
        return permissionsArray.includes(permission);
      }

      if (!configError && !isValidPermission(permission)) {
        return false;
      }
      return permissionsArray.includes(permission);
    });
  };

  /**
   * Verifica se o usuário tem todas as permissões especificadas
   * @param permissions - Array de permissões no formato ['resource.action']
   * @param type - Tipo de permissão: 'account' (padrão) ou 'user'
   * @returns boolean
   */
  const canAll = (permissions: string[], type: 'account' | 'user' = 'account'): boolean => {
    if (isSuperAdmin) return true;
    const permissionsArray =
      type === 'user' ? effectiveUserPermissions : effectiveAccountPermissions;

    if (permissionsArray.length === 0) {
      return false;
    }

    return permissions.every(permission => {
      if (configError && permissionsArray.length > 0) {
        return permissionsArray.includes(permission);
      }

      if (!configError && !isValidPermission(permission)) {
        return false;
      }
      return permissionsArray.includes(permission);
    });
  };

  /**
   * Estado que indica se as permissões estão prontas para uso
   * Super admin está sempre pronto
   * Usuários comuns precisam:
   * 1. Ter permissões carregadas (accountPermissions ou userPermissions)
   * 2. Ter configs de permissões carregadas (!configLoading)
   * 3. Não estar mais carregando (!permissionsLoading)
   * Isso garante que isValidPermission() funcione corretamente
   */
  const isReady =
    isSuperAdmin ||
    (!configLoading &&
      !effectiveLoading &&
      effectiveAccountPermissions.length > 0);

  /**
   * Força recarregamento das permissões
   */
  const refreshPermissions = async () => {
    if (user?.id) {
      try {
        setPermissionsLoading(true);
        setPermissionsError(null);

        // Carregar permissões de usuário
        const userPerms = await permissionsService.getUserPermissions(true);
        setUserPermissions(userPerms);

        // Carregar permissões de account
        const accountPerms = await permissionsService.getAccountPermissions(true);
        setAccountPermissions(accountPerms);
      } catch (err) {
        console.error('Erro ao recarregar permissões:', err);
        setPermissionsError('Erro ao recarregar permissões');
      } finally {
        setPermissionsLoading(false);
      }
    }
  };

  return {
    // Permissões do usuário (usando PermissionsContext se disponível)
    userPermissions: effectiveUserPermissions,
    accountPermissions: effectiveAccountPermissions,

    // Métodos de verificação consolidados
    // Cada método aceita um parâmetro 'type' para escolher entre 'account' (padrão) ou 'user'
    // Exemplos: can('users', 'read', 'user') ou can('users', 'read', 'account')
    can,
    canAny,
    canAll,

    // Estado das configurações e carregamento
    loading,
    isReady, // Indica se as permissões estão prontas (carregadas ou super admin)
    error,

    // Métodos utilitários
    createPermission,
    isValidPermission,
    getPermissionDisplayName,
    refreshPermissions,
  };
};

export default useUserPermissions;
