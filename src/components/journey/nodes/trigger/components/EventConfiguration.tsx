import { useEffect, useRef, useState } from 'react';
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
import { EventSelector } from '@/components/journey/shared/EventSelector';
import { getEvent, resolveLegacyEventName } from '@/lib/events-manifest';
import { useLanguage } from '@/hooks/useLanguage';

interface EventProperty {
  path: string;
  operator: { type: string; value?: unknown };
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

  const generateEventPaths = () => {
    const basePaths = ['event.id', 'event.name', 'event.timestamp', 'event.user_id'];
    const propertyPaths = eventProperties
      .filter(prop => prop.path && prop.path.trim())
      .map(prop => `event.properties.${prop.path}`);
    return [...basePaths, ...propertyPaths];
  };

  const handleSelectorChange = ({ eventName: picked, isCustom }: { eventName: string; isCustom: boolean }) => {
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
  };

  const handleCustomNameChange = (next: string) => {
    setCustomName(next);
    lastPushedRef.current = next;
    onEventNameChange(next);
  };

  const isCustomMode = selectorValue === 'custom';
  const canonicalDescription =
    !isCustomMode && selectorValue ? getEvent(selectorValue)?.description : undefined;

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
                        value={
                          property.operator.value == null
                            ? ''
                            : String(property.operator.value)
                        }
                        onChange={e =>
                          updateEventProperty(index, {
                            ...property,
                            operator: { ...property.operator, value: e.target.value },
                          })
                        }
                        className="flex-1 bg-sidebar-accent border-sidebar-border text-sidebar-foreground"
                        journeyId={journeyId}
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
