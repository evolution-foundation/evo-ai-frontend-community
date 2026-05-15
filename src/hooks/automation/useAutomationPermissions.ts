import { useUserPermissions } from '@/hooks/useUserPermissions';

export interface AutomationPermissions {
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canClone: boolean;
  isReady: boolean;
}

export function useAutomationPermissions(): AutomationPermissions {
  const { can, isReady } = useUserPermissions();
  return {
    canRead: can('automation_rules', 'read'),
    canCreate: can('automation_rules', 'create'),
    canUpdate: can('automation_rules', 'update'),
    canDelete: can('automation_rules', 'delete'),
    canClone: can('automation_rules', 'clone'),
    isReady,
  };
}
