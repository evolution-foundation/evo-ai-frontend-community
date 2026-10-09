import evoaiApi from '@/services/core/apiEvoAI';
import { extractData, extractResponse } from '@/utils/apiHelpers';
import {
  MCPServer,
  MCPServerCreate,
  MCPServerUpdate,
  MCPServersListParams
} from '@/types/ai';

// Create MCP server
export const createMCPServer = async (server: MCPServerCreate) => {
  const response = await evoaiApi.post('/mcp-servers', server);
  return extractData<any>(response);
};

const buildListQueryParams = (params?: MCPServersListParams) => {
  const queryParams: { skip: number; limit: number; page?: number; pageSize?: number } = {
    skip: params?.skip || 0,
    limit: params?.limit || 100
  };

  if (params?.page !== undefined) {
    queryParams.page = params.page;
  }
  if (params?.pageSize !== undefined) {
    queryParams.pageSize = params.pageSize;
  }

  return queryParams;
};

export const listMCPServers = async (params?: MCPServersListParams): Promise<MCPServer[]> => {
  const response = await evoaiApi.get('/mcp-servers', {
    params: buildListQueryParams(params),
  });

  return extractData<MCPServer[]>(response);
};

export interface MCPServersPage {
  servers: MCPServer[];
  total: number;
}

// Same request, keeping `meta.pagination.total`: the length of `data` is one page, not the base.
export const listMCPServersPage = async (params?: MCPServersListParams): Promise<MCPServersPage> => {
  const response = await evoaiApi.get('/mcp-servers', {
    params: buildListQueryParams(params),
  });
  const { data, meta } = extractResponse<MCPServer>(response);
  const servers = data ?? [];
  return { servers, total: meta?.pagination?.total ?? servers.length };
};

// Get MCP server by ID
export const getMCPServer = async (serverId: string) => {
  const response = await evoaiApi.get(`/mcp-servers/${serverId}`);
  return extractData<any>(response);
};

// Update MCP server
export const updateMCPServer = async (
  serverId: string,
  server: MCPServerUpdate,
) => {
  const response = await evoaiApi.put(`/mcp-servers/${serverId}`, server);
  return extractData<any>(response);
};

// Delete MCP server
export const deleteMCPServer = async (serverId: string) => {
  const response = await evoaiApi.delete(`/mcp-servers/${serverId}`);
  return extractData<any>(response);
};
