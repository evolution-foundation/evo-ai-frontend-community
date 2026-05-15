import { useState, useEffect, useCallback } from 'react';
import { agentIntegrationsService } from '@/services/agents/agentIntegrationsService';
import type {
  GitHubConfig,
  NotionConfig,
  StripeConfig,
  LinearConfig,
  MondayConfig,
  AtlassianConfig,
  AsanaConfig,
  HubSpotConfig,
  PayPalConfig,
  CanvaConfig,
  SupabaseConfig,
} from '@/types/integrations';

type IntegrationConfig =
  | GitHubConfig
  | NotionConfig
  | StripeConfig
  | LinearConfig
  | MondayConfig
  | AtlassianConfig
  | AsanaConfig
  | HubSpotConfig
  | PayPalConfig
  | CanvaConfig
  | SupabaseConfig;

interface UseMCPIntegrationsReturn {
  // Configs
  githubConfig: GitHubConfig | null;
  notionConfig: NotionConfig | null;
  stripeConfig: StripeConfig | null;
  linearConfig: LinearConfig | null;
  mondayConfig: MondayConfig | null;
  atlassianConfig: AtlassianConfig | null;
  asanaConfig: AsanaConfig | null;
  hubspotConfig: HubSpotConfig | null;
  paypalConfig: PayPalConfig | null;
  canvaConfig: CanvaConfig | null;
  supabaseConfig: SupabaseConfig | null;

  // Status
  credentialsConfigured: Record<string, boolean>;
  isCheckingCredentials: boolean;

  // Actions
  reloadAllConfigs: () => Promise<void>;
  isConnected: (provider: string) => boolean;
}

/**
 * Sanitize integration config to remove sensitive fields.
 * Security: This is a defense-in-depth measure to prevent sensitive data
 * from being stored in frontend state, even if backend accidentally sends it.
 */
function sanitizeConfig(config: Record<string, unknown>): Record<string, unknown> {
  if (!config) return config;

  const sanitized = { ...config };

  // Remove sensitive fields
  const sensitiveFields = [
    'access_token',
    'client_secret',
    'refresh_token',
    'pkce_verifiers',
    'token',
    'code_verifier',
  ];

  sensitiveFields.forEach(field => {
    delete sanitized[field];
  });

  // Remove any token-like values (REST API keys: sk_, rk_, pk_)
  Object.keys(sanitized).forEach(key => {
    const value = sanitized[key];
    if (typeof value === 'string' && value.match(/^(sk_|rk_|pk_)/)) {
      delete sanitized[key];
    }
  });

  return sanitized;
}

export function useMCPIntegrations(agentId: string): UseMCPIntegrationsReturn {
  const [githubConfig, setGithubConfig] = useState<GitHubConfig | null>(null);
  const [notionConfig, setNotionConfig] = useState<NotionConfig | null>(null);
  const [stripeConfig, setStripeConfig] = useState<StripeConfig | null>(null);
  const [linearConfig, setLinearConfig] = useState<LinearConfig | null>(null);
  const [mondayConfig, setMondayConfig] = useState<MondayConfig | null>(null);
  const [atlassianConfig, setAtlassianConfig] = useState<AtlassianConfig | null>(null);
  const [asanaConfig, setAsanaConfig] = useState<AsanaConfig | null>(null);
  const [hubspotConfig, setHubspotConfig] = useState<HubSpotConfig | null>(null);
  const [paypalConfig, setPaypalConfig] = useState<PayPalConfig | null>(null);
  const [canvaConfig, setCanvaConfig] = useState<CanvaConfig | null>(null);
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig | null>(null);

  const [isCheckingCredentials, setIsCheckingCredentials] = useState(true);
  const [credentialsConfigured, setCredentialsConfigured] = useState<Record<string, boolean>>({
    github: false,
    notion: false,
    stripe: false,
    linear: false,
    monday: false,
    atlassian: false,
    asana: false,
    hubspot: false,
    paypal: false,
    canva: false,
    supabase: false,
  });

  const loadConfigs = useCallback(async () => {
    if (!agentId) return;

    setIsCheckingCredentials(true);

    try {
      // Backend returns an array of { provider, config, ... } items.
      const items = await agentIntegrationsService.getAgentIntegrations(agentId);

      // Build a provider→config map normalized to hyphen-case keys
      // (backend stores underscored provider names like "google_calendar").
      const configsByProvider: Record<string, Record<string, unknown>> = {};
      const credentialsConfiguredNext: Record<string, boolean> = {
        github: false,
        notion: false,
        stripe: false,
        linear: false,
        monday: false,
        atlassian: false,
        asana: false,
        hubspot: false,
        paypal: false,
        canva: false,
        supabase: false,
      };

      items.forEach(item => {
        const key = (item.provider || '').replace(/_/g, '-');
        if (!key) return;
        configsByProvider[key] = item.config || {};
        if (key in credentialsConfiguredNext) {
          credentialsConfiguredNext[key] = true;
        }
      });

      setCredentialsConfigured(credentialsConfiguredNext);

      // Sanitize configs before storing (defense-in-depth security measure)
      setGithubConfig(
        configsByProvider.github
          ? (sanitizeConfig(configsByProvider.github) as unknown as GitHubConfig)
          : null
      );
      setNotionConfig(
        configsByProvider.notion
          ? (sanitizeConfig(configsByProvider.notion) as unknown as NotionConfig)
          : null
      );
      setStripeConfig(
        configsByProvider.stripe
          ? (sanitizeConfig(configsByProvider.stripe) as unknown as StripeConfig)
          : null
      );
      setLinearConfig(
        configsByProvider.linear
          ? (sanitizeConfig(configsByProvider.linear) as unknown as LinearConfig)
          : null
      );
      setMondayConfig(
        configsByProvider.monday
          ? (sanitizeConfig(configsByProvider.monday) as unknown as MondayConfig)
          : null
      );
      setAtlassianConfig(
        configsByProvider.atlassian
          ? (sanitizeConfig(configsByProvider.atlassian) as unknown as AtlassianConfig)
          : null
      );
      setAsanaConfig(
        configsByProvider.asana
          ? (sanitizeConfig(configsByProvider.asana) as unknown as AsanaConfig)
          : null
      );
      setHubspotConfig(
        configsByProvider.hubspot
          ? (sanitizeConfig(configsByProvider.hubspot) as unknown as HubSpotConfig)
          : null
      );
      setPaypalConfig(
        configsByProvider.paypal
          ? (sanitizeConfig(configsByProvider.paypal) as unknown as PayPalConfig)
          : null
      );
      setCanvaConfig(
        configsByProvider.canva
          ? (sanitizeConfig(configsByProvider.canva) as unknown as CanvaConfig)
          : null
      );
      setSupabaseConfig(
        configsByProvider.supabase
          ? (sanitizeConfig(configsByProvider.supabase) as unknown as SupabaseConfig)
          : null
      );
    } catch (error) {
      console.error('Error loading all integrations:', error);
      setCredentialsConfigured({
        github: false,
        notion: false,
        stripe: false,
        linear: false,
        monday: false,
        atlassian: false,
        asana: false,
        hubspot: false,
        paypal: false,
        canva: false,
        supabase: false,
      });
    } finally {
      setIsCheckingCredentials(false);
    }
  }, [agentId]);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  const isConnected = useCallback(
    (provider: string): boolean => {
      const configMap: Record<string, IntegrationConfig | null> = {
        github: githubConfig,
        notion: notionConfig,
        stripe: stripeConfig,
        linear: linearConfig,
        monday: mondayConfig,
        atlassian: atlassianConfig,
        asana: asanaConfig,
        hubspot: hubspotConfig,
        paypal: paypalConfig,
        canva: canvaConfig,
        supabase: supabaseConfig,
      };

      const config = configMap[provider];
      return config?.connected === true;
    },
    [
      githubConfig,
      notionConfig,
      stripeConfig,
      linearConfig,
      mondayConfig,
      atlassianConfig,
      asanaConfig,
      hubspotConfig,
      paypalConfig,
      canvaConfig,
      supabaseConfig,
    ],
  );

  return {
    githubConfig,
    notionConfig,
    stripeConfig,
    linearConfig,
    mondayConfig,
    atlassianConfig,
    asanaConfig,
    hubspotConfig,
    paypalConfig,
    canvaConfig,
    supabaseConfig,
    credentialsConfigured,
    isCheckingCredentials,
    reloadAllConfigs: loadConfigs,
    isConnected,
  };
}
