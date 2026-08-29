import type { AxiosResponse } from 'axios';
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

export type MacroFormDataSource = 'inboxes' | 'agents' | 'teams' | 'labels';

// The four endpoints answer with different shapes (id/value for the key, and
// name/title/label for the text), so the picker reads whichever is present.
export interface MacroFormOption {
  id?: string;
  value?: string | number;
  name?: string;
  title?: string;
  label?: string;
}

export interface MacroFormData {
  inboxes: MacroFormOption[];
  agents: MacroFormOption[];
  teams: MacroFormOption[];
  labels: MacroFormOption[];
  campaigns: MacroFormOption[];
  customAttributes: MacroFormOption[];
  failedSources: MacroFormDataSource[];
}

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
  async executeMacro(data: MacroExecuteData): Promise<{ data?: { executions?: Array<{ id: string; status: string; error_message?: string; actions_result?: Array<{ action: string; status: string; error?: string }> }>; unresolved_conversation_count?: number } }> {
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

  async getFormData(): Promise<MacroFormData> {
    const [inboxesRes, agentsRes, teamsRes, labelsRes] = await Promise.allSettled([
      api.get('/inboxes'),
      authApi.get('/users'),
      api.get('/teams'),
      api.get('/labels'),
    ]);

    const failedSources: MacroFormDataSource[] = [];

    // An empty list from a 403/500 is indistinguishable from a genuinely empty
    // one, so the failing source has to be reported instead of swallowed.
    const getResultData = (
      source: MacroFormDataSource,
      result: PromiseSettledResult<AxiosResponse>,
      isAuthService = false,
    ): MacroFormOption[] => {
      if (result.status === 'rejected') {
        console.error(`Failed to load ${source} for the macro form:`, result.reason);
        failedSources.push(source);
        return [];
      }

      try {
        if (isAuthService) {
          // Auth services return {data, meta} structure
          const response = extractResponse<MacroFormOption>(result.value);
          return response.data || [];
        }
        const data = extractData<MacroFormOption[]>(result.value);
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error(`Failed to parse ${source} for the macro form:`, error);
        failedSources.push(source);
        return [];
      }
    };

    return {
      inboxes: getResultData('inboxes', inboxesRes),
      agents: getResultData('agents', agentsRes, true),
      teams: getResultData('teams', teamsRes),
      labels: getResultData('labels', labelsRes),
      campaigns: [],
      customAttributes: [], // TODO: fetch custom attributes if they are ever needed
      failedSources,
    };
  }
}

export const macrosService = new MacrosService();
