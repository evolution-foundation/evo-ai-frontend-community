import { useMemo } from 'react';
import { Label, Separator } from '@evoapi/design-system';
import { VariableMapping, type DataMapping } from '@/components/journey/environment-manager';
import { propertiesToRecord, type EventProperty } from '@/lib/events-manifest';
import { useLanguage } from '@/hooks/useLanguage';

export interface EventAdvancedConfigProps {
  eventProperties: EventProperty[];
  variableMappings: DataMapping[];
  onVariableMappingsChange: (mappings: DataMapping[]) => void;
  journeyId?: string;
}

/**
 * Avançado half of the event trigger config (EVO-1276): the "Capture Event Data"
 * <VariableMapping> block. Stateless — it derives the available autocomplete
 * `paths` from the lifted `eventProperties` and round-trips mappings through the
 * parent. Extracted from EventConfiguration so the Avançado tab can render it
 * without re-mounting the stateful selector that lives in EventBasicConfig.
 */
export function EventAdvancedConfig({
  eventProperties,
  variableMappings,
  onVariableMappingsChange,
  journeyId,
}: EventAdvancedConfigProps) {
  const { t } = useLanguage('journey');

  const paths = useMemo(() => {
    const basePaths = ['event.id', 'event.name', 'event.timestamp', 'event.user_id'];
    const record = propertiesToRecord(eventProperties);
    const propertyPaths = Object.keys(record).map((key) => `event.properties.${key}`);
    return [...basePaths, ...propertyPaths];
  }, [eventProperties]);

  return (
    <>
      <Separator />
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          {t('triggerComponents.event.captureEventData')}
        </Label>
        <VariableMapping
          mappings={variableMappings}
          onMappingsChange={onVariableMappingsChange}
          paths={paths}
          journeyId={journeyId}
          className="bg-white dark:bg-gray-900/50 p-4 rounded-lg border"
        />
      </div>
    </>
  );
}
