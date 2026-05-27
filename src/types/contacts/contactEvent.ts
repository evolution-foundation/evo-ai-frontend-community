export type ContactEventType = 'identify' | 'track' | 'page' | 'screen' | 'segment';

// Added by the CRM proxy (Api::V1::EvoFlow::ContactEventsController) — these
// keys are snake_case because the Ruby hash literal uses symbol keys. Top-
// level event fields keep camelCase (set by evo-flow's Nest DTO).
export interface ContactEventEnriched {
  campaign_name?: string;
  channel_label?: string;
  agent_name?: string;
}

// Mirrors ContactEventDto in evo-flow (src/modules/events/dto/contact-event-
// response.dto.ts). All wire keys are camelCase. Optional `enriched` is added
// by the CRM proxy when at least one resolver hits.
export interface ContactEvent {
  id: string;
  contactId?: string;
  eventType: ContactEventType;
  eventName: string;
  occurredAt: string;
  properties: Record<string, unknown>;
  traits?: Record<string, unknown>;
  messageId?: string;
  anonymousId?: string;
  enriched?: ContactEventEnriched;
}

// Query params are snake_case in: the CRM proxy controller permits them and
// translates to camelCase before forwarding to evo-flow. Do NOT convert these
// to camelCase — Rails strong-params would silently drop them.
export interface ContactEventsQuery {
  event_type?: ContactEventType;
  event_name?: string;
  channel?: string;
  campaign_id?: string;
  occurred_after?: string;
  occurred_before?: string;
  cursor?: string;
  limit?: number;
}

export interface ContactEventsPagination {
  nextCursor: string | null;
  hasNext: boolean;
  limit: number;
}

// Success shape:    { events, pagination }
// Degraded shape:   { events: [], degraded: true }   (no pagination)
// Both shapes share `events`; `pagination` is present iff `degraded` is not.
export interface ContactEventsResponse {
  events: ContactEvent[];
  pagination?: ContactEventsPagination;
  degraded?: boolean;
}
