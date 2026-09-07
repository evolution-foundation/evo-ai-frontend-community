import i18n from '@/i18n/config';
import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@evoapi/design-system';
import { Plug } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

export type ProviderType = 'flowise' | 'n8n' | 'typebot' | 'dify' | 'openai';

export interface ProviderOption {
  value: ProviderType;
  label: string;
  description: string;
}

const PROVIDERS: ProviderOption[] = [
  {
    value: 'flowise',
    label: 'Flowise',
    get description() { return i18n.t("aiAgents:edit.configuration.sections.externalIntegration.providerSelector.providers.flowise.description"); },
  },
  {
    value: 'n8n',
    label: 'N8N',
    get description() { return i18n.t("aiAgents:edit.configuration.sections.externalIntegration.providerSelector.providers.n8n.description"); },
  },
  {
    value: 'typebot',
    label: 'Typebot',
    get description() { return i18n.t("aiAgents:edit.configuration.sections.externalIntegration.providerSelector.providers.typebot.description"); },
  },
  {
    value: 'dify',
    label: 'Dify',
    get description() { return i18n.t("aiAgents:edit.configuration.sections.externalIntegration.providerSelector.providers.dify.description"); },
  },
  {
    value: 'openai',
    label: 'OpenAI',
    get description() { return i18n.t("aiAgents:edit.configuration.sections.externalIntegration.providerSelector.providers.openai.description"); },
  },
];

interface ProviderSelectorProps {
  value?: ProviderType;
  onChange: (provider: ProviderType) => void;
  disabled?: boolean;
}

export const ProviderSelector = ({ value, onChange, disabled }: ProviderSelectorProps) => {
  const { t } = useLanguage('aiAgents');
  
  const getProviderLabel = (providerValue: ProviderType) => {
    return t(`edit.configuration.sections.externalIntegration.providerSelector.providers.${providerValue}.label`);
  };
  
  const getProviderDescription = (providerValue: ProviderType) => {
    return t(`edit.configuration.sections.externalIntegration.providerSelector.providers.${providerValue}.description`);
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/10">
            <Plug className="h-5 w-5 text-purple-500" />
          </div>
          <div>
            <CardTitle>{t('edit.configuration.sections.externalIntegration.providerSelector.title')}</CardTitle>
            <CardDescription>
              {t('edit.configuration.sections.externalIntegration.providerSelector.subtitle')}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="provider">{t('edit.configuration.sections.externalIntegration.providerSelector.label')}</Label>
            <Select
              value={value}
              onValueChange={(val) => onChange(val as ProviderType)}
              disabled={disabled}
            >
              <SelectTrigger id="provider">
                <SelectValue placeholder={t('edit.configuration.sections.externalIntegration.providerSelector.placeholder')} />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((provider) => (
                  <SelectItem key={provider.value} value={provider.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{getProviderLabel(provider.value)}</span>
                      <span className="text-xs text-muted-foreground">
                        {getProviderDescription(provider.value)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export { PROVIDERS };
