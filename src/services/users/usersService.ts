import apiAuth from '@/services/core/apiAuth';
import { extractData, extractResponse } from '@/utils/apiHelpers';
import type {
  UsersResponse,
  UsersListParams,
  UserUpdateData,
  BulkInviteParams,
  BulkInviteResponse,
  UserFormData,
  User,
} from '@/types/users';

// The auth caps page_size at 100; the page ceiling only bounds a runaway meta.
const ACCOUNT_USERS_PAGE_SIZE = 100;
const ACCOUNT_USERS_MAX_PAGES = 50;

class UsersService {
  // List users with pagination and filters
  async getUsers(params?: UsersListParams): Promise<UsersResponse> {
    const response = await apiAuth.get('/users', {
      params,
    });

    return extractResponse<User>(response) as UsersResponse;
  }

  // The people directory of the current account, complete. Every selector
  // that lists agents (channel collaborators, assignee, automation/macro
  // forms, ...) reads from here, never from GET /users directly: the auth
  // pages at 20 by default, and the account scope is applied by the auth
  // from the request context — so one call site keeps the behaviour uniform.
  async getAccountUsers(params: Pick<UsersListParams, 'sort' | 'order' | 'q'> = {}): Promise<User[]> {
    const users: User[] = [];
    let page = 1;
    let totalPages = 1;

    do {
      const response = await apiAuth.get('/users', {
        params: { ...params, page, per_page: ACCOUNT_USERS_PAGE_SIZE },
      });
      const { data, meta } = extractResponse<User>(response);
      users.push(...(Array.isArray(data) ? data : []));
      totalPages = Number(meta?.pagination?.total_pages) || 1;
      page += 1;
    } while (page <= totalPages && page <= ACCOUNT_USERS_MAX_PAGES);

    return users;
  }

  // Get single user
  async getUser(userId: string): Promise<User> {
    const response = await apiAuth.get(`/users/${userId}`);
    return extractData<User>(response);
  }

  // Create user (with optional file upload)
  async createUser(userData: UserFormData): Promise<User> {
    const { avatar, ...data } = userData;

    if (avatar) {
      const formData = new FormData();

      // Add basic fields directly (not wrapped in 'user')
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });

      // Add avatar file
      formData.append('avatar', avatar);

      const response = await apiAuth.post('/users', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return extractData<User>(response);
    } else {
      const response = await apiAuth.post('/users', data);
      return extractData<User>(response);
    }
  }

  // Update user
  async updateUser(userId: string, userData: UserUpdateData): Promise<User> {
    const { avatar, ...data } = userData;

    if (avatar) {
      const formData = new FormData();

      // Add basic fields
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });

      // Add avatar file
      formData.append('avatar', avatar);

      const response = await apiAuth.patch(`/users/${userId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return extractData<User>(response);
    } else {
      const response = await apiAuth.patch(`/users/${userId}`, data);
      return extractData<User>(response);
    }
  }

  // Delete user
  async deleteUser(userId: string): Promise<{ message: string }> {
    const response = await apiAuth.delete(`/users/${userId}`);
    return extractData<{ message: string }>(response);
  }

  // CRM-210: admin sets another user's password. Revokes the target's login
  // sessions — see evo-auth-service-community UsersController#set_password.
  async setPassword(
    userId: string,
    password: string,
    passwordConfirmation: string
  ): Promise<{ success: boolean; revoked_sessions: number }> {
    const response = await apiAuth.post(`/users/${userId}/set_password`, {
      password,
      password_confirmation: passwordConfirmation,
    });
    return extractData<{ success: boolean; revoked_sessions: number }>(response);
  }

  // Bulk invite users
  async bulkInvite(params: BulkInviteParams): Promise<BulkInviteResponse> {
    const response = await apiAuth.post('/users/bulk_create', params);
    return extractData<BulkInviteResponse>(response);
  }

  // Get assignable agents for inbox
  async getAssignableAgents(inboxId: string): Promise<UsersResponse> {
    const response = await apiAuth.get(`/inboxes/${inboxId}/assignable_agents`);
    return extractResponse<User>(response) as UsersResponse;
  }

  // Update user availability status
  async updateAvailability(userId: string, availability: string): Promise<User> {
    const response = await apiAuth.patch(`/users/${userId}`, {
      availability_status: availability,
    });
    return extractData<User>(response);
  }

  // Search users
  async searchUsers(query: string): Promise<UsersResponse> {
    const response = await apiAuth.get('/users', {
      params: { q: query },
    });
    return extractResponse<User>(response) as UsersResponse;
  }
}

export default new UsersService();
