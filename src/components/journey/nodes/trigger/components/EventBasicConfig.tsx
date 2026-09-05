import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Label } from '@evoapi/design-system';
import { VariableInput } from '@/components/journey/environment-manager';
import { EventSelector } from '@/components/journey/shared/EventSelector';
import { EventPropertiesForm } from '@/components/journey/shared/EventPropertiesForm';
import {
  getEvent,
  resolveLegacyEventName,
  propertiesToRecord,
  recordToProperties,
  preserveCompatibleValues,
  type EventProperty,
} from '@/lib/events-manifest';
import { useLanguage } from '@/hooks/useLanguage';

export interface EventBasicConfigProps {
  eventName: string;
  eventProperties: EventProperty[];
  onEventNameChange: (name: string) => void;
  onEventPropertiesChange: (properties: EventProperty[]) => void;
  // Optional: only the Flow Builder (JourneyTriggerPanel) gates Save on this.
  // A config is savable as soon as an event is chosen — filters are optional
  // (CRM-519). See EVO-1275.
  onValidityChange?: (valid: boolean) => void;
  // Optional: in contexts without a journey (e.g. trigger-type Campaigns) it is
  // omitted, so useJourneyVariables skips the fetch and the autocomplete degrades
  // to system variables only — no 404. See EVO-1608.
  journeyId?: string;
}

/**
 * Básico half of the event trigger config (EVO-1276): the event selector, the
 * custom-event free-text input, the schema-driven <EventPropertiesForm> (optional
 * filters), the event-switch notice with Undo, and validity reporting (an event
 * chosen; custom needs its name). Extracted
 * verbatim from EventConfiguration so it can be consumed directly by the Básico
 * tab without duplicating the stateful selector across tab subtrees.
 */
export function EventBasicConfig({
  eventName,
  eventProperties,
  onEventNameChange,
  onEventPropertiesChange,
  onValidityChange,
  journeyId,
}: EventBasicConfigProps) {
  const { t, currentLanguage } = useLanguage('journey');
  const { t: tEvents } = useLanguage('events');

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

  // Localized in events.json (`events.<name with _>.description`); the catalog
  // description is English-only and never shown outside the en locale.
  const canonicalDescription =
    !isCustomMode && selectorValue && getEvent(selectorValue)
      ? tEvents(`events.${selectorValue.replace(/\./g, '_')}.description`, { defaultValue: '' })
      : undefined;

  // Emit validity to opted-in consumers, but only when it actually flips so we
  // don't churn the parent's state on every keystroke.
  const lastValidityRef = useRef<boolean | null>(null);
  useEffect(() => {
    // A config is savable once an event is chosen — properties are optional
    // filters, not required inputs (CRM-519). Custom mode needs the typed
    // name: 'custom' alone is a placeholder, not an event.
    const valid = isCustomMode ? customName.trim() !== '' : selectorValue !== '';
    if (lastValidityRef.current !== valid) {
      lastValidityRef.current = valid;
      onValidityChange?.(valid);
    }
  }, [isCustomMode, customName, selectorValue, onValidityChange]);

  // CRM-519: switching events keeps the filters the new event also has (same
  // key and type) and drops the rest, no dialog. A dropped filter is reported
  // inline with Undo, which restores the previous event and its filters.
  const [dropped, setDropped] = useState<{
    count: number;
    toEventName: string;
    prevEventName: string;
    prevSelectorValue: string;
    prevCustomName: string;
    prevProperties: EventProperty[];
  } | null>(null);

  const eventLabel = (name: string) => {
    const entry = getEvent(name);
    if (!entry) return name;
    return currentLanguage.toLowerCase().startsWith('pt') ? entry.labelPt : entry.labelEn;
  };

  const handleSelectorChange = ({ eventName: picked, isCustom }: { eventName: string; isCustom: boolean }) => {
    const prevFormEvent = formEventName;
    const nextFormEvent = isCustom ? 'custom' : picked;
    const snapshot = {
      prevEventName: eventName,
      prevSelectorValue: selectorValue,
      prevCustomName: customName,
      prevProperties: eventProperties,
    };

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

    setDropped(null);
    if (prevFormEvent === nextFormEvent || Object.keys(record).length === 0) return;

    const kept = preserveCompatibleValues(record, prevFormEvent, nextFormEvent);
    const droppedCount = Object.keys(record).length - Object.keys(kept).length;
    if (droppedCount === 0) return;

    onEventPropertiesChange(recordToProperties(kept, eventProperties));
    setDropped({ count: droppedCount, toEventName: nextFormEvent, ...snapshot });
  };

  const handleUndoSwitch = () => {
    if (!dropped) return;
    setSelectorValue(dropped.prevSelectorValue);
    setCustomName(dropped.prevCustomName);
    lastPushedRef.current = dropped.prevEventName;
    onEventNameChange(dropped.prevEventName);
    onEventPropertiesChange(dropped.prevProperties);
    setDropped(null);
  };

  const handleCustomNameChange = (next: string) => {
    setCustomName(next);
    lastPushedRef.current = next;
    onEventNameChange(next);
  };

  const handlePropertiesRecordChange = (next: Record<string, unknown>) => {
    // A manual edit supersedes the switch: Undo would clobber it otherwise.
    setDropped(null);
    onEventPropertiesChange(recordToProperties(next, eventProperties));
  };

  return (
    <div className="space-y-4">
      <Label className="text-sidebar-foreground font-medium">
        {t('triggerComponents.event.configuration')}
      </Label>

      {/* Nome do evento */}
      <div className="space-y-2">
        <Label htmlFor="event-trigger-name" className="text-sm font-medium">
          {t('triggerComponents.event.eventName')}
        </Label>
        <EventSelector
          id="event-trigger-name"
          value={selectorValue || undefined}
          onChange={handleSelectorChange}
          className="bg-sidebar border-sidebar-border text-sidebar-foreground"
        />
        {selectorValue === '' && (
          <p className="text-xs text-destructive">{t('triggerComponents.event.selectEventRequired')}</p>
        )}
        {canonicalDescription && (
          <p className="text-xs text-muted-foreground">{canonicalDescription}</p>
        )}
        {isCustomMode && (
          <div className="space-y-2 pt-1">
            <Label htmlFor="custom-event-name" className="text-sm font-medium">
              {t('triggerComponents.event.customEventNameLabel')}
            </Label>
            <VariableInput
              id="custom-event-name"
              value={customName}
              onChange={e => handleCustomNameChange(e.target.value)}
              placeholder={t('triggerComponents.event.customEventNamePlaceholder')}
              className="bg-sidebar border-sidebar-border text-sidebar-foreground"
              journeyId={journeyId}
            />
            {customName.trim() === '' && (
              <p className="text-xs text-destructive">
                {t('triggerComponents.event.customEventNameRequired')}
              </p>
            )}
            <p className="text-xs text-amber-700 dark:text-amber-300">
              {t('triggerComponents.event.customEventWarning')}
            </p>
          </div>
        )}
      </div>

      {/* Propriedades do evento */}
      <div className="space-y-3">
        {/* The custom editor carries its own title; one heading is enough. */}
        {!isCustomMode && (
          <Label
            id="event-trigger-properties-label"
            className="text-sidebar-foreground font-medium text-sm"
          >
            {t('triggerComponents.event.eventProperties')}
          </Label>
        )}
        {dropped && (
          <div
            role="status"
            className="flex items-center justify-between gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-foreground"
          >
            <span>
              {t('triggerComponents.event.eventSwitch.dropped', {
                count: dropped.count,
                event: eventLabel(dropped.toEventName),
              })}
            </span>
            <Button type="button" variant="ghost" size="sm" className="h-7" onClick={handleUndoSwitch}>
              {t('triggerComponents.event.eventSwitch.undo')}
            </Button>
          </div>
        )}
        <div
          role={isCustomMode ? undefined : 'group'}
          aria-labelledby={isCustomMode ? undefined : 'event-trigger-properties-label'}
        >
          <EventPropertiesForm
            eventName={formEventName}
            value={record}
            onChange={handlePropertiesRecordChange}
          />
        </div>
      </div>
    </div>
  );
}
