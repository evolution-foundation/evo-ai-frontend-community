import i18n from '@/i18n/config';
import { useTranslation as useUiTranslation } from 'react-i18next';
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { 
  fetchRolePermissions, 
  deleteRolePermission 
} from '@/services/rbac';
import { RolePermission } from '@/types/auth';

interface UsePermissionsReturn {
  permissions: RolePermission[];
  selectedPermissions: RolePermission[];
  loading: {
    list: boolean;
    delete: boolean;
    bulk: boolean;
  };
  meta: {
    pagination: {
      page: number;
      total_pages: number;
      total: number;
      page_size: number;
    };
  };
  stats: {
    total: number;
    system: number;
    custom: number;
    with_permissions: number;
  };
  loadPermissions: (params?: {
    search?: string;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
    page?: number;
    per_page?: number;
    role_id?: number;
    system_only?: boolean;
    has_permissions?: boolean;
  }) => Promise<void>;
  selectPermissions: (permissions: RolePermission[]) => void;
  clearSelection: () => void;
  deletePermission: (permission: RolePermission) => Promise<void>;
  deleteBulkPermissions: (permissions: RolePermission[]) => Promise<void>;
}

export const usePermissions = (): UsePermissionsReturn => {
  const { t: tUi } = useUiTranslation();
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<RolePermission[]>([]);
  const [meta, setMeta] = useState({
    pagination: {
      page: 1,
      total_pages: 0,
      total: 0,
      page_size: 20,
    },
  });
  const [loading, setLoading] = useState({
    list: false,
    delete: false,
    bulk: false,
  });

  const updateLoading = useCallback((key: keyof typeof loading, value: boolean) => {
    setLoading(prev => ({ ...prev, [key]: value }));
  }, []);

  const loadPermissions = useCallback(async (params?: {
    search?: string;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
    page?: number;
    per_page?: number;
    role_id?: number;
    system_only?: boolean;
    has_permissions?: boolean;
  }) => {
    updateLoading('list', true);

    try {
      const response = await fetchRolePermissions(params);
      const permissionsList = response.data || [];
      setPermissions(permissionsList);
      setMeta(response.meta);
      
      // Calculate stats from permissions
      const total = response.meta.pagination.total;
      const system = permissionsList.filter(rp => rp.role?.system).length;
      const custom = permissionsList.filter(rp => !rp.role?.system).length;
      const with_permissions = permissionsList.filter(rp => rp.permission_keys?.length > 0).length;
      
      setStats({ total, system, custom, with_permissions });
    } catch (error) {
      console.error('Error loading role permissions:', error);
      toast.error(tUi("interface:usepermissions.couldNotLoadRolePermissions"));
    } finally {
      updateLoading('list', false);
    }
  }, [updateLoading, tUi]);

  const selectPermissions = useCallback((newSelectedPermissions: RolePermission[]) => {
    setSelectedPermissions(newSelectedPermissions);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedPermissions([]);
  }, []);

  const deletePermission = useCallback(async (permission: RolePermission) => {
    updateLoading('delete', true);

    try {
      // Delete all permissions for this role
      await deleteRolePermission(permission.role_id);
      
      toast.success(i18n.t("interface:messages.rolePermissionsRemoved", { role: permission.role.name }));
      
    } catch (error) {
      console.error('Error deleting role permissions:', error);
      toast.error(tUi("interface:usepermissions.couldNotRemovePermissionsFromRole"));
      throw error;
    } finally {
      updateLoading('delete', false);
    }
  }, [updateLoading, tUi]);

  const deleteBulkPermissions = useCallback(async (permissionsToDelete: RolePermission[]) => {
    updateLoading('bulk', true);

    try {
      // Delete all permissions for selected roles
      await Promise.all(
        permissionsToDelete.map(rolePermission => 
          deleteRolePermission(rolePermission.role_id)
        )
      );
      
      toast.success(i18n.t("interface:messages.rolePermissionsDeleted", { count: permissionsToDelete.length }));
      
      // Clear selection after successful deletion
      clearSelection();
      
    } catch (error) {
      console.error('Error bulk deleting role permissions:', error);
      toast.error(tUi("interface:usepermissions.couldNotDeleteRolePermissions"));
      throw error;
    } finally {
      updateLoading('bulk', false);
    }
  }, [updateLoading, clearSelection, tUi]);
  
  const [stats, setStats] = useState({
    total: 0,
    system: 0,
    custom: 0,
    with_permissions: 0,
  });

  return {
    permissions,
    selectedPermissions,
    loading,
    meta,
    stats,
    loadPermissions,
    selectPermissions,
    clearSelection,
    deletePermission,
    deleteBulkPermissions,
  };
};