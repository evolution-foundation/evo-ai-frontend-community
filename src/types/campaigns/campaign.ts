import type { PaginationMeta, StandardResponse, PaginatedResponse } from '@/types/core';

// Enums
export enum CampaignStatus {
  DRAFT = 0,
  SCHEDULED = 1,
  SENDING = 2,
  PAUSED = 3,
  STOPPED = 4,
  COMPLETED = 5,
  SENDING_TESTAB = 6,
}

export enum CampaignType {
  SIMPLE = 'simple',
  RECURRING = 'recurring',
  TRIGGER = 'trigger',
}

export enum CampaignChannelType {
  EMAIL = 'Channel::Email',
  WHATSAPP = 'Channel::Whatsapp',
  SMS = 'Channel::Sms',
}

export const CampaignStatusLabels: Record<CampaignStatus, string> = {
  [CampaignStatus.DRAFT]: 'Rascunho',
  [CampaignStatus.SCHEDULED]: 'Agendada',
  [CampaignStatus.SENDING]: 'Enviando',
  [CampaignStatus.PAUSED]: 'Pausada',
  [CampaignStatus.STOPPED]: 'Parada',
  [CampaignStatus.COMPLETED]: 'Concluída',
  [CampaignStatus.SENDING_TESTAB]: 'Teste A/B',
};

// Campaign Interfaces
export interface CampaignTemplate {
  id: string;
  campaign_id: string;
  account_id: string;
  message_template_id: string;
  variant: string; // 'A', 'B', 'C'
  is_winner: boolean;
  statistics: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Dados do template (carregados via relacionamento)
  template_data?: {
    id: string;
    name: string;
    content: string;
    language: string;
    channel_type: string;
    components?: Record<string, any>;
    variables?: any[];
  };
}

export interface CampaignContact {
  id: string;
  campaign_id: string;
  contact_id: string;
  account_id: string;
  sent_at: string | null;
  status: string | null;
  batch_sequence: number | null;
  created_at: string;
}

export interface Campaign {
  id: string;
  account_id: string;
  title: string;
  name: string;
  description?: string;
  publisher?: string;
  schedule_to?: string;
  scheduled_job_id?: string;

  // Status e controle
  status: CampaignStatus;
  spread_sending?: number;
  sent_contacts?: number;
  sent_percentage?: number;

  // Segmentação e audiência
  query?: string;
  steps?: Record<string, any>;
  tags?: string[];
  send_to_all: boolean;

  // Configurações
  type: CampaignType;
  inbox_id?: string;
  channel_type?: CampaignChannelType;
  is_rate_limit: boolean;
  is_run_segment: boolean;

  // Recorrência
  recurrence_count: number;
  recurrence_settings?: Record<string, any>;
  trigger_config?: Record<string, any>;

  // A/B Testing
  testab_name?: string;
  testab_subject?: string;
  testab_percentage?: number;
  testab_winner_criteria?: string;
  testab_duration_hours?: number;

  // Rotatividade
  phone_number_strategy: string;
  template_allocation_config: Record<string, any>;
  delivery_distribution: Record<string, any>;

  // Timestamps
  created_at: string;
  updated_at: string;
  deleted_at?: string;

  // Relacionamentos
  templates?: CampaignTemplate[];
  contacts_count?: number;

  // Estatísticas (agregadas)
  stats?: {
    total_sent: number;
    total_delivered: number;
    total_read: number;
    total_errors: number;
    delivery_rate: number;
    read_rate: number;
  };
}

// Request/Response Types
export interface CampaignsListParams {
  page?: number;
  per_page?: number;
  sort?: 'name' | 'created_at' | 'status' | 'schedule_to';
  order?: 'asc' | 'desc';
  status?: CampaignStatus[];
  type?: CampaignType[];
  channel_type?: CampaignChannelType[];
  search?: string;
}

// Advanced Configuration Interfaces
export interface RateLimitsConfig {
  whatsapp?: number;
  email?: number;
  sms?: number;
  [key: string]: number | undefined;
}

export interface RetryConfig {
  max_attempts?: number;
  delay_ms?: number;
}

export interface TimeRange {
  start: string; // "HH:mm"
  end: string; // "HH:mm"
  timezone?: string;
}

export interface BusinessHoursConfig {
  enabled: boolean;
  start: string; // "HH:mm"
  end: string; // "HH:mm"
  timezone?: string;
}

export interface MaxFrequencyConfig {
  per_day?: number;
  per_hour?: number;
}

export interface ScheduleConfig {
  week_days?: number[]; // 0=Sunday, 1=Monday, ..., 6=Saturday
  time_ranges?: TimeRange[];
  business_hours?: BusinessHoursConfig;
  max_frequency?: MaxFrequencyConfig;
}

export interface TemplateAllocationConfig {
  strategy?: 'equal' | 'weighted' | 'performance_based';
  weights?: Record<string, number>; // template_id -> weight (%)
}

export interface DeliveryDistributionConfig {
  spread_hours?: number; // Number of hours to spread the sending
  batch_size?: number; // Number of messages per batch
  batch_interval_minutes?: number; // Minutes between batches
  timezone?: string;
}

export interface CampaignCreateData {
  title: string;
  name: string;
  description?: string;
  type: CampaignType;
  channel_type: CampaignChannelType;
  schedule_to?: string;

  // Segmentação
  send_to_all?: boolean;
  query?: string;
  steps?: Record<string, any>;
  tags?: string[];

  // Configurações básicas
  is_rate_limit?: boolean;
  is_run_segment?: boolean;
  phone_number_strategy?: 'round_robin' | 'load_balance' | 'health_based' | 'flexible';

  // Configurações avançadas
  spread_sending?: number; // Hours to spread the campaign
  rate_limits?: RateLimitsConfig;
  retry_config?: RetryConfig;
  schedule_config?: ScheduleConfig;
  template_allocation_config?: TemplateAllocationConfig;
  delivery_distribution?: DeliveryDistributionConfig;

  // Templates
  template_ids?: string[];
  templates?: Array<{
    message_template_id: string;
    variant?: string; // 'A', 'B', 'C'
  }>;


  // A/B Testing (se type === 'testAB')
  testab_name?: string;
  testab_subject?: string;
  testab_percentage?: number;
  testab_winner_criteria?: 'open_rate' | 'click_rate' | 'conversion_rate';
  testab_duration_hours?: number;

  // Recorrência (se type === 'recurring')
  recurrence_settings?: Record<string, any>;
}

export interface CampaignUpdateData {
  title?: string;
  name?: string;
  description?: string;
  schedule_to?: string;
  status?: CampaignStatus;

  // Configurações
  is_rate_limit?: boolean;
  phone_number_strategy?: string;

  // Segmentação
  send_to_all?: boolean;
  query?: string;
  steps?: Record<string, any>;
  tags?: string[];
}

export interface CampaignsResponse extends PaginatedResponse<Campaign> {}
export interface CampaignResponse extends StandardResponse<Campaign> {}

export interface CampaignStatsResponse extends StandardResponse<{
  total_sent: number;
  total_delivered: number;
  total_read: number;
  total_errors: number;
  delivery_rate: number;
  read_rate: number;
  hourly_breakdown?: Array<{
    hour: string;
    sent: number;
    delivered: number;
  }>;
}> {}

// UI State Types
export interface CampaignsState {
  campaigns: Campaign[];
  selectedCampaignIds: string[];
  meta: {
    pagination: PaginationMeta;
  };
  loading: {
    list: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
    schedule: boolean;
    pause: boolean;
    resume: boolean;
  };
  filters: {
    status: CampaignStatus[];
    type: CampaignType[];
    channel_type: CampaignChannelType[];
  };
  searchQuery: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

// Form Types
export interface CampaignFormData extends CampaignCreateData {}

// Table Types
export interface CampaignTableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
}

// Bulk Actions
export interface BulkCampaignActionParams {
  campaign_ids: string[];
  action: 'pause' | 'resume' | 'delete' | 'duplicate';
}

export interface BulkCampaignActionResponse extends StandardResponse<{
  message: string;
  affected_count: number;
}> {}
