import { apiAuth } from '@/services/core';

export interface Role {
  id: string;
  key: string;
  name: string;
  description: string | null;
  system: boolean;
  type: 'user' | 'account';
  permissions_by_resource: Record<string, string[]>;
  permissions_count: number;
  users_count: number;
  created_at: string;
  updated_at: string;
}

export interface RoleFormData {
  name: string;
  description?: string;
}

interface ApiResponse<T> {
  data: T;
  message: string;
}

async function list(): Promise<Role[]> {
  const response = await apiAuth.get<ApiResponse<Role[]>>('/roles');
  return response.data.data;
}

async function get(id: string): Promise<Role> {
  const response = await apiAuth.get<ApiResponse<Role>>(`/roles/${id}`);
  return response.data.data;
}

async function create(data: RoleFormData): Promise<Role> {
  const response = await apiAuth.post<ApiResponse<Role>>('/roles', data);
  return response.data.data;
}

async function update(id: string, data: Partial<RoleFormData>): Promise<Role> {
  const response = await apiAuth.put<ApiResponse<Role>>(`/roles/${id}`, data);
  return response.data.data;
}

async function destroy(id: string): Promise<void> {
  await apiAuth.delete(`/roles/${id}`);
}

async function bulkUpdatePermissions(id: string, permissionKeys: string[]): Promise<Role> {
  const response = await apiAuth.put<ApiResponse<Role>>(`/roles/${id}/bulk_update_permissions`, {
    permission_keys: permissionKeys,
  });
  return response.data.data;
}

export const rolesService = { list, get, create, update, destroy, bulkUpdatePermissions };
