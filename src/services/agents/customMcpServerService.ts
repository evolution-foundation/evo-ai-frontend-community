import evoaiApi from '@/services/core/apiEvoAI';
import { extractData } from '@/utils/apiHelpers';
import {
  CustomMcpServer,
  CustomMcpServerCreate,
  CustomMcpServerUpdate,
  CustomMcpServerTestResponse,
  ListCustomMcpServersParams,
} from '@/types/ai';

// List custom MCP servers
export const listCustomMcpServers = async (
  params?: ListCustomMcpServersParams,
  filterParams?: Record<string, string>,
): Promise<CustomMcpServer[]> => {
  const queryParams: Record<string, unknown> = {
    skip: params?.skip || 0,
    limit: params?.limit || 100,
  };

  if (params?.page !== undefined) {
    queryParams.page = params.page;
  }
  if (params?.pageSize !== undefined) {
    queryParams.pageSize = params.pageSize;
  }
  if (params?.search) {
    queryParams.search = params.search;
  }
  if (params?.tags) {
    queryParams.tags = params.tags;
  }

  if (filterParams) {
    Object.assign(queryParams, filterParams);
  }

  const response = await evoaiApi.get('/custom-mcp-servers', {
    params: queryParams,
  });
  return extractData<CustomMcpServer[]>(response);
};

// Create custom MCP server
export const createCustomMcpServer = async (
  server: CustomMcpServerCreate,
): Promise<CustomMcpServer> => {
  const response = await evoaiApi.post('/custom-mcp-servers', server);
  return extractData<any>(response);
};

// Get custom MCP server by ID
export const getCustomMcpServer = async (serverId: string): Promise<CustomMcpServer> => {
  const response = await evoaiApi.get(`/custom-mcp-servers/${serverId}`);
  return extractData<any>(response);
};

// Update custom MCP server
export const updateCustomMcpServer = async (
  serverId: string,
  server: CustomMcpServerUpdate,
): Promise<CustomMcpServer> => {
  const response = await evoaiApi.put(`/custom-mcp-servers/${serverId}`, server);
  return extractData<any>(response);
};

// Delete custom MCP server
export const deleteCustomMcpServer = async (serverId: string): Promise<void> => {
  await evoaiApi.delete(`/custom-mcp-servers/${serverId}`);
};

// Test custom MCP server connection
export const testCustomMcpServer = async (
  serverId: string,
): Promise<CustomMcpServerTestResponse> => {
  const response = await evoaiApi.get(`/custom-mcp-servers/${serverId}/test`);
  return extractData<any>(response);
};
