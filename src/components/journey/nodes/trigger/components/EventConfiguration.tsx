import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Label,
  Separator,
} from '@evoapi/design-system';
import { VariableInput, VariableMapping, type DataMapping } from '@/components/journey/environment-manager';
import { EventSelector } from '@/components/journey/shared/EventSelector';
import { EventPropertiesForm } from '@/components/journey/shared/EventPropertiesForm';
import {
  getEvent,
  resolveLegacyEventName,
  propertiesToRecord,
  recordToProperties,
  validateEventProperties,
  preserveCompatibleValues,
  type EventProperty,
} from '@/lib/events-manifest';
import { useLanguage } from '@/hooks/useLanguage';

interface EventConfigurationProps {
  eventName: string;
  eventProperties: EventProperty[];
  onEventNameChange: (name: string) => void;
  onEventPropertiesChange: (properties: EventProperty[]) => void;
  // Optional: only the Flow Builder (JourneyTriggerPanel) gates Save on this.
  // Campaigns/Wait omit it and rely on the inline required-field indicators
  // <EventPropertiesForm> renders. See EVO-1275.
  onValidityChange?: (valid: boolean) => void;
  variableMappings?: DataMapping[];
  onVariableMappingsChange?: (mappings: DataMapping[]) => void;
  // Optional: in contexts without a journey (e.g. trigger-type Campaigns) it is
  // omitted, so useJourneyVariables skips the fetch and the autocomplete degrades
  // to system variables only — no 404. See EVO-1608.
  journeyId?: string;
}

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
  const { t } = useLanguage('journey');

  // selectorValue tracks which dropdown entry is rendered as selected
  // (canonical event name OR the literal 'custom' placeholder); customName
  // holds the free-text typed value when the user is in custom mode. The
  // persisted `eventName` prop stays as the canonical name OR the custom
  // string the user typed — never the literal 'custom'.
  const [selectorValue, setSelectorValue] = useState<string>(
    () => resolveLegacyEventName(eventName).selectorValue,
  );
  const [customName, setCustomName] = useState<string>(
    () => resolveLegacyEventName(eventName).customName ?? '',
  );

  // Skip the re-derive effect when the prop is just echoing back our own
  // onEventNameChange call. Without this, typing a name in the custom
  // input that happens to be canonical would yank the user out of custom
  // mode mid-keystroke.
  const lastPushedRef = useRef<string>(eventName);

  useEffect(() => {
    if (lastPushedRef.current === eventName) return;
    const resolved = resolveLegacyEventName(eventName);
    setSelectorValue(resolved.selectorValue);
    setCustomName(resolved.customName ?? '');
    lastPushedRef.current = eventName;
  }, [eventName]);

  const isCustomMode = selectorValue === 'custom';
  // The event identity the schema form reasons about: 'custom' in custom mode,
  // otherwise the canonical selector value.
  const formEventName = isCustomMode ? 'custom' : selectorValue;

  // Option A bridge: the persisted shape stays the filter-condition array;
  // derive the flat Record the form consumes WITHOUT mutating the source.
  const record = useMemo(() => propertiesToRecord(eventProperties), [eventProperties]);

  const canonicalDescription =
    !isCustomMode && selectorValue ? getEvent(selectorValue)?.description : undefined;

  const generateEventPaths = () => {
    const basePaths = ['event.id', 'event.name', 'event.timestamp', 'event.user_id'];
    const propertyPaths = Object.keys(record).map((key) => `event.properties.${key}`);
    return [...basePaths, ...propertyPaths];
  };

  // Emit validity to opted-in consumers, but only when it actually flips so we
  // don't churn the parent's state on every keystroke.
  const lastValidityRef = useRef<boolean | null>(null);
  useEffect(() => {
    // An event trigger with no event chosen yet is not a savable config — treat
    // the empty selection as invalid (formEventName === selectorValue, which is
    // '' until something is picked; 'custom' once Custom is selected).
    const valid =
      formEventName === '' ? false : validateEventProperties(formEventName, record).valid;
    if (lastValidityRef.current !== valid) {
      lastValidityRef.current = valid;
      onValidityChange?.(valid);
    }
  }, [formEventName, record, onValidityChange]);

  // Pending event switch awaiting the user's preserve/clear decision.
  const [pendingSwitch, setPendingSwitch] = useState<{ from: string; to: string } | null>(null);

  const handleSelectorChange = ({ eventName: picked, isCustom }: { eventName: string; isCustom: boolean }) => {
    const prevFormEvent = formEventName;
    const nextFormEvent = isCustom ? 'custom' : picked;

    // The event NAME (and selector) updates immediately so the schema reflects
    // the new event; the properties decision is deferred to the confirm dialog.
    if (isCustom) {
      setSelectorValue('custom');
      lastPushedRef.current = customName;
      onEventNameChange(customName);
    } else {
      setSelectorValue(picked);
      setCustomName('');
      lastPushedRef.current = picked;
      onEventNameChange(picked);
    }

    const identityChanged = prevFormEvent !== nextFormEvent;
    const hasValues = Object.keys(record).length > 0;
    if (identityChanged && hasValues) {
      setPendingSwitch({ from: prevFormEvent, to: nextFormEvent });
    }
  };

  const handleCustomNameChange = (next: string) => {
    setCustomName(next);
    lastPushedRef.current = next;
    onEventNameChange(next);
  };

  const handlePropertiesRecordChange = (next: Record<string, unknown>) => {
    onEventPropertiesChange(recordToProperties(next, eventProperties));
  };

  const handlePreserveValues = () => {
    if (pendingSwitch) {
      const kept = preserveCompatibleValues(record, pendingSwitch.from, pendingSwitch.to);
      onEventPropertiesChange(recordToProperties(kept, eventProperties));
    }
    setPendingSwitch(null);
  };

  const handleClearValues = () => {
    onEventPropertiesChange([]);
    setPendingSwitch(null);
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
          <EventSelector
            value={selectorValue || undefined}
            onChange={handleSelectorChange}
            className="bg-sidebar border-sidebar-border text-sidebar-foreground"
          />
          {canonicalDescription && (
            <p className="text-xs text-muted-foreground">{canonicalDescription}</p>
          )}
          {isCustomMode && (
            <div className="space-y-2 pt-1">
              <Label htmlFor="custom-event-name" className="text-sm font-medium">
                {t('triggerComponents.event.eventName')}
              </Label>
              <VariableInput
                id="custom-event-name"
                value={customName}
                onChange={e => handleCustomNameChange(e.target.value)}
                placeholder={t('triggerComponents.event.customEventNamePlaceholder')}
                className="bg-sidebar border-sidebar-border text-sidebar-foreground"
                journeyId={journeyId}
              />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                {t('triggerComponents.event.customEventWarning')}
              </p>
            </div>
          )}
        </div>

        {/* Propriedades do evento */}
        <div className="space-y-3">
          <Label className="text-sidebar-foreground font-medium text-sm">
            {t('triggerComponents.event.eventProperties')}
          </Label>
          <EventPropertiesForm
            eventName={formEventName}
            value={record}
            onChange={handlePropertiesRecordChange}
          />
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

      {/* Preserve-compatible-values confirm on event switch */}
      <AlertDialog
        open={pendingSwitch !== null}
        onOpenChange={open => {
          // Dismissing (Esc) without an explicit choice would otherwise strand
          // the newly-selected event with the previous event's values (incl.
          // keys absent from the new schema). Default a dismiss to the safe
          // Clear. Explicit Preserve/Clear close via state, not onOpenChange.
          if (!open) handleClearValues();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('triggerComponents.event.eventSwitch.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('triggerComponents.event.eventSwitch.body')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={handleClearValues}>
              {t('triggerComponents.event.eventSwitch.clear')}
            </Button>
            <Button onClick={handlePreserveValues}>
              {t('triggerComponents.event.eventSwitch.preserve')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
