import api from '@/services/core/api';
import MessageTemplateService from '@/services/channels/messageTemplatesService';
import type { MessageTemplate, TemplateFormData, MessageTemplateResponse } from '@/types';
import { extractData, extractResponse } from '@/utils/apiHelpers';

/**
 * Global (channel-independent) message templates — EVO-1233 [6.4].
 *
 * These hit the SAME per-inbox member routes as the channel-scoped service, but
 * in `?global=true` mode (EVO-1231): the backend lists/creates/updates/deletes
 * channel-less (`channel_id IS NULL`) templates and ignores the inbox in the URL.
 *
 * ⚠️ The route still requires a VALID, `show?`-able inbox id as a placeholder
 * (`fetch_inbox` does `Inbox.find(params[:id])`); callers pass one resolved from
 * the app data store. WhatsApp Cloud is intentionally NOT handled here (channel
 * -bound; stays in the per-channel Message Templates tab).
 */

/** Provider options exposed by the global menu (channel-less only). */
export type GlobalTemplateProvider = 'generic' | 'email';

/**
 * Map a global provider to the synthetic `channelType` the existing
 * `transformToBackendFormat` branch logic understands. Both resolve to
 * non-structured channels, so only the simple `content` (+ email `subject`)
 * fields are emitted — no WhatsApp `components` builder.
 */
export const providerToChannelType = (provider: GlobalTemplateProvider): string =>
  provider === 'email' ? 'Channel::Email' : 'Channel::Api';

export interface GlobalTemplatesQuery {
  page?: number;
  per_page?: number;
  search?: string;
  sort_by?: 'name' | 'created_at';
  category?: string;
  template_type?: string;
}

const GLOBAL_PARAM = { global: true } as const;

/**
 * Build the `message_template` request body for a global template.
 *
 * `provider` is sent both as the sibling key the backend reads via
 * `params.dig(:message_template, :provider)` AND persisted into
 * `settings.global_provider`. The backend's `intended_provider` is a virtual
 * attribute that is NOT echoed back in `serialized`, so without the settings
 * marker an edited email template (especially one with an empty subject) would
 * be mis-inferred as `generic` on reload. `settings` IS round-tripped.
 */
const buildMessageTemplatePayload = (
  formData: TemplateFormData,
  provider: GlobalTemplateProvider,
) => {
  const backendTemplate = MessageTemplateService.transformToBackendFormat(
    formData,
    providerToChannelType(provider),
  );
  return {
    ...backendTemplate,
    provider,
    settings: {
      ...(backendTemplate.settings as Record<string, unknown> | undefined),
      global_provider: provider,
    },
  };
};

/**
 * Recover a global template's provider for editing. Prefers the persisted
 * `settings.global_provider` marker, falling back to the email-subject heuristic
 * for templates created before the marker existed.
 */
export const inferTemplateProvider = (template: MessageTemplate): GlobalTemplateProvider => {
  const marker = (template.settings as Record<string, unknown> | undefined)?.global_provider;
  if (marker === 'email' || marker === 'generic') return marker;
  return (template.settings as Record<string, unknown> | undefined)?.subject ? 'email' : 'generic';
};

const GlobalMessageTemplateService = {
  /**
   * List global (channel-less) templates with pagination + search.
   * Never pass `per_page: -1` — that backend branch hardcodes `total_pages: 1`.
   */
  async getTemplates(
    placeholderInboxId: string,
    params?: GlobalTemplatesQuery,
  ): Promise<MessageTemplateResponse> {
    const response = await api.get(`/inboxes/${placeholderInboxId}/message_templates`, {
      params: { ...GLOBAL_PARAM, ...params },
    });
    return extractResponse<MessageTemplate>(response) as MessageTemplateResponse;
  },

  /**
   * Create a channel-less template. `provider` is sent as a sibling key INSIDE
   * `message_template` (the backend reads it via `params.dig(:message_template,
   * :provider)` — it is deliberately outside strong params). Returns the created
   * template (POST responds with `data` = the serialized template directly).
   */
  async createTemplate(
    placeholderInboxId: string,
    formData: TemplateFormData,
    provider: GlobalTemplateProvider,
  ): Promise<MessageTemplate> {
    const response = await api.post(
      `/inboxes/${placeholderInboxId}/message_templates`,
      { message_template: buildMessageTemplatePayload(formData, provider) },
      { params: GLOBAL_PARAM },
    );
    return extractData<MessageTemplate>(response);
  },

  /**
   * Update a channel-less template. PUT responds with `data.template` (a
   * different envelope from POST), so unwrap the nested `template`.
   */
  async updateTemplate(
    placeholderInboxId: string,
    templateId: string,
    formData: TemplateFormData,
    provider: GlobalTemplateProvider,
  ): Promise<MessageTemplate> {
    const response = await api.put(
      `/inboxes/${placeholderInboxId}/message_templates/${templateId}`,
      { message_template: buildMessageTemplatePayload(formData, provider) },
      { params: GLOBAL_PARAM },
    );
    const data = extractData<{ template: MessageTemplate } | MessageTemplate>(response);
    return (data as { template: MessageTemplate }).template ?? (data as MessageTemplate);
  },

  /** Delete a channel-less template. */
  async deleteTemplate(placeholderInboxId: string, templateId: string): Promise<void> {
    await api.delete(`/inboxes/${placeholderInboxId}/message_templates/${templateId}`, {
      params: GLOBAL_PARAM,
    });
  },

  /**
   * Convert a backend template into the form shape for editing. Reuses the
   * channel service's transform with the synthetic channel for the template's
   * provider.
   */
  toFormData(template: MessageTemplate, provider: GlobalTemplateProvider): TemplateFormData {
    return MessageTemplateService.transformToFrontendFormat(
      template,
      providerToChannelType(provider),
    );
  },
};

export default GlobalMessageTemplateService;
