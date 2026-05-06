// ===== CRM CHAT API TYPES =====
// Baseado na estrutura real da API do Evolution/CRM

import type { Pipeline as PipelineType, PipelineStage } from '@/types/analytics';
import type {
  PaginatedResponse,
  StandardResponse,
  PaginationMeta as BasePaginationMeta,
} from '@/types/core';
import type { ApiError as BaseApiError } from '@/types/auth';
import type { Label as BaseLabel } from '@/types/settings';
import type { Team as BaseTeam } from '@/types/users';
import type { User as Agent } from '@/types/users';
import type { Inbox as BaseInbox } from '@/types/channels/inbox';

// ===== MESSAGE TYPES (ENUM VALUES) =====
export const MESSAGE_TYPE = {
  INCOMING: 'incoming',
  OUTGOING: 'outgoing',
  ACTIVITY: 'activity',
  TEMPLATE: 'template',
} as const;

export type MessageTypeValue = 'incoming' | 'outgoing' | 'activity' | 'template';

// ===== CONVERSATION =====
export interface Conversation {
  id: string;
  uuid?: string;
  inbox_id: string;
  inbox_name?: string;
  status: 'open' | 'resolved' | 'pending' | 'snoozed';
  assignee_id: string | null;
  team_id: string | null;
  display_id: string;
  contact_last_seen_at: string | null;
  agent_last_seen_at: string | null;
  additional_attributes: Record<string, unknown>;
  can_reply: boolean;
  channel: string;
  contact_inbox_id: string;
  created_at: string;
  updated_at: string;
  custom_attributes: Record<string, unknown>;
  first_reply_created_at: string | null;
  identifier: string | null;
  last_activity_at: string;
  muted: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent' | null;
  pipeline_id: string | null;
  snoozed_until: string | null;
  timestamp: number;
  unread_count: number;
  waiting_since: number;
  meta: ConversationMeta;
  contact: Contact;
  inbox: Inbox;
  assignee: Agent | null;
  team: Team | null;
  labels: Label[];
  pipelines?: Array<{
    id: string;
    name: string;
    stages: Array<{
      id: string;
      name: string;
      days_in_current_stage?: number;
      color?: string;
    }>;
  }>;
  messages?: Message[];
  // Pipeline information
  pipeline?: PipelineType | null;
  pipeline_stage?: PipelineStage | null;
  pipeline_info?: {
    days_in_current_stage?: number;
  } | null;
  last_non_activity_message?: {
    id: string;
    content: string;
    message_type: MessageTypeValue;
    created_at: string;
    processed_message_content: string;
    content_attributes?: MessageContentAttributes;
    attachments?: Array<{ file_type: string }>;
    sender: {
      id: string;
      name: string;
      type: SenderType;
    };
  } | null;
}

export interface ConversationMeta {
  hmac_verified: boolean;
  provider_connection?: {
    connection?: string; // 'open' | 'close' | 'connecting' | 'reconnecting'
    error?: string;
    qr_data_url?: string;
  };
  sender: {
    id: string;
    name: string;
    type: SenderType;
    email?: string | null;
    phone_number?: string | null;
    avatar_url?: string | null;
  };
}

// ===== FILTER OPERATOR =====
// Operadores específicos da API de conversações
export type FilterOperator =
  | 'equal_to'
  | 'not_equal_to'
  | 'contains'
  | 'does_not_contain'
  | 'is_present'
  | 'is_not_present'
  | 'is_greater_than'
  | 'is_less_than'
  | 'days_before';

// ===== RE-EXPORTS =====
// Re-exporta tipos compartilhados para conveniência
// Contact flexível para aceitar dados parciais do WebSocket
export type Contact = {
  id: string;
  name: string;
  type?: 'person' | 'company';
  email?: string | null;
  phone_number?: string | null;
  thumbnail?: string;
  avatar?: string | null;
  avatar_url?: string | null;
  identifier?: string | null;
  tax_id?: string;
  website?: string;
  industry?: string;
  created_at?: string;
  updated_at?: string;
  last_activity_at?: string;
  availability_status?: 'online' | 'offline' | 'busy' | 'away';
  blocked?: boolean;
  custom_attributes?: Record<string, any>;
  additional_attributes?: any;
  contact_inboxes?: any; // Flexível para aceitar {} ou []
  labels?: string[];
  companies?: any[];
  persons?: any[];
  persons_count?: number;
  company_contacts_count?: number;
  conversations_count?: number;
  location?: string | null;
  country_code?: string | null;
  last_conversation?: {
    id: string;
    status: string;
    created_at: string;
    last_activity_at: string;
  };
  pipelines?: any[];
};

export type Label = BaseLabel;
export type Team = BaseTeam;
export type Inbox = BaseInbox;
export type Pipeline = PipelineType;
export type ApiError = BaseApiError;
export { Agent };

// ===== ATTACHMENTS =====
export interface Attachment {
  id: string;
  message_id: string;
  file_type: 'image' | 'video' | 'audio' | 'file' | 'location';
  extension: string | null;
  data_url: string;
  thumb_url: string | null;
  file_size: number;
  fallback_title: string;
  coordinates_lat: number;
  coordinates_long: number;
  external_url?: string;
  transcribed_text?: string;
  meta?: Record<string, any>;
}

// Known fields the backend tags on `Message.content_attributes`. The shape stays
// open (`Record<string, unknown>`) for forward compatibility, but these named
// fields let consumers read them without unsafe `as string` casts.
export interface MessageContentAttributes extends Record<string, unknown> {
  sender_name?: string;
  media_type?: 'image' | 'video' | 'audio' | 'file' | 'sticker' | 'location' | 'contact';
  in_reply_to?: string | number;
  in_reply_to_external_id?: string;
  is_reaction?: boolean;
  is_unsupported?: boolean;
  deleted?: boolean;
  external_created_at?: number;
}

// ===== MESSAGE =====
export interface Message {
  id: string;
  content: string;
  content_attributes: MessageContentAttributes;
  content_type:
    | 'text'
    | 'input_email'
    | 'incoming_email'
    | 'cards'
    | 'form'
    | 'article'
    | 'image'
    | 'file'
    | 'audio'
    | 'video';
  conversation_id: string;
  created_at: string | number; // Suporta Unix timestamp (number) ou ISO string (string)
  sender_type?: 'contact' | 'agent_bot' | 'agent' | 'user';
  external_source_ids: Record<string, unknown>;
  message_type: MessageTypeValue;
  private: boolean;
  sender: MessageSender;
  source_id: string | null;
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'progress';
  attachments: Attachment[];
  echo_id?: string;
}

export interface MessageSender {
  id: string;
  name: string;
  type: 'contact' | 'agent_bot' | 'agent' | 'user';
  thumbnail?: string;
  channel?: string;
}

// Note: Agent, Team, Label, Inbox, Attachment, Pipeline são importados dos tipos base
// e re-exportados acima para conveniência

// ===== API RESPONSES =====
export interface ConversationsListResponse extends PaginatedResponse<Conversation> {
  meta: PaginatedResponse<Conversation>['meta'] & {
    mine_count?: number;
    unassigned_count?: number;
    all_count?: number;
  };
}

export type ConversationResponse = StandardResponse<Conversation>;

export interface MessagesResponse extends StandardResponse<Message[]> {
  meta: StandardResponse<Message[]>['meta'] & {
    contact_last_seen_at?: string | null;
    agent_last_seen_at?: string | null;
  };
}

// Aliases para compatibilidade com código legado
export type ConversationsResponse = ConversationsListResponse;
export type MessageResponse = StandardResponse<Message>;
export type MessageDeleteResponse = StandardResponse<{ message: string }>;
export type ConversationDeleteResponse = StandardResponse<{ message: string }>;
export type ConversationUpdateResponse = StandardResponse<Conversation>;

// ===== FILTERS =====
export interface ConversationFilter {
  attribute_key: string;
  filter_operator: FilterOperator;
  values: unknown[];
  query_operator: 'and' | 'or';
}

export interface FilterRequest {
  page?: number;
  filters: Array<{
    attribute_key: string;
    filter_operator: string;
    values: unknown[];
    query_operator: string | null;
    custom_attribute_type?: string;
  }>;
}

export interface DateRange {
  from: string;
  to: string;
}

// ===== REQUEST TYPES =====
export interface CreateConversationRequest {
  source_id?: string;
  inbox_id: string;
  contact_id?: string;
  additional_attributes?: Record<string, unknown>;
  custom_attributes?: Record<string, unknown>;
  status?: 'open' | 'resolved' | 'pending';
  assignee_id?: string;
  team_id?: string;
  message?: {
    content: string;
    private?: boolean;
    template_params?: {
      name: string;
      category: string;
      language: string;
      namespace: string;
      processed_params: Record<string, string>;
    };
  };
}

// Alias para manter compatibilidade com código legado
export type ConversationCreateData = CreateConversationRequest;

export interface UpdateConversationRequest {
  status?: 'open' | 'resolved' | 'pending' | 'snoozed';
  assignee_id?: string | null;
  team_id?: string | null;
  labels?: string[];
  custom_attributes?: Record<string, unknown>;
  priority?: 'low' | 'medium' | 'high' | 'urgent' | null;
  snoozed_until?: string | null;
}

export interface SendMessageRequest {
  content: string;
  private?: boolean;
  canned_response_id?: string | null;
  echo_id?: string;
  content_attributes?: Record<string, unknown>;
  attachments?: File[];
  message_type: MessageTypeValue;
  template_params?: {
    name: string;
    category: string;
    language: string;
    namespace: string;
    processed_params: Record<string, string>;
  };
}

// ===== REPLY MODES =====
export enum ReplyMode {
  REPLY = 'REPLY', // Mensagem pública
  NOTE = 'NOTE', // Nota privada
}

export type ReplyModeValue = ReplyMode.REPLY | ReplyMode.NOTE;

// ===== PAGINATION =====
export interface ConversationPaginationMeta extends BasePaginationMeta {
  mine_count?: number;
  unassigned_count?: number;
  all_count?: number;
}

// ===== API PARAMS =====
export interface ConversationListParams {
  page?: number;
  per_page?: number;
  page_size?: number;
  pageSize?: number;
  status?: 'open' | 'resolved' | 'pending' | 'snoozed' | 'all';
  assignee_type?: 'me' | 'unassigned' | 'all';
  assignee_id?: string;
  inbox_id?: string;
  team_id?: string;
  labels?: string[];
  q?: string;
  sort_by?: 'last_activity_at' | 'created_at' | 'priority';
  conversation_type?: 'mention' | 'unattended' | 'participating';
}

export interface MessageListParams {
  before?: string;
  after?: string;
}

// Aliases para compatibilidade com código legado
export type ConversationParams = ConversationListParams;
export type MessageParams = SendMessageRequest;

// ===== WEBSOCKET EVENTS =====
export interface ConversationTypingEvent {
  event: 'conversation.typing_on' | 'conversation.typing_off';
  data: {
    conversation: Conversation;
    user: Agent;
    account_id: string;
  };
}

export interface MessageCreatedEvent {
  event: 'message.created';
  data: {
    message: Message;
    conversation: Conversation;
    account_id: string;
  };
}

export interface ConversationStatusChangedEvent {
  event: 'conversation.status_changed';
  data: {
    conversation: Conversation;
    account_id: string;
  };
}

export interface AssigneeChangedEvent {
  event: 'assignee.changed';
  data: {
    conversation: Conversation;
    account_id: string;
  };
}

// ===== UNION TYPES =====
export type WebSocketEvent =
  | ConversationTypingEvent
  | MessageCreatedEvent
  | ConversationStatusChangedEvent
  | AssigneeChangedEvent;

export type ConversationStatus = 'open' | 'resolved' | 'pending' | 'snoozed';
export type MessageType = 'incoming' | 'outgoing' | 'activity' | 'template';
export type SenderType = 'contact' | 'agent_bot' | 'agent' | 'user';
export type AvailabilityStatus = 'online' | 'busy' | 'offline';
export type Priority = 'low' | 'medium' | 'high' | 'urgent' | null;
export type QuickFilterTab = 'all' | 'mine' | 'unassigned';
