import authApi from '@/services/core/apiAuth';
import usersService from '@/services/users/usersService';
import { extractData } from '@/utils/apiHelpers';
import type { AgentChannel } from '@/types/channels/inbox';
import type { AgentDeleteResponse } from '@/types/agents';
import type { UsersUserResponse } from '@/types/users';

// Agents Service following Evolution patterns
const AgentsService = {
  /**
   * Get all agents for an account
   * Endpoint: GET /api/v1/users
   */
  async getAll(): Promise<AgentChannel[]> {
    // Single account-scoped source (CRM-539); the auth pages at 20 otherwise.
    // Errors propagate: an empty list must mean "no one", not "the request failed".
    return (await usersService.getAccountUsers()) as unknown as AgentChannel[];
  },

  /**
   * Create a new agent
   * Endpoint: POST /api/v1/users
   */
  async create(agentData: Partial<AgentChannel>): Promise<AgentChannel> {
    const response = await authApi.post('/users', agentData);
    const userResponse = extractData<UsersUserResponse>(response);
    // Convert User to AgentChannel with default values for missing properties
    return {
      ...userResponse.data,
      availability_status: userResponse.data.availability || 'offline',
      ui_flags: {
        is_creating: false,
        is_fetching: false,
        is_updating: false,
        is_deleting: false,
      },
    } as AgentChannel;
  },

  /**
   * Update an agent
   * Endpoint: PATCH /api/v1/users/:id
   */
  async update(agentId: string, agentData: Partial<AgentChannel>): Promise<AgentChannel> {
    const response = await authApi.patch(`/users/${agentId}`, agentData);
    const userResponse = extractData<UsersUserResponse>(response);
    // Convert User to AgentChannel with default values for missing properties
    return {
      ...userResponse.data,
      availability_status: userResponse.data.availability || 'offline',
      ui_flags: {
        is_creating: false,
        is_fetching: false,
        is_updating: false,
        is_deleting: false,
      },
    } as AgentChannel;
  },

  /**
   * Delete an agent
   * Endpoint: DELETE /api/v1/users/:id
   */
  async delete(agentId: string): Promise<AgentDeleteResponse> {
    const response = await authApi.delete(`/users/${agentId}`);
    return extractData<AgentDeleteResponse>(response);
  },

  /**
   * Bulk invite agents
   * Endpoint: POST /api/v1/users/bulk_create
   */
  async bulkInvite(emails: string[]): Promise<AgentChannel[]> {
    const response = await authApi.post('/users/bulk_create', {
      emails,
    });
    const data = extractData<{ invited_users?: AgentChannel[] } | AgentChannel[]>(response);

    if (Array.isArray(data)) {
      return data;
    }

    if (
      data &&
      typeof data === 'object' &&
      'invited_users' in data &&
      Array.isArray(data.invited_users)
    ) {
      return data.invited_users;
    }

    return [];
  },
};

export default AgentsService;
