import type { PaginationMeta } from '@/types/core';

export type BodyParamType = 'string' | 'number' | 'boolean' | 'object' | 'array';

/** The schema the AI tool-execution engine expects for each body param. The
 * wire type stays Record<string, unknown> because legacy tools stored a plain
 * string per key; the editor normalizes those into this shape on load. */
export interface BodyParamSchema {
  type: BodyParamType;
  required: boolean;
  description: string;
}

export interface CustomTool {
  body_params: Record<string, unknown>;
  created_at: string;
  description: string;
  endpoint: string;
  error_handling: Record<string, unknown>;
  examples: string[];
  headers: Record<string, unknown>;
  /** EVO-2250 story 2.4: map of header name -> vault credential id. A MAP by
   * design (one credential per secret): a tool with two auth headers holds
   * two entries, never a single scalar reference. */
  credential_refs?: Record<string, string>;
  id: string;
  input_modes: string[];
  method: string;
  name: string;
  output_modes: string[];
  path_params: Record<string, unknown>;
  query_params: Record<string, unknown>;
  tags: string[];
  updated_at: string;
  values: Record<string, unknown>;
}

export interface CustomToolCreate {
  body_params: Record<string, unknown>;
  description: string;
  endpoint: string;
  error_handling: Record<string, unknown>;
  examples: string[];
  headers: Record<string, unknown>;
  credential_refs?: Record<string, string>;
  input_modes: string[];
  method: string;
  name: string;
  output_modes: string[];
  path_params: Record<string, unknown>;
  query_params: Record<string, unknown>;
  tags: string[];
  values: Record<string, unknown>;
}

export interface CustomToolUpdate {
  body_params?: Record<string, unknown>;
  description?: string;
  endpoint?: string;
  error_handling?: Record<string, unknown>;
  examples?: string[];
  headers?: Record<string, unknown>;
  credential_refs?: Record<string, string>;
  input_modes?: string[];
  method?: string;
  name?: string;
  output_modes?: string[];
  path_params?: Record<string, unknown>;
  query_params?: Record<string, unknown>;
  tags?: string[];
  values?: Record<string, unknown>;
}

export interface CustomToolTestResponse {
  test_result: {
    error: string;
    headers: Record<string, string>;
    response_time: number;
    status_code: number;
    success: boolean;
  };
  tools: {
    body_params: Record<string, unknown>;
    created_at: string;
    description: string;
    endpoint: string;
    error_handling: Record<string, unknown>;
    examples: string[];
    headers: Record<string, string>;
    id: string;
    input_modes: string[];
    method: string;
    name: string;
    output_modes: string[];
    path_params: Record<string, string>;
    query_params: Record<string, unknown>;
    tags: string[];
    updated_at: string;
    values: Record<string, string>;
  };
}

export interface ListCustomToolsParams {
  skip?: number;
  limit?: number;
  active?: boolean;
  search?: string;
  tags?: string;
}

// UI State Types
export interface CustomToolsState {
  tools: CustomTool[];
  selectedToolIds: string[];
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

export interface CustomToolsListParams {
  page?: number;
  pageSize?: number;
  skip?: number;
  limit?: number;
  search?: string;
  tags?: string;
}

export interface CustomToolsListResponse {
  items: CustomTool[];
  count: number;
  total_count: number;
  current_page: number;
  per_page: number;
  total_pages: number;
}

export interface CustomToolTestResponse {
  test_result: {
    error: string;
    headers: Record<string, string>;
    response_time: number;
    status_code: number;
    success: boolean;
  };
  tools: {
    body_params: Record<string, unknown>;
    created_at: string;
    description: string;
    endpoint: string;
    error_handling: Record<string, unknown>;
    examples: string[];
    headers: Record<string, string>;
    id: string;
    input_modes: string[];
    method: string;
    name: string;
    output_modes: string[];
    path_params: Record<string, string>;
    query_params: Record<string, unknown>;
    tags: string[];
    updated_at: string;
    values: Record<string, string>;
  };
}

export interface CustomToolFormData extends CustomToolCreate {
  // Additional form-specific fields can be added here
}

export interface AgentTool {
  id: string;
  toolId: string;
  name: string;
  description: string;
  tags: string[];
  examples: string[];
  inputModes: string[];
  outputModes: string[];
  config: Record<string, unknown>;
}
