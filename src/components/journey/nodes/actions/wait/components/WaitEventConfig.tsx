import { useState, useEffect } from 'react';
import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  Checkbox,
} from '@evoapi/design-system';
import { WaitNodeData } from '../WaitNode';
import {
  EventConfiguration,
  SegmentConfiguration,
  ContactConfiguration,
  LabelConfiguration,
  CustomAttributeConfiguration,
  WebhookConfiguration,
} from '../../../trigger/components';
import { useLanguage } from '@/hooks/useLanguage';

interface WaitEventConfigProps {
  data: WaitNodeData;
  onChange: (updates: Partial<WaitNodeData>) => void;
  journeyId: string;
}

export function WaitEventConfig({ data, onChange, journeyId }: WaitEventConfigProps) {
  const { t } = useLanguage('journey');
  const [eventType, setEventType] = useState(data.eventType || 'event');

  const EVENT_TYPE_OPTIONS = [
    { value: 'event', label: t('panels.waitComponents.event.types.event') },
    { value: 'segment', label: t('panels.waitComponents.event.types.segment') },
    { value: 'contactCreated', label: t('panels.waitComponents.event.types.contactCreated') },
    { value: 'contactUpdated', label: t('panels.waitComponents.event.types.contactUpdated') },
    { value: 'label', label: t('panels.waitComponents.event.types.label') },
    { value: 'customAttribute', label: t('panels.waitComponents.event.types.customAttribute') },
    { value: 'webhook', label: t('panels.waitComponents.event.types.webhook') },
  ];

  const TIME_UNIT_OPTIONS = [
    { value: 'minutes', label: t('panels.waitComponents.shared.timeUnits.minutes') },
    { value: 'hours', label: t('panels.waitComponents.shared.timeUnits.hours') },
    { value: 'days', label: t('panels.waitComponents.shared.timeUnits.days') },
  ];

  // Garantir que eventType seja sempre definido
  useEffect(() => {
    if (!data.eventType) {
      onChange({ eventType: 'event' });
    }
  }, [data.eventType, onChange]);

  const handleEventTypeChange = (value: string) => {
    setEventType(value);
    onChange({
      eventType: value,
      // Limpar dados específicos quando muda o tipo
      eventTemplate: undefined,
      eventProperties: undefined,
      segmentId: undefined,
      segmentAction: undefined,
      labelId: undefined,
      labelAction: undefined,
      attributeName: undefined,
      attributeOperator: undefined,
      attributeValue: undefined,
      webhookUrl: undefined,
      webhookHeaders: undefined,
    });
  };

  const handleFallbackChange = (checked: boolean) => {
    if (checked) {
      onChange({
        enableFallback: checked,
        fallbackTime: data.fallbackTime || 1,
        fallbackUnit: data.fallbackUnit || 'hours',
      });
    } else {
      onChange({
        enableFallback: checked,
        fallbackTime: undefined,
        fallbackUnit: undefined,
      });
    }
  };

  const handleFallbackTimeChange = (value: string) => {
    const fallbackTime = parseInt(value) || 1;
    onChange({ fallbackTime });
  };

  const handleFallbackUnitChange = (value: 'minutes' | 'hours' | 'days') => {
    onChange({ fallbackUnit: value });
  };

  const getEventSummary = () => {
    if (!eventType) return t('panels.waitComponents.event.selectEventType');

    const typeOption = EVENT_TYPE_OPTIONS.find(t => t.value === eventType);
    let summary = typeOption?.label || eventType;

    switch (eventType) {
      case 'event':
        if (data.eventTemplate) summary += `: ${data.eventTemplate}`;
        break;
      case 'segment':
        if (data.segmentId) summary += `: ${data.segmentId}`;
        break;
      case 'label':
        if (data.labelId) summary += `: ${data.labelId}`;
        break;
      case 'customAttribute':
        if (data.attributeName) summary += `: ${data.attributeName}`;
        break;
      case 'webhook':
        if (data.webhookUrl) summary += `: ${data.webhookUrl}`;
        break;
    }

    return summary;
  };

  const renderEventConfiguration = () => {
    switch (eventType) {
      case 'event':
        return (
          <EventConfiguration
            eventName={data.eventTemplate || ''}
            eventProperties={data.eventProperties || []}
            onEventNameChange={name => onChange({ eventTemplate: name })}
            onEventPropertiesChange={properties => onChange({ eventProperties: properties })}
            variableMappings={data.variableMappings || []}
            onVariableMappingsChange={mappings => onChange({ variableMappings: mappings })}
            journeyId={journeyId}
          />
        );
      case 'segment':
        return (
          <SegmentConfiguration
            segmentId={data.segmentId || ''}
            segmentAction={data.segmentAction || 'entered'}
            onSegmentIdChange={segmentId => onChange({ segmentId })}
            onSegmentActionChange={action => onChange({ segmentAction: action })}
          />
        );
      case 'contactCreated':
      case 'contactUpdated':
        return (
          <ContactConfiguration
            triggerType={eventType as 'contactCreated' | 'contactUpdated'}
            contactFields={(data.contactFields || []).map(field => ({
              field: field.field || '',
              operator: field.operator || 'equals',
              value: field.value || '',
            }))}
            onContactFieldsChange={fields => onChange({ contactFields: fields as any })}
            variableMappings={data.variableMappings || []}
            onVariableMappingsChange={mappings => onChange({ variableMappings: mappings })}
            journeyId={journeyId}
          />
        );
      case 'label':
        return (
          <LabelConfiguration
            labelId={data.labelId || ''}
            labelAction={data.labelAction || 'applied'}
            onLabelIdChange={labelId => onChange({ labelId })}
            onLabelActionChange={action => onChange({ labelAction: action })}
          />
        );
      case 'customAttribute':
        return (
          <CustomAttributeConfiguration
            attributeName={data.attributeName || ''}
            operator={data.attributeOperator || 'equals'}
            value={data.attributeValue || ''}
            onAttributeNameChange={name => onChange({ attributeName: name })}
            onOperatorChange={operator => onChange({ attributeOperator: operator })}
            onValueChange={value => onChange({ attributeValue: value })}
            variableMappings={data.variableMappings || []}
            onVariableMappingsChange={mappings => onChange({ variableMappings: mappings })}
            journeyId={journeyId}
          />
        );
      case 'webhook':
        return (
          <WebhookConfiguration
            webhookUrl={data.webhookUrl || ''}
            expectedHeaders={(data.webhookHeaders || []) as any}
            onWebhookUrlChange={url => onChange({ webhookUrl: url })}
            onExpectedHeadersChange={headers =>
              onChange({
                webhookHeaders: headers as any,
              })
            }
            variableMappings={data.variableMappings || []}
            onVariableMappingsChange={mappings => onChange({ variableMappings: mappings })}
            journeyId={journeyId}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Seletor de Tipo */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">{t('panels.waitComponents.event.typeLabel')}</Label>
        <Select value={eventType} onValueChange={handleEventTypeChange}>
          <SelectTrigger className="w-full bg-sidebar border-sidebar-border text-sidebar-foreground">
            <SelectValue placeholder={t('panels.waitComponents.event.selectTypePlaceholder')} />
          </SelectTrigger>
          <SelectContent className="bg-sidebar border-sidebar-border">
            {EVENT_TYPE_OPTIONS.map(option => (
              <SelectItem
                key={option.value}
                value={option.value}
                className="text-sidebar-foreground"
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Configuração específica do tipo */}
      {eventType && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">
            {t('panels.waitComponents.event.configurationLabel')} -{' '}
            {EVENT_TYPE_OPTIONS.find(t => t.value === eventType)?.label}
          </Label>
          {renderEventConfiguration()}
        </div>
      )}

      {/* Caso contrário (substituindo o timeout antigo) */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="fallback"
            checked={data.enableFallback || false}
            onCheckedChange={handleFallbackChange}
          />
          <Label htmlFor="fallback" className="text-sm font-medium">
            {t('panels.waitComponents.event.fallbackLabel')}
          </Label>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 pl-6">
          {t('panels.waitComponents.event.fallbackDescription')}
        </p>

        {data.enableFallback && (
          <div className="grid grid-cols-2 gap-3 pl-6">
            <div className="space-y-2">
              <Label className="text-xs">
                {t('panels.waitComponents.event.fallbackTimeLabel')}
              </Label>
              <Input
                type="number"
                min="1"
                value={data.fallbackTime || 1}
                onChange={e => handleFallbackTimeChange(e.target.value)}
                placeholder={t('panels.waitComponents.event.fallbackTimePlaceholder')}
                className="bg-sidebar border-sidebar-border text-sidebar-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">
                {t('panels.waitComponents.event.fallbackUnitLabel')}
              </Label>
              <Select value={data.fallbackUnit || 'hours'} onValueChange={handleFallbackUnitChange}>
                <SelectTrigger className="bg-sidebar border-sidebar-border text-sidebar-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-sidebar border-sidebar-border">
                  {TIME_UNIT_OPTIONS.map(option => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className="text-sidebar-foreground"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/30">
        <p className="text-sm text-green-800 dark:text-green-200">
          <strong>{t('panels.waitComponents.event.summaryLabel')}:</strong>{' '}
          {t('panels.waitComponents.event.summaryText', { event: getEventSummary() })}.
          {data.enableFallback && data.fallbackTime && data.fallbackUnit && (
            <>
              {' '}
              {t('panels.waitComponents.event.fallbackSummary', {
                time: data.fallbackTime,
                unit:
                  data.fallbackUnit === 'minutes'
                    ? t('panels.waitComponents.shared.timeUnits.minutes')
                    : data.fallbackUnit === 'hours'
                    ? t('panels.waitComponents.shared.timeUnits.hours')
                    : t('panels.waitComponents.shared.timeUnits.days'),
              })}
              .
            </>
          )}
        </p>
      </div>
    </div>
  );
}
