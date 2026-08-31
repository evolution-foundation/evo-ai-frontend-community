import evoaiApi from '@/services/core/apiEvoAI';
import { extractData } from '@/utils/apiHelpers';
import {
  CustomTool,
  CustomToolCreate,
  CustomToolUpdate,
  CustomToolsState,
  CustomToolsListParams,
  CustomToolTestResponse
} from '@/types/ai';
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination';

// Lista ferramentas personalizadas
export const listCustomTools = async (
  params?: CustomToolsListParams,
  filterParams?: Record<string, string>,
): Promise<CustomTool[]> => {
  const queryParams: Record<string, unknown> = {
    skip: params?.skip || 0,
    limit: params?.limit || 100
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

  const response = await evoaiApi.get('/custom-tools', {
    params: queryParams,
  });
  return extractData<CustomTool[]>(response);
};

// Busca ferramenta personalizada por ID
export const getCustomTool = async (id: string): Promise<CustomTool> => {
  const response = await evoaiApi.get(`/custom-tools/${id}`);
  return extractData<any>(response);
};

// Cria nova ferramenta personalizada
export const createCustomTool = async (data: CustomToolCreate): Promise<CustomTool> => {
  const response = await evoaiApi.post('/custom-tools', data);
  return extractData<any>(response);
};

// Atualiza ferramenta personalizada
export const updateCustomTool = async (id: string, data: CustomToolUpdate): Promise<CustomTool> => {
  const response = await evoaiApi.put(`/custom-tools/${id}`, data);
  return extractData<any>(response);
};

// Deleta ferramenta personalizada
export const deleteCustomTool = async (id: string): Promise<void> => {
  await evoaiApi.delete(`/custom-tools/${id}`);
};

// Testa ferramenta personalizada
// EVO-1738: stateless test-before-save result (self-contained here to avoid the
// duplicated CustomToolTestResponse declaration in types/ai/customTool.ts).
export interface CustomToolTestPayloadResult {
  error: string;
  headers: Record<string, string>;
  response_time: number;
  status_code: number;
  success: boolean;
  body?: string;
}

// EVO-1738: the request-shaping subset of the tool config the test endpoint runs.
// path_params/query_params are part of it: without them the test hits
// `/users/{user_id}` literally and drops the query string, so a green result
// would describe a request that carried none of the user's configuration.
export interface CustomToolTestPayload {
  method: string;
  endpoint: string;
  headers?: Record<string, unknown>;
  path_params?: Record<string, unknown>;
  query_params?: Record<string, unknown>;
  body_params?: Record<string, unknown>;
}

// EVO-1738: test an UNSAVED tool's request (test-before-save in the wizard).
export const testCustomToolPayload = async (
  payload: CustomToolTestPayload,
): Promise<{ test_result: CustomToolTestPayloadResult }> => {
  const response = await evoaiApi.post('/custom-tools/test', payload);
  return extractData<{ test_result: CustomToolTestPayloadResult }>(response);
};

export const testCustomTool = async (id: string): Promise<CustomToolTestResponse> => {
  const response = await evoaiApi.get(`/custom-tools/${id}/test`);
  return extractData<any>(response);
};

// Estado inicial para UI
export const initialCustomToolsState: CustomToolsState = {
  tools: [],
  selectedToolIds: [],
  meta: {
    pagination: {
      page: 1,
      page_size: DEFAULT_PAGE_SIZE,
      total: 0,
      total_pages: 0,
    },
  },
  loading: {
    list: false,
    create: false,
    update: false,
    delete: false,
    test: false,
  },
  filters: [],
  searchQuery: '',
};

// Error handling utility.
// Core's error envelope is { success: false, error: { code, message, details }, meta }.
// The previous guard tested `data.message`, which never exists in that envelope, so
// `data.error.message` was unreachable and callers only ever saw axios's generic
// "Request failed with status code 400".
export const getErrorMessage = (error: any, defaultMessage: string = 'Erro desconhecido'): string => {
  const data = error?.response?.data;
  const base = data?.error?.message || data?.message;
  if (!base) return error?.message || defaultMessage;

  // Validation errors carry the offending field in details.fields[]; without it the
  // user reads "Validation failed" and cannot tell what needs fixing.
  const fields = data?.error?.details?.fields;
  if (Array.isArray(fields) && fields.length > 0) {
    const detail = fields
      .map((f: { field?: string; message?: string }) =>
        f?.field ? `${f.field}: ${f.message ?? ''}`.trim() : f?.message,
      )
      .filter(Boolean)
      .join('; ');
    if (detail) return `${base} (${detail})`;
  }
  return base;
};

export default {
  listCustomTools,
  getCustomTool,
  createCustomTool,
  updateCustomTool,
  deleteCustomTool,
  testCustomTool,
  initialCustomToolsState,
};
