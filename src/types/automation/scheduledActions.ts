// Scheduled action entity
export interface ScheduledAction {
  id: string;
  deal_id?: string;
  pipeline_item_id?: string;
  contact_id?: string;
  conversation_id?: string;
  action_type: string;
  status: string;
  scheduled_for: string;
  executed_at?: string;
  payload: Record<string, unknown>;
  template_id?: string;
  created_by: string;
  retry_count: number;
  max_retries: number;
  error_message?: string;
  recurrence_type?: string;
  recurrence_config?: Record<string, unknown>;
  time_until_execution?: number;
  formatted_time_until?: string;
  overdue?: boolean;
  can_retry?: boolean;
  creator?: {
    id: string;
    name: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

// Create scheduled action
export interface CreateScheduledAction {
  deal_id?: string;
  pipeline_item_id?: string;
  contact_id?: string;
  conversation_id?: string;
  action_type: string;
  scheduled_for: string;
  payload: Record<string, unknown>;
  template_id?: string;
  recurrence_type?: string;
  recurrence_config?: Record<string, unknown>;
}
