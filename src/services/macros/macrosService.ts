import api from '@/services/core/api';
import { extractData, extractResponse } from '@/utils/apiHelpers';
import authApi from '@/services/core/apiAuth';
import type {
  Macro,
  MacrosResponse,
  MacroResponse,
  MacroDeleteResponse,
  MacroCreateData,
  MacroUpdateData,
  MacroExecuteData,
  MacrosListParams,
} from '@/types/automation';

class MacrosService {
  // List macros with optional parameters
  async getMacros(params?: MacrosListParams): Promise<MacrosResponse> {
    const response = await api.get('/macros', { params });
    return extractResponse<Macro>(response) as MacrosResponse;
  }

  // Get single macro
  async getMacro(macroId: string): Promise<MacroResponse> {
    const response = await api.get(`/macros/${macroId}`);
    return extractData<MacroResponse>(response);
  }

  // Create macro
  async createMacro(data: MacroCreateData): Promise<MacroResponse> {
    const response = await api.post('/macros', data);
    return extractData<MacroResponse>(response);
  }

  // Update macro
  async updateMacro(macroId: string, data: Partial<MacroUpdateData>): Promise<MacroResponse> {
    const response = await api.put(`/macros/${macroId}`, data);
    return extractData<MacroResponse>(response);
  }

  // Delete macro
  async deleteMacro(macroId: string): Promise<MacroDeleteResponse> {
    const response = await api.delete(`/macros/${macroId}`);
    return extractData<MacroDeleteResponse>(response);
  }

  // Execute macro — returns execution results with status per action
  async executeMacro(data: MacroExecuteData): Promise<{ data?: { executions?: Array<{ id: string; status: string; error_message?: string; actions_result?: Array<{ action: string; status: string; error?: string }> }> } }> {
    const response = await api.post(`/macros/${data.macroId}/execute`, {
      conversation_ids: data.conversationIds,
    });
    return response.data;
  }

  // Search macros (if implemented in backend)
  async searchMacros(query: string, params?: MacrosListParams): Promise<MacrosResponse> {
    const searchParams = { ...params, q: query };
    return this.getMacros(searchParams);
  }

  async getFormData(): Promise<{
    inboxes: any[];
    agents: any[];
    teams: any[];
    labels: any[];
    campaigns: any[];
    customAttributes: any[];
  }> {
    try {
      // Buscar dados necessários para o formulário em paralelo
      const [inboxesRes, agentsRes, teamsRes, labelsRes] = await Promise.allSettled([
        api.get('/inboxes'),
        authApi.get('/users'),
        api.get('/teams'),
        api.get('/labels'),
      ]);

      const getResultData = (result: PromiseSettledResult<any>, isAuthService = false): any[] => {
        if (result.status === 'fulfilled') {
          if (isAuthService) {
            // Auth services return {data, meta} structure
            const response = extractResponse(result.value);
            return (response.data as any[]) || [];
          }
          const data = extractData(result.value);
          return Array.isArray(data) ? data : [];
        }
        return [];
      };

      return {
        inboxes: getResultData(inboxesRes),
        agents: getResultData(agentsRes, true), // true = isAuthService
        teams: getResultData(teamsRes),
        labels: getResultData(labelsRes),
        campaigns: [],
        customAttributes: [], // TODO: Implementar busca de custom attributes se necessário
      };
    } catch (error: any) {
      console.error('Erro ao buscar dados do formulário:', error);
      // Retornar dados vazios em caso de erro para não quebrar o formulário
      return {
        inboxes: [],
        agents: [],
        teams: [],
        labels: [],
        campaigns: [],
        customAttributes: [],
      };
    }
  }
}

export const macrosService = new MacrosService();
