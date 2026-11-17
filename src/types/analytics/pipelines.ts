export interface CardFieldDefinition { id: string; label: string; type: string; source: string }
export interface CardConfiguration {
  version: 1;
  density: 'comfortable' | 'compact';
  fields: { id: string; visible: boolean }[];
}

import type { PaginatedResponse, StandardResponse, PaginationMeta } from '@/types/core';
import type { Contact } from '@/types/contacts';

export type StageAutomationTrigger =
  'label_added' | 'conversation_status_changed' | 'custom_attribute_updated' | 'inactivity';
export type StageAutomationAction =
  | 'move_to_stage'
  | 'move_to_pipeline'
  | 'assign_agent'
  | 'apply_label'
  | 'send_ai_message'
  | 'send_direct_message'
  | 'send_template'
  | 'finalize';

export type InactivityBase = 'no_customer_reply' | 'stage_stagnation';

// trigger_value for the 'inactivity' trigger carries the timer config as an
// object; all other triggers keep using a plain string.
export interface InactivityTriggerValue {
  minutes: number;
  base: InactivityBase;
}

export interface StageAutomationRule {
  // Stable id (uuid) for inactivity idempotency. Optional for back-compat with
  // legacy rules saved before this field existed (backend falls back to a hash).
  id?: string;
  trigger: StageAutomationTrigger;
  trigger_value: string | InactivityTriggerValue;
  action: StageAutomationAction;
  // For send_ai_message: action_value holds the agent_bot id. For other actions
  // it holds the stage/agent/label id, template id, or raw text.
  action_value: string;
  // Optional suggested text passed to the AI for the send_ai_message action.
  ai_message?: string;
}

export interface PipelinesResponse extends PaginatedResponse<Pipeline> {}

export interface PipelineResponse extends StandardResponse<Pipeline> {}

export interface StagesResponse extends PaginatedResponse<PipelineStage> {}

export interface ItemsResponse extends PaginatedResponse<PipelineItem> {}

export interface PipelineItemResponse extends StandardResponse<PipelineItem> {}

export interface AvailableConversationsResponse extends StandardResponse<ConversationForModal[]> {}

export interface AvailableContactsResponse extends StandardResponse<Contact[]> {}

// For conversations used in pipeline modals
export interface ConversationForModal {
  id: string;
  display_id?: string;
  inbox_id: string;
  status: 'open' | 'resolved' | 'pending' | 'snoozed';
  contact?: {
    id: string;
    name: string;
    email: string | null;
    phone_number: string | null;
    avatar_url: string | null;
  };
  last_message?: {
    content: string;
    created_at: string;
  };
  meta?: Record<string, unknown>;
}

// For accessing non-typed API properties
export interface ConversationWithExtraFields {
  id: string;
  inbox_id: string;
  status: string;
  last_non_activity_message?: {
    content: string | null;
    created_at: string;
  };
  [key: string]: unknown;
}

// For sender with all possible fields
export interface SenderWithAllFields {
  id: string;
  name?: string;
  email?: string | null;
  phone_number?: string | null;
  avatar_url?: string | null;
  thumbnail?: string;
  [key: string]: unknown;
}

export interface PipelineStage {
  id: string;
  name: string;
  description?: string;
  color: string;
  position: number;
  pipeline_id?: string;
  stage_type?: string;
  automation_rules?: {
    description?: string;
    rules?: StageAutomationRule[];
  };
  custom_fields?: Record<string, unknown> & {
    attributes?: string[]; // Array of attribute keys created at stage level
  };
  item_count?: number;
  conversations_count?: number;
  total_value?: number; // Sum of services value of the stage's items (list payload)
  items?: PipelineItem[]; // Items already included in the stage
  created_at: string | number;
  updated_at: string | number;
}

export interface Pipeline {
  card_configuration?: CardConfiguration | Record<string, never>;
  card_configuration_revision?: number;
  card_field_definitions?: CardFieldDefinition[];
  id: string;
  name: string;
  description?: string;
  pipeline_type: 'custom' | 'sales' | 'support' | 'marketing';
  visibility: 'private' | 'public' | 'team';
  is_active: boolean;
  is_default?: boolean;
  stages?: PipelineStage[]; // Stages already include their items
  items?: PipelineItem[]; // Only returned when stages are not included
  conversations_count?: number;
  item_count?: number;
  deal_status_counts?: Record<DealStatus, number>;
  services_info?: {
    total_value: number;
    formatted_total?: string;
    conversations_with_services?: number;
    has_services?: boolean;
    currency?: string;
  };
  custom_fields?: Record<string, unknown> & {
    attributes?: string[]; // Array of attribute keys created at pipeline level
  };
  created_at: string | number;
  updated_at: string | number;
  created_by?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  team_ids?: string[];
}

export interface PipelineStats {
  total_items: number;
  stage_counts: number;
}

export interface PipelinesState {
  pipelines: Pipeline[];
  selectedPipelineIds: string[];
  meta: {
    pagination: PaginationMeta;
  };
  loading: {
    list: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
    duplicate: boolean;
  };
  searchQuery: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface PipelinesListParams {
  page?: number;
  per_page?: number;
  sort?: 'name' | 'created_at' | 'conversations_count';
  order?: 'asc' | 'desc';
  q?: string;
  is_active?: boolean;
  pipeline_type?: string;
}

export interface CreatePipelineData {
  name: string;
  description?: string;
  pipeline_type?: 'custom' | 'sales' | 'support' | 'marketing';
  visibility?: 'private' | 'public' | 'team';
  is_active?: boolean;
  stages?: PipelineStage[];
  team_ids?: string[];
}

export interface UpdatePipelineData extends Partial<CreatePipelineData> {
  card_configuration?: CardConfiguration;
  card_configuration_revision?: number;
  id?: string;
  team_ids?: string[];
  custom_fields?: Record<string, unknown> & {
    attributes?: string[]; // Array of attribute keys created at pipeline level
  };
}

export interface CreateStageData {
  name: string;
  color: string;
  stage_type: 'active' | 'completed' | 'cancelled';
  automation_rules?: {
    description?: string;
  };
}

export interface PipelineStats {
  total_pipelines: number;
  total_items: number;
  active_pipelines: number;
}

export type DealConversationReason = 'no_contact' | 'no_inbox_configured' | 'contact_without_phone' | 'contact_blocked';

/** Resumo calculado em lote pelo CRM (S3) para o botão de conversa do cartão. */
export interface DealConversationSummary {
  has_active: boolean;
  conversation_id?: string | null;
  display_id?: number | string | null;
  inbox_id?: string | null;
  status?: string | null;
  last_activity_at?: string | number | null;
  can_start: boolean;
  reason?: DealConversationReason | null;
  allowed_inbox_count?: number;
}

export interface WhatsappInboxInfo {
  id: string;
  name: string;
  phone_number?: string | null;
  provider?: string | null;
  connected: boolean;
  connection?: string | null;
  is_default?: boolean;
  allowed?: boolean;
}

export interface PipelineWhatsappInboxes {
  pipeline_id: string;
  configured: boolean;
  default_inbox_id: string | null;
  allowed: WhatsappInboxInfo[];
  eligible: WhatsappInboxInfo[];
}

export interface DealConversationStatus {
  deal_id: string;
  pipeline_id: string;
  has_active: boolean;
  conversation: {
    id: string;
    display_id?: number | string;
    status: string;
    inbox?: { id?: string; name?: string } | null;
    last_activity_at?: string | number | null;
    last_message?: { id: string; content?: string | null; message_type?: string; created_at?: string | number } | null;
    path: string;
  } | null;
  can_start: boolean;
  reason?: DealConversationReason | null;
  contact?: { id: string; name?: string; phone_number?: string } | null;
  allowed_inboxes: WhatsappInboxInfo[];
  default_inbox_id: string | null;
  created?: boolean;
  conversation_id?: string;
}

/** Status do negócio (não confundir com o status da conversa). */
export type DealStatus = 'open' | 'won' | 'lost';
export type DealStatusFilter = DealStatus | 'all';

export interface PipelineItem {
  deal_status?: DealStatus;
  lost_reason?: string | null;
  closed_by_id?: string | null;
  conversation_summary?: DealConversationSummary | null;
  channel_origin?: { channel?: string | null; origin?: string | null; conversation_id?: string | null };
  last_activity?: { occurred_at?: string | null; summary: string } | null;
  next_task?: { id: string; title: string; due_at?: string | null; status: string } | null;
  id: string;
  deal_id?: string;
  title?: string;
  item_id: string; // conversation_id or contact_id
  type: 'conversation' | 'contact';
  pipeline_id: string;
  stage_id: string;
  pipeline_stage_id?: string; // Backend alias for stage_id
  is_lead: boolean;
  notes?: string;
  value?: number;
  currency?: string;
  labels?: DealLabel[];
  created_at: string | number;
  updated_at: string | number;
  contact?: {
    id: string;
    name: string;
    email?: string;
    phone_number?: string;
    avatar_url?: string;
    thumbnail?: string;
    labels?: Array<{ name: string; color?: string }>;
  };
  primary_contact?: {
    id: string;
    name: string;
    email?: string;
    phone_number?: string;
    avatar_url?: string;
    thumbnail?: string;
    labels?: Array<{ name: string; color?: string }>;
    custom_attributes?: Record<string, unknown>;
  };
  company?: {
    id: string;
    name: string;
    email?: string;
    phone_number?: string;
    website?: string;
    industry?: string;
    custom_attributes?: Record<string, unknown>;
  };
  owner?: {
    id: string;
    name: string;
    email?: string;
    avatar_url?: string;
  } | null;
  contact_count?: number;
  conversation_count?: number;
  file_count?: number;
  latest_message?: {
    id: string;
    content: string;
    message_type: string;
    created_at: string;
    conversation_id: string;
  } | null;
  assignee?: {
    id: string;
    name: string;
    email?: string;
    avatar_url?: string;
  };
  last_message?: {
    content: string;
    created_at: string;
    message_type?: string;
    sender_type?: string | null;
    sender?: {
      name: string;
      type: string;
    };
  };
  // Additional fields from backend
  custom_fields?: any;
  entered_at?: number;
  completed_at?: number | null;
  days_in_pipeline?: number;
  days_in_current_stage?: number;
  services_info?: {
    total_value: number;
    currency: string;
    formatted_total: string;
    services_count: number;
    has_services: boolean;
  };
  tasks_info: {
    pending_count: number;
    overdue_count: number;
    due_soon_count: number;
    completed_count: number;
    total_count: number;
  };
  conversation?: {
    id: string;
    uuid?: string;
    display_id: string;
    status: string;
    priority?: string | null;
    last_activity_at: number;
    contact: {
      id: string;
      name: string;
      email?: string;
      phone_number?: string;
      avatar_url?: string;
    };
    inbox?: {
      id: string;
      name: string;
      channel_type: string;
    };
    assignee?: {
      id: string;
      name: string;
      avatar_url?: string;
    };
    labels?: Array<{
      id: number;
      title: string;
      color?: string;
      description?: string;
      show_on_sidebar?: boolean;
    }>;
    last_message?: {
      content: string;
      message_type: string;
      created_at: string;
      sender_type?: string | null;
      sender?: {
        name: string;
        type: string;
      };
    };
    last_non_activity_message?: {
      id: string;
      content: string;
      message_type: number;
      created_at: number | string;
      updated_at?: string;
      sender_type?: string | null;
      sender?: {
        name: string;
        type: string;
      };
      processed_message_content?: string;
    } | null;
  };
}

export interface DealContact {
  id: string;
  name: string;
  type?: 'person' | 'company' | 'group';
  email?: string;
  phone_number?: string;
  thumbnail?: string;
  avatar_url?: string;
  labels?: Array<{ name: string; color?: string }>;
  custom_attributes?: Record<string, unknown>;
}

export interface DealLabel {
  id?: string;
  name: string;
  title?: string;
  color?: string;
}

export interface DealConversation {
  id: string;
  display_id: string | number;
  status: string;
  inbox_id?: string;
  contact?: DealContact;
  latest_message?: PipelineItem['latest_message'];
}

export interface DealFile {
  id: string;
  name: string;
  content_type?: string;
  byte_size?: number;
  file_type: string;
  url: string;
  thumbnail_url?: string;
  created_at: string;
}

export interface DealHistoryEvent {
  id: string;
  action: string;
  source: string;
  changes: Record<string, unknown>;
  metadata: Record<string, unknown>;
  actor?: { id: string; name: string; avatar_url?: string } | null;
  created_at: string;
}

export interface Deal extends PipelineItem {
  title: string;
  currency: string;
  contacts: DealContact[];
  conversations: DealConversation[];
  files: DealFile[];
  history: DealHistoryEvent[];
  tasks: Array<Record<string, unknown>>;
  scheduled_actions: Array<Record<string, unknown>>;
}

export interface CreateDealData {
  title: string;
  value?: number;
  currency?: string;
  notes?: string;
  pipeline_stage_id?: string;
  owner_id?: string | null;
  company_id?: string | null;
  labels?: string[];
  contact_ids?: string[];
  conversation_ids?: string[];
  custom_fields?: Record<string, unknown>;
}

export type UpdateDealData = Partial<Omit<CreateDealData, 'contact_ids' | 'conversation_ids'>>;

export interface MovePipelineItemData {
  item_id: string;
  pipeline_id: string;
  from_stage_id: string;
  to_stage_id: string;
}

// Pipeline Tasks
export interface PipelineTask {
  id: string;
  pipeline_item_id: string;
  created_by_id: string;
  assigned_to_id?: string;
  title: string;
  description?: string;
  due_date?: string; // ISO 8601 datetime
  task_type: 'call' | 'email' | 'meeting' | 'follow_up' | 'note' | 'other';
  status: 'pending' | 'completed' | 'cancelled' | 'overdue';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  completed_at?: string;
  metadata?: Record<string, unknown>;
  created_at: string | number;
  updated_at: string | number;

  // Hierarchy fields
  parent_task_id?: string | null;
  position?: number;
  depth?: number;
  is_root?: boolean;
  has_subtasks?: boolean;
  subtask_count?: number;
  completion_percentage?: number;

  // Computed fields
  overdue?: boolean;
  due_soon?: boolean;
  days_until_due?: number;
  hours_until_due?: number;

  // Related objects
  created_by?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
  assigned_to?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
  parent_task?: {
    id: string;
    title: string;
    status: string;
    due_date?: string;
  };
  subtasks?: PipelineTask[]; // Recursive
  pipeline_item?: Partial<PipelineItem>;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  task_type: PipelineTask['task_type'];
  due_date?: string;
  assigned_to_id?: string;
  priority?: PipelineTask['priority'];
  parent_task_id?: string | null;
  position?: number;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  task_type?: PipelineTask['task_type'];
  due_date?: string;
  assigned_to_id?: string;
  priority?: PipelineTask['priority'];
  parent_task_id?: string | null;
  position?: number;
}

export interface MoveTaskData {
  new_parent_id?: string | null;
  new_position?: number;
}

export interface ReorderTaskData {
  position: number;
}

export interface PipelineTasksListParams {
  status?: PipelineTask['status'];
  task_type?: PipelineTask['task_type'];
  priority?: PipelineTask['priority'];
  assigned_to_id?: string;
  created_by_id?: string;
  due_date_from?: string;
  due_date_to?: string;
  due_today?: boolean;
  due_this_week?: boolean;
  past_due?: boolean;
  page?: number;
  per_page?: number;
}

export interface PipelineTasksResponse extends PaginatedResponse<PipelineTask> {}

export interface PipelineTaskStatistics {
  total_tasks: number;
  pending_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
  by_type: Record<PipelineTask['task_type'], number>;
  by_priority: Record<PipelineTask['priority'], number>;
  by_assignee: Array<{
    user_id: string;
    user_name: string;
    count: number;
  }>;
}

// Pipeline Service Definitions (Catalog)
export interface PipelineServiceDefinition {
  id: string;
  pipeline_id: string;
  name: string;
  default_value: number;
  currency: 'BRL' | 'USD' | 'EUR';
  description?: string;
  active: boolean;
  formatted_default_value: string;
  created_at: string;
  updated_at: string;
}

export interface CreateServiceDefinitionData {
  name: string;
  default_value: number;
  currency: 'BRL' | 'USD' | 'EUR';
  description?: string;
}

export interface UpdateServiceDefinitionData {
  name?: string;
  default_value?: number;
  currency?: 'BRL' | 'USD' | 'EUR';
  description?: string;
  active?: boolean;
}

export interface ServiceDefinitionsResponse extends StandardResponse<PipelineServiceDefinition[]> {}
