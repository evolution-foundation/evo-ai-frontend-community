import api from '@/services/core/api';
import { extractData, extractResponse } from '@/utils/apiHelpers';
import type { StandardResponse } from '@/types/core';
import {
  Integration,
  IntegrationsResponse,
  IntegrationToggleResponse,
  IntegrationDeleteResponse,
  IntegrationUpdateResponse,
  Webhook,
  WebhookFormData,
  WebhooksResponse,
  DashboardApp,
  DashboardAppFormData,
  DashboardAppsResponse,
  OAuthApplication,
  OAuthApplicationFormData,
  OAuthApplicationsResponse,
  OAuthInitiateResponse,
  OAuthCompleteResponse,
  OpenAIHook,
  OpenAIFormData,
  IntegrationHook,
  IntegrationHookDeleteResponse,
  SlackConfiguration,
  SlackConfigurationResponse,
  SlackChannelsResponse,
  IntegrationConfigurationResponse,
  BMSSyncResponse,
  LeadSquaredActivityResponse,
  LeadSquaredLeadResponse,
} from '@/types/integrations';

class IntegrationsService {
  private readonly baseURL = '/api/v1/integrations';

  // General integrations
  async getIntegrations(): Promise<IntegrationsResponse> {
    const response = await api.get<IntegrationsResponse>('/integrations/apps');
    return extractResponse<Integration>(response) as IntegrationsResponse;
  }

  async getIntegration(integrationId: string): Promise<Integration> {
    const response = await api.get(`/integrations/apps/${integrationId}`);
    return extractData<Integration>(response);
  }

  async toggleIntegration(integrationId: string, enabled: boolean): Promise<IntegrationToggleResponse> {
    const response = await api.post(`/integrations/${integrationId}/toggle`, {
      enabled
    });
    return extractData<IntegrationToggleResponse>(response);
  }

  async deleteIntegration(integrationId: string): Promise<IntegrationDeleteResponse> {
    const response = await api.delete(`/integrations/${integrationId}`);
    return extractData<IntegrationDeleteResponse>(response);
  }

  async configureIntegration(integrationId: string, settings: Record<string, unknown>): Promise<IntegrationUpdateResponse> {
    const response = await api.patch(`/integrations/${integrationId}`, {
      settings
    });
    return extractData<IntegrationUpdateResponse>(response);
  }

  // Webhooks
  async getWebhooks(): Promise<WebhooksResponse> {
    const response = await api.get('/webhooks');
    return extractResponse<Webhook>(response) as WebhooksResponse;
  }

  async getWebhook(webhookId: string): Promise<Webhook> {
    const response = await api.get(`/webhooks/${webhookId}`);
    return extractData<Webhook>(response);
  }

  async createWebhook(data: WebhookFormData): Promise<Webhook> {
    const response = await api.post('/webhooks', {
      webhook: data
    });
    return extractData<Webhook>(response);
  }

  async updateWebhook(webhookId: string, data: WebhookFormData): Promise<Webhook> {
    const response = await api.put(`/webhooks/${webhookId}`, {
      webhook: data
    });
    return extractData<Webhook>(response);
  }

  async deleteWebhook(webhookId: string): Promise<{ message: string }> {
    const response = await api.delete(`/webhooks/${webhookId}`);
    return extractData<{ message: string }>(response);
  }

  async testWebhook(webhookId: string): Promise<{ success: boolean; message?: string }> {
    const response = await api.post(`/webhooks/${webhookId}/test`);
    return extractData<{ success: boolean; message?: string }>(response);
  }

  // Dashboard Apps
  async getDashboardApps(): Promise<DashboardAppsResponse> {
    const response = await api.get('/dashboard_apps');
    return extractResponse<DashboardApp>(response) as DashboardAppsResponse;
  }

  async getDashboardApp(appId: string): Promise<DashboardApp> {
    const response = await api.get(`/dashboard_apps/${appId}`);
    return extractData<DashboardApp>(response);
  }

  async createDashboardApp(data: DashboardAppFormData): Promise<DashboardApp> {
    const response = await api.post('/dashboard_apps', {
      ...data,
      content: [data.content] // API expects array
    });
    return extractData<DashboardApp>(response);
  }

  async updateDashboardApp(appId: string, data: DashboardAppFormData): Promise<DashboardApp> {
    const response = await api.put(`/dashboard_apps/${appId}`, {
      ...data,
      content: [data.content] // API expects array
    });
    return extractData<DashboardApp>(response);
  }

  async deleteDashboardApp(appId: string): Promise<{ message: string }> {
    const response = await api.delete(`/dashboard_apps/${appId}`);
    return extractData<{ message: string }>(response);
  }

  // OAuth Applications
  async getOAuthApplications(): Promise<OAuthApplicationsResponse> {
    const response = await api.get('/oauth/applications');
    return extractResponse<OAuthApplication>(response) as OAuthApplicationsResponse;
  }

  async getOAuthApplication(appId: string): Promise<OAuthApplication> {
    const response = await api.get(`/oauth/applications/${appId}`);
    return extractData<OAuthApplication>(response);
  }

  async createOAuthApplication(data: OAuthApplicationFormData): Promise<OAuthApplication> {
    const response = await api.post('/oauth/applications', {
      application: data
    });
    return extractData<OAuthApplication>(response);
  }

  async updateOAuthApplication(appId: string, data: OAuthApplicationFormData): Promise<OAuthApplication> {
    const response = await api.put(`/oauth/applications/${appId}`, {
      application: data
    });
    return extractData<OAuthApplication>(response);
  }

  async deleteOAuthApplication(appId: string): Promise<{ message: string }> {
    const response = await api.delete(`/oauth/applications/${appId}`);
    return extractData<{ message: string }>(response);
  }

  async regenerateOAuthCredentials(appId: string): Promise<{ uid: string; secret: string }> {
    const response = await api.post(`/oauth/applications/${appId}/regenerate_secret`);
    return extractData<{ uid: string; secret: string }>(response);
  }

  // OAuth flow
  async initiateOAuth(provider: string): Promise<{ url: string }> {
    const response = await api.post(`${this.baseURL}/${provider}/auth`, {});
    return extractData<{ url: string }>(response);
  }

  async completeOAuth(provider: string, code: string): Promise<{ success: boolean; message?: string }> {
    const response = await api.post(`${this.baseURL}/${provider}/callback`, {
      code
    });
    return extractData<{ success: boolean; message?: string }>(response);
  }

  // Slack specific
  async getSlackConfiguration(): Promise<SlackConfiguration | null> {
    try {
      const response = await api.get('/integrations/slack');
      return extractData<SlackConfiguration>(response);
    } catch {
      return null;
    }
  }

  async updateSlackConfiguration(config: Record<string, unknown>): Promise<SlackConfigurationResponse> {
    const response = await api.patch('/integrations/slack', config);
    return extractData<SlackConfigurationResponse>(response);
  }

  async connectSlack(code: string): Promise<SlackConfigurationResponse> {
    const response = await api.post('/integrations/slack', {
      code
    });
    return extractData<SlackConfigurationResponse>(response);
  }

  async updateSlack(referenceId: string): Promise<SlackConfigurationResponse> {
    const response = await api.patch('/integrations/slack', {
      reference_id: referenceId
    });
    return extractData<SlackConfigurationResponse>(response);
  }

  async listSlackChannels(): Promise<SlackChannelsResponse> {
    const response = await api.get('/integrations/slack/list_all_channels');
    return extractData<SlackChannelsResponse>(response);
  }

  // Integration configuration methods
  async getIntegrationConfiguration(integrationId: string): Promise<IntegrationConfigurationResponse | null> {
    try {
      const response = await api.get(`/integrations/${integrationId}`);
      return extractData<IntegrationConfigurationResponse>(response);
    } catch {
      return null;
    }
  }

  async updateIntegrationConfiguration(integrationId: string, config: Record<string, unknown>): Promise<IntegrationConfigurationResponse> {
    const response = await api.patch(`/integrations/${integrationId}`, config);
    return extractData<IntegrationConfigurationResponse>(response);
  }

  async testIntegration(integrationId: string): Promise<StandardResponse<{ success: boolean; message?: string }>> {
    const response = await api.post(`/integrations/${integrationId}/test`);
    return extractData<StandardResponse<{ success: boolean; message?: string }>>(response);
  }

  // OAuth flow methods
  async exchangeOAuthCode(provider: string, data: { code: string; redirect_uri: string }): Promise<OAuthCompleteResponse> {
    const response = await api.post(`/integrations/${provider}/callback`, data);
    return extractData<OAuthCompleteResponse>(response);
  }

  // Specific provider configurations
  async getHubSpotConfiguration() {
    return this.getIntegrationConfiguration('hubspot');
  }

  async updateHubSpotConfiguration(config: Record<string, unknown>) {
    return this.updateIntegrationConfiguration('hubspot', config);
  }

  async getLinearConfiguration() {
    return this.getIntegrationConfiguration('linear');
  }

  async updateLinearConfiguration(config: Record<string, unknown>) {
    return this.updateIntegrationConfiguration('linear', config);
  }

  async getShopifyConfiguration() {
    return this.getIntegrationConfiguration('shopify');
  }

  async updateShopifyConfiguration(config: Record<string, unknown>) {
    return this.updateIntegrationConfiguration('shopify', config);
  }

  // Generic Hook methods
  async getIntegrationHook(appId: string): Promise<IntegrationHook | null> {
    try {
      // Get the integration which contains hooks
      const response = await api.get(`/integrations/apps/${appId}`);
      const integration = extractData<Integration>(response);

      // Find hook in the hooks array
      if (integration?.hooks && integration.hooks.length > 0) {
        return integration.hooks.find((hook: IntegrationHook) => hook.app_id === appId) || null;
      }

      return null;
    } catch {
      return null;
    }
  }

  async createIntegrationHook(appId: string, settings: Record<string, unknown>): Promise<IntegrationHook> {
    const payload = {
      hook: {
        app_id: appId,
        settings,
      },
    };
    const response = await api.post('/integrations/hooks', payload);
    return extractData<IntegrationHook>(response);
  }

  async updateIntegrationHook(hookId: string, settings: Record<string, unknown>): Promise<IntegrationHook> {
    const payload = {
      hook: {
        settings,
      },
    };
    const response = await api.patch(`/integrations/hooks/${hookId}`, payload);
    return extractData<IntegrationHook>(response);
  }

  async deleteIntegrationHook(hookId: string): Promise<IntegrationHookDeleteResponse> {
    const response = await api.delete(`/integrations/hooks/${hookId}`);
    return extractData<IntegrationHookDeleteResponse>(response);
  }

  // Google Workspace (Drive/GTM read-only login) — separate OAuth callback
  // from the Gmail-inbox flow (/google/callback), stores tokens as a
  // 'google_workspace' Integrations::Hook instead of creating a channel.
  async handleGoogleWorkspaceCallback(code: string, state: string): Promise<{ email: string | null }> {
    // Top-level path (not under /integrations/) on purpose: the production
    // gateway routes /api/v1/integrations/*/callback to a different backend
    // service (AI-agent tool OAuth callbacks), which would swallow this request.
    const response = await api.post('/google_workspace/callback', { code, state });
    return extractData<{ email: string | null }>(response);
  }

  // OpenAI Hook methods (using generic methods)
  async getOpenAIHook(): Promise<OpenAIHook | null> {
    const hook = await this.getIntegrationHook('openai');
    return hook as OpenAIHook | null;
  }

  async createOpenAIHook(data: OpenAIFormData): Promise<OpenAIHook> {
    return await this.createIntegrationHook('openai', { api_key: data.api_key }) as unknown as OpenAIHook;
  }

  async updateOpenAIHook(hookId: string, data: OpenAIFormData): Promise<OpenAIHook> {
    return await this.updateIntegrationHook(hookId, { api_key: data.api_key }) as unknown as OpenAIHook;
  }

  async deleteOpenAIHook(hookId: string): Promise<IntegrationHookDeleteResponse> {
    return this.deleteIntegrationHook(hookId);
  }

  async getOpenAIConfiguration() {
    return this.getIntegrationConfiguration('openai');
  }

  async updateOpenAIConfiguration(config: Record<string, unknown>) {
    return this.updateIntegrationConfiguration('openai', config);
  }

  async getDialogflowConfiguration() {
    return this.getIntegrationConfiguration('dialogflow');
  }

  async updateDialogflowConfiguration(config: Record<string, unknown>) {
    return this.updateIntegrationConfiguration('dialogflow', config);
  }

  async getBMSConfiguration() {
    return this.getIntegrationConfiguration('bms');
  }

  async updateBMSConfiguration(config: Record<string, unknown>) {
    return this.updateIntegrationConfiguration('bms', config);
  }

  async getLeadSquaredConfiguration() {
    return this.getIntegrationConfiguration('leadsquared');
  }

  async updateLeadSquaredConfiguration(config: Record<string, unknown>) {
    return this.updateIntegrationConfiguration('leadsquared', config);
  }

  // Shopify specific
  async connectShopify(shopDomain: string): Promise<OAuthInitiateResponse> {
    const response = await api.post(`${this.baseURL}/shopify/auth`, {
      shop_domain: shopDomain
    });
    return extractData<OAuthInitiateResponse>(response);
  }

  // HubSpot specific
  async connectHubSpot(): Promise<OAuthInitiateResponse> {
    const response = await api.post(`${this.baseURL}/hubspot/auth`, {});
    return extractData<OAuthInitiateResponse>(response);
  }

  // BMS specific
  async configureBMS(config: Record<string, unknown>): Promise<IntegrationConfigurationResponse> {
    const response = await api.post(`${this.baseURL}/bms`, {
      settings: config
    });
    return extractData<IntegrationConfigurationResponse>(response);
  }

  async syncBMSContacts(): Promise<BMSSyncResponse> {
    const response = await api.post(`${this.baseURL}/bms/contacts/sync`, {});
    return extractData<BMSSyncResponse>(response);
  }

  async syncBMSLabels(): Promise<BMSSyncResponse> {
    const response = await api.post(`${this.baseURL}/bms/labels/sync`, {});
    return extractData<BMSSyncResponse>(response);
  }

  async syncBMSAttributes(): Promise<BMSSyncResponse> {
    const response = await api.post(`${this.baseURL}/bms/attributes/sync`, {});
    return extractData<BMSSyncResponse>(response);
  }

  // LeadSquared specific
  async configureLeadSquared(config: Record<string, unknown>): Promise<IntegrationConfigurationResponse> {
    const response = await api.post(`${this.baseURL}/leadsquared`, {
      settings: config
    });
    return extractData<IntegrationConfigurationResponse>(response);
  }

  async createLeadSquaredActivity(data: Record<string, unknown>): Promise<LeadSquaredActivityResponse> {
    const response = await api.post(`${this.baseURL}/leadsquared/activity`, data);
    return extractData<LeadSquaredActivityResponse>(response);
  }

  async createOrUpdateLeadSquaredLead(data: Record<string, unknown>): Promise<LeadSquaredLeadResponse> {
    const response = await api.post(`${this.baseURL}/leadsquared/lead`, data);
    return extractData<LeadSquaredLeadResponse>(response);
  }
}

export const integrationsService = new IntegrationsService();
