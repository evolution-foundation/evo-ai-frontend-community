import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, AlertTriangle, Mail } from 'lucide-react';
import { toast } from 'sonner';
import oauthCallbackService from '@/services/channels/oauthCallbackService';
import { useLanguage } from '@/hooks/useLanguage';
import { AppLogo } from '@/components/AppLogo';

export default function GoogleCallback() {
  const { t } = useLanguage('email');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState(t('callback.processing'));
  const [hasProcessed, setHasProcessed] = useState(false);

  const handleGoogleCallback = async () => {
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
        setMessage(errorDescription || t('callback.authorizationError', { error }));
        toast.error(errorDescription || error);
        return;
      }

      if (!code || !state) {
        setStatus('error');
        setMessage(t('callback.missingParameters'));
        toast.error(t('callback.missingParameters'));
        return;
      }

      setMessage(t('callback.processingProvider', { provider: 'Google' }));

      // Call backend Google callback endpoint
      const response = await oauthCallbackService.handleGoogleCallback(
        code,
        state,
      );

      if (response?.success) {
        setStatus('success');
        setMessage(t('callback.connected', { provider: 'Gmail' }));
        toast.success(t('callback.connected', { provider: 'Gmail' }));

        // Redirect to channels list after success (same as Instagram)
        setTimeout(() => {
          navigate('/channels');
        }, 2000);
      } else {
        throw new Error(response?.error || t('callback.connectionError', { provider: 'Gmail' }));
      }
    } catch (error) {
      console.error('Google callback error:', error);
      setStatus('error');
      const errorMessage =
        (error as { response?: { data?: { error?: string } }; message?: string })?.response?.data
          ?.error ||
        (error as { message?: string })?.message ||
        t('callback.processingError', { provider: 'Google' });

      setMessage(errorMessage);

      toast.error(
        (error as { response?: { data?: { error?: string } }; message?: string })?.response?.data
          ?.error ||
        (error as { message?: string })?.message ||
        t('callback.unknownError', { provider: 'Gmail' })
      );
    }
  };

  useEffect(() => {
    handleGoogleCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getStatusIcon = () => {
    switch (status) {
      case 'processing':
        return <Loader2 className="h-12 w-12 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-12 w-12 text-green-500" />;
      case 'error':
        return <AlertTriangle className="h-12 w-12 text-red-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'processing':
        return 'text-blue-600 dark:text-blue-400';
      case 'success':
        return 'text-green-600 dark:text-green-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-t from-primary/20 via-background/95 to-background relative">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <AppLogo className="h-10 mx-auto" />
        </div>

        {/* Card de Callback */}
        <div className="bg-background/80 backdrop-blur-sm border rounded-lg p-6 shadow-lg">
          {/* Header com Google Icon */}
          <div className="text-center pb-6 border-b">
            <div className="flex items-center justify-center gap-3">
              <div className="p-3 rounded-full bg-gradient-to-br from-red-500 via-yellow-500 to-green-500">
                <Mail className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold">Gmail</h1>
            </div>
          </div>

          {/* Content */}
          <div className="text-center space-y-6 py-8">
            <div className="flex flex-col items-center gap-4">
              {getStatusIcon()}
              <div className="space-y-2">
                <p className={`text-lg font-semibold ${getStatusColor()}`}>
                  {status === 'processing' && t('callback.processingTitle')}
                  {status === 'success' && t('callback.successTitle')}
                  {status === 'error' && t('callback.errorTitle')}
                </p>
                <p className="text-sm text-muted-foreground max-w-sm">{message}</p>
              </div>
            </div>

            {status === 'success' && (
              <div className="text-xs text-muted-foreground animate-pulse">
                {t('callback.redirecting')}
              </div>
            )}

            {status === 'error' && (
              <div className="text-xs text-muted-foreground pt-4 border-t">
                <p>{t('callback.closeWindow')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground">
          <p>{t('callback.integration', { provider: 'Gmail' })}</p>
        </div>
      </div>
    </div>
  );
}
