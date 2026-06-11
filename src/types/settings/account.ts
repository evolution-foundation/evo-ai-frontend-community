import { Role } from '@/types/auth';

// Account features configuration
export interface AccountFeatures {
  // Canal features
  inbound_emails?: boolean;
  channel_email?: boolean;
  channel_facebook?: boolean;
  channel_twitter?: boolean;
  channel_website?: boolean;
  channel_instagram?: boolean;

  // Core features
  help_center?: boolean;
  agent_bots?: boolean;
  macros?: boolean;
  agent_management?: boolean;
  team_management?: boolean;
  inbox_management?: boolean;
  labels?: boolean;
  custom_attributes?: boolean;
  automations?: boolean;
  canned_responses?: boolean;
  integrations?: boolean;
  voice_recorder?: boolean;
  campaigns?: boolean;
  reports?: boolean;
  crm?: boolean;
  pipelines?: boolean;

  // Technical features
  ip_lookup?: boolean;
  email_continuity_on_api_channel?: boolean;
  auto_resolve_conversations?: boolean;
  custom_reply_email?: boolean;
  custom_reply_domain?: boolean;
  message_reply_to?: boolean;
  insert_article_in_reply?: boolean;
  inbox_view?: boolean;

  // Integration features
  linear_integration?: boolean;
  hubspot_integration?: boolean;
  shopify_integration?: boolean;
  crm_integration?: boolean;
  bms_integration?: boolean;

  // UI features
  chatwoot_v4?: boolean;
  report_v4?: boolean;
  mobile_v2?: boolean;
  search_with_gin?: boolean;

  // Custom features (extensible)
  [featureName: string]: boolean | undefined;
}

// Account entity
export interface Account {
  id: string;
  name: string;
  locale: string;
  domain?: string;
  support_email?: string;
  auto_resolve_duration?: number;
  features: AccountFeatures;
  settings?: {
    auto_resolve_after?: number;
    auto_resolve_message?: string;
    auto_resolve_ignore_waiting?: boolean;
    auto_resolve_label?: string;
    audio_transcriptions?: boolean;
    mask_contact_pii?: boolean;
  };
  custom_attributes?: {
    marked_for_deletion_at?: string;
    marked_for_deletion_reason?: string;
    [key: string]: any;
  };
  limits?: Record<string, any>;
  status: 'active' | 'inactive' | 'suspended';
  created_at?: string;
  updated_at?: string;
  latest_chatwoot_version?: string;
  
  // Optional fields from other contexts
  active_at?: string | null;
  role?: Role; // Updated to use Role interface
  availability?: 'online' | 'offline' | 'busy';
  availability_status?: 'online' | 'offline' | 'busy';
  auto_offline?: boolean;
}

// Create account
export interface CreateAccount {
  account_name: string;
  user_full_name: string;
  email: string;
  support_email: string;
  password: string;
  locale?: string;
}

// Update account
export interface UpdateAccount {
  name?: string;
  locale?: string;
  domain?: string;
  support_email?: string;
  auto_resolve_after?: number | null;
  auto_resolve_message?: string;
  auto_resolve_ignore_waiting?: boolean;
  auto_resolve_label?: string | null;
  audio_transcriptions?: boolean;
  mask_contact_pii?: boolean;
  settings?: {
    auto_resolve_after?: number;
    auto_resolve_message?: string;
    auto_resolve_ignore_waiting?: boolean;
    auto_resolve_label?: string;
    audio_transcriptions?: boolean;
    mask_contact_pii?: boolean;
  };
}

// Form data options for account forms
export interface FormDataOptions {
  inboxes: unknown[];
  agents: unknown[];
  teams: unknown[];
  labels: unknown[];
}

// Response types
import type { StandardResponse } from '@/types/core';

export interface AccountDeleteResponse extends StandardResponse<{ message: string }> {}

export interface AccountUpdateResponse extends StandardResponse<Account> {}
