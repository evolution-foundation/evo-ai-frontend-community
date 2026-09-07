import { useTranslation as useUiTranslation } from 'react-i18next';
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@evoapi/design-system';
import { Alert, AlertTitle, AlertDescription } from '@evoapi/design-system';
import { AlertCircle, ExternalLink, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/hooks/useLanguage';
import {
  getOAuthAccounts,
  createOAuthApplication,
} from '@/services/auth/oauthService';
import type { OAuthAccount } from '@/types/auth';

interface OAuthParams {
  client_id: string;
  response_type: string;
  redirect_uri: string;
  scope: string;
  state?: string;
  code_challenge?: string;
  code_challenge_method?: string;
}

export const OAuthLogin: React.FC = () => {
  const { t: tUi } = useUiTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { t } = useLanguage('oauth');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [accounts, setAccounts] = useState<OAuthAccount[]>([]);
  const [oauthParams, setOauthParams] = useState<OAuthParams | null>(null);
  const [hasProcessedOAuth, setHasProcessedOAuth] = useState(false);

  const returnTo = searchParams.get('return_to');
  const oauthUrl = searchParams.get('oauth_url');

  // Carregar logs salvos no localStorage ao inicializar
  useEffect(() => {
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function (...args) {
      return originalPushState.apply(this, args);
    };

    window.history.replaceState = function (...args) {
      return originalReplaceState.apply(this, args);
    };

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, []);

  useEffect(() => {
    const handleOAuthFlow = async () => {
      // Se usuário está autenticado e tem oauth_url, preparar seleção de conta
      if (isAuthenticated && user && oauthUrl && !hasProcessedOAuth) {
        setIsLoading(true);
        setHasProcessedOAuth(true); // Prevent loop

        try {
          // Extrair parâmetros da OAuth URL
          const url = new URL(oauthUrl);
          const clientId = url.searchParams.get('client_id');
          const redirectUri = url.searchParams.get('redirect_uri');
          const scope = url.searchParams.get('scope');
          const state = url.searchParams.get('state');
          const responseType = url.searchParams.get('response_type');
          const codeChallenge = url.searchParams.get('code_challenge');
          const codeChallengeMethod = url.searchParams.get('code_challenge_method');

          if (!clientId || !redirectUri) {
            throw new Error(t("oauth.login.errors.missingParameters"));
          }

          // Salvar os parâmetros OAuth para usar depois
          setOauthParams({
            client_id: clientId,
            response_type: responseType || 'code',
            redirect_uri: redirectUri,
            scope: scope || 'admin',
            state: state || undefined,
            code_challenge: codeChallenge || undefined,
            code_challenge_method: codeChallengeMethod || undefined,
          });

          // Buscar contas disponíveis via service
          const accounts = await getOAuthAccounts();

          if (accounts.length > 0) {
            setAccounts(accounts);
            setIsLoading(false);
          } else {
            setError(t("oauth.login.errors.noAccounts"));
            setIsLoading(false);
          }
        } catch (err: any) {
          setError(`${t("oauth.login.errors.failedToLoadAccounts")} ${err.message || err}`);
          setIsLoading(false);
        }
        return;
      }

      // Se usuário não está autenticado, mostrar opções de login
      if (!isAuthenticated && (oauthUrl || returnTo)) {
        return;
      }

      // Fluxo antigo com returnTo
      if (isAuthenticated && user && returnTo) {
        setIsLoading(true);
        window.location.href = returnTo;
        return;
      }

      // Se não tem returnTo nem oauthUrl, mostrar erro
      if (!returnTo && !oauthUrl) {
        setError(t("oauth.login.errors.missingOAuthUrl"));
        return;
      }
    };

    handleOAuthFlow();
  }, [isAuthenticated, user, returnTo, oauthUrl, hasProcessedOAuth, t]);

  const handleLogin = () => {
    const targetUrl = oauthUrl || returnTo;
    if (!targetUrl) {
      setError(t("oauth.login.errors.missingUrlForAuth"));
      return;
    }

    try {
      // Redirecionar para a página de login normal do Evolution
      // Depois que o usuário fizer login, eles serão redirecionados de volta
      const loginUrl = `/login?returnUrl=${encodeURIComponent(targetUrl)}`;
      navigate(loginUrl);
    } catch (err) {
      console.error('❌ OAuth: Failed to redirect to login:', err);
      setError(t("oauth.login.errors.failedToRedirect"));
    }
  };

  const handleDirectOAuth = () => {
    const targetUrl = oauthUrl || returnTo;
    if (!targetUrl) {
      setError(t("oauth.login.errors.missingOAuthUrlDirect"));
      return;
    }

    setIsLoading(true);
    window.location.href = targetUrl;
  };

  const handleAccountSelect = async (account: OAuthAccount) => {
    if (!oauthParams) {
      setError(t("oauth.login.errors.missingOAuthParams"));
      return;
    }

    setIsLoading(true);

    try {
      // Criar/vincular aplicação OAuth via service
      await createOAuthApplication({
        client_id: oauthParams.client_id,
        account_id: account.account_id,
        redirect_uri: oauthParams.redirect_uri,
      });

      // Agora redirecionar para a autorização OAuth
      const params = new URLSearchParams({
        client_id: oauthParams.client_id,
        response_type: oauthParams.response_type,
        redirect_uri: oauthParams.redirect_uri,
        scope: oauthParams.scope,
        ...(oauthParams.state && { state: oauthParams.state }),
        ...(oauthParams.code_challenge && { code_challenge: oauthParams.code_challenge }),
        ...(oauthParams.code_challenge_method && {
          code_challenge_method: oauthParams.code_challenge_method,
        }),
      });

      const oauthUrl = `/oauth/authorize?${params.toString()}`;

      // Redirect to frontend OAuth authorize page
      window.location.href = oauthUrl;
    } catch (err: any) {
      setError(`${t("oauth.login.errors.failedToCreateApp")} ${err.message || err}`);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-t from-primary/20 via-background/95 to-background">
      <div className="w-full max-w-md space-y-6">
        <div className="bg-background/80 backdrop-blur-sm border rounded-lg p-6 shadow-lg">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-2">
              {accounts.length > 0
                ? t("oauth.login.titles.selectAccount")
                : isAuthenticated
                ? t("oauth.login.titles.redirecting")
                : t("oauth.login.titles.loginRequired")}
            </h1>
            <p className="text-muted-foreground">
              {accounts.length > 0
                ? t("oauth.login.descriptions.selectAccount")
                : isAuthenticated
                ? t("oauth.login.descriptions.redirecting")
                : t("oauth.login.descriptions.loginRequired")}
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{tUi("oauth:oauth.common.error")}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {accounts.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-medium mb-3">{t("oauth.login.accounts.available")}</p>
              <div className="space-y-2">
                {accounts.map(account => (
                  <button
                    key={account.account_id}
                    onClick={() => handleAccountSelect(account)}
                    className="w-full p-3 text-left border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
                    disabled={isLoading}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{account.account_name}</span>
                      <span className="text-xs text-muted-foreground">
                        ID: {account.account_id}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {(returnTo || oauthParams || oauthUrl) && (
            <div className="mb-6 p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">{t("oauth.login.applicationDetails.title")}</p>
              <div className="text-xs text-muted-foreground break-all">
                {oauthParams ? (
                  <>
                    <p>
                      <strong>{t("oauth.login.applicationDetails.clientId")}</strong> {oauthParams.client_id.substring(0, 8)}...
                    </p>
                    <p>
                      <strong>{t("oauth.login.applicationDetails.redirectUri")}</strong> {new URL(oauthParams.redirect_uri).origin}
                    </p>
                    <p>
                      <strong>{t("oauth.login.applicationDetails.scope")}</strong> {oauthParams.scope}
                    </p>
                  </>
                ) : oauthUrl ? (
                  <>
                    <p>
                      <strong>{tUi("oauth:oauth.login.applicationDetails.oauthUrl")}</strong> {new URL(oauthUrl).origin}
                    </p>
                    <p>
                      <strong>{tUi("oauth:oauth.login.applicationDetails.clientId")}</strong>{' '}
                      {new URLSearchParams(new URL(oauthUrl).search)
                        .get('client_id')
                        ?.substring(0, 8)}
                      ...
                    </p>
                  </>
                ) : returnTo ? (
                  <>
                    <p>
                      <strong>{tUi("oauth:oauth.login.applicationDetails.returnUrl")}</strong> {new URL(returnTo).origin}
                    </p>
                    <p>
                      <strong>{tUi("oauth:oauth.login.applicationDetails.clientId")}</strong>{' '}
                      {new URLSearchParams(new URL(returnTo).search)
                        .get('client_id')
                        ?.substring(0, 8)}
                      ...
                    </p>
                  </>
                ) : null}
              </div>
            </div>
          )}

          {accounts.length === 0 && !isAuthenticated && (
            <div className="space-y-3">
              <Button onClick={handleLogin} className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("oauth.login.buttons.redirecting")}
                  </>
                ) : (
                  t("oauth.login.buttons.loginToAuthorize")
                )}
              </Button>

              <Button
                onClick={handleDirectOAuth}
                variant="outline"
                className="w-full"
                disabled={isLoading}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                {t("oauth.login.buttons.continueToAuthorization")}
              </Button>
            </div>
          )}

          {(isLoading || (isAuthenticated && accounts.length === 0)) && (
            <div className="text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground mt-2">
                {accounts.length > 0
                  ? t("oauth.login.loading.processingAuthorization")
                  : t("oauth.login.loading.redirectingToAuthorization")}
              </p>
            </div>
          )}

          <div className="mt-6 text-xs text-muted-foreground text-center">
            <p>{t("oauth.login.footer.disclaimer")}</p>
            <p className="mt-2">{t("oauth.login.footer.revoke")}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OAuthLogin;
