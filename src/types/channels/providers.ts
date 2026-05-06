// Channel and Provider Types
// Centralized types for channel configuration and providers

/**
 * Provider information for a channel type
 */
export interface Provider {
  id: string;
  name: string;
  description: string;
  recommended?: boolean;
  popular?: boolean;
}

/**
 * Supported channel types in the system
 */
export type ChannelTypeId =
  | 'web_widget'
  | 'whatsapp'
  | 'facebook'
  | 'instagram'
  | 'telegram'
  | 'sms'
  | 'email'
  | 'api';

/**
 * Channel type with its configuration and available providers
 */
export interface ChannelType {
  id: string;
  name: string;
  description: string;
  icon?: string;
  type: ChannelTypeId;
  providers?: Provider[];
}

/**
 * Form data for channel configuration
 * Flexible structure to accommodate different channel types
 */
export interface ChannelFormData {
  [key: string]: string | boolean;
}
