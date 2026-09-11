// Types for Widget Builder
import i18n from '@/i18n/config';
export interface WidgetConfig {
  websiteName: string;
  welcomeHeading: string;
  welcomeTagline: string;
  widgetColor: string;
  replyTime: string;
  avatarUrl: string;
  widgetBubblePosition: string;
  widgetBubbleLauncherTitle: string;
  widgetBubbleType: string;
}

export interface WidgetBubblePosition {
  id: string;
  title: string;
  checked: boolean;
}

export interface WidgetBubbleType {
  id: string;
  title: string;
  checked: boolean;
}

export interface WidgetViewOption {
  id: string;
  title: string;
  checked: boolean;
}

export interface ReplyTimeOption {
  key: string;
  value: string;
  text: string;
}

// Widget bubble positions
export const getWidgetBubblePositions = (): WidgetBubblePosition[] => [
  {
    id: 'left',
    title: i18n.t('channels:settings.widgetHelpers.positions.left'),
    checked: false,
  },
  {
    id: 'right',
    title: i18n.t('channels:settings.widgetHelpers.positions.right'),
    checked: true,
  },
];

// Widget bubble types
export const getWidgetBubbleTypes = (): WidgetBubbleType[] => [
  {
    id: 'standard',
    title: i18n.t('channels:settings.widgetHelpers.bubbleTypes.standard'),
    checked: true,
  },
  {
    id: 'expanded_bubble',
    title: i18n.t('channels:settings.widgetHelpers.bubbleTypes.expanded'),
    checked: false,
  },
];

// Widget view options (Preview/Script)
export const getWidgetViewOptions = (): WidgetViewOption[] => [
  {
    id: 'preview',
    title: i18n.t('channels:settings.widgetHelpers.viewOptions.preview'),
    checked: true,
  },
  {
    id: 'script',
    title: i18n.t('channels:settings.widgetHelpers.viewOptions.script'),
    checked: false,
  },
];

// Reply time options
export const getReplyTimeOptions = (): ReplyTimeOption[] => [
  {
    key: 'in_a_few_minutes',
    value: 'in_a_few_minutes',
    text: i18n.t('channels:settings.widgetHelpers.replyTime.fewMinutes'),
  },
  {
    key: 'in_a_few_hours',
    value: 'in_a_few_hours',
    text: i18n.t('channels:settings.widgetHelpers.replyTime.fewHours'),
  },
  {
    key: 'in_a_day',
    value: 'in_a_day',
    text: i18n.t('channels:settings.widgetHelpers.replyTime.day'),
  },
];

// Default widget config
export const getDefaultWidgetConfig = (): WidgetConfig => ({
  websiteName: '',
  welcomeHeading: '',
  welcomeTagline: '',
  widgetColor: '#1f93ff',
  replyTime: 'in_a_few_minutes',
  avatarUrl: '',
  widgetBubblePosition: 'right',
  widgetBubbleLauncherTitle: i18n.t('channels:settings.widgetHelpers.defaultLauncherTitle'),
  widgetBubbleType: 'standard',
});

/** The origin the embeds point at: where the agency is, never the backend's FRONTEND_URL. */
export const widgetOrigin = (): string =>
  typeof window !== 'undefined' ? window.location.origin : '';

// Generate widget script
export const extractWebsiteToken = (originalScript: string): string => {
  try {
    const m = originalScript?.match(/websiteToken\s*:\s*['\"]([^'\"]+)['\"]/i);
    if (m && m[1]) return m[1];
  } catch (_) {}
  return '';
};

export const generateWidgetScript = (
  originalScript: string,
  config: {
    position: string;
    type: string;
    launcherTitle: string;
  },
): string => {
  const token = extractWebsiteToken(originalScript);

  // SDK and widget page are both served from the origin the agency is on: the
  // backend script carries FRONTEND_URL (the platform), which on a whitelabel
  // host would put the platform inside the client's site. One origin only.
  const SDK_BASE = widgetOrigin();
  const WIDGET_BASE = SDK_BASE;
  const ENV_API_BASE = import.meta.env.VITE_API_URL || '';

  const opts = JSON.stringify({
    position: config.position,
    type: config.type,
    launcherTitle: config.launcherTitle,
    ...(ENV_API_BASE ? { apiBase: ENV_API_BASE } : {}),
  });

  return `\n<script>\n  (function(d,t){\n    var SDK_BASE = '${SDK_BASE}';\n    var WIDGET_BASE = '${WIDGET_BASE}';\n    var s = d.createElement(t); var x = d.getElementsByTagName(t)[0];\n    window.evoChatSettings = ${opts};\n    s.src = SDK_BASE + '/widget-sdk/sdk.min.js'; s.async = true; s.defer = true;\n    x.parentNode.insertBefore(s,x);\n    s.onload = function(){\n      if(window.evoChatSDK && window.evoChatSDK.run){\n        window.evoChatSDK.run({ baseUrl: WIDGET_BASE, websiteToken: '${
    token || 'REPLACE_WITH_WEBSITE_TOKEN'
  }' });\n      }\n    };\n  })(document,'script');\n</script>`;
};

// Generate iframe embed code (without SDK bubble)
export const generateWidgetIframeEmbed = (originalScript: string): string => {
  const token = extractWebsiteToken(originalScript) || 'REPLACE_WITH_WEBSITE_TOKEN';
  const widgetBase = widgetOrigin();
  const envApiBase = import.meta.env.VITE_API_URL || '';
  const src = envApiBase
    ? `${widgetBase}/widget?website_token=${token}&api_base=${encodeURIComponent(envApiBase)}`
    : `${widgetBase}/widget?website_token=${token}`;

  return `<iframe\n  src="${src}"\n  style="width:100%;max-width:420px;height:680px;border:0;border-radius:12px;"\n  allow="camera; microphone; clipboard-write"\n  referrerpolicy="strict-origin-when-cross-origin"\n  loading="lazy"\n></iframe>`;
};

// Validate widget configuration
export const validateWidgetConfig = (config: WidgetConfig): string[] => {
  const errors: string[] = [];

  if (!config.websiteName) {
    errors.push(i18n.t('channels:settings.widgetHelpers.validation.websiteNameRequired'));
  }

  if (!config.widgetColor) {
    errors.push(i18n.t('channels:settings.widgetHelpers.validation.widgetColorRequired'));
  }

  if (!config.replyTime) {
    errors.push(i18n.t('channels:settings.widgetHelpers.validation.replyTimeRequired'));
  }

  return errors;
};

// Get reply time display text
export const getReplyTimeDisplayText = (replyTime: string): string => {
  const option = getReplyTimeOptions().find(opt => opt.value === replyTime);
  return option ? option.text : replyTime;
};

// Storage keys for local storage
export const WIDGET_BUILDER_STORAGE_KEY = 'evolution_widget_builder_';

// Save widget settings to localStorage
export const saveWidgetSettings = (
  inboxId: string,
  settings: {
    position: string;
    type: string;
    launcherTitle: string;
  },
): void => {
  const key = `${WIDGET_BUILDER_STORAGE_KEY}${inboxId}`;
  localStorage.setItem(key, JSON.stringify(settings));
};

// Load widget settings from localStorage
export const loadWidgetSettings = (
  inboxId: string,
): {
  position: string;
  type: string;
  launcherTitle: string;
} | null => {
  const key = `${WIDGET_BUILDER_STORAGE_KEY}${inboxId}`;
  const saved = localStorage.getItem(key);

  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (error) {
      console.error('Error parsing saved widget settings:', error);
    }
  }

  return null;
};

// Widget editor menu options (for rich text editor)
export const WIDGET_EDITOR_MENU_OPTIONS = ['strong', 'em', 'link', 'undo', 'redo'];

// Color picker presets for widget
export const WIDGET_COLOR_PRESETS = [
  '#1f93ff', // Default blue
  '#00d4aa', // Evolution green
  '#ff6b6b', // Red
  '#4ecdc4', // Teal
  '#45b7d1', // Light blue
  '#96ceb4', // Mint
  '#feca57', // Yellow
  '#ff9ff3', // Pink
  '#54a0ff', // Blue
  '#5f27cd', // Purple
];

// Widget screen types
export const WIDGET_SCREEN_TYPES = {
  DEFAULT: 'default',
  CHAT: 'chat',
} as const;

// Widget position constants
export const WIDGET_POSITIONS = {
  LEFT: 'left',
  RIGHT: 'right',
} as const;

// Widget bubble types constants
export const WIDGET_BUBBLE_TYPES = {
  STANDARD: 'standard',
  EXPANDED: 'expanded_bubble',
} as const;
