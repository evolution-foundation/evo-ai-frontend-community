import { type DataMapping } from '@/components/journey/environment-manager';
import { type EventProperty } from '@/lib/events-manifest';
import { EventBasicConfig } from './EventBasicConfig';
import { EventAdvancedConfig } from './EventAdvancedConfig';

interface EventConfigurationProps {
  eventName: string;
  eventProperties: EventProperty[];
  onEventNameChange: (name: string) => void;
  onEventPropertiesChange: (properties: EventProperty[]) => void;
  // Optional: only the Flow Builder (JourneyTriggerPanel) gates Save on this.
  // A config is savable as soon as an event is chosen — filters are optional
  // (CRM-519). See EVO-1275.
  onValidityChange?: (valid: boolean) => void;
  variableMappings?: DataMapping[];
  onVariableMappingsChange?: (mappings: DataMapping[]) => void;
  // Optional: in contexts without a journey (e.g. trigger-type Campaigns) it is
  // omitted, so useJourneyVariables skips the fetch and the autocomplete degrades
  // to system variables only — no 404. See EVO-1608.
  journeyId?: string;
}

/**
 * Composes the Básico (selector + properties) and Avançado (Capture Event Data)
 * halves into one stacked block. The Flow Builder's tabbed layout (EVO-1276)
 * consumes <EventBasicConfig> / <EventAdvancedConfig> directly per tab; the
 * Campaigns/Wait (section="all") contexts keep using THIS composed component, so
 * its public signature and visible layout are preserved. The Avançado half renders
 * only when `onVariableMappingsChange` is provided.
 */
export function EventConfiguration({
  eventName,
  eventProperties,
  onEventNameChange,
  onEventPropertiesChange,
  onValidityChange,
  variableMappings = [],
  onVariableMappingsChange,
  journeyId,
}: EventConfigurationProps) {
  return (
    <>
      <EventBasicConfig
        eventName={eventName}
        eventProperties={eventProperties}
        onEventNameChange={onEventNameChange}
        onEventPropertiesChange={onEventPropertiesChange}
        onValidityChange={onValidityChange}
        journeyId={journeyId}
      />

      {/* Mapeamento de Variáveis */}
      {onVariableMappingsChange && (
        <EventAdvancedConfig
          eventProperties={eventProperties}
          variableMappings={variableMappings}
          onVariableMappingsChange={onVariableMappingsChange}
          journeyId={journeyId}
        />
      )}
    </>
  );
}
