import i18n from '@/i18n/config';

// Types for Agent Bots
export interface AgentBot {
  id: string;
  name: string;
  description: string;
  outgoing_url: string;
  /** EVO-2250 story 2.4: scalar vault reference (a bot holds one secret). */
  credential_id?: string;
  bot_type: string;
  bot_provider: string;
  thumbnail?: string;
  message_signature?: string;
  text_segmentation_enabled: boolean;
  text_segmentation_limit: number;
  text_segmentation_min_size: number;
  delay_per_character: number;
  debounce_time: number;
  access_token?: string;
  bot_config?: {
    webhook_url?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface AgentBotFormData {
  name: string;
  description: string;
  outgoing_url: string;
  credential_id: string;
  bot_provider: string;
  avatar?: File | null;
  avatarUrl: string;
  message_signature: string;
  text_segmentation_enabled: boolean;
  text_segmentation_limit: number;
  text_segmentation_min_size: number;
  delay_per_character: number;
  debounce_time: number;
}

export interface BotConfiguration {
  inboxId: string;
  selectedAgentBotId: string | null;
  activeAgentBot?: AgentBot | null;
  allowedConversationStatuses?: string[];
  allowedLabelIds?: string[];
}

export interface AgentBotInboxConfiguration {
  allowed_conversation_statuses: string[];
  allowed_label_ids: string[];
}

// Bot provider options
export const getBotProviders = () =>
  [
    {
      value: 'webhook_provider',
      label: i18n.t('channels:settings.agentBot.providers.webhook.label'),
      description: i18n.t('channels:settings.agentBot.providers.webhook.description'),
    },
    {
      value: 'dialogflow',
      label: i18n.t('channels:settings.agentBot.providers.dialogflow.label'),
      description: i18n.t('channels:settings.agentBot.providers.dialogflow.description'),
    },
    {
      value: 'rasa',
      label: i18n.t('channels:settings.agentBot.providers.rasa.label'),
      description: i18n.t('channels:settings.agentBot.providers.rasa.description'),
    },
  ] as const;

// Bot types
export const getBotTypes = () =>
  [
    {
      value: 'webhook',
      label: i18n.t('channels:settings.agentBot.types.webhook.label'),
      description: i18n.t('channels:settings.agentBot.types.webhook.description'),
    },
    {
      value: 'csml',
      label: i18n.t('channels:settings.agentBot.types.csml.label'),
      description: i18n.t('channels:settings.agentBot.types.csml.description'),
    },
  ] as const;

// Default form data
export const getDefaultAgentBotFormData = (): AgentBotFormData => ({
  name: '',
  description: '',
  outgoing_url: '',
  credential_id: '',
  bot_provider: 'webhook_provider',
  avatar: null,
  avatarUrl: '',
  message_signature: '',
  text_segmentation_enabled: false,
  text_segmentation_limit: 300,
  text_segmentation_min_size: 50,
  delay_per_character: 0.05,
  debounce_time: 5,
});

// Validation functions
export const validateAgentBotForm = (formData: AgentBotFormData): string[] => {
  const errors: string[] = [];

  if (!formData.name.trim()) {
    errors.push(i18n.t('channels:settings.agentBot.validation.nameRequired'));
  }

  if (!formData.description.trim()) {
    errors.push(i18n.t('channels:settings.agentBot.validation.descriptionRequired'));
  }

  if (!formData.outgoing_url.trim()) {
    errors.push(i18n.t('channels:settings.agentBot.validation.webhookUrlRequired'));
  } else {
    try {
      new URL(formData.outgoing_url);
    } catch {
      errors.push(i18n.t('channels:settings.agentBot.validation.webhookUrlInvalid'));
    }
  }

  if (formData.text_segmentation_enabled) {
    if (formData.text_segmentation_limit < 1) {
      errors.push(i18n.t('channels:settings.agentBot.validation.segmentationLimitMinimum'));
    }

    if (formData.text_segmentation_min_size < 1) {
      errors.push(i18n.t('channels:settings.agentBot.validation.segmentationMinSizeMinimum'));
    }

    if (formData.text_segmentation_min_size >= formData.text_segmentation_limit) {
      errors.push(i18n.t('channels:settings.agentBot.validation.segmentationMinSizeSmallerThanLimit'));
    }
  }

  if (formData.delay_per_character < 0) {
    errors.push(i18n.t('channels:settings.agentBot.validation.delayPerCharacterNonNegative'));
  }

  if (formData.debounce_time < 0) {
    errors.push(i18n.t('channels:settings.agentBot.validation.debounceTimeNonNegative'));
  }

  return errors;
};

// Helper to format bot provider display name
export const getBotProviderDisplayName = (provider: string): string => {
  const providerConfig = getBotProviders().find(p => p.value === provider);
  return providerConfig ? providerConfig.label : provider;
};

// Helper to format bot type display name
export const getBotTypeDisplayName = (type: string): string => {
  const typeConfig = getBotTypes().find(t => t.value === type);
  return typeConfig ? typeConfig.label : type;
};

// Helper to check if bot is connected to inbox
export const isBotConnectedToInbox = (
  agentBots: AgentBot[],
  activeAgentBotId?: string | null,
): boolean => {
  return !!(activeAgentBotId && agentBots.find(bot => bot.id === activeAgentBotId));
};

// Helper to get active bot details
export const getActiveBotDetails = (
  agentBots: AgentBot[],
  activeAgentBotId?: string | null,
): AgentBot | null => {
  if (!activeAgentBotId) return null;
  return agentBots.find(bot => bot.id === activeAgentBotId) || null;
};

// Helper to prepare form data for API
export const prepareAgentBotPayload = (formData: AgentBotFormData) => {
  const payload = new FormData();

  payload.append('name', formData.name);
  payload.append('description', formData.description);
  payload.append('outgoing_url', formData.outgoing_url);
  payload.append('bot_type', 'webhook');
  payload.append('bot_provider', formData.bot_provider);
  payload.append('message_signature', formData.message_signature || '');
  payload.append('text_segmentation_enabled', formData.text_segmentation_enabled.toString());
  payload.append('text_segmentation_limit', formData.text_segmentation_limit.toString());
  payload.append('text_segmentation_min_size', formData.text_segmentation_min_size.toString());
  payload.append('delay_per_character', formData.delay_per_character.toString());
  payload.append('debounce_time', formData.debounce_time.toString());

  // No api_key: story 2.7 dropped it from the permitted params, so sending it
  // is silently discarded and the bot ends up with no credential at all.
  if (formData.credential_id) {
    payload.append('credential_id', formData.credential_id);
  }

  if (formData.avatar) {
    payload.append('avatar', formData.avatar);
  }

  return payload;
};

// Helper to parse agent bot data for form
export const parseAgentBotForForm = (bot: AgentBot): AgentBotFormData => ({
  name: bot.name || '',
  description: bot.description || '',
  outgoing_url: bot.outgoing_url || bot.bot_config?.webhook_url || '',
  credential_id: bot.credential_id || '',
  bot_provider: bot.bot_provider || 'webhook_provider',
  avatar: null,
  avatarUrl: bot.thumbnail || '',
  message_signature: bot.message_signature || '',
  text_segmentation_enabled: bot.text_segmentation_enabled ?? false,
  text_segmentation_limit: bot.text_segmentation_limit ?? 300,
  text_segmentation_min_size: bot.text_segmentation_min_size ?? 50,
  delay_per_character: bot.delay_per_character ?? 0.05,
  debounce_time: bot.debounce_time ?? 5,
});

// Status indicators
export const getBotStatusColor = (isConnected: boolean): string => {
  return isConnected ? 'text-green-600' : 'text-slate-500';
};

export const getBotStatusText = (isConnected: boolean): string => {
  return isConnected
    ? i18n.t('settings.agentBot.status.connected')
    : i18n.t('settings.agentBot.status.disconnected');
};

// Text segmentation helpers
export const calculateEstimatedDelay = (textLength: number, delayPerCharacter: number): number => {
  return textLength * delayPerCharacter;
};

export const getSegmentationPreview = (
  text: string,
  segmentLimit: number,
  minSize: number,
): string[] => {
  if (!text || segmentLimit <= 0) return [text];

  const segments: string[] = [];
  let currentSegment = '';
  const words = text.split(' ');

  for (const word of words) {
    const testSegment = currentSegment ? `${currentSegment} ${word}` : word;

    if (testSegment.length <= segmentLimit) {
      currentSegment = testSegment;
    } else {
      if (currentSegment && currentSegment.length >= minSize) {
        segments.push(currentSegment);
        currentSegment = word;
      } else {
        currentSegment = testSegment;
      }
    }
  }

  if (currentSegment) {
    segments.push(currentSegment);
  }

  return segments;
};
