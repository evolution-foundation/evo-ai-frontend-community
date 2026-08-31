import api from '@/services/core/api';
import { extractData, extractResponse } from '@/utils/apiHelpers';
import type {
  Journey,
  CreateJourneyPayload,
  UpdateJourneyPayload,
  JourneysResponse,
  JourneyResponse,
  JourneyDeleteResponse
} from '@/types/automation';

// EVO-2191: the CRM proxy does not relay evo-flow's error body verbatim — it wraps
// it (`{ errors: <evo-flow body> }`) and answers its own guards with shapes of its
// own: invalid subpath (400) and oversized payload (413) as `{ errors: { message } }`,
// evo-flow not configured (503) as `{ error: { code, message } }`, permission denied
// (403) as a top-level `{ message }`. Reading only `data.message`, as the pre-proxy
// code did, collapsed every one of those into the generic fallback and the user lost
// the reason. Walk the shapes before falling back.
type ProxyErrorBody = {
  message?: string;
  // The CRM renders a permission denial as `{ error: '<string>', message }` and a
  // coded failure as `{ error: { code, message } }` — both shapes reach here.
  error?: string | { message?: string };
  errors?: string | { message?: string; error?: { message?: string } };
};

function apiErrorMessage(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: ProxyErrorBody } })?.response?.data;
  const wrapped = data?.errors;

  if (typeof wrapped === 'string' && wrapped) return wrapped;

  const wrappedMessage =
    wrapped && typeof wrapped === 'object'
      ? wrapped.message || wrapped.error?.message
      : undefined;
  const codedMessage =
    data?.error && typeof data.error === 'object' ? data.error.message : undefined;

  return wrappedMessage || codedMessage || data?.message || fallback;
}

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
      const response = await api.get(this.getBaseUrl(), {
        params,
      });
      return extractResponse<Journey>(response) as JourneysResponse;
    } catch (error: any) {
      console.error('Erro ao buscar jornadas:', error);
      throw new Error(apiErrorMessage(error, 'Erro ao buscar jornadas'));
    }
  }

  async getJourney(id: string): Promise<Journey> {
    try {
      const response = await api.get(`${this.getBaseUrl()}/${id}`);
      return extractData<Journey>(response);
    } catch (error: any) {
      console.error('Erro ao buscar jornada:', error);
      throw new Error(apiErrorMessage(error, 'Erro ao buscar jornada'));
    }
  }

  async createJourney(
    payload: CreateJourneyPayload,
  ): Promise<Journey> {
    try {
      const response = await api.post(
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
      throw new Error(apiErrorMessage(error, 'Erro ao criar jornada'));
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

      const response = await api.patch(`${this.getBaseUrl()}/${id}`, updateData);

      return extractData<Journey>(response);
    } catch (error: any) {
      console.error('Erro ao atualizar jornada:', error);
      throw new Error(apiErrorMessage(error, 'Erro ao atualizar jornada'));
    }
  }

  async deleteJourney(id: string): Promise<JourneyDeleteResponse> {
    try {
      const response = await api.delete(`${this.getBaseUrl()}/${id}`);
      return extractData<JourneyDeleteResponse>(response);
    } catch (error: any) {
      console.error('Erro ao excluir jornada:', error);
      throw new Error(apiErrorMessage(error, 'Erro ao excluir jornada'));
    }
  }

  async toggleJourney(id: string): Promise<JourneyResponse> {
    try {
      const response = await api.post(
        `${this.getBaseUrl()}/${id}/toggle-active`,
        {},
      );
      return extractData<JourneyResponse>(response);
    } catch (error: any) {
      console.error('Erro ao alterar status da jornada:', error);
      throw new Error(apiErrorMessage(error, 'Erro ao alterar status da jornada'));
    }
  }

  async duplicateJourney(id: string): Promise<{ data: Journey }> {
    try {
      const response = await api.post(
        `${this.getBaseUrl()}/${id}/duplicate`,
        {},
      );
      return {
        data: extractData<Journey>(response),
      };
    } catch (error: any) {
      console.error('Erro ao duplicar jornada:', error);
      throw new Error(apiErrorMessage(error, 'Erro ao duplicar jornada'));
    }
  }

  async getJourneysByTriggerType(
    triggerType: string,
  ): Promise<{ data: Journey[] }> {
    try {
      const response = await api.get(
        `${this.getBaseUrl()}/trigger-type/${encodeURIComponent(triggerType)}`,
      );
      const data = extractData<Journey[]>(response);
      return {
        data: Array.isArray(data) ? data : [],
      };
    } catch (error: any) {
      console.error('Erro ao buscar jornadas por tipo de trigger:', error);
      throw new Error(
        apiErrorMessage(error, 'Erro ao buscar jornadas por tipo de trigger'),
      );
    }
  }

  async getJourneyVariables(id: string): Promise<{ data: any[] }> {
    try {
      const response = await api.get(`${this.getBaseUrl()}/${id}/variables`);

      const data = extractData<unknown[]>(response);
      return {
        data: Array.isArray(data) ? data : [],
      };
    } catch (error: any) {
      console.error('❌ Erro ao buscar variáveis da jornada:', error);
      console.error('❌ Error details:', error?.response?.data);
      throw new Error(apiErrorMessage(error, 'Erro ao buscar variáveis da jornada'));
    }
  }

  async updateJourneyVariables(
    id: string,
    variables: any[],
  ): Promise<{ data: any[] }> {
    try {
      const response = await api.post(`${this.getBaseUrl()}/${id}/variables`, variables);
      const data = extractData<unknown[]>(response);
      return {
        data: Array.isArray(data) ? data : [],
      };
    } catch (error: any) {
      console.error('Erro ao atualizar variáveis da jornada:', error);
      throw new Error(apiErrorMessage(error, 'Erro ao atualizar variáveis da jornada'));
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
      const response = await api.get(`${this.getBaseUrl()}/${journeyId}/sessions`, {
        params,
      });
      return {
        data: extractData(response),
      };
    } catch (error: any) {
      console.error('Erro ao buscar sessões da jornada:', error);
      throw new Error(apiErrorMessage(error, 'Erro ao buscar sessões da jornada'));
    }
  }

  async getJourneySessionStats(journeyId: string): Promise<{
    data: {
      total?: number;
      byStatus?: Partial<Record<'active' | 'waiting' | 'paused' | 'completed' | 'failed' | 'cancelled', number>>;
    };
  }> {
    try {
      const response = await api.get(`${this.getBaseUrl()}/${journeyId}/sessions/stats`);
      return {
        data: extractData(response),
      };
    } catch (error: any) {
      console.error('Erro ao buscar estatísticas de sessões:', error);
      throw new Error(apiErrorMessage(error, 'Erro ao buscar estatísticas de sessões'));
    }
  }

  async getJourneySession(
    journeyId: string,
    sessionId: string,
  ): Promise<{ data: any }> {
    try {
      const response = await api.get(
        `${this.getBaseUrl()}/${journeyId}/sessions/${sessionId}`,
      );
      return {
        data: extractData(response),
      };
    } catch (error: any) {
      console.error('Erro ao buscar sessão:', error);
      throw new Error(apiErrorMessage(error, 'Erro ao buscar sessão'));
    }
  }

  async deleteJourneySession(
    journeyId: string,
    sessionId: string,
  ): Promise<void> {
    try {
      await api.delete(`${this.getBaseUrl()}/${journeyId}/sessions/${sessionId}`);
    } catch (error: any) {
      console.error('Erro ao deletar sessão:', error);
      throw new Error(apiErrorMessage(error, 'Erro ao deletar sessão'));
    }
  }

  async cancelJourneySession(
    journeyId: string,
    sessionId: string,
  ): Promise<{ data: any }> {
    try {
      const response = await api.post(
        `${this.getBaseUrl()}/${journeyId}/sessions/${sessionId}/cancel`,
        {},
      );
      return {
        data: extractData(response),
      };
    } catch (error: any) {
      console.error('Erro ao cancelar sessão:', error);
      throw new Error(apiErrorMessage(error, 'Erro ao cancelar sessão'));
    }
  }

  async bulkDeleteJourneySessions(
    journeyId: string,
    status: string,
  ): Promise<{ data: { deleted: number } }> {
    try {
      const response = await api.delete(
        `${this.getBaseUrl()}/${journeyId}/sessions/bulk/${status}`,
      );
      return {
        data: extractData(response),
      };
    } catch (error: any) {
      console.error('Erro ao deletar sessões em lote:', error);
      throw new Error(apiErrorMessage(error, 'Erro ao deletar sessões em lote'));
    }
  }
}

export const journeyService = new JourneyService();
