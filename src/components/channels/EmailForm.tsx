import React, { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, Button, Input, Skeleton } from '@evoapi/design-system';
import { Mail, AlertTriangle } from 'lucide-react';
import EmailOauthService from '@/services/channels/emailOauthService';
import { EmailChannelPayload } from '@/types/channels/inbox';
import { useLanguage } from '@/hooks/useLanguage';
import { FormActionBar } from '@/components/channels/shared/FormActionBar';

interface EmailFormProps {
  provider: 'google' | 'microsoft' | 'other_provider';
  onSuccess: (channelId: string) => void;
  onBack: () => void;
}

const EmailForm: React.FC<EmailFormProps> = ({ provider, onSuccess, onBack }) => {
  const { t } = useLanguage('email');
  const [isLoading, setIsLoading] = useState(false);

  // OAuth state
  const [isRequestingAuthorization, setIsRequestingAuthorization] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // OAuth form data (simpler for OAuth providers)
  const [email, setEmail] = useState('');

  // Manual IMAP configuration
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    imap_address: '',
    imap_port: 993,
    imap_login: '',
    imap_password: '',
    imap_enable_ssl: true,
    smtp_enabled: false,
    smtp_address: '',
    smtp_port: 587,
    smtp_login: '',
    smtp_password: '',
    smtp_enable_starttls_auto: true,
    smtp_authentication: 'login',
  });

  // The OAuth callback is handled automatically by the backend; here we only
  // need the initial authorization flow.

  const handleOAuthLogin = async () => {
    if (!email.trim()) {
      toast.error(t('validation.emailRequired'));
      return;
    }

    setIsRequestingAuthorization(true);
    setAuthError(null);

    try {
      let response;
      if (provider === 'google') {
        response = await EmailOauthService.generateGoogleAuthorization(email);
      } else if (provider === 'microsoft') {
        response = await EmailOauthService.generateMicrosoftAuthorization(email);
      }

      if (response?.url) {
        // Redirect straight to the OAuth flow
        window.location.href = response.url;
      }
    } catch (error) {
      console.error('OAuth authorization error:', error);
      setAuthError(t('errors.authError'));
      toast.error(
        t('errors.connectError', { provider: provider === 'google' ? 'Google' : 'Microsoft' }),
      );
    } finally {
      setIsRequestingAuthorization(false);
    }
  };

  const handleCreateChannel = async () => {
    if (!formData.name) {
      toast.error(t('validation.nameRequired'));
      return;
    }

    if (provider === 'other_provider') {
      if (
        !formData.email ||
        !formData.imap_address ||
        !formData.imap_login ||
        !formData.imap_password
      ) {
        toast.error(t('validation.fillAllFields'));
        return;
      }
    }

    setIsLoading(true);
    try {
      const payload: EmailChannelPayload = {
        name: formData.name,
        channel: {
          type: 'email',
          provider: provider,
          email: formData.email,
          imap_enabled: true,
          imap_address: formData.imap_address,
          imap_port: formData.imap_port,
          imap_login: formData.imap_login,
          imap_password: formData.imap_password,
          imap_enable_ssl: formData.imap_enable_ssl,
          smtp_enabled: formData.smtp_enabled,
          ...(formData.smtp_enabled && {
            smtp_address: formData.smtp_address,
            smtp_port: formData.smtp_port,
            smtp_login: formData.smtp_login,
            smtp_password: formData.smtp_password,
            smtp_enable_starttls_auto: formData.smtp_enable_starttls_auto,
            smtp_authentication: formData.smtp_authentication,
          }),
        },
      };

      const result = await EmailOauthService.createEmailChannel(payload);
      toast.success(t('success.created'));
      onSuccess(result.id);
    } catch (error) {
      console.error('Create channel error:', error);
      toast.error(t('errors.createError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6" data-tour="email-connect">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">
          {t('connect')}{' '}
          {provider === 'google' ? 'Gmail' : provider === 'microsoft' ? 'Outlook' : 'Email IMAP'}
        </h1>
        <p className="text-muted-foreground">
          {provider === 'google'
            ? t('connectGmail')
            : provider === 'microsoft'
            ? t('connectOutlook')
            : t('configureImap')}
        </p>
      </div>

      {authError && (
        <Card className="border-destructive">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span>{authError}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* OAuth Providers */}
      {(provider === 'google' || provider === 'microsoft') && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Mail className="h-8 w-8 text-primary" />
                  </div>
                </div>

                <h3 className="text-xl font-semibold mb-2">
                  {t('emailFrom', { provider: provider === 'google' ? 'Google' : 'Microsoft' })}
                </h3>
                <p className="text-muted-foreground">
                  {t('oauthDescription', {
                    provider: provider === 'google' ? 'Google' : 'Microsoft',
                  })}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={t('emailPlaceholder')}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Simple Email Channel (Forward-to) */}
      {provider === 'other_provider' && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Mail className="h-8 w-8 text-primary" />
                </div>
              </div>

              <h3 className="text-xl font-semibold mb-2">{t('emailChannel')}</h3>
              <p className="text-muted-foreground">{t('emailChannelDescription')}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">{t('channelName')} *</label>
                <Input
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={t('channelNamePlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t('email')} *</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder={t('emailAddressPlaceholder')}
                />
                <p className="text-xs text-muted-foreground mt-1">{t('forwardDescription')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Standardized footer band — redirect / create actions live here. */}
      <FormActionBar>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onBack} className="min-w-24">
            {t('channels:newChannel.buttons.cancel')}
          </Button>
          {provider === 'other_provider' ? (
            <Button onClick={handleCreateChannel} disabled={isLoading} className="min-w-32">
              {isLoading ? (
                <>
                  <Skeleton className="h-4 w-4 mr-2" />
                  {t('creating')}
                </>
              ) : (
                t('createEmailChannel')
              )}
            </Button>
          ) : (
            <Button
              onClick={handleOAuthLogin}
              disabled={isRequestingAuthorization}
              className="min-w-[200px] bg-green-500 hover:bg-green-600 text-white"
            >
              {isRequestingAuthorization ? (
                <>
                  <Skeleton className="h-4 w-4 mr-2" />
                  {t('connecting')}
                </>
              ) : (
                t('signInWith', { provider: provider === 'google' ? 'Google' : 'Microsoft' })
              )}
            </Button>
          )}
        </div>
      </FormActionBar>
    </div>
  );
};

export default EmailForm;
