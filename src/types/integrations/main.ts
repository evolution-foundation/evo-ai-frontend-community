import type { StandardResponse, PaginatedResponse } from '@/types/core';

export interface Integration {
  id: string;
  name: string;
  description: string;
  logo?: string;
  enabled: boolean;
  action?: string;
  hook_type?: 'account' | 'inbox';
  allow_multiple_hooks?: boolean;
  settings?: Record<string, any>;
  hooks?: IntegrationHook[];
  i18n_key?: string;
  created_at?: string;
  updated_at?: string;
}

export interface IntegrationHook {
  id: string;
  app_id: string;
  inbox_id?: string;
  settings?: Record<string, any>;
  status?: boolean;
  created_at: string;
  updated_at: string;
}

export interface IntegrationCategory {
  id: string;
  name: string;
  icon: React.ComponentType<any> | null;
}

// Webhook specific types
export interface Webhook {
  id: string;
  url: string;
  name?: string;
  description?: string;
  enabled?: boolean;
  inbox_id?: string | null;
  subscriptions: WebhookEvent[];
  created_at: string;
  updated_at: string;
}

export type WebhookEvent =
  | 'conversation_created'
  | 'conversation_status_changed'
  | 'conversation_updated'
  | 'message_created'
  | 'message_updated'
  | 'webwidget_triggered'
  | 'contact_created'
  | 'contact_updated'
  | 'conversation_typing_on'
  | 'conversation_typing_off';

export interface WebhookFormData {
  url: string;
  name?: string;
  inbox_id?: string | null;
  subscriptions: WebhookEvent[];
}

// Dashboard App types
export interface DashboardApp {
  id: string;
  title: string;
  content: {
    type: 'frame';
    url: string;
  }[];
  display_type: 'conversation' | 'sidebar';
  sidebar_menu?: 'conversations' | 'contacts' | 'campaigns' | 'automation' | 'reports' | 'settings';
  sidebar_position?: 'before' | 'after';
  created_at: string;
  updated_at?: string;
}

export interface DashboardAppFormData {
  title: string;
  content: {
    type: 'frame';
    url: string;
  };
  display_type: 'conversation' | 'sidebar';
  sidebar_menu?: 'conversations' | 'contacts' | 'campaigns' | 'automation' | 'reports' | 'settings';
  sidebar_position?: 'before' | 'after';
}

// OAuth Application types
export interface OAuthApplication {
  id: string;
  name: string;
  uid: string;
  secret: string;
  redirect_uri: string;
  scopes: string[];
  trusted: boolean;
  created_at: string;
  updated_at: string;
  token_count: number;
  last_used_at: string;
}

export interface OAuthApplicationFormData {
  name: string;
  redirect_uri: string;
  scopes: string;
  trusted: boolean;
}

// BMS Integration types
export interface BMSConfig {
  api_key: string;
  enable_contact_sync: boolean;
  enable_label_sync: boolean;
  enable_custom_attributes_sync: boolean;
  enable_campaign_sync: boolean;
}

// LeadSquared Integration types
export interface LeadSquaredConfig {
  access_key: string;
  secret_key: string;
  host_url?: string;
  endpoint_url?: string;
  app_url?: string;
  timezone?: string;
  enable_contact_sync?: boolean;
  enable_lead_creation?: boolean;
  enable_activity_sync?: boolean;
  enable_opportunity_sync?: boolean;
  enable_conversation_activity?: boolean;
  enable_transcript_activity?: boolean;
  conversation_activity_score?: string;
  transcript_activity_score?: string;
  conversation_activity_code?: number;
  transcript_activity_code?: number;
}

// Slack Integration types
export interface SlackConfig {
  team_id?: string;
  team_name?: string;
  channel_id?: string;
  channel_name?: string;
  reference_id?: string;
  webhook_url?: string;
}

export interface SlackConfiguration extends SlackConfig {
  flag_reference_id?: boolean;
  enable_notifications?: boolean;
  selected_channels?: string[];
  available_channels?: SlackChannel[];
  member_count?: number;
  updated_at?: string;
}

export interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
}

// OpenAI Integration types
export interface OpenAIConfig {
  api_key: string;
  label_suggestion?: boolean;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  enable_audio_transcription?: boolean;
}

export interface OpenAIHook extends IntegrationHook {
  app_id: 'openai';
  settings: OpenAIConfig;
}

export interface OpenAIFormData {
  api_key: string;
  enable_audio_transcription?: boolean;
}

export interface GeminiConfig {
  api_key: string;
}

export interface GeminiHook extends IntegrationHook {
  app_id: 'gemini';
  settings: GeminiConfig;
}

export interface GeminiFormData {
  api_key: string;
}

// Groq Integration types
export interface GroqConfig {
  api_key: string;
}

export interface GroqHook extends IntegrationHook {
  app_id: 'groq';
  settings: GroqConfig;
}

export interface GroqFormData {
  api_key: string;
}

// ElevenLabs Integration types
export interface ElevenLabsConfig {
  api_key: string;
}

export interface ElevenLabsHook extends IntegrationHook {
  app_id: 'elevenlabs';
  settings: ElevenLabsConfig;
}

export interface ElevenLabsFormData {
  api_key: string;
}

// Hugging Face Integration types
export interface HuggingFaceConfig {
  api_key: string;
}

export interface HuggingFaceHook extends IntegrationHook {
  app_id: 'huggingface';
  settings: HuggingFaceConfig;
}

export interface HuggingFaceFormData {
  api_key: string;
}

// BMS Integration types
export interface BMSHook extends IntegrationHook {
  app_id: 'bms';
  settings: BMSConfig;
}

export interface BMSFormData {
  api_key: string;
  enable_contact_sync: boolean;
  enable_label_sync: boolean;
  enable_custom_attributes_sync: boolean;
  enable_campaign_sync: boolean;
}

// LeadSquared Integration types
export interface LeadSquaredHook extends IntegrationHook {
  app_id: 'leadsquared';
  settings: LeadSquaredConfig;
}

export interface LeadSquaredFormData {
  access_key: string;
  secret_key: string;
  host_url: string;
  endpoint_url?: string;
  app_url?: string;
  timezone?: string;
  enable_contact_sync: boolean;
  enable_lead_creation: boolean;
  enable_activity_sync: boolean;
  enable_opportunity_sync: boolean;
  enable_conversation_activity?: boolean;
  enable_transcript_activity?: boolean;
  conversation_activity_score?: string;
  transcript_activity_score?: string;
  conversation_activity_code?: number;
  transcript_activity_code?: number;
}

// Google Ads Integration types
export interface GoogleAdsConfig {
  client_id: string;
  client_secret: string;
  refresh_token: string;
  developer_token: string;
  login_customer_id?: string;
  customer_id: string;
}

export interface GoogleAdsHook extends IntegrationHook {
  app_id: 'google_ads';
  settings: GoogleAdsConfig;
}

export interface GoogleAdsFormData {
  client_id: string;
  client_secret: string;
  refresh_token: string;
  developer_token: string;
  login_customer_id: string;
  customer_id: string;
}

// Google Translate Integration types
export interface GoogleTranslateConfig {
  project_id: string;
  credentials: object;
  enable_agent_bot?: boolean;
  enable_auto_translate?: boolean;
  default_target_language?: string;
  enable_detection?: boolean;
}

export interface GoogleTranslateHook extends IntegrationHook {
  app_id: 'google_translate';
  settings: GoogleTranslateConfig;
}

export interface GoogleTranslateFormData {
  project_id: string;
  credentials: object;
  enable_agent_bot: boolean;
  enable_auto_translate: boolean;
  default_target_language: string;
  enable_detection: boolean;
}

// Dialogflow Integration types
export interface DialogflowConfig {
  project_id: string;
  credentials: object;
}

export interface DialogflowHook extends IntegrationHook {
  app_id: 'dialogflow';
  settings: DialogflowConfig;
}

export interface DialogflowFormData {
  project_id: string;
  credentials: object;
}

// Integration service response types
export type IntegrationsResponse = PaginatedResponse<Integration>;

export type IntegrationResponse = StandardResponse<Integration>;

// ============================================
// MCP OAuth Integrations (Common Types)
// ============================================

export interface MCPTool {
  id: string;
  name: string;
  description: string;
}

export interface DiscoverToolsResponse {
  tools: MCPTool[];
}

// ============================================
// HubSpot Integration
// ============================================

export interface HubSpotConfig {
  provider: 'hubspot';
  username?: string;
  email?: string;
  connected?: boolean;
  tools?: string[];
}

export interface HubSpotOAuthResponse {
  url: string;
}

export interface HubSpotConnectionResponse {
  success: boolean;
  username?: string;
  email?: string;
  error?: string;
}

// ============================================
// Stripe Integration
// ============================================

export interface StripeConfig {
  provider: 'stripe';
  username?: string;
  email?: string;
  connected?: boolean;
  tools?: string[];
}

export interface StripeOAuthResponse {
  url: string;
}

export interface StripeConnectionResponse {
  success: boolean;
  username?: string;
  email?: string;
  error?: string;
}

// ============================================
// Notion Integration
// ============================================

export interface NotionConfig {
  provider: 'notion';
  username?: string;
  email?: string;
  connected?: boolean;
  tools?: string[];
}

export interface NotionOAuthResponse {
  url: string;
}

export interface NotionConnectionResponse {
  success: boolean;
  username?: string;
  email?: string;
  error?: string;
}

// ============================================
// Linear Integration
// ============================================

export interface LinearConfig {
  provider: 'linear';
  username?: string;
  email?: string;
  connected?: boolean;
  tools?: string[];
}

export interface LinearOAuthResponse {
  url: string;
}

export interface LinearConnectionResponse {
  success: boolean;
  username?: string;
  email?: string;
  error?: string;
}

// ============================================
// GitHub Integration
// ============================================

export interface GitHubConfig {
  provider: 'github';
  username?: string;
  email?: string;
  connected?: boolean;
  tools?: string[];
}

export interface GitHubOAuthResponse {
  url: string;
}

export interface GitHubConnectionResponse {
  success: boolean;
  username?: string;
  email?: string;
  error?: string;
}

// ============================================
// Atlassian Integration
// ============================================

export interface AtlassianConfig {
  provider: 'atlassian';
  username?: string;
  email?: string;
  connected?: boolean;
  tools?: string[];
}

export interface AtlassianOAuthResponse {
  url: string;
}

export interface AtlassianConnectionResponse {
  success: boolean;
  username?: string;
  email?: string;
  error?: string;
}

// ============================================
// Supabase Integration
// ============================================

export interface SupabaseConfig {
  provider: 'supabase';
  username?: string;
  email?: string;
  connected?: boolean;
  tools?: string[];
}

export interface SupabaseOAuthResponse {
  url: string;
}

export interface SupabaseConnectionResponse {
  success: boolean;
  username?: string;
  email?: string;
  error?: string;
}

// ============================================
// Asana Integration
// ============================================

export interface AsanaConfig {
  provider: 'asana';
  username?: string;
  email?: string;
  connected?: boolean;
  tools?: string[];
}

export interface AsanaOAuthResponse {
  url: string;
}

export interface AsanaConnectionResponse {
  success: boolean;
  username?: string;
  email?: string;
  error?: string;
}

// ============================================
// Canva Integration
// ============================================

export interface CanvaConfig {
  provider: 'canva';
  username?: string;
  email?: string;
  connected?: boolean;
  tools?: string[];
}

export interface CanvaOAuthResponse {
  url: string;
}

export interface CanvaConnectionResponse {
  success: boolean;
  username?: string;
  email?: string;
  error?: string;
}

// ============================================
// Monday Integration
// ============================================

export interface MondayConfig {
  provider: 'monday';
  username?: string;
  email?: string;
  connected?: boolean;
  tools?: string[];
}

export interface MondayOAuthResponse {
  url: string;
}

export interface MondayConnectionResponse {
  success: boolean;
  username?: string;
  email?: string;
  error?: string;
}

// ============================================
// PayPal Integration
// ============================================

export interface PayPalConfig {
  provider: 'paypal';
  username?: string;
  email?: string;
  connected?: boolean;
  tools?: string[];
}

export interface PayPalOAuthResponse {
  url: string;
}

export interface PayPalConnectionResponse {
  success: boolean;
  username?: string;
  email?: string;
  error?: string;
}

// ============================================
// Google Calendar Integration
// ============================================

export interface GoogleCalendarConfig {
  provider: 'google_calendar';
  email?: string;
  connected?: boolean;
  calendars?: GoogleCalendarItem[];
  settings?: CalendarSettings;
}

export interface GoogleCalendarItem {
  id: string;
  name: string;
  email?: string;
  primary?: boolean;
  selected?: boolean;
}

export interface CalendarSettings {
  selectedCalendarId?: string;
  minAdvanceTime?: {
    enabled: boolean;
    value?: number;
    unit?: 'hours' | 'days' | 'weeks';
  };
  maxDistance?: {
    enabled: boolean;
    value?: number;
    unit?: 'days' | 'weeks' | 'months';
  };
  maxDuration?: {
    value: number;
    unit: 'minutes' | 'hours';
  };
  simultaneousBookings?: {
    enabled: boolean;
    limit?: number;
  };
  alwaysOpen?: boolean;
  businessHours?: BusinessHours;
  meetIntegration?: boolean;
  allowAvailabilityCheck?: boolean;
  restrictedHours?: {
    enabled: boolean;
    allowedTimes?: string[];
  };
  distributionMode?: 'sequential' | 'intelligent';
  bookingFields?: BookingField[];
}

export interface BusinessHours {
  [key: string]: {
    enabled: boolean;
    start?: string;
    end?: string;
  };
}

export interface BookingField {
  id: string;
  name: 'name' | 'company' | 'subject' | 'duration' | 'email' | 'summary';
  label: string;
  enabled: boolean;
  required?: boolean;
}

export interface GoogleCalendarOAuthResponse {
  url: string;
}

export interface GoogleCalendarConnectionResponse {
  success: boolean;
  email?: string;
  calendars?: GoogleCalendarItem[];
  error?: string;
}

// ============================================
// OpenAI Events Integration
// ============================================

export interface ProcessEventOptions {
  type: string;
  content?: string;
  tone?: string;
  conversationId?: string;
  hookId?: string;
}

export interface ProcessEventResponse {
  message: string;
}

export type IntegrationHookDeleteResponse = StandardResponse<{ message: string }>;

export type IntegrationHookResponse = StandardResponse<IntegrationHook>;

// Webhook Response Types
export type WebhooksResponse = PaginatedResponse<Webhook>;

export type WebhookResponse = StandardResponse<Webhook>;

export type WebhookDeleteResponse = StandardResponse<{ message: string }>;

export type WebhookTestResponse = StandardResponse<{ success: boolean; message?: string }>;

// Dashboard App Response Types
export type DashboardAppsResponse = PaginatedResponse<DashboardApp>;

export type DashboardAppResponse = StandardResponse<DashboardApp>;

export type DashboardAppDeleteResponse = StandardResponse<{ message: string }>;

// OAuth Application Response Types
export type OAuthApplicationsResponse = PaginatedResponse<OAuthApplication>;

export type OAuthApplicationResponse = StandardResponse<OAuthApplication>;

export type OAuthApplicationDeleteResponse = StandardResponse<{ message: string }>;

export type OAuthCredentialsResponse = StandardResponse<{ uid: string; secret: string }>;

// Integration Operation Response Types
export type IntegrationToggleResponse = StandardResponse<Integration>;

export type IntegrationDeleteResponse = StandardResponse<{ message: string }>;

export type IntegrationUpdateResponse = StandardResponse<Integration>;

// OAuth Flow Response Types
export type OAuthInitiateResponse = StandardResponse<{ url: string }>;

export type OAuthCompleteResponse = StandardResponse<{ success: boolean; message?: string }>;

// Slack Response Types
export type SlackConfigurationResponse = StandardResponse<SlackConfiguration>;

export type SlackChannelsResponse = StandardResponse<SlackChannel[]>;

// Integration Configuration Response Types
export type IntegrationConfigurationResponse = StandardResponse<Record<string, unknown>>;

// BMS Response Types
export type BMSSyncResponse = StandardResponse<{ message: string; synced_count?: number }>;

// LeadSquared Response Types
export type LeadSquaredActivityResponse = StandardResponse<{ id: string; message: string }>;

export type LeadSquaredLeadResponse = StandardResponse<{ id: string; message: string }>;
