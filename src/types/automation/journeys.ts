// ============================================
// Flow Node Types
// ============================================

export interface JourneyFlowNode {
  id: string;
  type: string;
  position: {
    x: number;
    y: number;
  };
  data: unknown;
}

// ============================================
// Flow Edge Types
// ============================================

export interface JourneyFlowEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  data?: unknown;
}

// ============================================
// Flow Data Types
// ============================================

export interface JourneyFlowData {
  nodes: JourneyFlowNode[];
  edges: JourneyFlowEdge[];
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
}

// ============================================
// Trigger Types
// ============================================

export enum TriggerType {
  Event = 'Event',
  Segment = 'Segment',
  Manual = 'Manual',
  Schedule = 'Schedule',
  Webhook = 'Webhook',
  ContactField = 'ContactField',
  ContactCreated = 'ContactCreated',
  ContactUpdated = 'ContactUpdated',
  Label = 'Label',
  CustomAttribute = 'CustomAttribute',
}

export interface TriggerCondition {
  field?: string;
  operator?: string;
  value?: unknown;
  eventName?: string;
  segmentId?: string;
  schedule?: string;
  webhookUrl?: string;
  labelId?: string;
  attributeName?: string;
}

export interface JourneyFlowTrigger {
  id: string;
  type: TriggerType;
  name: string;
  enabled: boolean;
  conditions?: TriggerCondition;
  metadata?: Record<string, unknown>;
}

// ============================================
// Journey Types
// ============================================

export interface Journey {
  id?: string;
  accountId?: string;
  name: string;
  description?: string;
  isActive: boolean;
  flowData: JourneyFlowData;
  flowTriggers: JourneyFlowTrigger[];
  createdAt?: string;
  updatedAt?: string;
}

// ============================================
// Payload Types
// ============================================

export interface CreateJourneyPayload {
  name: string;
  description?: string;
  isActive?: boolean;
  flowData: JourneyFlowData;
  flowTriggers: JourneyFlowTrigger[];
}

export interface UpdateJourneyPayload extends Partial<CreateJourneyPayload> {
  id: string;
}

// ============================================
// Response Types
// ============================================

import type { PaginatedResponse, StandardResponse } from '@/types/core';

export interface JourneysResponse extends PaginatedResponse<Journey> {}

export interface JourneyResponse extends StandardResponse<Journey> {}

export interface JourneyDeleteResponse extends StandardResponse<{ message: string }> {}
