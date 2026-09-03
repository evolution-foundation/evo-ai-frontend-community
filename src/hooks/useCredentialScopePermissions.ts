import { usePermissions } from '@/contexts/PermissionsContext';
import type { ApiKeyScope } from '@/types/agents';

/**
 * The permission gate shared by the two credential screens (AI keys and
 * integration credentials). They ask the same questions of two different
 * resources, and when they each answered them on their own the two drifted:
 * the same defect had to be fixed twice.
 *
 * The rule it encodes: the scope privilege sits ON TOP of the resource grant,
 * never instead of it. The server checks BOTH — the verb on the route, and
 * installation_configs.manage inside the handler when the scope is
 * `installation` — so a control gated on only one of them is a dead end that
 * ends in a 403. Per verb, because delete does not travel through update.
 */
export function useCredentialScopePermissions(resource: string) {
  const { can, isReady: permissionsReady } = usePermissions();

  const canRead = can(resource, 'read');
  const canCreate = can(resource, 'create');
  const canUpdate = can(resource, 'update');
  const canDelete = can(resource, 'delete');
  // Writing at the installation level is a separate privilege: an account admin
  // sees the inherited default but cannot change it.
  const canManageInstallation = can('installation_configs', 'manage');

  const inScope = (granted: boolean, scope: ApiKeyScope) =>
    granted && (scope === 'installation' ? canManageInstallation : true);

  return {
    can,
    permissionsReady,
    canRead,
    canCreate,
    canUpdate,
    canDelete,
    canManageInstallation,
    canCreateInScope: (scope: ApiKeyScope) => inScope(canCreate, scope),
    canUpdateInScope: (scope: ApiKeyScope) => inScope(canUpdate, scope),
    canDeleteInScope: (scope: ApiKeyScope) => inScope(canDelete, scope),
  };
}
