import { useState, useEffect, useCallback } from 'react';
import {
  Label,
  Input,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Switch,
  Badge,
} from '@evoapi/design-system';
import { ExternalLink, Settings, Share2, Plus, X, Globe } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

type AgentPageMode = 'create' | 'edit' | 'view';

export interface A2AConfigData {
  agent_card_url: string;
  output_key: string;
  external_sharing?: {
    enabled: boolean;
    allowlist?: string[]; // Lista de domínios/IPs permitidos
    callback_url?: string; // URL de callback para notificações
    publish_state?: 'draft' | 'published' | 'archived'; // Estado de publicação
  };
}

interface A2AConfigFormProps {
  mode: AgentPageMode;
  data: A2AConfigData;
  onChange: (data: A2AConfigData) => void;
  onValidationChange: (isValid: boolean, errors: string[]) => void;
}

// Função para sanitizar nome do agente (igual ao evo-ai-frontend)
const sanitizeAgentName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
};

const A2AConfigForm = ({ mode, data, onChange, onValidationChange }: A2AConfigFormProps) => {
  const { t } = useLanguage('aiAgents');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newAllowlistEntry, setNewAllowlistEntry] = useState('');

  // Inicializar external_sharing se não existir
  const externalSharing = data.external_sharing || {
    enabled: false,
    allowlist: [],
    callback_url: '',
    publish_state: 'draft' as const,
  };

  // Memoizar função de validação para evitar loops infinitos
  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!data.agent_card_url.trim()) {
      newErrors.agent_card_url = t('validation.urlRequired');
    } else {
      // Validar se é uma URL válida
      try {
        new URL(data.agent_card_url);
      } catch {
        newErrors.agent_card_url = t('validation.invalidUrl');
      }
    }

    // Validar callback URL se compartilhamento externo estiver habilitado
    if (externalSharing.enabled) {
      if (externalSharing.callback_url && externalSharing.callback_url.trim()) {
        try {
          const callbackUrl = new URL(externalSharing.callback_url);
          if (callbackUrl.protocol !== 'https:') {
            newErrors.callback_url = t('validation.httpsRequired');
          }
        } catch {
          newErrors.callback_url = t('validation.invalidUrl');
        }
      }

      // Validar allowlist se habilitado
      if (externalSharing.allowlist && externalSharing.allowlist.length === 0) {
        newErrors.allowlist = t('validation.allowlistRequired');
      }
    }

    return newErrors;
  }, [data.agent_card_url, externalSharing, t]);

  useEffect(() => {
    const newErrors = validateForm();
    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    const errorMessages = Object.values(newErrors);

    // Usar setTimeout para evitar loops
    const timer = setTimeout(() => {
      onValidationChange(isValid, errorMessages);
    }, 0);

    return () => clearTimeout(timer);
  }, [validateForm, onValidationChange]);

  const handleInputChange = useCallback(
    (field: keyof A2AConfigData, value: string) => {
      onChange({ ...data, [field]: value });
    },
    [data, onChange],
  );

  const handleExternalSharingChange = useCallback(
    (updates: Partial<typeof externalSharing>) => {
      onChange({
        ...data,
        external_sharing: {
          ...externalSharing,
          ...updates,
        },
      });
    },
    [data, externalSharing, onChange],
  );

  const handleAddAllowlistEntry = useCallback(() => {
    if (newAllowlistEntry.trim()) {
      const updatedAllowlist = [...(externalSharing.allowlist || []), newAllowlistEntry.trim()];
      handleExternalSharingChange({ allowlist: updatedAllowlist });
      setNewAllowlistEntry('');
    }
  }, [newAllowlistEntry, externalSharing.allowlist, handleExternalSharingChange]);

  const handleRemoveAllowlistEntry = useCallback(
    (index: number) => {
      const updatedAllowlist = externalSharing.allowlist?.filter((_, i) => i !== index) || [];
      handleExternalSharingChange({ allowlist: updatedAllowlist });
    },
    [externalSharing.allowlist, handleExternalSharingChange],
  );

  const isReadOnly = mode === 'view';

  return (
    <div className="space-y-6">
      {/* Card da URL do Agent Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <ExternalLink className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <CardTitle>{t('a2aConfig.title')}</CardTitle>
              <CardDescription>
                {t('a2aConfig.description')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="agent-card-url">
              {t('a2aConfig.agentCardUrl')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="agent-card-url"
              value={data.agent_card_url || ''}
              onChange={e => handleInputChange('agent_card_url', e.target.value)}
              placeholder={t('a2aConfig.agentCardUrlPlaceholder')}
              disabled={isReadOnly}
              className={errors.agent_card_url ? 'border-red-500 focus:border-red-500' : ''}
            />
            {errors.agent_card_url && (
              <p className="text-xs text-red-600">{errors.agent_card_url}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {t('a2aConfig.urlDescription')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card da Chave de Saída */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-500/10">
              <Settings className="h-5 w-5 text-teal-500" />
            </div>
            <div>
              <CardTitle>{t('a2aConfig.advancedTitle')}</CardTitle>
              <CardDescription>{t('a2aConfig.advancedDescription')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="output-key" className="text-sm font-medium">
              {t('a2aConfig.outputKey')}
            </Label>
            <Input
              id="output-key"
              value={data.output_key || ''}
              onChange={e => handleInputChange('output_key', sanitizeAgentName(e.target.value))}
              placeholder={t('a2aConfig.outputKeyPlaceholder')}
              disabled={isReadOnly}
              className={errors.output_key ? 'border-red-500 focus:border-red-500' : ''}
            />
            {errors.output_key && <p className="text-xs text-red-600">{errors.output_key}</p>}
            <p className="text-xs text-muted-foreground">
              {t('a2aConfig.outputKeyDescription')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card de Compartilhamento Externo */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Share2 className="h-5 w-5 text-purple-500" />
            </div>
            <div className="flex-1">
              <CardTitle>{t('a2aConfig.externalSharingTitle')}</CardTitle>
              <CardDescription>
                {t('a2aConfig.externalSharingDescription')}
              </CardDescription>
            </div>
            <Switch
              checked={externalSharing.enabled}
              onCheckedChange={(checked) => handleExternalSharingChange({ enabled: checked })}
              disabled={isReadOnly}
            />
          </div>
        </CardHeader>
        {externalSharing.enabled && (
          <CardContent className="space-y-4">
            {/* Estado de Publicação */}
            <div className="space-y-2">
              <Label htmlFor="publish-state" className="text-sm font-medium">
                {t('a2aConfig.publishStateLabel')}
              </Label>
              <div className="flex gap-2">
                {(['draft', 'published', 'archived'] as const).map((state) => (
                  <Button
                    key={state}
                    type="button"
                    variant={externalSharing.publish_state === state ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => !isReadOnly && handleExternalSharingChange({ publish_state: state })}
                    disabled={isReadOnly}
                  >
                    {t(`a2aConfig.publishState.${state}`)}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {t('a2aConfig.publishStateDescription')}
              </p>
            </div>

            {/* Callback URL */}
            <div className="space-y-2">
              <Label htmlFor="callback-url" className="text-sm font-medium">
                {t('a2aConfig.callbackUrl')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="callback-url"
                value={externalSharing.callback_url || ''}
                onChange={e => handleExternalSharingChange({ callback_url: e.target.value })}
                placeholder={t('a2aConfig.callbackUrlPlaceholder')}
                disabled={isReadOnly}
                className={errors.callback_url ? 'border-red-500 focus:border-red-500' : ''}
              />
              {errors.callback_url && (
                <p className="text-xs text-red-600">{errors.callback_url}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {t('a2aConfig.callbackUrlDescription')}
              </p>
            </div>

            {/* Allowlist */}
            <div className="space-y-2">
              <Label htmlFor="allowlist" className="text-sm font-medium">
                {t('a2aConfig.allowlist')} <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="allowlist"
                  value={newAllowlistEntry}
                  onChange={e => setNewAllowlistEntry(e.target.value)}
                  placeholder={t('a2aConfig.allowlistPlaceholder')}
                  disabled={isReadOnly}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isReadOnly) {
                      e.preventDefault();
                      handleAddAllowlistEntry();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleAddAllowlistEntry}
                  disabled={isReadOnly || !newAllowlistEntry.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {errors.allowlist && (
                <p className="text-xs text-red-600">{errors.allowlist}</p>
              )}
              {externalSharing.allowlist && externalSharing.allowlist.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {externalSharing.allowlist.map((entry, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      {entry}
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAllowlistEntry(index)}
                          className="ml-1 hover:text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {t('a2aConfig.allowlistDescription')}
              </p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default A2AConfigForm;
