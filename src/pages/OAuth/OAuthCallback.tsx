import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, AlertTitle, AlertDescription } from '@evoapi/design-system';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

export const OAuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { t } = useLanguage('oauth');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state');

    // Simular processamento
    const timer = setTimeout(() => {
      if (error) {
        setStatus('error');
        setMessage(`${t("oauth.callback.errors.oauthError")} ${error}`);
      } else if (code) {
        setStatus('success');
        setMessage(t("oauth.callback.success.message"));

        // Enviar mensagem para a janela pai (para casos de popup)
        if (window.opener) {
          window.opener.postMessage({
            type: 'oauth_callback',
            data: { code, state }
          }, '*');
          window.close();
        }
      } else {
        setStatus('error');
        setMessage(t("oauth.callback.errors.invalidCallback"));
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [searchParams, t]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-t from-primary/20 via-background/95 to-background">
      <div className="w-full max-w-md space-y-6">
        <div className="bg-background/80 backdrop-blur-sm border rounded-lg p-6 shadow-lg text-center">
          <h1 className="text-2xl font-bold mb-4">{t("oauth.callback.title")}</h1>

          {status === 'loading' && (
            <div className="space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground">{t("oauth.callback.loading.processing")}</p>
            </div>
          )}

          {status === 'success' && (
            <Alert>
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">{t("oauth.callback.success.title")}</AlertTitle>
              <AlertDescription className="text-green-700">
                {message}
              </AlertDescription>
            </Alert>
          )}

          {status === 'error' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t("oauth.callback.errors.title")}</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          <div className="mt-6 text-xs text-muted-foreground">
            <p>{t("oauth.callback.footer.canClose")}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OAuthCallback;
