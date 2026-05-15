import type { Node, Edge } from '@xyflow/react';

// Basic automation rule interface (existing)
export interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  event_name: string;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  mode: 'simple' | 'flow';
  flow_data?: AutomationFlowData;
  created_on: number;
  active: boolean;
  files?: AutomationFile[];
}

// Automation condition interface (existing)
export interface AutomationCondition {
  attribute_key: string;
  filter_operator: string;
  query_operator?: string;
  values: (string | number)[];
  custom_attribute_type?: string;
}

// Automation action interface (existing)
export interface AutomationAction {
  action_name: string;
  action_params: string[] | Record<string, unknown>;
}

// Automation rule run (execution log)
export type AutomationRuleRunStatus = 'matched' | 'no_match' | 'error' | 'skipped';

export interface AutomationRuleRunStep {
  at: string;
  label: string;
  level: 'info' | 'success' | 'warn' | 'error';
  data?: Record<string, unknown>;
}

export interface AutomationRuleRun {
  id: string;
  automation_rule_id: string;
  event_name: string;
  status: AutomationRuleRunStatus;
  started_at: string;
  finished_at?: string;
  duration_ms?: number;
  error_message?: string;
  payload?: Record<string, unknown>;
  steps: AutomationRuleRunStep[];
}

// Automation file interface (existing)
export interface AutomationFile {
  id: string;
  automation_rule_id: string;
  file_type: string;
  file_url: string;
  blob_id: string;
  filename: string;
}

// New React Flow specific interfaces
export interface AutomationFlowData {
  nodes: AutomationFlowNode[];
  edges: AutomationFlowEdge[];
  variables: string[];
}

// Extended Node interface for automation specific data
export interface AutomationFlowNode extends Node {
  type: 'trigger' | 'condition' | 'action' | 'variable';
  data: AutomationNodeData;
}

// Extended Edge interface for automation specific data
export interface AutomationFlowEdge extends Edge {
  data?: {
    condition?: string;
    label?: string;
  };
}

// Node data based on type
export type AutomationNodeData =
  | AutomationTriggerNodeData
  | AutomationConditionNodeData
  | AutomationActionNodeData
  | AutomationVariableNodeData;

// Trigger node (start of flow)
export interface AutomationTriggerNodeData extends Record<string, unknown> {
  type: 'trigger';
  event_name: string;
  label: string;
}

// Condition node (decision points)
export interface AutomationConditionNodeData extends Record<string, unknown> {
  type: 'condition';
  attribute_key: string;
  filter_operator: string;
  values: (string | number)[];
  custom_attribute_type?: string;
  label: string;
}

// Action node (operations to perform)
export interface AutomationActionNodeData extends Record<string, unknown> {
  type: 'action';
  action_name: string;
  action_params: string[] | Record<string, unknown>;
  label: string;
}

// Variable node (store/use variables)
export interface AutomationVariableNodeData extends Record<string, unknown> {
  type: 'variable';
  variable_name: string;
  variable_value?: string;
  operation: 'set' | 'get' | 'increment' | 'append';
  label: string;
}

// Flow validation interface
export interface AutomationFlowValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Flow execution context
export interface AutomationFlowContext {
  conversation_id: string;
  contact_id?: string;
  message?: unknown;
  variables: Record<string, unknown>;
  currentNodeId?: string;
}

// Event types for automation triggers
export type AutomationEventType =
  | 'conversation_created'
  | 'conversation_updated'
  | 'conversation_opened'
  | 'message_created'
  | 'pipeline_stage_updated'
  | 'contact_created'
  | 'contact_updated'
  | 'conversation_resolved'
  | 'conversation_status_changed';

// Filter operators for conditions
export type AutomationFilterOperator =
  | 'equal_to'
  | 'not_equal_to'
  | 'contains'
  | 'does_not_contain'
  | 'is_present'
  | 'is_not_present'
  | 'is_greater_than'
  | 'is_less_than'
  | 'days_before'
  | 'starts_with'
  | 'attribute_changed'
  | 'is_in'
  | 'is_not_in';

// Action types for automation actions
export type AutomationActionType =
  | 'send_message'
  | 'send_canned_response'
  | 'send_template'
  | 'add_label'
  | 'remove_label'
  | 'send_email_to_team'
  | 'assign_team'
  | 'assign_agent'
  | 'send_webhook_event'
  | 'mute_conversation'
  | 'send_attachment'
  | 'change_status'
  | 'resolve_conversation'
  | 'snooze_conversation'
  | 'change_priority'
  | 'send_email_transcript'
  | 'assign_to_pipeline'
  | 'update_pipeline_stage'
  | 'create_pipeline_task';

// Flow builder state interface
export interface AutomationFlowBuilderState {
  nodes: AutomationFlowNode[];
  edges: AutomationFlowEdge[];
  variables: string[];
  selectedNode?: AutomationFlowNode;
  selectedEdge?: AutomationFlowEdge;
  isEditing: boolean;
  isDirty: boolean;
}

// Flow builder actions
export interface AutomationFlowBuilderActions {
  addNode: (node: Omit<AutomationFlowNode, 'id'>) => void;
  updateNode: (nodeId: string, data: Partial<AutomationNodeData>) => void;
  deleteNode: (nodeId: string) => void;
  addEdge: (edge: Omit<AutomationFlowEdge, 'id'>) => void;
  updateEdge: (edgeId: string, data: Partial<AutomationFlowEdge>) => void;
  deleteEdge: (edgeId: string) => void;
  addVariable: (variableName: string) => void;
  removeVariable: (variableName: string) => void;
  validate: () => AutomationFlowValidation;
  reset: () => void;
}

// ============================================
// Payload Types
// ============================================

export interface CreateAutomationPayload {
  name: string;
  description?: string;
  event_name: string;
  active?: boolean;
  mode?: 'simple' | 'flow';
  flow_data?: AutomationFlowData;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
}

export interface UpdateAutomationPayload extends Partial<CreateAutomationPayload> {
  id: string;
}

// ============================================
// Response Types
// ============================================

import type { PaginatedResponse, StandardResponse } from '@/types/core';

export interface AutomationsResponse extends PaginatedResponse<AutomationRule> {}

export interface AutomationResponse extends StandardResponse<AutomationRule> {}

export interface AutomationDeleteResponse extends StandardResponse<{ message: string }> {}

