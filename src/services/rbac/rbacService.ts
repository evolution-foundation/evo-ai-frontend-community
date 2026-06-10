import { extractData, extractResponse } from '@/utils/apiHelpers';
import { apiAuth } from '@/services/core';
import {
  RoleResponse,
  Role,
  RoleAction,
  RolePermission,
  RoleCreate,
  RolePermissionCreate,
  RoleUpdate,
  RolePermissionUpdate,
  RolePermissionFilters,
  RolePermissionsResponse,
  RoleActionsResponse
} from '@/types/auth';

// Role Actions API - Now using ResourceActionsConfig from backend
export const fetchRoleActions = async (filters?: {
  search?: string;
  sortBy?: string;
  sortDirection?: string;
  page?: number;
  per_page?: number;
}): Promise<RoleActionsResponse> => {
  const params = new URLSearchParams();
  if (filters?.search) params.append('search', filters.search);
  if (filters?.sortBy) params.append('sort_by', filters.sortBy);
  if (filters?.sortDirection) params.append('sort_order', filters.sortDirection);
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.per_page) params.append('per_page', filters.per_page.toString());

  const response = await apiAuth.get(`/resource_actions?${params.toString()}`);
  return extractResponse<RoleAction>(response) as RoleActionsResponse;
};


export const fetchActionsForPermissions = async (): Promise<Record<string, RoleAction[]>> => {
  const response = await apiAuth.get('/resource_actions/for_permissions');
  return extractData<any>(response);
};

// Roles API
export const fetchRoles = async (filters?: {
  search?: string;
  sortBy?: string;
  sortDirection?: string;
  page?: number;
  per_page?: number;
  system_only?: boolean;
  exclude_with_permissions?: boolean;
  type?: 'user' | 'account';
}): Promise<RoleResponse> => {
  const params = new URLSearchParams();
  if (filters?.search) params.append('search', filters.search);
  if (filters?.sortBy) params.append('sort_by', filters.sortBy);
  if (filters?.sortDirection) params.append('sort_order', filters.sortDirection);
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.per_page) params.append('per_page', filters.per_page.toString());
  if (filters?.system_only) params.append('system_only', 'true');
  if (filters?.exclude_with_permissions) params.append('exclude_with_permissions', 'true');
  if (filters?.type) params.append('type', filters.type);

  const response = await apiAuth.get(`/roles?${params.toString()}`);
  return extractResponse<Role>(response) as RoleResponse;
};

export const fetchRolesFull = async (filters?: {
  type?: 'user' | 'account';
}): Promise<RoleResponse> => {
  const params = new URLSearchParams();
  if (filters?.type) params.append('type', filters.type);

  const baseUrl = '/roles/full';
  const url = params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;

  const response = await apiAuth.get(url);
  return extractData<any>(response);
};

export const fetchRolesWithoutPermissions = async (): Promise<Role[]> => {
  const response = await apiAuth.get('/roles?exclude_with_permissions=true');
  return extractData<any>(response);
};

export const createRole = async (role: RoleCreate): Promise<Role> => {
  const response = await apiAuth.post('/roles', { role });
  return extractData<any>(response);
};

export const updateRole = async (id: string, role: RoleUpdate): Promise<Role> => {
  const response = await apiAuth.put(`/roles/${id}`, { role });
  return extractData<any>(response);
};

export const deleteRole = async (id: string): Promise<void> => {
  await apiAuth.delete(`/roles/${id}`);
};

// Role Permissions API
export const fetchRolePermissions = async (filters?: RolePermissionFilters): Promise<RolePermissionsResponse> => {
  const params = new URLSearchParams();

  if (filters?.search) params.append('search', filters.search);
  if (filters?.roleId) params.append('role_id', filters.roleId);
  if (filters?.sortBy) params.append('sort_by', filters.sortBy);
  if (filters?.sortDirection) params.append('sort_direction', filters.sortDirection);
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.per_page) params.append('per_page', filters.per_page.toString());

  const response = await apiAuth.get(`/role_permissions?${params.toString()}`);
  return extractResponse<RolePermission>(response) as RolePermissionsResponse;
};

export const createRolePermission = async (data: RolePermissionCreate): Promise<RolePermission> => {
  const response = await apiAuth.post('/role_permissions', {
    role_permission: {
      role_id: data.role_id,
      permission_keys: data.permission_keys
    }
  });
  return extractData<any>(response);
};

export const updateRolePermission = async (id: string, data: RolePermissionUpdate): Promise<RolePermission> => {
  const response = await apiAuth.put(`/role_permissions/${id}`, {
    role_permission: {
      role_id: data.role_id,
      permission_keys: data.permission_keys
    }
  });
  return extractData<any>(response);
};

export const deleteRolePermission = async (id: string): Promise<void> => {
  await apiAuth.delete(`/role_permissions/${id}`);
};
