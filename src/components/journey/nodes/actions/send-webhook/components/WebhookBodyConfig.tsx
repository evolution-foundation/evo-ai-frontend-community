import { useState } from 'react';
import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
} from '@evoapi/design-system';
import { Code, Copy, Check } from 'lucide-react';
import { SendWebhookNodeData } from '../SendWebhookNode';
import { VariableTextarea } from '@/components/journey/environment-manager';
import { useLanguage } from '@/hooks/useLanguage';

interface WebhookBodyConfigProps {
  data: SendWebhookNodeData;
  onChange: (updates: Partial<SendWebhookNodeData>) => void;
  journeyId: string;
}


const JSON_TEMPLATES = {
  contact: `{
  "contact": {
    "id": "{{contact.id}}",
    "name": "{{contact.name}}",
    "email": "{{contact.email}}",
    "phone": "{{contact.phone}}",
    "created_at": "{{contact.created_at}}"
  },
  "journey": {
    "id": "{{journey.id}}",
    "name": "{{journey.name}}",
    "step": "{{current_step}}"
  },
  "timestamp": "{{now}}"
}`,
  event: `{
  "event": "journey_webhook",
  "contact_id": "{{contact.id}}",
  "journey_id": "{{journey.id}}",
  "data": {
    "contact_name": "{{contact.name}}",
    "contact_email": "{{contact.email}}"
  },
  "metadata": {
    "source": "journey",
    "timestamp": "{{now}}"
  }
}`,
  custom: `{
  "message": "Contact reached webhook step",
  "contact": "{{contact.name}}",
  "email": "{{contact.email}}",
  "custom_field": "your_value_here"
}`,
};

export function WebhookBodyConfig({ data, onChange, journeyId }: WebhookBodyConfigProps) {
  const { t } = useLanguage('journey');
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);

  const BODY_TYPES = [
    { value: 'json', label: t('panels.sendWebhook.body.types.json.label'), description: t('panels.sendWebhook.body.types.json.description') },
    {
      value: 'form',
      label: t('panels.sendWebhook.body.types.form.label'),
      description: t('panels.sendWebhook.body.types.form.description'),
    },
    { value: 'text', label: t('panels.sendWebhook.body.types.text.label'), description: t('panels.sendWebhook.body.types.text.description') },
    { value: 'xml', label: t('panels.sendWebhook.body.types.xml.label'), description: t('panels.sendWebhook.body.types.xml.description') },
  ];

  const handleBodyTypeChange = (value: 'json' | 'form' | 'text' | 'xml') => {
    onChange({ bodyType: value });

    // Auto-definir Content-Type header se não existir
    const currentHeaders = data.headers || [];
    const hasContentType = currentHeaders.some(h => h.key.toLowerCase() === 'content-type');

    if (!hasContentType) {
      const contentTypeMap = {
        json: 'application/json',
        form: 'application/x-www-form-urlencoded',
        text: 'text/plain',
        xml: 'application/xml',
      };

      const newHeaders = [
        ...currentHeaders,
        {
          key: 'Content-Type',
          value: contentTypeMap[value],
        },
      ];

      onChange({ headers: newHeaders });
    }
  };

  const handleBodyChange = (value: string) => {
    onChange({ body: value });
  };

  const copyTemplate = async (template: string, templateName: string) => {
    handleBodyChange(template);
    setCopiedTemplate(templateName);
    setTimeout(() => setCopiedTemplate(null), 2000);
  };

  const shouldShowBody = () => {
    const method = data.method || 'POST';
    return ['POST', 'PUT', 'PATCH'].includes(method);
  };

  if (!shouldShowBody()) {
    return (
      <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-950/20 border border-gray-200 dark:border-gray-800/30 text-center">
        <Code className="h-6 w-6 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('panels.sendWebhook.body.methodNotSupported', { method: data.method || 'GET' })}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tipo do Body */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">{t('panels.sendWebhook.body.contentType')}</Label>
        <Select value={data.bodyType || 'json'} onValueChange={handleBodyTypeChange}>
          <SelectTrigger className="w-full bg-sidebar border-sidebar-border text-sidebar-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-sidebar border-sidebar-border">
            {BODY_TYPES.map(type => (
              <SelectItem key={type.value} value={type.value} className="text-sidebar-foreground">
                <div>
                  <div className="font-medium">{type.label}</div>
                  <div className="text-xs text-muted-foreground">{type.description}</div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Templates para JSON */}
      {data.bodyType === 'json' && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t('panels.sendWebhook.body.jsonTemplates')}</Label>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(JSON_TEMPLATES).map(([name, template]) => (
              <Button
                key={name}
                variant="outline"
                size="sm"
                onClick={() => copyTemplate(template, name)}
                className="text-xs"
              >
                {copiedTemplate === name ? (
                  <Check className="w-3 h-3 mr-1" />
                ) : (
                  <Copy className="w-3 h-3 mr-1" />
                )}
                {name === 'contact'
                  ? t('panels.sendWebhook.body.templateContact')
                  : name === 'event'
                  ? t('panels.sendWebhook.body.templateEvent')
                  : t('panels.sendWebhook.body.templateCustom')}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Editor do Body */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">{t('panels.sendWebhook.body.bodyContent')}</Label>
        <div className="relative">
          <VariableTextarea
            value={data.body || ''}
            onChange={e => handleBodyChange(e.target.value)}
            placeholder={
              data.bodyType === 'json'
                ? t('panels.sendWebhook.body.jsonPlaceholder')
                : data.bodyType === 'form'
                ? t('panels.sendWebhook.body.formPlaceholder')
                : data.bodyType === 'xml'
                ? t('panels.sendWebhook.body.xmlPlaceholder')
                : t('panels.sendWebhook.body.textPlaceholder')
            }
            className="w-full h-32 p-3 text-sm bg-sidebar border-sidebar-border text-sidebar-foreground rounded-md font-mono resize-y"
            style={{ minHeight: '120px' }}
            journeyId={journeyId}
          />
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {t('panels.sendWebhook.body.useVariables')}
        </div>
      </div>

      {/* Variáveis disponíveis */}
      <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30">
        <Label className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2 block">
          {t('panels.sendWebhook.body.availableVariables')}
        </Label>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <strong>{t('panels.sendWebhook.body.contact')}</strong>
            <div className="font-mono text-blue-700 dark:text-blue-300">
              {'{{contact.id}}'}
              <br />
              {'{{contact.name}}'}
              <br />
              {'{{contact.email}}'}
              <br />
              {'{{contact.phone}}'}
            </div>
          </div>
          <div>
            <strong>{t('panels.sendWebhook.body.system')}</strong>
            <div className="font-mono text-blue-700 dark:text-blue-300">
              {'{{journey.id}}'}
              <br />
              {'{{journey.name}}'}
              <br />
              {'{{now}}'}
              <br />
              {'{{timestamp}}'}
            </div>
          </div>
        </div>
      </div>

      {/* Preview do body */}
      {data.body && (
        <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/30">
          <p className="text-sm text-purple-800 dark:text-purple-200 mb-2">
            <strong>{t('panels.sendWebhook.body.bodyPreview')}</strong>
          </p>
          <pre className="text-xs text-purple-700 dark:text-purple-300 whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
            {data.body}
          </pre>
        </div>
      )}
    </div>
  );
}
