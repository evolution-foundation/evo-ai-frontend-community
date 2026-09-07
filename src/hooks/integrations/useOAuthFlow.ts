import i18n from '@/i18n/config';
import { useTranslation as useUiTranslation } from 'react-i18next';
import { useState, useEffect, useCallback } from 'react';
import { integrationsService } from '@/services/integrations';
import { toast } from 'sonner';

interface UseOAuthFlowOptions {
  integrationId: string;
  redirectUri?: string;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

interface UseOAuthFlowReturn {
  initiateFlow: () => void;
  exchangeCode: (code: string) => Promise<void>;
  isProcessing: boolean;
  error: string | null;
}

export function useOAuthFlow(options: UseOAuthFlowOptions): UseOAuthFlowReturn {
  const { t: tUi } = useUiTranslation();
  const { integrationId, redirectUri, onSuccess, onError } = options;
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initiateFlow = useCallback(() => {
    setError(null);

    try {
      // Build OAuth authorization URL
      const baseUrls: Record<string, string> = {
        slack: 'https://slack.com/oauth/v2/authorize',
        hubspot: 'https://app.hubspot.com/oauth/authorize',
        linear: 'https://linear.app/oauth/authorize',
        shopify: '', // Shopify URL is dynamic based on shop domain
        google: 'https://accounts.google.com/o/oauth2/v2/auth',
      };

      const scopes: Record<string, string[]> = {
        slack: ['channels:read', 'chat:write', 'users:read'],
        hubspot: ['crm.objects.contacts.read', 'crm.objects.companies.read'],
        linear: ['read', 'write'],
        shopify: ['read_customers', 'write_customers', 'read_orders'],
        google: [
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile',
        ],
      };

      const clientIds: Record<string, string> = {
        // These would typically come from environment variables or backend config
        slack: process.env.REACT_APP_SLACK_CLIENT_ID || '',
        hubspot: process.env.REACT_APP_HUBSPOT_CLIENT_ID || '',
        linear: process.env.REACT_APP_LINEAR_CLIENT_ID || '',
        shopify: process.env.REACT_APP_SHOPIFY_CLIENT_ID || '',
        google: process.env.REACT_APP_GOOGLE_CLIENT_ID || '',
      };

      if (!baseUrls[integrationId] && integrationId !== 'shopify') {
        throw new Error(i18n.t("interface:messages.unsupportedOAuth", { integration: integrationId }));
      }

      const clientId = clientIds[integrationId];
      if (!clientId) {
        throw new Error(i18n.t("interface:messages.missingClientId", { integration: integrationId }));
      }

      const scope = scopes[integrationId]?.join(' ') || '';
      const currentRedirectUri =
        redirectUri || `${window.location.origin}/integrations/${integrationId}/callback`;

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: currentRedirectUri,
        scope,
        response_type: 'code',
        state: `${integrationId}`, // Include account and integration info in state
      });

      let authUrl: string;

      if (integrationId === 'shopify') {
        // For Shopify, we need the shop domain which should be provided separately
        // This is a simplified example - in practice you'd get the shop domain from user input
        const shopDomain = prompt(
          tUi("interface:useoauthflow.enterYourShopifyStoreDomainForExampleMystoreMyshopifyCom"),
        );
        if (!shopDomain) {
          throw new Error(tUi("interface:useoauthflow.aStoreDomainIsRequiredForShopify"));
        }
        authUrl = `https://${shopDomain}/admin/oauth/authorize?${params.toString()}`;
      } else {
        authUrl = `${baseUrls[integrationId]}?${params.toString()}`;
      }

      // Redirect to OAuth provider
      window.location.href = authUrl;
    } catch (err: any) {
      const errorMsg = err.message || tUi("interface:useoauthflow.couldNotStartOauthFlow");
      setError(errorMsg);
      console.error('Error initiating OAuth flow:', err);
      toast.error(errorMsg);
      onError?.(err);
    }
  }, [integrationId, redirectUri, onError, tUi]);

  const exchangeCode = useCallback(
    async (code: string) => {
      setIsProcessing(true);
      setError(null);

      try {
        // Exchange authorization code for access token
        const tokenData = await integrationsService.exchangeOAuthCode(integrationId, {
          code,
          redirect_uri:
            redirectUri || `${window.location.origin}/integrations/${integrationId}/callback`,
        });

        toast.success(i18n.t("interface:dynamic.integrationConnected", { integration: integrationId }));
        onSuccess?.(tokenData);
      } catch (err: any) {
        const errorMsg = err.message || tUi("interface:useoauthflow.couldNotConnectIntegration");
        setError(errorMsg);
        console.error('Error exchanging OAuth code:', err);
        toast.error(errorMsg);
        onError?.(err);
      } finally {
        setIsProcessing(false);
      }
    },
    [integrationId, redirectUri, onSuccess, onError, tUi],
  );

  // Handle OAuth callback if code is present in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    if (error) {
      const errorMsg = i18n.t("interface:messages.oauthError", { error });
      setError(errorMsg);
      toast.error(errorMsg);
      onError?.(error);
      return;
    }

    if (code && state) {
      const [stateIntegrationId] = state.split(':');

      if (stateIntegrationId === integrationId) {
        // Clear URL params
        const newUrl = window.location.href.split('?')[0];
        window.history.replaceState({}, document.title, newUrl);

        // Exchange code for token
        exchangeCode(code);
      }
    }
  }, [integrationId, exchangeCode, onError]);

  return {
    initiateFlow,
    exchangeCode,
    isProcessing,
    error,
  };
}
