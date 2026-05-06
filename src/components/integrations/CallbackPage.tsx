import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@evoapi/design-system';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import i18n from '@/i18n/config';
import { AppLogo } from '@/components/AppLogo';
import { cn } from '@/lib/utils';
import { getBrandIcon } from '@/components/BrandIcon';

interface CallbackPageProps {
  integrationName: string;
  onCallback: (code: string, state: string, agentId?: string) => Promise<{ success: boolean; error?: string; username?: string;[key: string]: any }>;
  onSuccess?: (response: any, agentId: string) => Promise<void> | void;
  redirectPath?: string | ((agentId: string) => string);
  iconPath?: string;
  iconPathDark?: string;
  integrationId?: string;
}

export default function CallbackPage({ integrationName, onCallback, onSuccess, redirectPath, iconPath, iconPathDark, integrationId }: CallbackPageProps) {
  const { t } = useLanguage('integrations');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('');
  const [hasProcessed, setHasProcessed] = useState(false);

  // Ensure language is initialized from localStorage if available
  useEffect(() => {
    const savedLang = localStorage.getItem('i18nextLng');
    if (savedLang && i18n.language !== savedLang) {
      i18n.changeLanguage(savedLang);
    }
  }, []);

  const handleCallback = async () => {
    // Prevent double execution in React Strict Mode
    if (hasProcessed) return;
    setHasProcessed(true);
    try {
      // Get URL parameters
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');
      const state = searchParams.get('state');

      if (error) {
        setStatus('error');
        const errorMsg = errorDescription || t('callback.error.authorizationError', { error });
        setMessage(errorMsg);
        toast.error(errorMsg);
        return;
      }

      if (!code || !state) {
        setStatus('error');
        const errorMsg = t('callback.error.codeNotFound');
        setMessage(errorMsg);
        toast.error(errorMsg);
        return;
      }

      setMessage(t('callback.processing.message', { name: integrationName }));

      // Decode the base64url state to get agent_id (if available)
      let agentIdFromState: string | undefined;

      try {
        const decodedState = atob(state.replace(/-/g, '+').replace(/_/g, '/'));
        const payload = JSON.parse(decodedState);
        agentIdFromState = payload.agent_id;
      } catch (e) {
        // Some integrations use different state structures - let onCallback handle it
        console.warn('Could not decode state, callback will handle it:', e);
      }

      // Call the provided callback function
      // Pass empty strings if not found - callback can decode state itself if needed
      const response = await onCallback(code, state, agentIdFromState || '');

      if (response.success) {
        setStatus('success');
        const usernameText = response.username ? t('callback.success.username', { username: response.username }) : '';
        const successMsg = t('callback.success.message', { name: integrationName, username: usernameText });
        setMessage(successMsg);
        toast.success(t('callback.success.message', { name: integrationName, username: '' }));

        // Execute custom success callback if provided
        if (onSuccess && agentIdFromState) {
          await onSuccess(response, agentIdFromState);
        }

        // Redirect after success
        setTimeout(() => {
          const path = typeof redirectPath === 'function'
            ? redirectPath(agentIdFromState || '')
            : redirectPath || (agentIdFromState ? `/agents/${agentIdFromState}/edit?tab=mcp-servers` : '/agents');
          navigate(path);
        }, 2000);
      } else {
        throw new Error(response.error || t('callback.error.connectionError', { name: integrationName }));
      }
    } catch (error: any) {
      console.error(`${integrationName} callback error:`, error);
      setStatus('error');
      const errorMsg = error.message || t('callback.error.processingError', { name: integrationName });
      setMessage(errorMsg);
      toast.error(errorMsg);
    }
  };

  useEffect(() => {
    handleCallback();
  }, []);

  const BrandIconComponent = integrationId ? getBrandIcon(integrationId) : undefined;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex justify-center">
          <AppLogo className="h-12" />
        </div>

        {/* Status Card */}
        <div className="bg-card border border-border rounded-lg p-8 space-y-4 text-center">
          {status === 'processing' && (
            <>
              <div className="flex justify-center">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
              </div>
              <h2 className="text-xl font-semibold">{t('callback.processing.title')}</h2>
              <p className="text-muted-foreground">{message || t('callback.processing.message', { name: integrationName })}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="flex justify-center">
                <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-3">
                  <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <h2 className="text-xl font-semibold">{t('callback.success.title', { name: integrationName })}</h2>
              <p className="text-muted-foreground">{message}</p>
              {BrandIconComponent ? (
                <div className="flex justify-center">
                  <BrandIconComponent size={32} className="h-8 w-8" />
                </div>
              ) : iconPath && (
                <>
                  <img
                    src={iconPath}
                    alt={integrationName}
                    className={cn("h-8 w-8", iconPathDark && "dark:hidden")}
                  />
                  {iconPathDark && (
                    <img
                      src={iconPathDark}
                      alt={integrationName}
                      className="h-8 w-8 hidden dark:block"
                    />
                  )}
                </>
              )}
            </>
          )}

          {status === 'error' && (
            <>
              <div className="flex justify-center">
                <div className="rounded-full bg-red-100 dark:bg-red-900/20 p-3">
                  <AlertTriangle className="h-12 w-12 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <h2 className="text-xl font-semibold">{t('callback.error.title')}</h2>
              <p className="text-muted-foreground">{message}</p>
              <Button
                onClick={() => navigate('/agents')}
                variant="outline"
                className="mt-4"
              >
                {t('callback.error.backToAgents')}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

