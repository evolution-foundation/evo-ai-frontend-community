import apiEvoFlow from '../core/apiEvoFlow';
import { extractData, extractResponse } from '@/utils/apiHelpers';
import type {
  Journey,
  CreateJourneyPayload,
  UpdateJourneyPayload,
  JourneysResponse,
  JourneyResponse,
  JourneyDeleteResponse
} from '@/types/automation';

class JourneyService {
  private getBaseUrl() {
    return '/journeys';
  }

  async getJourneys(
    params?: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
    },
  ): Promise<JourneysResponse> {
    try {
      const response = await apiEvoFlow.get(this.getBaseUrl(), {
        params,
      });
      return extractResponse<Journey>(response) as JourneysResponse;
    } catch (error: any) {
      console.error('Erro ao buscar jornadas:', error);
      throw new Error(error?.response?.data?.message || 'Erro ao buscar jornadas');
    }
  }

  async getJourney(id: string): Promise<Journey> {
    try {
      const response = await apiEvoFlow.get(`${this.getBaseUrl()}/${id}`);
      return extractData<Journey>(response);
    } catch (error: any) {
      console.error('Erro ao buscar jornada:', error);
      // Usar formato padrão de erro: { success: false, error: { code, message, details }, meta }
      const errorMessage =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        'Erro ao buscar jornada';
      throw new Error(errorMessage);
    }
  }

  async createJourney(
    payload: CreateJourneyPayload,
  ): Promise<Journey> {
    try {
      const response = await apiEvoFlow.post(
        this.getBaseUrl(),
        {
          name: payload.name,
          description: payload.description,
          isActive: payload.isActive ?? true,
          flowData: payload.flowData,
          flowTriggers: payload.flowTriggers,
        },
      );

      return extractData<Journey>(response);
    } catch (error: any) {
      console.error('Erro ao criar jornada:', error);

      // Usar formato padrão de erro: { success: false, error: { code, message, details }, meta }
      const errorMessage =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        'Erro ao criar jornada';
      throw new Error(errorMessage);
    }
  }

  async updateJourney(
    id: string,
    payload: Partial<UpdateJourneyPayload>,
  ): Promise<Journey> {
    try {
      const updateData: any = { ...payload };

      // Remove o id do payload se estiver presente
      if ('id' in updateData) {
        delete updateData.id;
      }

      const response = await apiEvoFlow.patch(`${this.getBaseUrl()}/${id}`, updateData);

      return extractData<Journey>(response);
    } catch (error: any) {
      console.error('Erro ao atualizar jornada:', error);

      // Usar formato padrão de erro: { success: false, error: { code, message, details }, meta }
      const errorMessage =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        'Erro ao atualizar jornada';
      throw new Error(errorMessage);
    }
  }

  async deleteJourney(id: string): Promise<JourneyDeleteResponse> {
    try {
      const response = await apiEvoFlow.delete(`${this.getBaseUrl()}/${id}`);
      return extractData<JourneyDeleteResponse>(response);
    } catch (error: any) {
      console.error('Erro ao excluir jornada:', error);
      throw new Error(error?.response?.data?.message || 'Erro ao excluir jornada');
    }
  }

  async toggleJourney(id: string): Promise<JourneyResponse> {
    try {
      const response = await apiEvoFlow.post(
        `${this.getBaseUrl()}/${id}/toggle-active`,
        {},
      );
      return extractData<JourneyResponse>(response);
    } catch (error: any) {
      console.error('Erro ao alterar status da jornada:', error);
      throw new Error(error?.response?.data?.message || 'Erro ao alterar status da jornada');
    }
  }

  async duplicateJourney(id: string): Promise<{ data: Journey }> {
    try {
      const response = await apiEvoFlow.post(
        `${this.getBaseUrl()}/${id}/duplicate`,
        {},
      );
      return {
        data: response.data,
      };
    } catch (error: any) {
      console.error('Erro ao duplicar jornada:', error);
      throw new Error(error?.response?.data?.message || 'Erro ao duplicar jornada');
    }
  }

  async getJourneysByTriggerType(
    triggerType: string,
  ): Promise<{ data: Journey[] }> {
    try {
      const response = await apiEvoFlow.get(`${this.getBaseUrl()}/trigger-type/${triggerType}`);
      return {
        data: response.data || [],
      };
    } catch (error: any) {
      console.error('Erro ao buscar jornadas por tipo de trigger:', error);
      throw new Error(
        error?.response?.data?.message || 'Erro ao buscar jornadas por tipo de trigger',
      );
    }
  }

  async getJourneyVariables(id: string): Promise<{ data: any[] }> {
    try {
      const response = await apiEvoFlow.get(`${this.getBaseUrl()}/${id}/variables`);

      return {
        data: Array.isArray(response.data) ? response.data : [],
      };
    } catch (error: any) {
      console.error('❌ Erro ao buscar variáveis da jornada:', error);
      console.error('❌ Error details:', error?.response?.data);
      throw new Error(error?.response?.data?.message || 'Erro ao buscar variáveis da jornada');
    }
  }

  async updateJourneyVariables(
    id: string,
    variables: any[],
  ): Promise<{ data: any[] }> {
    try {
      const response = await apiEvoFlow.post(`${this.getBaseUrl()}/${id}/variables`, variables);
      return {
        data: response.data || [],
      };
    } catch (error: any) {
      console.error('Erro ao atualizar variáveis da jornada:', error);
      throw new Error(error?.response?.data?.message || 'Erro ao atualizar variáveis da jornada');
    }
  }

  // ============================================================================
  // JOURNEY SESSIONS MANAGEMENT
  // ============================================================================

  async getJourneySessions(
    journeyId: string,
    params?: {
      status?: string;
      contactId?: string;
      page?: number;
      pageSize?: number;
    },
  ): Promise<{ data: any }> {
    try {
      const response = await apiEvoFlow.get(`${this.getBaseUrl()}/${journeyId}/sessions`, {
        params,
      });
      return {
        data: response.data,
      };
    } catch (error: any) {
      console.error('Erro ao buscar sessões da jornada:', error);
      throw new Error(error?.response?.data?.message || 'Erro ao buscar sessões da jornada');
    }
  }

  async getJourneySessionStats(journeyId: string): Promise<{ data: any }> {
    try {
      const response = await apiEvoFlow.get(`${this.getBaseUrl()}/${journeyId}/sessions/stats`);
      return {
        data: response.data,
      };
    } catch (error: any) {
      console.error('Erro ao buscar estatísticas de sessões:', error);
      throw new Error(error?.response?.data?.message || 'Erro ao buscar estatísticas de sessões');
    }
  }

  async getJourneySession(
    journeyId: string,
    sessionId: string,
  ): Promise<{ data: any }> {
    try {
      const response = await apiEvoFlow.get(
        `${this.getBaseUrl()}/${journeyId}/sessions/${sessionId}`,
      );
      return {
        data: response.data,
      };
    } catch (error: any) {
      console.error('Erro ao buscar sessão:', error);
      throw new Error(error?.response?.data?.message || 'Erro ao buscar sessão');
    }
  }

  async deleteJourneySession(
    journeyId: string,
    sessionId: string,
  ): Promise<void> {
    try {
      await apiEvoFlow.delete(`${this.getBaseUrl()}/${journeyId}/sessions/${sessionId}`);
    } catch (error: any) {
      console.error('Erro ao deletar sessão:', error);
      throw new Error(error?.response?.data?.message || 'Erro ao deletar sessão');
    }
  }

  async cancelJourneySession(
    journeyId: string,
    sessionId: string,
  ): Promise<{ data: any }> {
    try {
      const response = await apiEvoFlow.post(
        `${this.getBaseUrl()}/${journeyId}/sessions/${sessionId}/cancel`,
        {},
      );
      return {
        data: response.data,
      };
    } catch (error: any) {
      console.error('Erro ao cancelar sessão:', error);
      throw new Error(error?.response?.data?.message || 'Erro ao cancelar sessão');
    }
  }

  async bulkDeleteJourneySessions(
    journeyId: string,
    status: string,
  ): Promise<{ data: { deleted: number } }> {
    try {
      const response = await apiEvoFlow.delete(
        `${this.getBaseUrl()}/${journeyId}/sessions/bulk/${status}`,
      );
      return {
        data: response.data,
      };
    } catch (error: any) {
      console.error('Erro ao deletar sessões em lote:', error);
      throw new Error(error?.response?.data?.message || 'Erro ao deletar sessões em lote');
    }
  }
}

export const journeyService = new JourneyService();
