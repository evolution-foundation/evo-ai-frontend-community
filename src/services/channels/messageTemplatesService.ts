import api from '@/services/core/api';
import type {
  MessageTemplate,
  TemplateFormData,
  MessageTemplateResponse,
  MessageTemplateComponent,
} from '@/types/channels/inbox';
import { extractResponse } from '@/utils/apiHelpers';
import {
  extractTemplateFormVariables,
  extractTemplateVariables,
  normalizeTemplateVariables,
} from '@/utils/templateVariables';

/**
 * Determine if a channel supports WhatsApp-style template sync
 */
export const supportsTemplateSync = (channelType: string): boolean => {
  const syncableChannels = [
    'Channel::Whatsapp',
    'Channel::WhatsappCloud',
    'Channel::Whatsapp360Dialog',
  ];
  return syncableChannels.includes(channelType);
};

/**
 * Determine if a channel uses structured components (header/body/footer/buttons)
 */
export const usesStructuredComponents = (channelType: string): boolean => {
  const structuredChannels = [
    'Channel::Whatsapp',
    'Channel::WhatsappCloud',
    'Channel::Whatsapp360Dialog',
    'Channel::FacebookPage',
    'Channel::InstagramDirect',
  ];
  return structuredChannels.includes(channelType);
};

/**
 * Get channel-specific template configuration
 */
export const getChannelTemplateConfig = (channelType: string) => {
  const configs: Record<
    string,
    {
      supportsMedia: boolean;
      supportsButtons: boolean;
      supportsStructured: boolean;
      categories: string[];
      templateTypes: string[];
      usesLiquid?: boolean;
    }
  > = {
    'Channel::Whatsapp': {
      supportsMedia: true,
      supportsButtons: true,
      supportsStructured: true,
      categories: ['MARKETING', 'UTILITY', 'AUTHENTICATION'],
      templateTypes: ['text', 'interactive', 'media'],
    },
    'Channel::FacebookPage': {
      supportsMedia: true,
      supportsButtons: true,
      supportsStructured: true,
      categories: ['MARKETING', 'UTILITY'],
      templateTypes: ['text', 'interactive'],
    },
    'Channel::InstagramDirect': {
      supportsMedia: true,
      supportsButtons: true,
      supportsStructured: true,
      categories: ['MARKETING', 'UTILITY'],
      templateTypes: ['text', 'interactive'],
    },
    'Channel::TelegramChannel': {
      supportsMedia: true,
      supportsButtons: true,
      supportsStructured: false,
      categories: ['MARKETING', 'UTILITY'],
      templateTypes: ['text', 'media'],
    },
    'Channel::TwilioSms': {
      supportsMedia: false,
      supportsButtons: false,
      supportsStructured: false,
      categories: ['TRANSACTIONAL', 'MARKETING'],
      templateTypes: ['text'],
    },
    'Channel::Line': {
      supportsMedia: true,
      supportsButtons: true,
      supportsStructured: false,
      categories: ['MARKETING', 'UTILITY'],
      templateTypes: ['text', 'interactive'],
    },
    'Channel::Email': {
      supportsMedia: false,
      supportsButtons: false,
      supportsStructured: false,
      categories: ['TRANSACTIONAL', 'MARKETING'],
      templateTypes: ['text'],
      usesLiquid: true,
    },
    'Channel::Api': {
      supportsMedia: false,
      supportsButtons: false,
      supportsStructured: false,
      categories: ['TRANSACTIONAL'],
      templateTypes: ['text'],
    },
  };

  return configs[channelType] || configs['Channel::Api'];
};

const MessageTemplateService = {
  /**
   * Get all templates for an inbox with pagination support. Hits the flat,
   * account-scoped `/message_templates` endpoint (EVO-1716) and passes
   * `inbox_id` so the backend resolves the inbox's channel and returns that
   * channel's templates.
   */
  async getTemplates(
    inboxId: string,
    params?: {
      page?: number;
      per_page?: number;
      // NOTE: the backend `index` reads `params[:search]` (search_by_name); the
      // legacy `query` field below is never honored — always pass `search`.
      search?: string;
      query?: string;
      category?: string;
      active?: boolean;
    },
  ): Promise<MessageTemplateResponse> {
    try {
      const response = await api.get<MessageTemplateResponse>(`/message_templates`, {
        params: { ...params, inbox_id: inboxId },
      });

      return extractResponse<MessageTemplate>(response) as MessageTemplateResponse;
    } catch (error) {
      console.error('MessageTemplateService.getTemplates error:', error);
      throw error;
    }
  },

  /**
   * Sync templates with external API (WhatsApp only)
   */
  async syncTemplates(inboxId: string): Promise<MessageTemplate[]> {
    try {
      const { data } = await api.post(`/inboxes/${inboxId}/message_templates/sync`);
      return Array.isArray(data) ? data : [data];
    } catch (error) {
      console.error('MessageTemplateService.syncTemplates error:', error);
      throw error;
    }
  },

  /**
   * Create a new template
   */
  async createTemplate(
    inboxId: string,
    templateData: TemplateFormData,
    channelType: string,
  ): Promise<MessageTemplate> {
    try {
      const backendTemplate = this.transformToBackendFormat(templateData, channelType);

      const { data } = await api.post(`/message_templates`, {
        inbox_id: inboxId,
        message_template: backendTemplate,
      });
      return data;
    } catch (error) {
      console.error('MessageTemplateService.createTemplate error:', error);
      throw error;
    }
  },

  /**
   * Update an existing template
   */
  async updateTemplate(
    inboxId: string,
    templateId: string,
    templateData: TemplateFormData,
    channelType: string,
  ): Promise<MessageTemplate> {
    try {
      const backendTemplate = this.transformToBackendFormat(templateData, channelType);

      const { data } = await api.put(`/message_templates/${templateId}`, {
        inbox_id: inboxId,
        message_template: backendTemplate,
      });
      return data;
    } catch (error) {
      console.error('MessageTemplateService.updateTemplate error:', error);
      throw error;
    }
  },

  /**
   * Delete a template
   */
  async deleteTemplate(inboxId: string, templateId: string): Promise<void> {
    try {
      await api.delete(`/message_templates/${templateId}`, {
        params: { inbox_id: inboxId },
      });
    } catch (error) {
      console.error('MessageTemplateService.deleteTemplate error:', error);
      throw error;
    }
  },

  /**
   * Toggle template active status
   */
  async toggleTemplate(
    inboxId: string,
    templateId: string,
    active: boolean,
  ): Promise<MessageTemplate> {
    try {
      const { data } = await api.patch(
        `/inboxes/${inboxId}/message_templates/${templateId}/toggle`,
        { active },
      );
      return data;
    } catch (error) {
      console.error('MessageTemplateService.toggleTemplate error:', error);
      throw error;
    }
  },

  /**
   * Transform frontend template format to backend format
   */
  transformToBackendFormat(
    templateData: TemplateFormData,
    channelType: string,
  ): Partial<MessageTemplate> {
    const config = getChannelTemplateConfig(channelType);
    const isStructured = usesStructuredComponents(channelType);

    // For structured channels (WhatsApp, Facebook, Instagram)
    if (isStructured && config.supportsStructured) {
      const components: MessageTemplateComponent[] = [];
      // Add header component (skip when there is no header / format is NONE)
      if (
        templateData.headerText &&
        templateData.headerFormat &&
        templateData.headerFormat !== 'NONE'
      ) {
        components.push({
          type: 'HEADER',
          format: templateData.headerFormat,
          text: templateData.headerText,
        });
      }

      // Add body component (required for structured templates)
      if (templateData.bodyText) {
        components.push({
          type: 'BODY',
          text: templateData.bodyText,
        });
      }

      // Add footer component
      if (templateData.footerText) {
        components.push({
          type: 'FOOTER',
          text: templateData.footerText,
        });
      }

      // Add buttons component
      if (templateData.buttons && templateData.buttons.length > 0) {
        const buttons = templateData.buttons.map(button => ({
          type: button.type,
          text: button.text,
          ...(button.url && { url: button.url }),
          ...(button.phone_number && { phone_number: button.phone_number }),
        }));

        components.push({
          type: 'BUTTONS',
          buttons,
        });
      }

      // Build content from components for unified storage
      const contentParts = [];
      if (templateData.headerText) contentParts.push(templateData.headerText);
      if (templateData.bodyText) contentParts.push(templateData.bodyText);
      if (templateData.footerText) contentParts.push(templateData.footerText);

      return {
        name: templateData.name,
        content: contentParts.join('\n\n'),
        language: templateData.language,
        category: templateData.category,
        template_type: templateData.template_type || 'interactive',
        components,
        variables: extractTemplateFormVariables(templateData),
        ...(templateData.mediaUrl && { media_url: templateData.mediaUrl }),
        ...(templateData.mediaType && { media_type: templateData.mediaType }),
        ...(templateData.settings && { settings: templateData.settings }),
        ...(templateData.metadata && { metadata: templateData.metadata }),
        active: templateData.active !== false,
      };
    }

    // For simple text-based channels (Email, SMS, API, Telegram, Line)
    return {
      name: templateData.name,
      content: templateData.content,
      language: templateData.language,
      category: templateData.category,
      template_type: templateData.template_type || 'text',
      variables: extractTemplateFormVariables(templateData),
      ...(templateData.mediaUrl && { media_url: templateData.mediaUrl }),
      ...(templateData.mediaType && { media_type: templateData.mediaType }),
      settings: {
        ...templateData.settings,
        ...(templateData.subject && { subject: templateData.subject }),
      },
      ...(templateData.metadata && { metadata: templateData.metadata }),
      active: templateData.active !== false,
    };
  },

  /**
   * Transform backend template format to frontend format
   */
  transformToFrontendFormat(template: MessageTemplate, channelType: string): TemplateFormData {
    const isStructured = usesStructuredComponents(channelType);

    const result: TemplateFormData = {
      name: template.name,
      content: template.content || '',
      language: template.language,
      category: template.category,
      template_type: template.template_type,
      ...(template.media_url && { mediaUrl: template.media_url }),
      ...(template.media_type && { mediaType: template.media_type }),
      ...(template.settings && { settings: template.settings }),
      ...(template.metadata && { metadata: template.metadata }),
      active: template.active !== false,
      variables: extractTemplateVariables(template),
    };

    // Extract subject from settings for email templates
    if (channelType === 'Channel::Email' && template.settings?.subject) {
      result.subject = template.settings.subject as string;
    }

    // Parse structured components if available
    if (isStructured && template.components) {
      result.headerFormat = 'NONE';
      result.headerText = '';
      result.bodyText = '';
      result.footerText = '';
      result.buttons = [];

      Object.entries(template.components).forEach(([, component]) => {
        switch (component.type) {
          case 'HEADER':
            result.headerFormat = (component.format || 'TEXT') as TemplateFormData['headerFormat'];
            result.headerText = component.text || '';
            break;
          case 'BODY':
            result.bodyText = component.text || '';
            break;
          case 'FOOTER':
            result.footerText = component.text || '';
            break;
          case 'BUTTONS':
            result.buttons =
              component.buttons?.map(btn => ({
                type: btn.type,
                text: btn.text,
                url: btn.url,
                phoneNumber: btn.phone_number,
              })) || [];
            break;
        }
      });
    }

    return result;
  },

  /**
   * Extract variables from template content
   */
  extractVariables(content: string, channelType: string): string[] {
    const channelConfig = getChannelTemplateConfig(channelType);

    // Email templates use Liquid syntax
    if (channelConfig.usesLiquid) {
      const liquidPattern = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_.]*)\s*\}\}/g;
      const matches = content.matchAll(liquidPattern);
      return Array.from(matches, m => m[1]);
    }

    return normalizeTemplateVariables(
      Array.from(content.matchAll(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g), m => m[1]),
    ).map(variable => variable.name);
  },
};

export default MessageTemplateService;
