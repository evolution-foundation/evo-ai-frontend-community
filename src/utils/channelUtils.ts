/**
 * Utility functions for channel formatting and display
 */

// Channel type translations
const CHANNEL_TYPE_TRANSLATIONS: Record<string, string> = {
  'Channel::WebWidget': 'Website Chat',
  'Channel::Whatsapp': 'WhatsApp',
  'Channel::FacebookPage': 'Messenger',
  'Channel::TwitterProfile': 'Twitter',
  'Channel::TwilioSms': 'SMS - Twilio',
  'Channel::Api': 'API',
  'Channel::Email': 'Email',
  'Channel::Telegram': 'Telegram',
  'Channel::Line': 'Line',
  'Channel::Sms': 'SMS',
  'Channel::Instagram': 'Instagram',
  'webwidget': 'Website Chat',
  'whatsapp': 'WhatsApp',
  'facebookpage': 'Messenger',
  'twitterprofile': 'Twitter',
  'twiliosms': 'SMS - Twilio',
  'api': 'API',
  'email': 'Email',
  'telegram': 'Telegram',
  'line': 'Line',
  'sms': 'SMS',
  'instagram': 'Instagram',
  'web_widget': 'Website Chat',
  'facebook_page': 'Messenger',
  'twitter_profile': 'Twitter',
  'twilio_sms': 'SMS - Twilio',
};

// Channel types where a phone number is the contact's primary identifier.
// Used to gate UI affordances (e.g. showing the phone in conversation lists)
// so we never render a phone field for website/email/API contacts.
const PHONE_BEARING_CHANNEL_TYPES = new Set<string>([
  'Channel::Whatsapp',
  'Channel::WhatsappCloud',
  'Channel::Whatsapp360Dialog',
  'Channel::TwilioSms',
  'Channel::Sms',
  'Channel::Telegram',
  'whatsapp',
  'whatsappcloud',
  'whatsapp_cloud',
  'whatsapp360dialog',
  'whatsapp_360dialog',
  'twiliosms',
  'twilio_sms',
  'sms',
  'telegram',
]);

export function isPhoneBearingChannel(channelType?: string | null): boolean {
  if (!channelType) return false;
  return PHONE_BEARING_CHANNEL_TYPES.has(channelType);
}

// Channel types where the contact's `availability_status` carries real
// presence semantics. Today this is limited to the Website widget; other
// channels (WhatsApp, SMS, Email, social, API) do not expose live presence,
// so the UI must hide the indicator instead of showing a misleading state.
const PRESENCE_CAPABLE_CHANNEL_TYPES = new Set<string>([
  'Channel::WebWidget',
  'webwidget',
  'web_widget',
]);

export function isPresenceCapableChannel(channelType?: string | null): boolean {
  if (!channelType) return false;
  return PRESENCE_CAPABLE_CHANNEL_TYPES.has(channelType);
}

// Provider-specific translations for detailed display
const PROVIDER_TRANSLATIONS: Record<string, string> = {
  'whatsapp_cloud': 'WhatsApp Cloud',
  'evolution': 'Evolution API',
  'evolution_go': 'Evolution Go',
  'notificame': 'Notificame',
  'twilio': 'Twilio',
  'google': 'Gmail',
  'microsoft': 'Outlook',
  'bandwidth': 'Bandwidth',
  'default': 'Padrão',
};

/**
 * Get the display name for a channel type
 * @param channelType - The channel type (e.g., 'Channel::Whatsapp', 'whatsapp')
 * @param provider - Optional provider (e.g., 'evolution', 'whatsapp_cloud')
 * @returns Formatted display name
 */
export function getChannelDisplayName(channelType?: string, provider?: string): string {
  if (!channelType) return 'Desconhecido';

  // First try direct translation
  const directTranslation = CHANNEL_TYPE_TRANSLATIONS[channelType];
  if (directTranslation) {
    // If it's an email or SMS with specific provider, add provider info
    if (provider && (channelType.toLowerCase().includes('email') || channelType.toLowerCase().includes('sms'))) {
      const providerName = PROVIDER_TRANSLATIONS[provider] || provider;
      if (channelType.toLowerCase().includes('email')) {
        return `Email - ${providerName}`;
      }
      if (channelType.toLowerCase().includes('sms') && !directTranslation.includes(providerName)) {
        return `SMS - ${providerName}`;
      }
    }
    return directTranslation;
  }

  // Fallback: clean up the channel type string
  const cleaned = channelType
    .replace('Channel::', '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());

  return cleaned || 'Desconhecido';
}

/**
 * Get the display name for a provider
 * @param provider - The provider identifier
 * @returns Formatted provider name
 */
export function getProviderDisplayName(provider?: string): string {
  if (!provider) return '';
  return PROVIDER_TRANSLATIONS[provider] || provider.charAt(0).toUpperCase() + provider.slice(1);
}

/**
 * Format channel type for display following the Channels.tsx pattern
 * This follows the same pattern used in ChannelCard.tsx
 * @param channelType - The channel type
 * @returns Formatted channel type
 */
export function formatChannelType(channelType?: string): string {
  if (!channelType) return 'N/A';

  return channelType
    .toLowerCase()
    .replace('channel::', '')
    .replace('_', ' ');
}
