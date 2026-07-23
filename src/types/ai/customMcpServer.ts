import type { PaginationMeta } from '@/types/core';

export interface CustomMcpServer {
  client_id: string;
  description: string;
  headers: Record<string, unknown>;
  id: string;
  name: string;
  retry_count: number;
  tags: string[];
  timeout: number;
  tools: Record<string, unknown>[];
  updated_at: string;
  created_at: string;
  url: string;
}

export interface CustomMcpServerCreate {
  description: string;
  headers: Record<string, unknown>;
  name: string;
  retry_count: number;
  tags: string[];
  timeout: number;
  url: string;
}

export interface CustomMcpServerUpdate {
  description?: string;
  headers?: Record<string, unknown>;
  name?: string;
  retry_count?: number;
  tags?: string[];
  timeout?: number;
  url?: string;
}

export interface CustomMcpServerTestResponse {
  server: {
    created_at: string;
    description: string;
    headers: Record<string, unknown>;
    id: string;
    name: string;
    retry_count: number;
    tags: string[];
    timeout: number;
    tools: Array<Record<string, unknown>>;
    updated_at: string;
    url: string;
  };
  test_result: {
    error: string;
    message: string;
    response_time: number;
    status_code: number;
    success: boolean;
    url_tested: string;
    // EVO-2139: quantidade de tools descobertas neste test (via handshake MCP).
    // Refletir sempre este valor no toast, não `server.tools.length` (DB-stale).
    tools_count?: number;
  };
}

// EVO-1739: the stateless test-before-save result (no persisted server).
export type McpTestResult = CustomMcpServerTestResponse['test_result'];

export interface CustomMcpServerTestConnectionResponse {
  test_result: McpTestResult;
}

export interface ListCustomMcpServersParams {
  page?: number;
  pageSize?: number;
  skip?: number;
  limit?: number;
  active?: boolean;
  search?: string;
  tags?: string;
}

// UI State Types
export interface CustomMcpServersState {
  servers: CustomMcpServer[];
  selectedServerIds: string[];
  meta: {
    pagination: PaginationMeta;
  };
  loading: {
    list: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;

    test: boolean;
  };
  filters: unknown[];
  searchQuery: string;
}

export interface CustomMcpServerFormData extends CustomMcpServerCreate {
  // Additional form-specific fields can be added here
}
