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
  | 'api'
  // Display-only "coming soon" types (no backend). They surface on the Channels
  // overview as disabled cards and are filtered out of the New Channel picker.
  | 'linkedin'
  | 'tiktok'
  | 'youtube';

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
  /**
   * Display-only channel with no backend integration yet. Rendered as a disabled
   * "coming soon" card on the overview and excluded from the New Channel picker.
   */
  comingSoon?: boolean;
}

/**
 * Form data for channel configuration
 * Flexible structure to accommodate different channel types
 */
export interface ChannelFormData {
  [key: string]: string | boolean;
}
