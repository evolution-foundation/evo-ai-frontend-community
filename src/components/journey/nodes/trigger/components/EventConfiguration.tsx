import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
} from '@evoapi/design-system';
import { Plus, X } from 'lucide-react';
import { VariableInput, VariableMapping, type DataMapping } from '@/components/journey/environment-manager';
import { useLanguage } from '@/hooks/useLanguage';

interface EventProperty {
  path: string;
  operator: { type: string; value?: any };
}

interface EventConfigurationProps {
  eventName: string;
  eventProperties: EventProperty[];
  onEventNameChange: (name: string) => void;
  onEventPropertiesChange: (properties: EventProperty[]) => void;
  variableMappings?: DataMapping[];
  onVariableMappingsChange?: (mappings: DataMapping[]) => void;
  journeyId: string;
}

const eventTemplates = {
  contact_created: {
    event: 'contact_created',
    properties: [
      { path: 'source', operator: { type: 'Equals', value: '' } },
      { path: 'contact_type', operator: { type: 'Equals', value: 'lead' } },
    ],
  },
  contact_updated: {
    event: 'contact_updated',
    properties: [
      { path: 'changeCount', operator: { type: 'GreaterThanOrEqual', value: '1' } },
      { path: 'changedFields', operator: { type: 'Contains', value: '' } },
    ],
  },
  message_created: {
    event: 'message_created',
    properties: [
      { path: 'message_type', operator: { type: 'Equals', value: 'incoming' } },
      { path: 'content_type', operator: { type: 'Equals', value: 'text' } },
    ],
  },
  button_clicked: {
    event: 'button_clicked',
    properties: [
      { path: 'button_id', operator: { type: 'Equals', value: '' } },
      { path: 'page_url', operator: { type: 'Contains', value: '' } },
    ],
  },
  page_viewed: {
    event: 'page_viewed',
    properties: [
      { path: 'page_url', operator: { type: 'Equals', value: '' } },
      { path: 'page_title', operator: { type: 'Contains', value: '' } },
    ],
  },
  form_submitted: {
    event: 'form_submitted',
    properties: [
      { path: 'form_id', operator: { type: 'Equals', value: '' } },
      { path: 'form_name', operator: { type: 'Equals', value: '' } },
    ],
  },
  product_purchased: {
    event: 'product_purchased',
    properties: [
      { path: 'product_id', operator: { type: 'Equals', value: '' } },
      { path: 'price', operator: { type: 'GreaterThan', value: '0' } },
    ],
  },
};

export function EventConfiguration({
  eventName,
  eventProperties,
  onEventNameChange,
  onEventPropertiesChange,
  variableMappings = [],
  onVariableMappingsChange,
  journeyId,
}: EventConfigurationProps) {
  const { t } = useLanguage('journey');
  // Gerar paths dinamicamente baseado nas propriedades configuradas
  const generateEventPaths = () => {
    const basePaths = ['event.id', 'event.name', 'event.timestamp', 'event.user_id'];

    // Adicionar propriedades configuradas
    const propertyPaths = eventProperties
      .filter(prop => prop.path && prop.path.trim())
      .map(prop => `event.properties.${prop.path}`);

    return [...basePaths, ...propertyPaths];
  };
  const applyEventTemplate = (templateKey: string) => {
    const template = eventTemplates[templateKey as keyof typeof eventTemplates];
    if (template) {
      onEventNameChange(template.event);
      onEventPropertiesChange(template.properties);
    }
  };

  const addEventProperty = () => {
    const newProperty = { path: '', operator: { type: 'Equals', value: '' } };
    onEventPropertiesChange([...eventProperties, newProperty]);
  };

  const removeEventProperty = (index: number) => {
    onEventPropertiesChange(eventProperties.filter((_, i) => i !== index));
  };

  const updateEventProperty = (index: number, property: EventProperty) => {
    const updated = [...eventProperties];
    updated[index] = property;
    onEventPropertiesChange(updated);
  };

  return (
    <>
      <Separator />
      <div className="space-y-4">
        <Label className="text-sidebar-foreground font-medium">
          {t('triggerComponents.event.configuration')}
        </Label>

        {/* Nome do evento */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t('triggerComponents.event.eventName')}</Label>
          <div className="flex gap-2">
            <VariableInput
              value={eventName || ''}
              onChange={e => onEventNameChange(e.target.value)}
              placeholder={t('triggerComponents.event.eventNamePlaceholder')}
              className="flex-1 bg-sidebar border-sidebar-border text-sidebar-foreground"
              journeyId={journeyId}
              onVariableInsert={variable => {
                console.log('Variable inserted in event name:', variable);
              }}
            />
            <Select
              value=""
              onValueChange={templateKey => {
                if (templateKey) {
                  applyEventTemplate(templateKey);
                }
              }}
            >
              <SelectTrigger className="w-48 bg-sidebar border-sidebar-border text-sidebar-foreground">
                <SelectValue placeholder={t('triggerComponents.event.templates')} />
              </SelectTrigger>
              <SelectContent className="bg-sidebar border-sidebar-border">
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                  {t('triggerComponents.event.contactEvents')}
                </div>
                <SelectItem value="contact_created" className="text-sidebar-foreground">
                  {t('triggerComponents.event.contactCreated')}
                </SelectItem>
                <SelectItem value="contact_updated" className="text-sidebar-foreground">
                  {t('triggerComponents.event.contactUpdated')}
                </SelectItem>

                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                  {t('triggerComponents.event.messageEvents')}
                </div>
                <SelectItem value="message_created" className="text-sidebar-foreground">
                  {t('triggerComponents.event.messageCreated')}
                </SelectItem>

                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                  {t('triggerComponents.event.customEvents')}
                </div>
                <SelectItem value="button_clicked" className="text-sidebar-foreground">
                  {t('triggerComponents.event.buttonClicked')}
                </SelectItem>
                <SelectItem value="page_viewed" className="text-sidebar-foreground">
                  {t('triggerComponents.event.pageViewed')}
                </SelectItem>
                <SelectItem value="form_submitted" className="text-sidebar-foreground">
                  {t('triggerComponents.event.formSubmitted')}
                </SelectItem>
                <SelectItem value="product_purchased" className="text-sidebar-foreground">
                  {t('triggerComponents.event.productPurchased')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Propriedades do evento */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sidebar-foreground font-medium text-sm">
              {t('triggerComponents.event.eventProperties')}
            </Label>
            <Button
              size="sm"
              variant="outline"
              onClick={addEventProperty}
              className="h-8 px-3 text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              {t('triggerComponents.event.addProperty')}
            </Button>
          </div>

          {eventProperties.length === 0 ? (
            <div className="p-4 rounded-lg bg-sidebar-accent/20 border border-sidebar-border/50">
              <p className="text-sm text-sidebar-foreground/70 text-center">
                {t('triggerComponents.event.noPropertiesConfigured')}
                <br />
                {t('triggerComponents.event.triggerForAnyOccurrence')}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {eventProperties.map((property, index) => (
                <div key={index} className="p-3 rounded-lg bg-sidebar border border-sidebar-border">
                  <div className="flex items-center gap-2">
                    <VariableInput
                      placeholder={t('triggerComponents.event.property')}
                      value={property.path}
                      onChange={e =>
                        updateEventProperty(index, {
                          ...property,
                          path: e.target.value,
                        })
                      }
                      className="flex-1 bg-sidebar-accent border-sidebar-border text-sidebar-foreground"
                      journeyId={journeyId}
                      onVariableInsert={variable => {
                        console.log('Variable inserted in property path:', variable);
                      }}
                    />
                    <Select
                      value={property.operator.type}
                      onValueChange={value =>
                        updateEventProperty(index, {
                          ...property,
                          operator: { ...property.operator, type: value },
                        })
                      }
                    >
                      <SelectTrigger className="w-32 bg-sidebar-accent border-sidebar-border text-sidebar-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-sidebar border-sidebar-border">
                        <SelectItem value="Equals" className="text-sidebar-foreground">
                          {t('triggerComponents.operators.equals')}
                        </SelectItem>
                        <SelectItem value="NotEquals" className="text-sidebar-foreground">
                          {t('triggerComponents.operators.not_equals')}
                        </SelectItem>
                        <SelectItem value="Contains" className="text-sidebar-foreground">
                          {t('triggerComponents.operators.contains')}
                        </SelectItem>
                        <SelectItem value="GreaterThan" className="text-sidebar-foreground">
                          {t('triggerComponents.operators.greater_than')}
                        </SelectItem>
                        <SelectItem value="LessThan" className="text-sidebar-foreground">
                          {t('triggerComponents.operators.less_than')}
                        </SelectItem>
                        <SelectItem value="Exists" className="text-sidebar-foreground">
                          {t('triggerComponents.operators.exists')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {property.operator.type !== 'Exists' && (
                      <VariableInput
                        placeholder={t('triggerComponents.event.value')}
                        value={property.operator.value || ''}
                        onChange={e =>
                          updateEventProperty(index, {
                            ...property,
                            operator: { ...property.operator, value: e.target.value },
                          })
                        }
                        className="flex-1 bg-sidebar-accent border-sidebar-border text-sidebar-foreground"
                        journeyId={journeyId}
                        onVariableInsert={variable => {
                          console.log('Variable inserted in property value:', variable);
                        }}
                      />
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeEventProperty(index)}
                      className="h-7 w-7 p-0 text-sidebar-foreground/60 hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mapeamento de Variáveis */}
      {onVariableMappingsChange && (
        <>
          <Separator />
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              {t('triggerComponents.event.captureEventData')}
            </Label>
            <VariableMapping
              mappings={variableMappings}
              onMappingsChange={onVariableMappingsChange}
              paths={generateEventPaths()}
              journeyId={journeyId}
              className="bg-white dark:bg-gray-900/50 p-4 rounded-lg border"
            />
          </div>
        </>
      )}
    </>
  );
}
