import type { PaginatedResponse, StandardResponse, PaginationMeta } from '@/types/core';
import type { Contact } from '@/types/contacts';

export type StageAutomationTrigger = 'label_added' | 'conversation_status_changed' | 'custom_attribute_updated';
export type StageAutomationAction = 'move_to_stage' | 'assign_agent' | 'apply_label';

export interface StageAutomationRule {
  trigger: StageAutomationTrigger;
  trigger_value: string;
  action: StageAutomationAction;
  action_value: string;
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
  items?: PipelineItem[]; // Items already included in the stage
  created_at: string | number;
  updated_at: string | number;
}

export interface Pipeline {
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

export interface PipelineItem {
  id: string;
  item_id: string; // conversation_id or contact_id
  type: 'conversation' | 'contact';
  pipeline_id: string;
  stage_id: string;
  pipeline_stage_id?: string; // Backend alias for stage_id
  is_lead: boolean;
  notes?: string;
  value?: number;
  created_at: string | number;
  updated_at: string | number;
  contact?: {
    id: string;
    name: string;
    email?: string;
    phone_number?: string;
    avatar_url?: string;
  };
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