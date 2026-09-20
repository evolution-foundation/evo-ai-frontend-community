import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@evoapi/design-system';
import { Plus, X } from 'lucide-react';
import { WebhookBodyField, WebhookBodyValueType } from '../SendWebhookNode';
import { VariableInput } from '@/components/journey/environment-manager';
import { useLanguage } from '@/hooks/useLanguage';
import { newBodyField, StructuredBodyType } from './webhookBody';

interface WebhookBodyBuilderProps {
  fields: WebhookBodyField[];
  bodyType: StructuredBodyType;
  onChange: (fields: WebhookBodyField[]) => void;
  journeyId: string;
}

const VALUE_TYPES: WebhookBodyValueType[] = ['string', 'number', 'boolean'];

export function WebhookBodyBuilder({ fields, bodyType, onChange, journeyId }: WebhookBodyBuilderProps) {
  const { t } = useLanguage('journey');
  const showTypeColumn = bodyType === 'json';

  const addField = () => onChange([...fields, newBodyField()]);

  const updateField = (id: string, updates: Partial<WebhookBodyField>) =>
    onChange(fields.map(field => (field.id === id ? { ...field, ...updates } : field)));

  const removeField = (id: string) => onChange(fields.filter(field => field.id !== id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label id="send-webhook-body-fields-label" className="text-sm font-medium">
          {t('panels.sendWebhook.body.bodyContent')}
        </Label>
        <Button variant="outline" size="sm" onClick={addField}>
          <Plus className="w-4 h-4 mr-1" />
          {t('panels.sendWebhook.body.builder.addField')}
        </Button>
      </div>

      <div className="space-y-3" role="group" aria-labelledby="send-webhook-body-fields-label">
        {fields.length === 0 ? (
          <div className="p-4 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 dark:bg-gray-950/20 text-center">
            <p className="text-sm text-gray-500">{t('panels.sendWebhook.body.builder.noFields')}</p>
          </div>
        ) : (
          fields.map(field => (
            <div key={field.id} className="p-3 border rounded-lg bg-sidebar-accent/10">
              <div className="grid grid-cols-12 gap-3 items-end">
                {/* Key */}
                <div className={showTypeColumn ? 'col-span-4' : 'col-span-5'}>
                  <Label htmlFor={`send-webhook-body-key-${field.id}`} className="text-xs">
                    {t('panels.sendWebhook.body.builder.keyLabel')}
                  </Label>
                  <VariableInput
                    id={`send-webhook-body-key-${field.id}`}
                    value={field.key}
                    onChange={e => updateField(field.id, { key: e.target.value })}
                    placeholder={t('panels.sendWebhook.body.builder.keyPlaceholder')}
                    className="bg-sidebar border-sidebar-border text-sidebar-foreground"
                    journeyId={journeyId}
                  />
                </div>

                {/* Value */}
                <div className={showTypeColumn ? 'col-span-4' : 'col-span-6'}>
                  <Label htmlFor={`send-webhook-body-value-${field.id}`} className="text-xs">
                    {t('panels.sendWebhook.body.builder.valueLabel')}
                  </Label>
                  <VariableInput
                    id={`send-webhook-body-value-${field.id}`}
                    value={field.value}
                    onChange={e => updateField(field.id, { value: e.target.value })}
                    placeholder={t('panels.sendWebhook.body.builder.valuePlaceholder')}
                    className="bg-sidebar border-sidebar-border text-sidebar-foreground"
                    journeyId={journeyId}
                  />
                </div>

                {/* Type (JSON only) */}
                {showTypeColumn && (
                  <div className="col-span-3">
                    <Label htmlFor={`send-webhook-body-type-${field.id}`} className="text-xs">
                      {t('panels.sendWebhook.body.builder.typeLabel')}
                    </Label>
                    <Select
                      value={field.type}
                      onValueChange={(value: WebhookBodyValueType) => updateField(field.id, { type: value })}
                    >
                      <SelectTrigger
                        id={`send-webhook-body-type-${field.id}`}
                        className="bg-sidebar border-sidebar-border text-sidebar-foreground"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-sidebar border-sidebar-border">
                        {VALUE_TYPES.map(type => (
                          <SelectItem key={type} value={type} className="text-sidebar-foreground">
                            {t(`panels.sendWebhook.body.builder.types.${type}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Remove */}
                <div className="col-span-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeField(field.id)}
                    aria-label={t('panels.sendWebhook.body.builder.removeField')}
                    className="h-10 w-full p-0 text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
