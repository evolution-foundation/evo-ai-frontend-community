import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@evoapi/design-system';
import { Alert, AlertTitle, AlertDescription } from '@evoapi/design-system';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/hooks/useLanguage';
import { createOAuthAuthorization } from '@/services/auth/oauthService';

interface OAuthParams {
  client_id: string;
  response_type: string;
  redirect_uri: string;
  scope: string;
  state?: string | null;
  code_challenge?: string | null;
  code_challenge_method?: string | null;
}

export const OAuthAuthorize: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const { t } = useLanguage('oauth');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [oauthParams, setOauthParams] = useState<OAuthParams | null>(null);
  const [appInfo, setAppInfo] = useState<any>(null);

  useEffect(() => {
    // Extrair parâmetros OAuth da URL
    const clientId = searchParams.get('client_id');
    const responseType = searchParams.get('response_type');
    const redirectUri = searchParams.get('redirect_uri');
    const scope = searchParams.get('scope');
    const state = searchParams.get('state');
    const codeChallenge = searchParams.get('code_challenge');
    const codeChallengeMethod = searchParams.get('code_challenge_method');

    if (!clientId || !responseType || !redirectUri) {
      setError(t("oauth.authorize.errors.missingParams"));
      return;
    }

    setOauthParams({
      client_id: clientId,
      response_type: responseType,
      redirect_uri: redirectUri,
      scope: scope || 'admin',
      state: state || null,
      code_challenge: codeChallenge || null,
      code_challenge_method: codeChallengeMethod || null
    });

    // Buscar informações da aplicação
    setAppInfo({
      name: t("oauth.authorize.appInfo.name"),
      description: t("oauth.authorize.appInfo.description"),
      redirect_uri: redirectUri
    });
  }, [searchParams, t]);

  const handleAuthorize = async () => {
    if (!oauthParams || !isAuthenticated) {
      setError(t("oauth.authorize.errors.missingParamsOrAuth"));
      return;
    }

    setIsLoading(true);
    try {
      // Criar autorização via backend (gera código válido)
      const result = await createOAuthAuthorization({
        client_id: oauthParams.client_id,
        redirect_uri: oauthParams.redirect_uri,
        scope: oauthParams.scope,
        state: oauthParams.state,
        code_challenge: oauthParams.code_challenge,
        code_challenge_method: oauthParams.code_challenge_method
      });

      // Construir URL de callback com código válido
      const callbackUrl = new URL(oauthParams.redirect_uri);
      callbackUrl.searchParams.set('code', result.code);
      if (result.state) {
        callbackUrl.searchParams.set('state', result.state);
      }

      // Redirecionar para o callback da aplicação
      window.location.href = callbackUrl.toString();

    } catch (err: any) {
      console.error('❌ OAuth Authorization Error:', err);
      setError(`${t("oauth.authorize.errors.authorizationFailed")} ${err.message || err}`);
      setIsLoading(false);
    }
  };

  const handleDeny = () => {
    if (!oauthParams) return;

    // Redirecionar com erro
    const callbackUrl = new URL(oauthParams.redirect_uri);
    callbackUrl.searchParams.set('error', 'access_denied');
    callbackUrl.searchParams.set('error_description', t("oauth.authorize.errors.userDenied"));
    if (oauthParams.state) {
      callbackUrl.searchParams.set('state', oauthParams.state);
    }

    window.location.href = callbackUrl.toString();
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-t from-primary/20 via-background/95 to-background">
        <div className="w-full max-w-md space-y-6">
          <div className="bg-background/80 backdrop-blur-sm border rounded-lg p-6 shadow-lg text-center">
            <h1 className="text-2xl font-bold mb-4">{t("oauth.authorize.titles.loginRequired")}</h1>
            <p className="text-muted-foreground mb-6">{t("oauth.authorize.descriptions.needLogin")}</p>
            <Button onClick={() => window.location.href = '/auth'} className="w-full">
              {t("oauth.authorize.buttons.goToLogin")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!oauthParams) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-t from-primary/20 via-background/95 to-background">
        <div className="w-full max-w-md space-y-6">
          <div className="bg-background/80 backdrop-blur-sm border rounded-lg p-6 shadow-lg text-center">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t("oauth.authorize.titles.invalidRequest")}</AlertTitle>
              <AlertDescription>
                {error || t("oauth.authorize.descriptions.invalidParams")}
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-t from-primary/20 via-background/95 to-background">
      <div className="w-full max-w-md space-y-6">
        <div className="bg-background/80 backdrop-blur-sm border rounded-lg p-6 shadow-lg">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-2">{t("oauth.authorize.titles.authorizeApp")}</h1>
            <p className="text-muted-foreground">
              {t("oauth.authorize.descriptions.requestingAccess")}
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t("oauth.common.error")}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {appInfo && (
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <h3 className="font-medium mb-2">{appInfo.name}</h3>
              <p className="text-sm text-muted-foreground mb-3">{appInfo.description}</p>

              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>{t("oauth.authorize.appInfo.redirectUri")}</strong> {new URL(appInfo.redirect_uri).origin}</p>
                <p><strong>{t("oauth.authorize.appInfo.requestedScope")}</strong> {oauthParams.scope}</p>
                <p><strong>{t("oauth.authorize.appInfo.user")}</strong> {user?.email}</p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Button
              onClick={handleAuthorize}
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("oauth.authorize.buttons.authorizing")}
                </>
              ) : (
                t("oauth.authorize.buttons.authorize")
              )}
            </Button>

            <Button
              onClick={handleDeny}
              variant="outline"
              className="w-full"
              disabled={isLoading}
            >
              {t("oauth.authorize.buttons.deny")}
            </Button>
          </div>

          <div className="mt-6 text-xs text-muted-foreground text-center">
            <p>{t("oauth.authorize.footer.disclaimer")}</p>
            <p className="mt-2">{t("oauth.authorize.footer.revoke")}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OAuthAuthorize;
