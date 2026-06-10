import type { Role } from '@/types/auth';
import type { AgentBot } from '@/components/channels/settings/helpers/agentBotHelpers';
import type { PaginatedResponse, PaginationMeta, StandardResponse } from '@/types/core';

// ============================================
// Inbox Types
// ============================================

/** Live connection state exposed by /inboxes (EVO-1674). */
export type InboxConnectionState = 'connected' | 'disconnected' | 'pending' | 'error' | 'unknown';

/**
 * How trustworthy the connection state is: event-fed by the provider,
 * assumed from stored configuration, or unsupported by the channel type.
 */
export type InboxHealthSource = 'provider_event' | 'stored_flag' | 'none';

export interface Channel {
  id: string;
  phone_number: string;
  provider: string;
  provider_config: Record<string, unknown>;
  provider_connection: Record<string, unknown>;
}

export interface Inbox {
  id: string;
  name: string;
  channel_id: string;
  display_name?: string;
  channel_type: string;
  avatar_url?: string;
  provider?: string;
  provider_config?: Record<string, unknown>;
  // Channel-specific fields
  medium?: string;
  phone_number?: string;
  email?: string;
  messaging_service_sid?: string;
  imap_address?: string;
  // Widget fields
  website_url?: string;
  welcome_title?: string;
  welcome_tagline?: string;
  widget_color?: string;
  selected_feature_flags?: string[];
  reply_time?: string;
  locale?: string;
  // Communication settings
  greeting_enabled?: boolean;
  greeting_message?: string;
  enable_email_collect?: boolean;
  allow_messages_after_resolved?: boolean;
  continuity_via_email?: boolean;
  lock_to_single_conversation?: boolean;
  // Auth/status
  reauthorization_required?: boolean;
  // Live channel health (EVO-1674)
  connection_state?: InboxConnectionState;
  health_source?: InboxHealthSource;
  /** Epoch seconds of the last known connectivity change. */
  last_sync?: number | null;
  // Sender settings
  sender_name_type?: string;
  business_name?: string;
  // Webhook
  webhook_url?: string;
  // Help center
  help_center?: {
    id: string;
    slug: string;
    name: string;
  };
  // Auto assignment
  enable_auto_assignment?: boolean;
  auto_assignment_config?: {
    max_assignment_limit?: number | null;
  };
  // Business hours
  working_hours_enabled?: boolean;
  out_of_office_message?: string;
  working_hours?: unknown[];
  timezone?: string;
  // CSAT
  csat_survey_enabled?: boolean;
  csat_config?: {
    display_type: string;
    message: string;
    survey_rules: {
      triggers: Array<{
        type: string;
        operator?: string;
        values?: string[];
        stage_ids?: string[];
        stage_names?: string[];
        pattern?: string;
        field?: string;
        days?: string[];
        time?: string;
        minutes?: number;
      }>;
    };
  };
  // Pre-chat form
  pre_chat_form_enabled?: boolean;
  pre_chat_form_options?: import('@/components/channels/settings/helpers/preChatHelpers').PreChatFormOptions;
  web_widget_script?: string;
  default_conversation_status?: string;
}

// ============================================
// Channel Creation Payload Types
// ============================================

export interface ApiChannelPayload {
  name: string;
  display_name?: string;
  channel: {
    type: 'api';
    webhook_url?: string;
  };
}

export interface EmailChannelPayload {
  name: string;
  channel: {
    type: 'email';
    email?: string;
    provider?: 'google' | 'microsoft' | 'other_provider';
    imap_enabled?: boolean;
    imap_address?: string;
    imap_port?: number;
    imap_login?: string;
    imap_password?: string;
    imap_enable_ssl?: boolean;
    smtp_enabled?: boolean;
    smtp_address?: string;
    smtp_port?: number;
    smtp_login?: string;
    smtp_password?: string;
    smtp_enable_starttls_auto?: boolean;
    smtp_authentication?: string;
  };
}

export interface SmsChannelPayload {
  name: string;
  channel: {
    type: 'sms';
    provider: 'twilio' | 'bandwidth';
    account_sid?: string;
    auth_token?: string;
    phone_number?: string;
    messaging_service_sid?: string;
    api_key?: string;
    api_secret?: string;
    application_id?: string;
  };
}

export interface TelegramChannelPayload {
  name: string;
  channel: {
    type: 'telegram';
    bot_token: string;
  };
}

export interface WebWidgetPayload {
  name: string;
  display_name?: string;
  greeting_enabled?: boolean;
  greeting_message?: string;
  channel: {
    type: 'web_widget';
    website_url?: string;
    welcome_title?: string;
    welcome_tagline?: string;
    widget_color?: string;
  };
}

export interface WhatsappCloudPayload {
  name: string;
  display_name?: string;
  channel: {
    type: 'whatsapp';
    provider: 'whatsapp_cloud';
    phone_number?: string;
    provider_config: {
      api_key: string;
      phone_number_id: string;
      waba_id: string;
    };
  };
}

export interface WhatsappEvolutionPayload {
  name: string;
  display_name?: string;
  channel: {
    type: 'whatsapp';
    provider: 'evolution';
    phone_number: string;
    provider_config?: {
      api_url?: string;
      admin_token?: string;
      instance_name?: string;
      proxy_settings?: {
        enabled: boolean;
        host?: string;
        port?: string;
        protocol?: string;
        username?: string;
        password?: string;
      };
      instance_settings?: {
        rejectCall?: boolean;
        msgCall?: string;
        groupsIgnore?: boolean;
        alwaysOnline?: boolean;
        readMessages?: boolean;
        syncFullHistory?: boolean;
        readStatus?: boolean;
        enable_sync_features?: boolean;
      };
    };
  };
}

export interface WhatsappEvolutionGoPayload {
  name: string;
  display_name?: string;
  channel: {
    type: 'whatsapp';
    provider: 'evolution_go';
    phone_number: string;
    provider_config?: {
      api_url?: string;
      admin_token?: string;
      instance_name?: string;
      instance_uuid?: string;
      instance_token?: string;
      always_online?: boolean;
      reject_call?: boolean;
      read_messages?: boolean;
      ignore_groups?: boolean;
      ignore_status?: boolean;
    };
  };
}

export interface WhatsappTwilioPayload {
  name: string;
  display_name?: string;
  channel: {
    type: 'whatsapp';
    provider: 'twilio';
    phone_number?: string;
    account_sid: string;
    auth_token: string;
    messaging_service_sid?: string;
  };
}

export interface WhatsappNotificamePayload {
  name: string;
  display_name?: string;
  channel: {
    type: 'whatsapp';
    provider: 'notificame';
    phone_number: string;
    provider_config?: {
      api_url?: string;
      admin_token?: string;
      instance_id?: string;
      api_token?: string;
      channel_id?: string;
    };
  };
}

export interface WhatsappZapiPayload {
  name: string;
  display_name?: string;
  channel: {
    type: 'whatsapp';
    provider: 'zapi';
    phone_number: string;
    provider_config?: {
      instance_id?: string;
      token?: string;
      client_token?: string;
      api_key?: string;
    };
  };
}

export interface SmsTwilioPayload {
  name: string;
  display_name?: string;
  channel: {
    type: 'sms';
    provider: 'twilio';
    phone_number?: string;
    provider_config?: {
      account_sid?: string;
      auth_token?: string;
      api_key_sid?: string | null;
      messaging_service_sid?: string | null;
      medium?: string;
    };
  };
}

export interface SmsBandwidthPayload {
  name: string;
  display_name?: string;
  channel: {
    type: 'sms';
    provider: 'bandwidth';
    phone_number: string;
    provider_config?: {
      api_key?: string;
      api_secret?: string;
      application_id?: string;
      account_id?: string;
    };
  };
}

export type ChannelPayload =
  | ApiChannelPayload
  | EmailChannelPayload
  | SmsChannelPayload
  | TelegramChannelPayload
  | WebWidgetPayload
  | WhatsappCloudPayload
  | WhatsappEvolutionPayload
  | WhatsappEvolutionGoPayload
  | WhatsappTwilioPayload
  | WhatsappNotificamePayload
  | WhatsappZapiPayload
  | SmsTwilioPayload
  | SmsBandwidthPayload;

// Response type for channel list
export type InboxesResponse = PaginatedResponse<Inbox>;

// Response type for single inbox
export type InboxResponse = StandardResponse<Inbox>;

export type InboxDeleteResponse = StandardResponse<{ message: string }>;

export type InboxMembersUpdateResponse = StandardResponse<{ message: string }>;

export type ChannelDeleteResponse = StandardResponse<{ message: string }>;

// ============================================
// Agent Types
// ============================================

export interface AgentChannel {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  role: Role;
  availability_status: string;
  confirmed: boolean;
  ui_flags: {
    is_creating: boolean;
    is_fetching: boolean;
    is_updating: boolean;
    is_deleting: boolean;
  };
}

export interface AgentsResponse {
  users: AgentChannel[];
}

// ============================================
// Agent Bots Types
// ============================================

export interface AgentBotsResponse {
  data: AgentBot[];
}

export interface AgentBotResponse {
  data: AgentBot;
}

export interface ChannelAccessTokenResponse {
  access_token: string;
  id: string;
}

export interface AgentBotInboxConfiguration {
  allowed_conversation_statuses: string[];
  allowed_label_ids: string[];
  ignored_label_ids?: string[];
  facebook_comment_replies_enabled?: boolean;
  facebook_comment_agent_bot_id?: string | null;
  facebook_interaction_type?: 'comments_only' | 'messages_only' | 'both';
  facebook_allowed_post_ids?: string[];
  moderation_enabled?: boolean;
  explicit_words_filter?: string[];
  sentiment_analysis_enabled?: boolean;
  auto_approve_responses?: boolean;
  auto_reject_explicit_words?: boolean;
  auto_reject_offensive_sentiment?: boolean;
}

export interface InboxAgentBotResponse {
  agent_bot?: AgentBot | null;
  configuration?: AgentBotInboxConfiguration | null;
  data?: {
    agent_bot?: AgentBot | null;
    configuration?: AgentBotInboxConfiguration | null;
  };
}

// ============================================
// Inbox Members Types
// ============================================

export interface InboxMembersResponse {
  data: {
    payload: AgentChannel[];
  };
}

// ============================================
// Channel Configuration Types
// ============================================

export interface ChannelConfiguration {
  // API Channel
  hmac_mandatory?: boolean;

  // WhatsApp Channels
  provider_config?: {
    api_key?: string;
    provider_url?: string;
    mark_as_read?: boolean;
    instance_settings?: {
      rejectCall?: boolean;
      msgCall?: string;
      groupsIgnore?: boolean;
      alwaysOnline?: boolean;
      readMessages?: boolean;
      syncFullHistory?: boolean;
      readStatus?: boolean;
    };
    proxy_settings?: {
      enabled?: boolean;
      host?: string;
      port?: string;
      username?: string;
      password?: string;
    };
  };

  // Email Channels
  imap_enabled?: boolean;
  imap_address?: string;
  imap_port?: number;
  imap_login?: string;
  imap_password?: string;
  imap_enable_ssl?: boolean;
  smtp_enabled?: boolean;
  smtp_address?: string;
  smtp_port?: number;
  smtp_login?: string;
  smtp_password?: string;
  smtp_enable_starttls_auto?: boolean;
  smtp_authentication?: string;

  // Twilio Channels
  auth_token?: string;
  account_sid?: string;
}

export interface EvolutionSettings {
  api_url?: string;
  admin_token?: string;
  instance_name?: string;
  phone_number?: string;
  proxy_settings?: {
    enabled: boolean;
    host: string;
    port: string;
    username: string;
    password: string;
  };
  instance_settings?: {
    rejectCall: boolean;
    msgCall: string;
    groupsIgnore: boolean;
    alwaysOnline: boolean;
    readMessages: boolean;
    syncFullHistory: boolean;
    readStatus: boolean;
  };
}

export interface EvolutionInstance {
  instance_name: string;
  status: 'open' | 'close' | 'connecting';
  qr_code?: string;
  phone_number?: string;
}

// ============================================
// WhatsApp Service Types
// ============================================

export interface WhatsappConfig {
  phone_number: string;
  provider: 'whatsapp_cloud' | 'whatsapp_360dialog';
  api_key?: string;
  api_secret?: string;
  webhook_verify_token?: string;
}

export interface WhatsappChannel {
  id: string;
  name: string;
  phone_number: string;
  provider: string;
  provider_config: unknown;
}

// ============================================
// Evolution Service Types
// ============================================

export interface EvolutionConnectionParams {
  apiUrl: string;
  adminToken: string;
  instanceName: string;
  phoneNumber: string;
  proxySettings?: {
    enabled: boolean;
    host?: string;
    port?: string;
    protocol?: string;
    username?: string;
    password?: string;
  };
  instanceSettings?: {
    rejectCall?: boolean;
    msgCall?: string;
    groupsIgnore?: boolean;
    alwaysOnline?: boolean;
    readMessages?: boolean;
    syncFullHistory?: boolean;
    readStatus?: boolean;
    enable_sync_features?: boolean;
  };
}

export interface EvolutionAuthorizationResponse {
  success: boolean;
  instance_uuid?: string;
  instance_token?: string;
  qrcode?: string;
  error?: string;
}

// ============================================
// Evolution Go Service Types
// ============================================

export interface EvolutionGoConnectionParams {
  apiUrl: string;
  adminToken: string;
  instanceName: string;
  phoneNumber: string;
  mode?: 'test' | 'create';
  proxySettings?: {
    enabled: boolean;
    host?: string;
    port?: string;
    username?: string;
    password?: string;
  };
  instanceSettings?: {
    rejectCall?: boolean;
    msgCall?: string;
    groupsIgnore?: boolean;
    alwaysOnline?: boolean;
    readMessages?: boolean;
    syncFullHistory?: boolean;
    readStatus?: boolean;
  };
}

export interface EvolutionGoAuthorizationResponse {
  success: boolean;
  instance_uuid?: string;
  instance_token?: string;
  qrcode?: string;
  error?: string;
  reused?: boolean;
}

// ============================================
// Instagram Service Types
// ============================================

export interface InstagramAuthorizationRequest {
  channel_id?: string;
}

export interface InstagramAuthorizationResponse {
  success: boolean;
  url: string;
}

// ============================================
// Twilio Service Types
// ============================================

export interface TwilioWhatsappVerifyPayload {
  accountSid: string;
  authToken: string;
  apiKeySid?: string;
  phoneNumber?: string;
  messagingServiceSid?: string;
}

export interface TwilioWhatsappVerifyResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// ============================================
// Email OAuth Service Types
// ============================================

export interface EmailOAuthConfig {
  provider: 'google' | 'microsoft';
  code?: string;
  state?: string;
  error?: string;
}

export interface EmailChannel {
  id: string;
  name: string;
  email: string;
  provider: 'google' | 'microsoft' | 'other_provider';
  imap_enabled: boolean;
  imap_address: string;
  imap_port: number;
  imap_login: string;
  imap_enable_ssl: boolean;
  smtp_enabled: boolean;
  smtp_address: string;
  smtp_port: number;
  smtp_login: string;
  smtp_enable_starttls_auto: boolean;
}

// ============================================
// Notificame Service Types
// ============================================

export interface NotificameVerifyPayload {
  api_token: string;
  channel_id: string;
  phone_number: string;
}

export interface NotificameChannel {
  id: string;
  name: string;
  phone_number: string;
  status?: string;
  provider?: string;
  provider_config?: unknown;
}

export interface NotificameVerifyResponse {
  success: boolean;
  message?: string;
  error?: string;
  channels: NotificameChannel[];
}

// ============================================
// Message Templates Types
// ============================================

export type MessageTemplateComponent = {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  text?: string;
  buttons?: Array<{
    type: 'URL' | 'PHONE_NUMBER' | 'QUICK_REPLY';
    text: string;
    url?: string;
    phone_number?: string;
  }>;
};

export type MessageTemplateVariable = {
  name: string;
  label?: string;
  type?: 'text' | 'number' | 'date' | 'currency' | 'url';
  required?: boolean;
  default_value?: string;
  source?: string;
  example?: string;
  position?: number;
  component?: 'HEADER' | 'BODY' | 'BUTTONS';
};

export interface MessageTemplate {
  id?: string;
  name: string;
  content: string;
  language: string;
  category?: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION' | 'TRANSACTIONAL';
  template_type?: 'text' | 'interactive' | 'media' | 'location';
  /**
   * Template components structure
   * - Object format (WhatsApp Cloud): { body: {...}, header: {...}, footer: {...} }
   * - Array format (Legacy/Other providers): [{ type: 'BODY', ... }, ...]
   */
  components?: MessageTemplateComponent[] | Record<string, MessageTemplateComponent>;
  variables?: MessageTemplateVariable[];
  media_url?: string;
  media_type?: string;
  settings?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  active?: boolean;
  namespace?: string;
  status?: 'APPROVED' | 'PENDING' | 'REJECTED' | 'PAUSED' | 'ACTIVE' | 'INACTIVE';
  created_at?: string;
  updated_at?: string;
}

export interface TemplateFormData {
  name: string;
  content: string;
  language: string;
  category?: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION' | 'TRANSACTIONAL';
  template_type?: 'text' | 'interactive' | 'media' | 'location';
  headerFormat?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  headerText?: string;
  bodyText?: string;
  footerText?: string;
  buttons?: Array<{
    type: 'URL' | 'PHONE_NUMBER' | 'QUICK_REPLY';
    text: string;
    url?: string;
    phone_number?: string;
  }>;
  mediaUrl?: string;
  mediaType?: string;
  variables?: MessageTemplateVariable[];
  settings?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  active?: boolean;
  subject?: string;
}

export type MessageTemplateResponse = StandardResponse<MessageTemplate[]>;

export type MessageTemplateCreateResponse = StandardResponse<MessageTemplate>;

export type MessageTemplateUpdateResponse = StandardResponse<MessageTemplate>;

export type MessageTemplateDeleteResponse = StandardResponse<{ message: string }>;

// ============================================
// Facebook Moderation Types
// ============================================

export interface FacebookCommentModeration {
  id: string;
  conversation_id: string;
  message_id: string;
  comment_id: string;
  moderation_type: 'explicit_words' | 'offensive_sentiment' | 'response_approval';
  status: 'pending' | 'approved' | 'rejected';
  action_type: 'delete_comment' | 'block_user' | 'send_response';
  response_content?: string;
  rejection_reason?: string;
  moderated_by_id?: string;
  moderated_at?: string;
  created_at: string;
  updated_at: string;
  // Legacy fields (may be present in some responses)
  inbox_id?: string;
  post_id?: string;
  comment_text?: string;
  commenter_name?: string;
  commenter_id?: string;
  parent_comment_id?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  explicit_words_detected?: string[];
  moderation_action?: string;
  moderation_reason?: string;
  agent_bot_response?: string;
  post_url?: string;
  post_message?: string;
  post_created_time?: string;
  attachment_url?: string;
  attachment_type?: string;
  // Sentiment analysis fields
  sentiment_offensive?: boolean;
  sentiment_confidence?: number;
  sentiment_reason?: string;
  // Nested objects (from serializer)
  message?: {
    id: string;
    content: string;
    created_at: string;
  };
  conversation?: {
    id: string;
    display_id: string;
  };
  moderated_by?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface ModerationsResponse {
  data: FacebookCommentModeration[];
  meta: {
    pagination: PaginationMeta;
  };
}

// ============================================
// Facebook Posts Types
// ============================================

export interface FacebookPost {
  id: string;
  message?: string;
  created_time: string;
  permalink_url?: string;
  full_picture?: string;
  attachments?: {
    data: Array<{
      type: string;
      url?: string;
      media?: {
        image: {
          src: string;
        };
      };
    }>;
  };
}
