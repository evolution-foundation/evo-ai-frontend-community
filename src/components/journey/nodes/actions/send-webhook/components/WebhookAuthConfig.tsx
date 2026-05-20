import { useState } from 'react';
import {
  Label,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
} from '@evoapi/design-system';
import { Shield, Eye, EyeOff, Lock } from 'lucide-react';
import { SendWebhookNodeData } from '../SendWebhookNode';
import { VariableInput } from '@/components/journey/environment-manager';
import { useLanguage } from '@/hooks/useLanguage';

interface WebhookAuthConfigProps {
  data: SendWebhookNodeData;
  onChange: (updates: Partial<SendWebhookNodeData>) => void;
  journeyId: string;
}

export function WebhookAuthConfig({ data, onChange, journeyId }: WebhookAuthConfigProps) {
  const { t } = useLanguage('journey');

  const AUTH_TYPES = [
    {
      value: 'none',
      label: t('panels.sendWebhook.auth.types.none.label'),
      description: t('panels.sendWebhook.auth.types.none.description'),
      icon: '🔓',
    },
    {
      value: 'bearer',
      label: t('panels.sendWebhook.auth.types.bearer.label'),
      description: t('panels.sendWebhook.auth.types.bearer.description'),
      icon: '🎫',
    },
    {
      value: 'basic',
      label: t('panels.sendWebhook.auth.types.basic.label'),
      description: t('panels.sendWebhook.auth.types.basic.description'),
      icon: '👤',
    },
    {
      value: 'api_key',
      label: t('panels.sendWebhook.auth.types.apiKey.label'),
      description: t('panels.sendWebhook.auth.types.apiKey.description'),
      icon: '🔑',
    },
  ];
  const [showSensitive, setShowSensitive] = useState({
    token: false,
    password: false,
    apiKey: false,
  });

  const handleAuthTypeChange = (value: 'none' | 'bearer' | 'basic' | 'api_key') => {
    onChange({
      authenticationType: value,
      // Limpar dados de auth anteriores
      authToken: undefined,
      authUsername: undefined,
      authPassword: undefined,
      authApiKey: undefined,
      authApiKeyHeader: undefined,
    });
  };

  const toggleShowSensitive = (field: keyof typeof showSensitive) => {
    setShowSensitive(prev => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const renderAuthFields = () => {
    const authType = data.authenticationType || 'none';

    switch (authType) {
      case 'bearer':
        return (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('panels.sendWebhook.auth.bearerToken')}</Label>
              <div className="relative">
                <Input
                  type={showSensitive.token ? 'text' : 'password'}
                  value={data.authToken || ''}
                  onChange={e => onChange({ authToken: e.target.value })}
                  placeholder={t('panels.sendWebhook.auth.bearerPlaceholder')}
                  className="bg-sidebar border-sidebar-border text-sidebar-foreground pr-8"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleShowSensitive('token')}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                >
                  {showSensitive.token ? (
                    <EyeOff className="h-3 w-3" />
                  ) : (
                    <Eye className="h-3 w-3" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('panels.sendWebhook.auth.bearerDescription')}
              </p>
            </div>
          </div>
        );

      case 'basic':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('panels.sendWebhook.auth.username')}</Label>
                <VariableInput
                  value={data.authUsername || ''}
                  onChange={e => onChange({ authUsername: e.target.value })}
                  placeholder={t('panels.sendWebhook.auth.usernamePlaceholder')}
                  className="bg-sidebar border-sidebar-border text-sidebar-foreground"
                  journeyId={journeyId}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('panels.sendWebhook.auth.password')}</Label>
                <div className="relative">
                  <Input
                    type={showSensitive.password ? 'text' : 'password'}
                    value={data.authPassword || ''}
                    onChange={e => onChange({ authPassword: e.target.value })}
                    placeholder={t('panels.sendWebhook.auth.passwordPlaceholder')}
                    className="bg-sidebar border-sidebar-border text-sidebar-foreground pr-8"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleShowSensitive('password')}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                  >
                    {showSensitive.password ? (
                      <EyeOff className="h-3 w-3" />
                    ) : (
                      <Eye className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('panels.sendWebhook.auth.basicDescription')}
            </p>
          </div>
        );

      case 'api_key':
        return (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('panels.sendWebhook.auth.headerName')}</Label>
              <VariableInput
                value={data.authApiKeyHeader || ''}
                onChange={e => onChange({ authApiKeyHeader: e.target.value })}
                placeholder={t('panels.sendWebhook.auth.headerNamePlaceholder')}
                className="bg-sidebar border-sidebar-border text-sidebar-foreground"
                journeyId={journeyId}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('panels.sendWebhook.auth.headerNameDescription')}
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('panels.sendWebhook.auth.apiKey')}</Label>
              <div className="relative">
                <Input
                  type={showSensitive.apiKey ? 'text' : 'password'}
                  value={data.authApiKey || ''}
                  onChange={e => onChange({ authApiKey: e.target.value })}
                  placeholder={t('panels.sendWebhook.auth.apiKeyPlaceholder')}
                  className="bg-sidebar border-sidebar-border text-sidebar-foreground pr-8"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleShowSensitive('apiKey')}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                >
                  {showSensitive.apiKey ? (
                    <EyeOff className="h-3 w-3" />
                  ) : (
                    <Eye className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/30 text-center">
            <Shield className="h-6 w-6 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-green-700 dark:text-green-300">
              {t('panels.sendWebhook.auth.noAuthMessage')}
            </p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              {t('panels.sendWebhook.auth.noAuthDescription')}
            </p>
          </div>
        );
    }
  };

  const getAuthSummary = () => {
    const authType = data.authenticationType || 'none';

    switch (authType) {
      case 'bearer':
        return data.authToken ? t('panels.sendWebhook.auth.tokenConfigured') : t('panels.sendWebhook.auth.tokenNotConfigured');
      case 'basic':
        return data.authUsername && data.authPassword
          ? t('panels.sendWebhook.auth.basicAuth', { username: data.authUsername })
          : t('panels.sendWebhook.auth.credentialsNotConfigured');
      case 'api_key':
        return data.authApiKeyHeader && data.authApiKey
          ? t('panels.sendWebhook.auth.apiKeyHeader', { header: data.authApiKeyHeader })
          : t('panels.sendWebhook.auth.apiKeyNotConfigured');
      default:
        return t('panels.sendWebhook.auth.noAuth');
    }
  };

  return (
    <div className="space-y-4">
      {/* Tipo de Autenticação */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">{t('panels.sendWebhook.auth.authType')}</Label>
        <Select value={data.authenticationType || 'none'} onValueChange={handleAuthTypeChange}>
          <SelectTrigger className="w-full bg-sidebar border-sidebar-border text-sidebar-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-sidebar border-sidebar-border">
            {AUTH_TYPES.map(type => (
              <SelectItem key={type.value} value={type.value} className="text-sidebar-foreground">
                <div className="flex items-center gap-2">
                  <span>{type.icon}</span>
                  <div>
                    <div className="font-medium">{type.label}</div>
                    <div className="text-xs text-muted-foreground">{type.description}</div>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Campos de autenticação */}
      {renderAuthFields()}

      {/* Resumo da configuração */}
      <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/30">
        <div className="flex items-center gap-2 mb-2">
          <Lock className="h-4 w-4 text-purple-600" />
          <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
            {t('panels.sendWebhook.auth.configTitle')}
          </p>
        </div>
        <p className="text-sm text-purple-700 dark:text-purple-300">{getAuthSummary()}</p>
        {data.authenticationType !== 'none' && (
          <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
            🔒 {t('panels.sendWebhook.auth.sensitiveDataEncrypted')}
          </p>
        )}
      </div>
    </div>
  );
}
