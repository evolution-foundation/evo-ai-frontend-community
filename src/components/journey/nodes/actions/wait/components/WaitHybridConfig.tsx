import { useState } from 'react';
import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@evoapi/design-system';
import { WaitNodeData } from '../WaitNode';
import { WaitEventConfig } from './WaitEventConfig';
import { WaitConditionConfig } from './WaitConditionConfig';
import { VariableInput } from '@/components/journey/environment-manager';
import { useLanguage } from '@/hooks/useLanguage';

interface WaitHybridConfigProps {
  data: WaitNodeData;
  onChange: (updates: Partial<WaitNodeData>) => void;
  journeyId: string;
}

export function WaitHybridConfig({ data, onChange, journeyId }: WaitHybridConfigProps) {
  const { t } = useLanguage('journey');
  const [triggerType, setTriggerType] = useState<'event' | 'condition'>(
    data.eventTemplate ? 'event' : 'condition',
  );

  const TIME_UNIT_OPTIONS = [
    { value: 'minutes', label: t('panels.waitComponents.shared.timeUnits.minutes') },
    { value: 'hours', label: t('panels.waitComponents.shared.timeUnits.hours') },
    { value: 'days', label: t('panels.waitComponents.shared.timeUnits.days') },
  ];

  const handleMaxWaitTimeChange = (value: string) => {
    const maxWaitTime = parseInt(value) || 1;
    onChange({ maxWaitTime });
  };

  const handleMaxWaitUnitChange = (value: 'minutes' | 'hours' | 'days') => {
    onChange({ maxWaitUnit: value });
  };

  const handleTriggerTypeChange = (type: 'event' | 'condition') => {
    setTriggerType(type);

    // Limpar dados do tipo anterior
    if (type === 'event') {
      onChange({
        conditionType: undefined,
        conditionField: undefined,
        conditionOperator: undefined,
        conditionValue: undefined,
      });
    } else {
      onChange({
        eventTemplate: undefined,
        eventProperties: undefined,
      });
    }
  };

  const getTriggerSummary = () => {
    if (triggerType === 'event') {
      if (!data.eventType) return t('panels.waitComponents.hybrid.configureEvent');
      const eventTypeLabels: Record<string, string> = {
        event: t('panels.waitComponents.event.types.event'),
        segment: t('panels.waitComponents.event.types.segment'),
        contactCreated: t('panels.waitComponents.event.types.contactCreated'),
        contactUpdated: t('panels.waitComponents.event.types.contactUpdated'),
        label: t('panels.waitComponents.event.types.label'),
        customAttribute: t('panels.waitComponents.event.types.customAttribute'),
        webhook: t('panels.waitComponents.event.types.webhook'),
      };
      return eventTypeLabels[data.eventType] || data.eventType;
    } else if (triggerType === 'condition' && data.conditionField) {
      return t('panels.waitComponents.hybrid.conditionSummary', { field: data.conditionField });
    }
    return t('panels.waitComponents.hybrid.configureTrigger');
  };

  const getTimeSummary = () => {
    if (data.maxWaitTime && data.maxWaitUnit) {
      const unit =
        data.maxWaitTime === 1
          ? data.maxWaitUnit === 'minutes'
            ? t('panels.waitComponents.shared.timeUnitsSingular.minute')
            : data.maxWaitUnit === 'hours'
            ? t('panels.waitComponents.shared.timeUnitsSingular.hour')
            : t('panels.waitComponents.shared.timeUnitsSingular.day')
          : data.maxWaitUnit === 'minutes'
          ? t('panels.waitComponents.shared.timeUnits.minutes')
          : data.maxWaitUnit === 'hours'
          ? t('panels.waitComponents.shared.timeUnits.hours')
          : t('panels.waitComponents.shared.timeUnits.days');
      return `${data.maxWaitTime} ${unit}`;
    }
    return t('panels.waitComponents.hybrid.configureMaxTime');
  };

  return (
    <div className="space-y-4">
      {/* Tempo Máximo de Espera (obrigatório) */}
      <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/30">
        <Label className="text-sm font-medium text-purple-800 dark:text-purple-200 mb-3 block">
          {t('panels.waitComponents.hybrid.maxWaitTimeLabel')}
        </Label>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs">{t('panels.waitComponents.hybrid.timeLabel')}</Label>
            <VariableInput
              type="number"
              min="1"
              value={data.maxWaitTime?.toString() || '1'}
              onChange={e => handleMaxWaitTimeChange(e.target.value)}
              placeholder={t('panels.waitComponents.hybrid.timePlaceholder')}
              className="bg-sidebar border-sidebar-border text-sidebar-foreground"
              journeyId={journeyId}
              onVariableInsert={variable => {
                console.log('Variable inserted in hybrid max wait time:', variable);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">{t('panels.waitComponents.hybrid.unitLabel')}</Label>
            <Select value={data.maxWaitUnit || 'hours'} onValueChange={handleMaxWaitUnitChange}>
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
      </div>

      {/* Condição ou Evento */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          {t('panels.waitComponents.hybrid.stopConditionLabel')}
        </Label>

        <Tabs
          value={triggerType}
          onValueChange={(value: string) => handleTriggerTypeChange(value as 'event' | 'condition')}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="event">{t('panels.waitComponents.hybrid.tabs.event')}</TabsTrigger>
            <TabsTrigger value="condition">
              {t('panels.waitComponents.hybrid.tabs.condition')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="event" className="mt-4">
            <WaitEventConfig
              data={{ ...data, hasTimeout: false }} // Remove timeout pois já está configurado acima
              onChange={onChange}
              journeyId={journeyId}
            />
          </TabsContent>

          <TabsContent value="condition" className="mt-4">
            <WaitConditionConfig
              data={{ ...data, hasTimeout: false }} // Remove timeout pois já está configurado acima
              onChange={onChange}
              journeyId={journeyId}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Preview */}
      <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/30">
        <p className="text-sm text-purple-800 dark:text-purple-200">
          <strong>{t('panels.waitComponents.hybrid.summaryLabel')}:</strong>{' '}
          {t('panels.waitComponents.hybrid.summaryText', {
            time: getTimeSummary(),
            trigger: getTriggerSummary(),
          })}
        </p>

        <div className="mt-2 text-xs text-purple-600 dark:text-purple-400">
          {t('panels.waitComponents.hybrid.pathDescription1')}
          <br />
          {t('panels.waitComponents.hybrid.pathDescription2')}
        </div>
      </div>
    </div>
  );
}
