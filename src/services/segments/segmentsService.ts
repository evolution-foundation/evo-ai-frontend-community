import apiEvoFlow from '@/services/core/apiEvoFlow';
import { extractData } from '@/utils/apiHelpers';
import { SegmentsResponse, SegmentResponse, SegmentDeleteResponse, SegmentFormData, Segment } from '@/types/analytics';

class SegmentsService {
  private getBaseUrl(): string {
    return '/segments';
  }

  async getSegments(
    params?: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
    },
  ): Promise<SegmentsResponse> {
    const response = await apiEvoFlow.get(this.getBaseUrl(), {
      params,
    });
    // API retorna: { success: true, data: { segments: [], total: 0, page: 1, limit: 100 }, meta: {...} }
    const responseData = extractData<{ segments: Segment[]; total: number; page: number; limit: number }>(response);
    return {
      success: true,
      data: responseData.segments || [],
      meta: {
        ...(response.data?.meta || {}),
        pagination: {
          page: responseData.page || 1,
          page_size: responseData.limit || 100,
          total: responseData.total || 0,
          total_pages: Math.ceil((responseData.total || 0) / (responseData.limit || 100)),
        },
      },
      message: response.data?.message || '',
    } as SegmentsResponse;
  }

  async createSegment(data: SegmentFormData): Promise<SegmentResponse> {
    const response = await apiEvoFlow.post(this.getBaseUrl(), data);
    return extractData<SegmentResponse>(response);
  }

  async updateSegment(
    segmentId: string,
    data: Partial<SegmentFormData>,
  ): Promise<SegmentResponse> {
    const response = await apiEvoFlow.patch(`${this.getBaseUrl()}/${segmentId}`, data);
    return extractData<SegmentResponse>(response);
  }

  async deleteSegment(segmentId: string): Promise<SegmentDeleteResponse> {
    const response = await apiEvoFlow.delete(`${this.getBaseUrl()}/${segmentId}`);
    return extractData<SegmentDeleteResponse>(response);
  }

  async getSegment(segmentId: string): Promise<SegmentResponse> {
    const response = await apiEvoFlow.get(`${this.getBaseUrl()}/${segmentId}`);
    return extractData<SegmentResponse>(response);
  }

  async recomputeSegment(segmentId: string): Promise<void> {
    await apiEvoFlow.post(`${this.getBaseUrl()}/${segmentId}/recompute`, {});
  }

  async recomputeAllSegments(): Promise<{
    results: Array<{
      segmentId: string;
      contactsAdded: number;
      contactsRemoved: number;
      totalContacts: number;
      processingTimeMs: number;
    }>;
    totalProcessingTimeMs: number;
  }> {
    const response = await apiEvoFlow.post(`${this.getBaseUrl()}/recompute-all`, {});
    return extractData<{
      results: Array<{
        segmentId: string;
        contactsAdded: number;
        contactsRemoved: number;
        totalContacts: number;
        processingTimeMs: number;
      }>;
      totalProcessingTimeMs: number;
    }>(response);
  }

  async getSegmentContactIds(
    segmentId: string,
    params?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    contactIds: string[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const response = await apiEvoFlow.get(`${this.getBaseUrl()}/${segmentId}/contact-ids`, {
      params,
    });
    return extractData<{
      contactIds: string[];
      total: number;
      limit: number;
      offset: number;
    }>(response);
  }

  async getContactSegments(
    contactId: string,
  ): Promise<{ segmentIds: string[]; segments: Segment[]; total: number }> {
    try {
      // Primeiro buscar todos os segmentos (seguindo padrão do Vue)
      const segmentsResponse = await this.getSegments({
        limit: 100, // Buscar todos os segmentos
      });

      const allSegments = segmentsResponse.data || [];

      // Buscar eventos do tipo 'segment' do contato
      const eventsResponse = await apiEvoFlow.get(`/contacts/${contactId}/events`, {
        params: {
          eventType: 'segment',
          limit: 100,
        },
      });

      // API retorna: { success: true, data: { events: [...], pagination: {...}, metadata: {...} }, meta: {...} }
      const eventsData = extractData<{ events: any[]; pagination?: any; metadata?: any }>(eventsResponse);
      const events = eventsData.events || [];

      // Construir mapa de status dos segmentos baseado no último evento
      const segmentStatusMap = new Map<string, boolean>();

      // Processar eventos em ordem cronológica reversa (mais recente primeiro)
      const sortedEvents = events.sort((a: unknown, b: unknown) => {
        const eventA = a as { occurredAt: string };
        const eventB = b as { occurredAt: string };
        return new Date(eventB.occurredAt).getTime() - new Date(eventA.occurredAt).getTime();
      });

      for (const event of sortedEvents) {
        const eventData = event as { properties?: { segmentId?: string }; eventName: string };
        const segmentId = eventData.properties?.segmentId;
        if (segmentId && !segmentStatusMap.has(segmentId)) {
          // Definir status baseado no evento mais recente para este segmento
          segmentStatusMap.set(segmentId, eventData.eventName === 'segment_entered');
        }
      }

      // Filtrar segmentos onde o contato está ativo
      const activeSegments = allSegments.filter((segment: Segment) =>
        segmentStatusMap.get(segment.id) === true
      );

      const segmentIds = activeSegments.map((segment: Segment) => segment.id);

      return {
        segmentIds,
        segments: activeSegments,
        total: activeSegments.length,
      };
    } catch (error) {
      console.error('Error fetching contact segments:', error);
      return {
        segmentIds: [],
        segments: [],
        total: 0,
      };
    }
  }
}

export const segmentsService = new SegmentsService();
