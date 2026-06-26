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

// Error handling utility
export const getErrorMessage = (error: any, defaultMessage: string = 'Erro desconhecido'): string => {
  if (error?.response?.data?.message) {
    // Usar formato padrão de erro: { success: false, error: { code, message, details }, meta }
  return error.response.data.error?.message || error.response.data.message;
  }
  return error?.message || defaultMessage;
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
