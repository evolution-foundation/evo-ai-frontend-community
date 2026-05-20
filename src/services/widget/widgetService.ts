import axios, { AxiosError, AxiosInstance } from 'axios';

import { extractData } from '@/utils/apiHelpers';
import { wdebug } from '@/utils/widget/debug';
import type { WidgetConfig, PreChatSubmissionData, WidgetMessage } from '@/types/settings';
import i18n from '@/i18n/config';

// Use shared API client (baseURL = VITE_API_URL/api/v1 -> Evolution CRM)

class WidgetService {
  private apiBaseStorageKey = 'evo_widget_api_base';

  private normalizeWidgetLocale(locale?: string | null): string | undefined {
    if (!locale) return undefined;
    const normalized = locale.replace('_', '-').toLowerCase();

    if (normalized === 'pt-br') return 'pt-BR';
    if (normalized.startsWith('pt')) return 'pt';
    if (normalized.startsWith('fr')) return 'fr';
    if (normalized.startsWith('it')) return 'it';
    if (normalized.startsWith('es')) return 'es';
    if (normalized.startsWith('en')) return 'en';

    return undefined;
  }

  private storageKey(token: string) {
    return `evo_widget_auth_${token}`;
  }

  private getFromLocalStorage(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private setInLocalStorage(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      return;
    }
  }

  private removeFromLocalStorage(key: string) {
    try {
      localStorage.removeItem(key);
    } catch {
      return;
    }
  }

  private getFromSessionStorage(key: string): string | null {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private setInSessionStorage(key: string, value: string) {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      return;
    }
  }

  private removeFromSessionStorage(key: string) {
    try {
      sessionStorage.removeItem(key);
    } catch {
      return;
    }
  }

  private readToken(websiteToken: string): string | null {
    const key = this.storageKey(websiteToken);
    const local = this.getFromLocalStorage(key);
    if (local) return local;

    const legacySession = this.getFromSessionStorage(key);
    if (legacySession) {
      this.setInLocalStorage(key, legacySession);
      return legacySession;
    }

    return null;
  }

  private writeToken(websiteToken: string, token: string) {
    const key = this.storageKey(websiteToken);
    this.setInLocalStorage(key, token);
    this.setInSessionStorage(key, token);
  }

  private clearToken(websiteToken: string) {
    const key = this.storageKey(websiteToken);
    this.removeFromLocalStorage(key);
    this.removeFromSessionStorage(key);
  }

  private isTokenError(error: unknown): boolean {
    const err = error as AxiosError<{ error?: string; code?: string }>;
    if (err.response?.status !== 401) return false;

    const code = String(err.response?.data?.code || '').toUpperCase();
    const message = String(err.response?.data?.error || '').toLowerCase();

    return code === 'TOKEN_EXPIRED' || code === 'INVALID_TOKEN' || message.includes('token') || message.includes('contact not found');
  }

  private normalizeBase(base?: string | null): string | null {
    if (!base) return null;
    const trimmed = base.trim();
    if (!trimmed) return null;
    return trimmed.replace(/\/+$/, '');
  }

  private getCandidateApiBases(): string[] {
    const candidates: string[] = [];

    try {
      const persisted = this.normalizeBase(sessionStorage.getItem(this.apiBaseStorageKey));
      if (persisted) candidates.push(persisted);
    } catch (_) {}

    try {
      const fromQuery = this.normalizeBase(
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('api_base')
          : null
      );
      if (fromQuery) candidates.push(fromQuery);
    } catch (_) {}

    const fromEnv = this.normalizeBase(import.meta.env.VITE_API_URL);
    if (fromEnv) candidates.push(fromEnv);

    const fromOrigin = this.normalizeBase(
      typeof window !== 'undefined' ? window.location.origin : null
    );
    if (fromOrigin) candidates.push(fromOrigin);

    return Array.from(new Set(candidates));
  }

  private buildClient(base: string): AxiosInstance {
    return axios.create({
      baseURL: `${base}/api/v1`,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  private shouldTryNextBase(error: unknown): boolean {
    const err = error as AxiosError;
    const status = err.response?.status;
    return !status || status === 403 || status === 404 || status === 405;
  }

  private async requestWithBaseFallback<T>(requestFn: (client: AxiosInstance) => Promise<T>): Promise<T> {
    const bases = this.getCandidateApiBases();
    let lastError: unknown = null;

    for (const base of bases) {
      const client = this.buildClient(base);
      try {
        const result = await requestFn(client);
        try {
          sessionStorage.setItem(this.apiBaseStorageKey, base);
        } catch (_) {}
        return result;
      } catch (error) {
        lastError = error;
        if (!this.shouldTryNextBase(error)) {
          throw error;
        }
      }
    }

    throw lastError;
  }

  private async runWithTokenRecovery<T>(websiteToken: string, requestFn: () => Promise<T>): Promise<T> {
    try {
      return await requestFn();
    } catch (error) {
      if (!this.isTokenError(error)) throw error;
      this.clearToken(websiteToken);
      await this.getConfig(websiteToken);
      return requestFn();
    }
  }

  async getConfig(websiteToken: string): Promise<WidgetConfig & { website_channel_config?: { auth_token?: string }; current_user?: any; active_campaign?: any }> {
    const fetchConfig = async (includeToken: boolean) => {
      const headers: Record<string, string> = {};
      const existing = includeToken ? this.readToken(websiteToken) : null;
      if (existing) headers['X-Auth-Token'] = existing;

      return this.requestWithBaseFallback((client) =>
        client.post('/widget/config', {}, {
          params: { website_token: websiteToken },
          headers,
        })
      );
    };

    try {
      let response;
      try {
        response = await fetchConfig(true);
      } catch (error) {
        if (!this.isTokenError(error)) throw error;
        this.clearToken(websiteToken);
        response = await fetchConfig(false);
      }

      const data = response.data;
      const authToken = data?.website_channel_config?.auth_token;
      if (authToken) this.writeToken(websiteToken, authToken);

      // Map backend config to our interface
      const websiteConfig = data.website_channel_config || {};
      const preChatOptions = websiteConfig.pre_chat_form_options || {};

      const locale = this.normalizeWidgetLocale(websiteConfig.locale);
      if (locale && i18n.language !== locale) {
        await i18n.changeLanguage(locale).catch((err) => {
          console.error('[Widget] Failed to change language:', err);
        });
      }

      return {
        ...data,
        // Pre-chat configuration from backend
        preChatFormEnabled: websiteConfig.pre_chat_form_enabled || false,
        locale,
        preChatMessage: preChatOptions.pre_chat_message || '',
        preChatFields: (preChatOptions.pre_chat_fields || []).map((field: any) => ({
          ...field,
          field_type: field.field_type === 'standard' ? 'contact_attribute' : field.field_type,
        })),
        // Widget features
        hasAttachmentsEnabled: websiteConfig.enabled_features?.includes('attachments') ?? true,
        hasEmojiPickerEnabled: websiteConfig.enabled_features?.includes('emoji_picker') ?? true,
        enabledFeatures: websiteConfig.enabled_features || [], // Add full enabled features array
        inboxAvatarUrl: websiteConfig.avatar_url || '',
        // Conversation settings
        allowMessagesAfterResolved: websiteConfig.allow_messages_after_resolved ?? true,
        channelConfig: {
          websiteName: websiteConfig.website_name || '',
          widgetColor: websiteConfig.widget_color || '#1f93ff',
        },
      };
    } catch (e) {
      // Fallback: GET /widget (HTML) and parse window.authToken from the response
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/widget?website_token=${encodeURIComponent(websiteToken)}`, {
          credentials: 'include',
        });
        const html = await res.text();
        const m = html.match(/window\.authToken\s*=\s*'([^']+)'/);
        if (m && m[1]) {
          this.writeToken(websiteToken, m[1]);
          return {
            website_channel_config: { auth_token: m[1] },
            preChatFormEnabled: false,
            preChatFields: [],
            hasAttachmentsEnabled: true,
            hasEmojiPickerEnabled: true,
            allowMessagesAfterResolved: true,
          };
        }
      } catch (_) {}
      throw e;
    }
  }

  private getAuthHeader(websiteToken: string) {
    const t = this.readToken(websiteToken);
    return t ? { 'X-Auth-Token': t } : {};
  }

  async getConversations(websiteToken: string) {
    const t = this.readToken(websiteToken);

    wdebug('[WIDGET_DEBUG] getConversations', {
      websiteToken,
      xAuthPresent: !!t,
      xAuthPrefix: t?.slice(0, 12) || 'N/A',
      timestamp: new Date().toISOString(),
    });

    const response = await this.runWithTokenRecovery(websiteToken, () =>
      this.requestWithBaseFallback((client) =>
        client.get('/widget/conversations', {
          params: { website_token: websiteToken },
          headers: {
            ...this.getAuthHeader(websiteToken),
            'Content-Type': 'application/json',
          },
        })
      )
    );

    wdebug('[WIDGET_DEBUG] getConversations RESPONSE', {
      status: response.status,
      data: response.data,
      dataKeys: Object.keys(response.data || {}),
      hasPayload: !!response.data?.payload,
      payloadType: typeof response.data?.payload,
      payloadIsArray: Array.isArray(response.data?.payload),
      payloadLength: Array.isArray(response.data?.payload) ? response.data.payload.length : 'not array',
      rawDataType: typeof response.data,
      rawDataIsArray: Array.isArray(response.data),
      // Try to extract conversations from all possible structures
      possibleConversations: {
        fromPayload: response.data?.payload,
        fromData: response.data?.data,
        fromConversations: response.data?.conversations,
        directArray: Array.isArray(response.data) ? response.data : null,
      },
      timestamp: new Date().toISOString(),
    });

    return response.data;
  }

  async getMessages(websiteToken: string, params?: { before?: string; after?: string }) {
    const response = await this.runWithTokenRecovery(websiteToken, () =>
      this.requestWithBaseFallback((client) =>
        client.get('/widget/messages', {
          params: {
            website_token: websiteToken,
            locale: (navigator.language || 'en-US').replace('-', '_'),
            ...(params?.before ? { before: params.before } : {}),
            ...(params?.after ? { after: params.after } : {}),
          },
          headers: {
            ...this.getAuthHeader(websiteToken),
            'Content-Type': 'application/json',
          },
        })
      )
    );
    const extracted = extractData<{
      data?: { messages?: WidgetMessage[] };
      payload?: WidgetMessage[] | { messages?: WidgetMessage[] };
      messages?: WidgetMessage[];
    }>(response) as any;

    if (Array.isArray(extracted?.payload)) {
      return { data: { messages: extracted.payload } };
    }

    if (Array.isArray(extracted?.payload?.messages)) {
      return { data: { messages: extracted.payload.messages } };
    }

    if (Array.isArray(extracted?.messages)) {
      return { data: { messages: extracted.messages } };
    }

    if (Array.isArray(extracted?.data?.messages)) {
      return { data: { messages: extracted.data.messages } };
    }

    return { data: { messages: [] } };
  }

  async sendMessage(websiteToken: string, content: string, replyTo?: string | null, echoId?: string, conversationId?: string | number) {
    const response = await this.runWithTokenRecovery(websiteToken, () =>
      this.requestWithBaseFallback((client) =>
        client.post(
          '/widget/messages',
          {
            message: {
              content,
              reply_to: replyTo || null,
              conversation_id: conversationId || undefined,
              timestamp: new Date().toString(),
              referer_url: document.referrer || '',
              echo_id: echoId || undefined,
            },
          },
          {
            params: { website_token: websiteToken, locale: (navigator.language || 'en-US').replace('-', '_') },
            headers: {
              ...this.getAuthHeader(websiteToken),
              'Content-Type': 'application/json',
            },
          }
        )
      )
    );
    return extractData<any>(response);
  }

  async createConversation(
    websiteToken: string,
    content: string,
    contact?: { name?: string; email?: string; phone_number?: string },
    customAttributes?: Record<string, any>
  ) {
    const response = await this.runWithTokenRecovery(websiteToken, () =>
      this.requestWithBaseFallback((client) =>
        client.post(
          '/widget/conversations',
          {
            contact: contact || {},
            message: {
              content,
              timestamp: new Date().toString(),
              referer_url: document.referrer || '',
            },
            custom_attributes: customAttributes || {},
          },
          {
            params: { website_token: websiteToken, locale: (navigator.language || 'en-US').replace('-', '_') },
            headers: {
              ...this.getAuthHeader(websiteToken),
              'Content-Type': 'application/json',
            },
          }
        )
      )
    );
    return extractData<any>(response);
  }

  async createConversationFromPreChat(
    websiteToken: string,
    preChatData: PreChatSubmissionData
  ) {
    const contact = {
      name: preChatData.fullName || '',
      email: preChatData.emailAddress || '',
      phone_number: preChatData.phoneNumber || '',
    };

    // Combine all custom attributes
    const customAttributes = {
      ...preChatData.conversationCustomAttributes,
      // Add contact attributes to custom attributes as well for backward compatibility
      ...preChatData.contactCustomAttributes,
    };

    return this.createConversation(
      websiteToken,
      preChatData.message || '',
      contact,
      customAttributes
    );
  }

  async setCustomAttributes(websiteToken: string, customAttributes: Record<string, any>) {
    const response = await this.requestWithBaseFallback((client) =>
      client.post(
        '/widget/conversations/set_custom_attributes',
        { custom_attributes: customAttributes },
        {
          params: { website_token: websiteToken },
          headers: {
            ...this.getAuthHeader(websiteToken),
            'Content-Type': 'application/json',
          },
        }
      )
    );
    return extractData<any>(response);
  }

  async deleteCustomAttribute(websiteToken: string, customAttribute: string) {
    const response = await this.requestWithBaseFallback((client) =>
      client.post(
        '/widget/conversations/destroy_custom_attributes',
        { custom_attribute: [customAttribute] },
        {
          params: { website_token: websiteToken },
          headers: {
            ...this.getAuthHeader(websiteToken),
            'Content-Type': 'application/json',
          },
        }
      )
    );
    return extractData<any>(response);
  }

  async sendAttachmentRaw(websiteToken: string, file: File, replyTo?: string | null, echoId?: string) {
    const form = new FormData();
    form.append('message[attachments][]', file, file.name);
    form.append('message[referer_url]', document.referrer || '');
    form.append('message[timestamp]', new Date().toString());
    if (replyTo) form.append('message[reply_to]', replyTo);
    if (echoId) form.append('message[echo_id]', echoId);

    const response = await this.requestWithBaseFallback((client) =>
      client.post('/widget/messages', form, {
        params: { website_token: websiteToken, locale: (navigator.language || 'en-US').replace('-', '_') },
        headers: {
          ...this.getAuthHeader(websiteToken),
          // Remove Content-Type to let browser set multipart boundary
          'Content-Type': undefined,
        },
      })
    );
    return extractData<any>(response);
  }

  async sendMultipleAttachments(websiteToken: string, files: File[], message?: string, replyTo?: string | null, echoId?: string, conversationId?: string | number) {
    const form = new FormData();

    // Add all files
    files.forEach(file => {
      form.append('message[attachments][]', file, file.name);
    });

    // Add message content if provided
    if (message) {
      form.append('message[content]', message);
    }

    form.append('message[referer_url]', document.referrer || '');
    form.append('message[timestamp]', new Date().toString());
    if (replyTo) form.append('message[reply_to]', replyTo);
    if (echoId) form.append('message[echo_id]', echoId);
    if (conversationId) form.append('message[conversation_id]', conversationId.toString());

    const response = await this.requestWithBaseFallback((client) =>
      client.post('/widget/messages', form, {
        params: { website_token: websiteToken, locale: (navigator.language || 'en-US').replace('-', '_') },
        headers: {
          ...this.getAuthHeader(websiteToken),
          // Remove Content-Type to let browser set multipart boundary
          'Content-Type': undefined,
        },
      })
    );
    return extractData<any>(response);
  }

  async getInboxMembers(websiteToken: string) {
    const response = await this.requestWithBaseFallback((client) =>
      client.get('/widget/inbox_members', {
        params: { website_token: websiteToken },
        headers: {
          ...this.getAuthHeader(websiteToken),
          'Content-Type': 'application/json',
        },
      })
    );
    return extractData<any>(response);
  }

  async sendEmailTranscript(websiteToken: string) {
    const response = await this.requestWithBaseFallback((client) =>
      client.post(
        '/widget/messages/email_transcript',
        {},
        {
          params: { website_token: websiteToken },
          headers: {
            ...this.getAuthHeader(websiteToken),
            'Content-Type': 'application/json',
          },
        }
      )
    );
    return extractData<any>(response);
  }

  async updateMessage(websiteToken: string, messageId: string | number, contactEmail: string) {
    const response = await this.requestWithBaseFallback((client) =>
      client.patch(
        `/widget/messages/${messageId}`,
        {
          contact: { email: contactEmail },
        },
        {
          params: { website_token: websiteToken },
          headers: {
            ...this.getAuthHeader(websiteToken),
            'Content-Type': 'application/json',
          },
        }
      )
    );
    return extractData<any>(response);
  }

  async toggleConversationStatus(websiteToken: string, status: 'open' | 'resolved' = 'resolved') {
    const response = await this.requestWithBaseFallback((client) =>
      client.get('/widget/conversations/toggle_status', {
        params: { website_token: websiteToken, status },
        headers: {
          ...this.getAuthHeader(websiteToken),
          'Content-Type': 'application/json',
        },
      })
    );
    return extractData<any>(response);
  }
}

export const widgetService = new WidgetService();
