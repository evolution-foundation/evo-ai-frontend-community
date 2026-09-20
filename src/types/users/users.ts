import { BaseFilter } from "@/types/core";
import { Role } from "@/types/auth";
import type { PaginatedResponse, StandardResponse, PaginationMeta } from '@/types/core';

export interface User {
  id: string;
  uid?: string; // OAuth provider UID
  name: string;
  email: string;
  avatar?: string;
  avatar_url?: string;
  available_name?: string;
  thumbnail?: string;
  availability: 'online' | 'busy' | 'offline';
  availability_status?: 'online' | 'busy' | 'offline'; // Alias for availability
  role?: Role;
  confirmed: boolean;
  created_at: string;
  updated_at: string;
  permissions: string[];
}

export interface UsersListParams {
  page?: number;
  per_page?: number;
  sort?: 'name' | 'email' | 'role' | 'created_at';
  order?: 'asc' | 'desc';
  q?: string;
}

export interface UserCreateData {
  name: string;
  email: string;
  role: string;
  auto_offline?: boolean;
  availability?: 'online' | 'busy' | 'offline';
}

export interface UserUpdateData {
  name?: string;
  email?: string;
  role?: string;
  auto_offline?: boolean;
  availability?: 'online' | 'busy' | 'offline';
  avatar?: File;
  password?: string;
}

export interface UsersResponse extends PaginatedResponse<User> {}

export interface UsersUserResponse extends StandardResponse<User> {}

export interface UserDeleteResponse extends StandardResponse<{ message: string }> {}

export interface BulkInviteParams {
  emails: string[];
}

export interface BulkInviteResponse {
  success: boolean;
  message: string;
  invited_users: User[];
  failed_invitations: Array<{
    email: string;
    error: string;
  }>;
}

// UI State Types
export interface UsersState {
  users: User[];
  selectedUserIds: string[];
  meta: {
    pagination: PaginationMeta;
  };
  loading: {
    list: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
    bulk: boolean;
  };
  filters: BaseFilter[]; // UserFilter type from users-filters
  searchQuery: string;
  // Restricted to what the backend sorts by: a dead column would come back
  // silently in the default order.
  sortBy: NonNullable<UsersListParams['sort']>;
  sortOrder: 'asc' | 'desc';
}

export interface UserFormData {
  name: string;
  email: string;
  availability: 'online' | 'busy' | 'offline';
  role?: string;
  avatar?: File;
  removeAvatar?: boolean;
  password?: string;
  confirmPassword?: string;
}

export interface UserTableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
}

export interface UserActionsMenuProps {
  user: User;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  canEdit: boolean;
  canDelete: boolean;
}
