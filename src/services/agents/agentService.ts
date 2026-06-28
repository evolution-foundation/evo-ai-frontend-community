import evoaiApi from '@/services/core/apiEvoAI';
import {
  Agent,
  AgentCreate,
  Folder,
  FolderCreate,
  FolderUpdate,
  ApiKey,
  ApiKeyCreate,
  ApiKeyUpdate,
  AgentDeleteResponse,
  FolderDeleteResponse,
  ApiKeyDeleteResponse,
  ApiKeyModelsResponse,
  AgentListResponse,
} from '@/types/agents';
import { processAgentData } from '@/utils/agentUtils';
import { extractData, buildPaginationParams, extractResponse } from '@/utils/apiHelpers';

class AgentsService {
  // AI Agents
  async createAgent(data: AgentCreate): Promise<Agent> {
    const response = await evoaiApi.post('/agents', processAgentData(data));
    return extractData<Agent>(response);
  }

  async listAgents(
    page = 1,
    pageSize = 100,
    folderId?: string,
    options?: { search?: string; filterParams?: Record<string, string> },
  ): Promise<AgentListResponse> {
    const params: any = buildPaginationParams(page, pageSize);
    if (folderId) {
      params.folder_id = folderId;
    }
    if (options?.search) {
      params.search = options.search;
    }
    if (options?.filterParams) {
      Object.assign(params, options.filterParams);
    }

    const response = await evoaiApi.get('/agents', {
      params,
    });

    return extractResponse<Agent>(response) as AgentListResponse;
  }

  async getAgent(agentId: string): Promise<Agent> {
    const response = await evoaiApi.get(`/agents/${agentId}`);
    return extractData<Agent>(response);
  }

  async updateAgent(agentId: string, data: Partial<AgentCreate>): Promise<Agent> {
    const response = await evoaiApi.put(`/agents/${agentId}`, processAgentData(data));
    return extractData<Agent>(response);
  }

  async deleteAgent(agentId: string): Promise<AgentDeleteResponse> {
    const response = await evoaiApi.delete(`/agents/${agentId}`);
    return extractData<AgentDeleteResponse>(response);
  }

  async syncEvolutionBot(agentId: string): Promise<unknown> {
    const response = await evoaiApi.post(`/agents/${agentId}/sync-evolution`, {});
    return extractData(response);
  }

  async assignFolder(agentId: string, folderId: string | null): Promise<unknown> {
    const response = await evoaiApi.put(`/agents/${agentId}/folder`, {
      folder_id: folderId
    });
    return extractData(response);
  }

  async shareAgent(agentId: string): Promise<unknown> {
    const response = await evoaiApi.get(`/agents/${agentId}/share`);
    return extractData(response);
  }

  async getSharedAgent(agentId: string): Promise<Agent> {
    const response = await evoaiApi.get(`/agents/${agentId}/shared`);
    return extractData<Agent>(response);
  }

  async getAgentIntegrations(agentId: string): Promise<any[]> {
    const response = await evoaiApi.get(`/agents/${agentId}/integrations`);
    return extractData<any[]>(response);
  }

  // AI Folders
  async createFolder(data: FolderCreate): Promise<Folder> {
    const response = await evoaiApi.post('/folders', data);
    return extractData<Folder>(response);
  }

  async listFolders(page = 1, pageSize = 100): Promise<Folder[]> {
    const response = await evoaiApi.get('/folders', {
      params: buildPaginationParams(page, pageSize),
    });
    return extractData<Folder[]>(response);
  }

  async getFolder(folderId: string): Promise<Folder> {
    const response = await evoaiApi.get(`/folders/${folderId}`);
    return extractData<Folder>(response);
  }

  async updateFolder(folderId: string, data: FolderUpdate): Promise<Folder> {
    const response = await evoaiApi.put(`/folders/${folderId}`, data);
    return extractData<Folder>(response);
  }

  async deleteFolder(folderId: string): Promise<FolderDeleteResponse> {
    const response = await evoaiApi.delete(`/folders/${folderId}`);
    return extractData<FolderDeleteResponse>(response);
  }

  // AI API Keys
  async createApiKey(data: ApiKeyCreate): Promise<ApiKey> {
    const response = await evoaiApi.post('/agents/apikeys', data);
    return extractData<ApiKey>(response);
  }

  async listApiKeys(page = 1, pageSize = 100): Promise<ApiKey[]> {
    const response = await evoaiApi.get('/agents/apikeys', {
      params: buildPaginationParams(page, pageSize),
    });
    return extractData<ApiKey[]>(response);
  }

  async updateApiKey(keyId: string, data: ApiKeyUpdate): Promise<ApiKey> {
    const response = await evoaiApi.put(`/agents/apikeys/${keyId}`, data);
    return extractData<ApiKey>(response);
  }

  async deleteApiKey(keyId: string): Promise<ApiKeyDeleteResponse> {
    const response = await evoaiApi.delete(`/agents/apikeys/${keyId}`);
    return extractData<ApiKeyDeleteResponse>(response);
  }

  async listApiKeyModels(keyId: string): Promise<ApiKeyModelsResponse> {
    const response = await evoaiApi.get(`/agents/apikeys/${keyId}/models`);
    return extractData<ApiKeyModelsResponse>(response);
  }

  // Helper methods for backward compatibility
  async getAccessibleFolders(page = 1, pageSize = 100) {
    const folders = await this.listFolders(page, pageSize);
    return folders.map(folder => ({
      ...folder,
      is_shared: false,
      permission_level: 'owner',
      shared_by: null
    }));
  }

  async getAccessibleAgents(
    page = 1,
    pageSize = 100,
    options?: { search?: string; filterParams?: Record<string, string> },
  ) {
    try {
      return await this.listAgents(page, pageSize, undefined, options);
    } catch (error) {
      console.error('Error getting accessible agents:', error);
      throw error;
    }
  }
}

export const agentsService = new AgentsService();

// Export individual functions for backward compatibility
export const createAgent = (data: AgentCreate) => agentsService.createAgent(data);
export const listAgents = (page?: number, pageSize?: number, folderId?: string) => agentsService.listAgents(page, pageSize, folderId);
export const getAgent = (agentId: string) => agentsService.getAgent(agentId);
export const updateAgent = (agentId: string, data: Partial<AgentCreate>) => agentsService.updateAgent(agentId, data);
export const deleteAgent = (agentId: string) => agentsService.deleteAgent(agentId);

export const createFolder = (data: FolderCreate) => agentsService.createFolder(data);
export const listFolders = (page?: number, pageSize?: number) => agentsService.listFolders(page, pageSize);
export const getFolder = (folderId: string) => agentsService.getFolder(folderId);
export const updateFolder = (folderId: string, data: FolderUpdate) => agentsService.updateFolder(folderId, data);
export const deleteFolder = (folderId: string) => agentsService.deleteFolder(folderId);

export const createApiKey = (data: ApiKeyCreate) => agentsService.createApiKey(data);
export const listApiKeys = (page?: number, pageSize?: number) => agentsService.listApiKeys(page, pageSize);
export const updateApiKey = (keyId: string, data: ApiKeyUpdate) => agentsService.updateApiKey(keyId, data);
export const deleteApiKey = (keyId: string) => agentsService.deleteApiKey(keyId);

export const assignAgentToFolder = (agentId: string, folderId: string | null) => agentsService.assignFolder(agentId, folderId);
export const getAccessibleFolders = (page?: number, pageSize?: number) => agentsService.getAccessibleFolders(page, pageSize);
export const getAccessibleAgents = (
  page?: number,
  pageSize?: number,
  options?: { search?: string; filterParams?: Record<string, string> },
) => agentsService.getAccessibleAgents(page, pageSize, options);
export const shareAgent = (agentId: string) => agentsService.shareAgent(agentId);
export const getAgentIntegrations = (agentId: string) => agentsService.getAgentIntegrations(agentId);
