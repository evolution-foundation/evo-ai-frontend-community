export interface PreChatField {
  name: string;
  type: 'text' | 'email' | 'phone' | 'select' | 'checkbox' | 'date' | 'url' | 'number' | 'textarea';
  label: string;
  placeholder?: string;
  required: boolean;
  enabled: boolean;
  field_type: 'contact_attribute' | 'conversation_attribute' | 'standard';
  values?: string[]; // Para select
  regex_pattern?: string;
  regex_cue?: string;
}

export interface PreChatFormData {
  fullName?: string;
  emailAddress?: string;
  phoneNumber?: string;
  message?: string;
  [key: string]: string | undefined;
}

export interface PreChatSubmissionData {
  fullName?: string;
  phoneNumber?: string;
  emailAddress?: string;
  message?: string;
  activeCampaignId?: string;
  conversationCustomAttributes: Record<string, any>;
  contactCustomAttributes: Record<string, any>;
}

export interface WidgetConfig {
  locale?: string;
  preChatFormEnabled?: boolean;
  preChatMessage?: string;
  preChatFields?: PreChatField[];
  hasAttachmentsEnabled?: boolean;
  hasEmojiPickerEnabled?: boolean;
  enabledFeatures?: string[]; // Full array of enabled features for advanced config
  inboxAvatarUrl?: string;
  allowMessagesAfterResolved?: boolean;
  channelConfig?: {
    websiteName?: string;
    widgetColor?: string;
  };
}

export interface CurrentUser {
  has_email?: boolean;
  has_phone_number?: boolean;
  identifier?: string;
  name?: string;
  email?: string;
  phone_number?: string;
}

export interface Campaign {
  id?: string | number;
  title?: string;
  description?: string;
}

// Re-export WidgetMessage from widgetConfig to avoid duplication
export type { WidgetMessage } from './widgetConfig';
