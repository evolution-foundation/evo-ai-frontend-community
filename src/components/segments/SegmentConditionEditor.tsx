import { useTranslation as useUiTranslation } from 'react-i18next';
import i18n from '@/i18n/config';
import { Fragment, useState, useEffect, useCallback } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  Label,
  Button,
} from '@evoapi/design-system';
import { Trash2, Settings, Clock, Plus, X } from 'lucide-react';
import {
  EVENT_CATEGORIES,
  getEventsByCategory,
  getEventLabel,
  resolveLegacyEventName,
  type EventCategory,
} from '@/lib/events-manifest';
import { useLanguage } from '@/hooks/useLanguage';

// Componentes especializados
import ConditionTypeSelector from './ui/ConditionTypeSelector';
import UserPropertyEditor from './editors/UserPropertyEditor';
import LabelConditionEditor from './editors/LabelConditionEditor';
import CustomAttributeEditor from './editors/CustomAttributeEditor';
import {
  SegmentNodeUnion,
  UserPropertyNode,
  PerformedNode,
  LastPerformedNode,
  EmailNode,
  RandomBucketNode,
  ManualNode,
  LabelNode,
  CustomAttributeNode,
  PropertyFilter,
} from '@/types/analytics';
import { labelsService } from '@/services/contacts/labelsService';
import { customAttributesService } from '@/services/customAttributes/customAttributesService';
import { Label as LabelType } from '@/types/settings';
import { CustomAttributeDefinition, AttributeModel } from '@/types/settings';

interface SegmentConditionEditorProps {
  condition: SegmentNodeUnion;
  index: number;
  onUpdate: (index: number, condition: SegmentNodeUnion) => void;
  onRemove: (index: number) => void;
}

// Category headers for the Performed/LastPerformed event selector. The 'custom'
// category is intentionally omitted: free-form custom events were removed in
// EVO-1263 (only canonical manifest events are selectable now).
const SEGMENT_EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  get contact() { return i18n.t("events:categories.contact"); },
  get conversation() { return i18n.t("events:categories.conversation"); },
  get message() { return i18n.t("events:categories.message"); },
  get campaign() { return i18n.t("events:categories.campaign"); },
  get purchase() { return i18n.t("events:categories.purchase"); },
  get custom() { return i18n.t("events:categories.custom"); },
};

// Manifest-driven, category-grouped event picker shared by the Performed and
// LastPerformed conditions. Stores the canonical dot-notation event name (e.g.
// `contact.created`) — the SAME format evo-flow matches against in ClickHouse
// (`event_name = '<event>'`). This replaces the old free-text input + hardcoded
// snake_case templates, which never matched the stored canonical names.
function ManifestEventSelect({
  value,
  onSelect,
}: {
  value: string;
  onSelect: (eventName: string) => void;
}) {
  const { t: tUi } = useUiTranslation();
  const { currentLanguage } = useLanguage();
  // A persisted node may hold a legacy snake_case value (e.g. `contact_created`)
  // from before EVO-1263, or a value already in canonical form. Resolve it so it
  // matches a dot-notation <SelectItem> and the saved event still renders its
  // label (AC6). Non-backend legacy values (no canonical equivalent) resolve to
  // 'custom', which is not an option, so the picker shows the placeholder.
  const resolved = resolveLegacyEventName(value);
  const selected = resolved.selectorValue && resolved.selectorValue !== 'custom' ? resolved.selectorValue : '';
  return (
    <Select value={selected} onValueChange={(v) => v && onSelect(v)}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={tUi("events:selector.placeholder")} />
      </SelectTrigger>
      <SelectContent>
        {EVENT_CATEGORIES.filter((category) => category !== 'custom').map((category) => {
          const events = getEventsByCategory(category);
          if (events.length === 0) return null;
          return (
            <Fragment key={category}>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                {SEGMENT_EVENT_CATEGORY_LABELS[category]}
              </div>
              {events.map((entry) => (
                <SelectItem key={entry.eventName} value={entry.eventName}>
                  {getEventLabel(entry.eventName, currentLanguage)}
                </SelectItem>
              ))}
            </Fragment>
          );
        })}
      </SelectContent>
    </Select>
  );
}

export default function SegmentConditionEditor({
  condition,
  index,
  onUpdate,
  onRemove,
}: SegmentConditionEditorProps) {
  const { t: tUi } = useUiTranslation();
  const [selectedConditionType, setSelectedConditionType] = useState<string>(condition.type || '');
  const [localCondition, setLocalCondition] = useState<SegmentNodeUnion>(condition);

  // Configuration toggles
  const [showPropertyConfig, setShowPropertyConfig] = useState(false);
  const [showTimeWindow, setShowTimeWindow] = useState(false);

  // Form values
  const [operatorType, setOperatorType] = useState<string>('Equals');
  const [operatorValue, setOperatorValue] = useState<string>('');
  const [timeWindowValue, setTimeWindowValue] = useState<number>(30);
  const [timeWindowUnit, setTimeWindowUnit] = useState<string>('days');
  const [initialized, setInitialized] = useState(false);
  const [bucketPercent, setBucketPercent] = useState<number>(50);
  const [performedProperties, setPerformedProperties] = useState<PropertyFilter[]>([]);

  // Label and Custom Attribute specific
  const [selectedLabelId, setSelectedLabelId] = useState<string>('');
  const [labelConditionType, setLabelConditionType] = useState<'has' | 'not_has'>('has');
  const [customAttributeName, setCustomAttributeName] = useState<string>('');
  const [customAttributeOperatorType, setCustomAttributeOperatorType] = useState<string>('Equals');
  const [customAttributeValue, setCustomAttributeValue] = useState<string>('');

  // Lists from API
  const [availableLabels, setAvailableLabels] = useState<LabelType[]>([]);
  const [availableCustomAttributes, setAvailableCustomAttributes] = useState<
    CustomAttributeDefinition[]
  >([]);
  const [loadingLabels, setLoadingLabels] = useState(false);
  const [loadingCustomAttributes, setLoadingCustomAttributes] = useState(false);

  // Load labels when needed
  const loadLabels = useCallback(async () => {
    if (loadingLabels || availableLabels.length > 0) return;

    setLoadingLabels(true);
    try {
      const response = await labelsService.getLabels();
      setAvailableLabels(response.data || []);
    } catch (error) {
      console.error('Error loading labels:', error);
    } finally {
      setLoadingLabels(false);
    }
  }, [loadingLabels, availableLabels.length]);

  // Load custom attributes when needed
  const loadCustomAttributes = useCallback(async () => {
    if (loadingCustomAttributes) return;

    setLoadingCustomAttributes(true);
    try {
      const attributes = await customAttributesService.getCustomAttributes();

      // Filter only contact attributes
      const contactAttributes = attributes.data.filter(
        attr => attr.attribute_model === AttributeModel.CONTACT_ATTRIBUTE,
      );

      setAvailableCustomAttributes(contactAttributes);
    } catch (error) {
      console.error('Error loading custom attributes:', error);
    } finally {
      setLoadingCustomAttributes(false);
    }
  }, [loadingCustomAttributes, availableCustomAttributes.length]);

  // Initialize from condition only once to avoid reset loops
  useEffect(() => {
    if (initialized) return;

    setSelectedConditionType(condition.type);

    switch (condition.type) {
      case 'UserProperty': {
        const node = condition as UserPropertyNode;
        setOperatorType(node.operator?.type || 'Equals');
        setOperatorValue(String(node.operator?.value || ''));
        break;
      }
      case 'Performed': {
        const node = condition as PerformedNode;
        setPerformedProperties(node.properties || []);
        setShowPropertyConfig((node.properties?.length || 0) > 0);
        setShowTimeWindow(node.withinSeconds !== undefined);
        if (node.withinSeconds) {
          // Convert from seconds to best unit
          const { value, unit } = convertFromSeconds(node.withinSeconds);
          setTimeWindowValue(value);
          setTimeWindowUnit(unit);
        }
        break;
      }
      case 'LastPerformed': {
        const node = condition as LastPerformedNode;
        setPerformedProperties(node.whereProperties || []);
        setShowPropertyConfig((node.whereProperties?.length || 0) > 0);
        setShowTimeWindow(node.withinSeconds !== undefined);
        if (node.withinSeconds) {
          // Convert from seconds to best unit
          const { value, unit } = convertFromSeconds(node.withinSeconds);
          setTimeWindowValue(value);
          setTimeWindowUnit(unit);
        }
        break;
      }
      case 'RandomBucket': {
        const node = condition as RandomBucketNode;
        setBucketPercent(node.percent * 100);
        break;
      }
      case 'Label': {
        const node = condition as LabelNode;
        setSelectedLabelId(node.labelId);
        setLabelConditionType(node.condition);
        loadLabels(); // Load labels when editing
        break;
      }
      case 'CustomAttribute': {
        const node = condition as CustomAttributeNode;
        setCustomAttributeName(node.attributeName);
        setCustomAttributeOperatorType(node.operator?.type || 'Equals');
        setCustomAttributeValue(String(node.operator?.value || ''));
        loadCustomAttributes(); // Load attributes when editing
        break;
      }
    }

    setInitialized(true);
  }, [condition, initialized, loadCustomAttributes, loadLabels]);

  // labelId is the Label UUID — the CRM emits it in `contact.label.*` traits and evo-flow
  // matches on it (CRM-215). Definitions saved by the old editor carry the label TITLE;
  // migrate them to the id once labels load, so they start matching on the next save.
  useEffect(() => {
    if (selectedConditionType !== 'Label' || !selectedLabelId || availableLabels.length === 0) return;
    if (availableLabels.some(l => l.id === selectedLabelId)) return;
    const label = availableLabels.find(l => l.title === selectedLabelId);
    if (!label) return;
    setSelectedLabelId(label.id);
    const updatedCondition = { ...(localCondition as LabelNode), labelId: label.id };
    setLocalCondition(updatedCondition);
    onUpdate(index, updatedCondition);
  }, [selectedConditionType, selectedLabelId, availableLabels, localCondition, index, onUpdate]);

  const handleConditionTypeChange = (value: string) => {
    setSelectedConditionType(value);

    const baseCondition = {
      id: condition.id,
      type: value,
    };

    let newCondition: SegmentNodeUnion;

    switch (value) {
      case 'UserProperty':
        newCondition = {
          ...baseCondition,
          type: 'UserProperty',
          path: '',
          operator: { type: 'Equals', value: '' },
        } as UserPropertyNode;
        break;
      case 'Performed':
        newCondition = {
          ...baseCondition,
          type: 'Performed',
          event: '',
          times: 1,
          timesOperator: 'GreaterThanOrEqual',
        } as PerformedNode;
        break;
      case 'LastPerformed':
        newCondition = {
          ...baseCondition,
          type: 'LastPerformed',
          event: '',
        } as LastPerformedNode;
        break;
      case 'Email':
        newCondition = {
          ...baseCondition,
          type: 'Email',
          event: 'MessageSent',
          templateId: '',
        } as EmailNode;
        break;
      case 'WhatsApp':
        newCondition = {
          ...baseCondition,
          type: 'WhatsApp',
          event: 'MessageSent',
          templateId: '',
        } as unknown as EmailNode;
        break;
      case 'Web':
        newCondition = {
          ...baseCondition,
          type: 'Web',
          event: 'MessageSent',
          templateId: '',
        } as unknown as EmailNode;
        break;
      case 'SMS':
        newCondition = {
          ...baseCondition,
          type: 'SMS',
          event: 'MessageSent',
          templateId: '',
        } as unknown as EmailNode;
        break;
      case 'RandomBucket':
        newCondition = {
          ...baseCondition,
          type: 'RandomBucket',
          percent: 0.5,
        } as RandomBucketNode;
        break;
      case 'Manual':
        newCondition = {
          ...baseCondition,
          type: 'Manual',
          version: Date.now(),
        } as ManualNode;
        break;
      case 'Label':
        newCondition = {
          ...baseCondition,
          type: 'Label',
          labelId: '',
          condition: 'has',
        } as LabelNode;
        loadLabels(); // Load labels when selecting this type
        break;
      case 'CustomAttribute':
        newCondition = {
          ...baseCondition,
          type: 'CustomAttribute',
          attributeName: '',
          operator: { type: 'Equals', value: '' },
        } as CustomAttributeNode;
        loadCustomAttributes(); // Load attributes when selecting this type
        break;
      default:
        return;
    }

    setLocalCondition(newCondition);
    onUpdate(index, newCondition);
  };

  const updateCondition = () => {
    onUpdate(index, localCondition);
  };

  const handlePropertyChange = (field: string, value: unknown) => {
    const updatedCondition = { ...localCondition, [field]: value } as SegmentNodeUnion;
    setLocalCondition(updatedCondition);
    updateCondition();
  };

  // Selecting a canonical event from the manifest. Stores the dot-notation name.
  // For the events that have a dedicated property editor (custom attribute /
  // label pickers) we eagerly load the aux data AND seed the keyed property so
  // the special UI shows up — preserving the affordance the old per-event
  // templates used to provide (the templates themselves were removed in
  // EVO-1263, but this single keyed property is what gates the editors).
  const handleEventSelect = (eventName: string) => {
    let seeded: PropertyFilter[] | undefined;
    if (eventName === 'contact.custom_attribute.changed') {
      loadCustomAttributes();
      seeded = [{ path: 'attributeName', operator: { type: 'Equals', value: '' } }];
    } else if (eventName === 'contact.label.added' || eventName === 'contact.label.removed') {
      loadLabels();
      seeded = [{ path: 'labelName', operator: { type: 'Equals', value: '' } }];
    }

    if (!seeded) {
      handlePropertyChange('event', eventName);
      return;
    }

    // LastPerformed stores its filters under `whereProperties`; Performed under
    // `properties`. Update + propagate directly (handlePropertyChange's
    // updateCondition reads stale state).
    const isLast = localCondition.type === 'LastPerformed';
    const updated = {
      ...localCondition,
      event: eventName,
      ...(isLast ? { whereProperties: seeded } : { properties: seeded }),
    } as PerformedNode | LastPerformedNode;
    setLocalCondition(updated);
    setPerformedProperties(seeded);
    setShowPropertyConfig(true);
    onUpdate(index, updated);
  };

  const handleOperatorChange = () => {
    if (localCondition.type === 'UserProperty') {
      const updated = {
        ...localCondition,
        operator: {
          type: operatorType,
          value:
            operatorType === 'Exists' || operatorType === 'NotExists' ? undefined : operatorValue,
        },
      } as UserPropertyNode;
      setLocalCondition(updated);
      onUpdate(index, updated);
    } else if (localCondition.type === 'CustomAttribute') {
      const updated = {
        ...localCondition,
        operator: {
          type: customAttributeOperatorType,
          value:
            customAttributeOperatorType === 'Exists' || customAttributeOperatorType === 'NotExists'
              ? undefined
              : customAttributeValue,
        },
      } as CustomAttributeNode;
      setLocalCondition(updated);
      onUpdate(index, updated);
    }
  };

  const addProperty = () => {
    const newProperty: PropertyFilter = {
      path: '',
      operator: { type: 'Equals', value: '' },
    };
    const updated = [...performedProperties, newProperty];
    setPerformedProperties(updated);

    if (localCondition.type === 'Performed') {
      const node = { ...localCondition, properties: updated } as PerformedNode;
      setLocalCondition(node);
      onUpdate(index, node);
    } else if (localCondition.type === 'LastPerformed') {
      const node = { ...localCondition, whereProperties: updated } as LastPerformedNode;
      setLocalCondition(node);
      onUpdate(index, node);
    }
  };

  const removeProperty = (propertyIndex: number) => {
    const updated = performedProperties.filter((_, i) => i !== propertyIndex);
    setPerformedProperties(updated);

    if (localCondition.type === 'Performed') {
      const node = {
        ...localCondition,
        properties: updated.length > 0 ? updated : undefined,
      } as PerformedNode;
      setLocalCondition(node);
      onUpdate(index, node);
    } else if (localCondition.type === 'LastPerformed') {
      const node = {
        ...localCondition,
        whereProperties: updated.length > 0 ? updated : undefined,
      } as LastPerformedNode;
      setLocalCondition(node);
      onUpdate(index, node);
    }
  };

  const updateTimeWindow = (newValue?: number, newUnit?: string) => {
    if (localCondition.type === 'Performed' || localCondition.type === 'LastPerformed') {
      // Get the most current values - either from parameters or current state
      const actualValue = newValue !== undefined ? newValue : timeWindowValue;
      const actualUnit = newUnit !== undefined ? newUnit : timeWindowUnit;

      const seconds = showTimeWindow ? convertToSeconds(actualValue, actualUnit) : undefined;
      const node = {
        ...localCondition,
        withinSeconds: seconds,
      } as PerformedNode | LastPerformedNode;

      setLocalCondition(node);
      onUpdate(index, node);
    }
  };

  const convertToSeconds = (value: number, unit: string): number => {
    switch (unit) {
      case 'minutes':
        return value * 60;
      case 'hours':
        return value * 3600;
      case 'days':
        return value * 86400;
      case 'weeks':
        return value * 604800;
      case 'months':
        return value * 2592000;
      default:
        return value;
    }
  };

  const convertFromSeconds = (seconds: number): { value: number; unit: string } => {
    if (seconds === 0) return { value: 0, unit: 'minutes' };

    // Check in order from smallest to largest unit to get the best fit
    if (seconds % 2592000 === 0) {
      // months
      return { value: seconds / 2592000, unit: 'months' };
    } else if (seconds % 604800 === 0) {
      // weeks
      return { value: seconds / 604800, unit: 'weeks' };
    } else if (seconds % 86400 === 0) {
      // days
      return { value: seconds / 86400, unit: 'days' };
    } else if (seconds % 3600 === 0) {
      // hours
      return { value: seconds / 3600, unit: 'hours' };
    } else if (seconds % 60 === 0) {
      // minutes
      return { value: seconds / 60, unit: 'minutes' };
    } else {
      // If not divisible by any standard unit, use the most appropriate
      if (seconds >= 2592000) {
        return { value: Math.round((seconds / 2592000) * 10) / 10, unit: 'months' };
      } else if (seconds >= 604800) {
        return { value: Math.round((seconds / 604800) * 10) / 10, unit: 'weeks' };
      } else if (seconds >= 86400) {
        return { value: Math.round((seconds / 86400) * 10) / 10, unit: 'days' };
      } else if (seconds >= 3600) {
        return { value: Math.round((seconds / 3600) * 10) / 10, unit: 'hours' };
      } else {
        return { value: Math.round((seconds / 60) * 10) / 10, unit: 'minutes' };
      }
    }
  };


  return (
    <div className="border rounded-lg p-4 mb-4">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1 mr-4">
          <ConditionTypeSelector
            value={selectedConditionType}
            onChange={handleConditionTypeChange}
          />
        </div>
        <Button variant="ghost" size="icon" onClick={() => onRemove(index)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Condition Body */}
      {selectedConditionType && (
        <div className="border-t pt-4">
          {/* User Property Configuration */}
          {selectedConditionType === 'UserProperty' && (
            <UserPropertyEditor
              condition={localCondition as UserPropertyNode}
              operatorType={operatorType}
              operatorValue={operatorValue}
              onOperatorTypeChange={type => {
                setOperatorType(type);
                handleOperatorChange();
              }}
              onOperatorValueChange={value => {
                setOperatorValue(value);
                handleOperatorChange();
              }}
              onUpdate={updatedCondition => {
                setLocalCondition(updatedCondition);
                onUpdate(index, updatedCondition);
              }}
            />
          )}

          {/* Label Configuration */}
          {selectedConditionType === 'Label' && (
            <LabelConditionEditor
              condition={localCondition as LabelNode}
              availableLabels={availableLabels}
              loadingLabels={loadingLabels}
              selectedLabelId={selectedLabelId}
              labelConditionType={labelConditionType}
              onLabelIdChange={setSelectedLabelId}
              onConditionTypeChange={setLabelConditionType}
              onUpdate={updatedCondition => {
                setLocalCondition(updatedCondition);
                onUpdate(index, updatedCondition);
              }}
              onLoadLabels={loadLabels}
            />
          )}

          {/* Custom Attribute Configuration */}
          {selectedConditionType === 'CustomAttribute' && (
            <CustomAttributeEditor
              condition={localCondition as CustomAttributeNode}
              availableCustomAttributes={availableCustomAttributes}
              loadingCustomAttributes={loadingCustomAttributes}
              customAttributeName={customAttributeName}
              customAttributeOperatorType={customAttributeOperatorType}
              customAttributeValue={customAttributeValue}
              onAttributeNameChange={setCustomAttributeName}
              onOperatorTypeChange={type => {
                setCustomAttributeOperatorType(type);
                handleOperatorChange();
              }}
              onValueChange={value => {
                setCustomAttributeValue(value);
                handleOperatorChange();
              }}
              onUpdate={updatedCondition => {
                setLocalCondition(updatedCondition);
                onUpdate(index, updatedCondition);
              }}
              onLoadCustomAttributes={loadCustomAttributes}
            />
          )}

          {/* Performed Configuration */}
          {selectedConditionType === 'Performed' && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-1">{tUi("segments:conditionEditor.eventName")}</Label>
                <ManifestEventSelect
                  value={(localCondition as PerformedNode).event}
                  onSelect={handleEventSelect}
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <Label className="text-sm font-medium mb-1">{tUi("segments:conditionEditor.timesPerformed")}</Label>
                  <Select
                    value={(localCondition as PerformedNode).timesOperator}
                    onValueChange={v => handlePropertyChange('timesOperator', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GreaterThanOrEqual">{tUi("segments:conditionEditor.timesOperators.greaterThanOrEqual")}</SelectItem>
                      <SelectItem value="LessThan">{tUi("segments:conditionEditor.timesOperators.lessThan")}</SelectItem>
                      <SelectItem value="Equals">{tUi("segments:conditionEditor.timesOperators.equals")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label className="text-sm font-medium mb-1">{tUi("products:pipelinePanel.quantity")}</Label>
                  <Input
                    type="number"
                    min="1"
                    value={(localCondition as PerformedNode).times || 1}
                    onChange={e => handlePropertyChange('times', parseInt(e.target.value))}
                  />
                </div>
              </div>

              {/* Toggle Buttons */}
              <div className="flex gap-2">
                <Button
                  variant={showPropertyConfig ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setShowPropertyConfig(!showPropertyConfig);
                    if (!showPropertyConfig && performedProperties.length === 0) {
                      addProperty();
                    }
                  }}
                  className="flex items-center gap-1"
                >
                  <Settings className="h-3 w-3" />
                  {tUi("aiAgents:outputSchema.properties")}</Button>
                <Button
                  variant={showTimeWindow ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    const newShowTimeWindow = !showTimeWindow;
                    setShowTimeWindow(newShowTimeWindow);
                    // Use the new state value directly since setState is async
                    if (
                      localCondition.type === 'Performed' ||
                      localCondition.type === 'LastPerformed'
                    ) {
                      const seconds = newShowTimeWindow
                        ? convertToSeconds(timeWindowValue, timeWindowUnit)
                        : undefined;
                      const node = {
                        ...localCondition,
                        withinSeconds: seconds,
                      } as PerformedNode | LastPerformedNode;
                      setLocalCondition(node);
                      onUpdate(index, node);
                    }
                  }}
                  className="flex items-center gap-1"
                >
                  <Clock className="h-3 w-3" />
                  {tUi("segments:conditionEditor.timeWindow")}</Button>
              </div>

              {/* Properties Panel */}
              {showPropertyConfig && (
                <div className="rounded-lg border p-4">
                  <h4 className="text-sm font-semibold mb-2">{tUi("segments:conditionEditor.eventProperties")}</h4>
                  <div className="space-y-2">
                    {performedProperties.map((prop, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded border">
                        {/* Special handling for attributeName in custom_attribute_changed */}
                        {(localCondition as PerformedNode).event === 'contact.custom_attribute.changed' &&
                        prop.path === 'attributeName' ? (
                          <Select
                            value={(prop.operator.value as string) || ''}
                            onValueChange={value => {
                              const updated = [...performedProperties];
                              updated[i] = {
                                ...prop,
                                path: 'attributeName',
                                operator: { ...prop.operator, value: value },
                              };
                              setPerformedProperties(updated);
                            }}
                            disabled={loadingCustomAttributes}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue
                                placeholder={
                                  loadingCustomAttributes
                                    ? tUi("common:loading")
                                    : tUi("segments:conditionEditor.selectAttribute")
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {availableCustomAttributes.length === 0 &&
                                !loadingCustomAttributes && (
                                  <div className="p-2 text-sm text-muted-foreground text-center">
                                    {tUi("segments:conditionEditor.noAttributesFound")}</div>
                                )}
                              {availableCustomAttributes.map(attr => (
                                <SelectItem key={attr.id} value={attr.attribute_key}>
                                  <div className="flex flex-col">
                                    <span>{attr.attribute_display_name}</span>
                                    {attr.attribute_description && (
                                      <span className="text-xs text-muted-foreground">
                                        {attr.attribute_description}
                                      </span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : /* Special handling for labelName in label events */
                        ((localCondition as PerformedNode).event === 'contact.label.added' ||
                            (localCondition as PerformedNode).event === 'contact.label.removed') &&
                          prop.path === 'labelName' ? (
                          <Select
                            value={(prop.operator.value as string) || ''}
                            onValueChange={value => {
                              const updated = [...performedProperties];
                              updated[i] = {
                                ...prop,
                                path: 'labelName',
                                operator: { ...prop.operator, value: value },
                              };
                              setPerformedProperties(updated);
                            }}
                            disabled={loadingLabels}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue
                                placeholder={
                                  loadingLabels ? tUi("common:loading") : tUi("segments:conditionEditor.selectLabel")
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {availableLabels.length === 0 && !loadingLabels && (
                                <div className="p-2 text-sm text-muted-foreground text-center">
                                  {tUi("segments:conditionEditor.noLabelsFound")}</div>
                              )}
                              {availableLabels.map(label => (
                                <SelectItem key={label.id} value={label.title}>
                                  <span className="flex items-center gap-2">
                                    <span
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: label.color }}
                                    />
                                    {label.title}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            placeholder={tUi("segments:conditionEditor.path")}
                            value={prop.path}
                            onChange={e => {
                              const updated = [...performedProperties];
                              updated[i] = { ...prop, path: e.target.value };
                              setPerformedProperties(updated);
                            }}
                            className="flex-1"
                          />
                        )}
                        <Select
                          value={prop.operator.type}
                          onValueChange={v => {
                            const updated = [...performedProperties];
                            updated[i] = { ...prop, operator: { ...prop.operator, type: v } };
                            setPerformedProperties(updated);
                          }}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Equals">{tUi("segments:operators.equals")}</SelectItem>
                            <SelectItem value="NotEquals">{tUi("segments:operators.notEquals")}</SelectItem>
                            <SelectItem value="Contains">{tUi("common:filter.operators.contains")}</SelectItem>
                            <SelectItem value="Exists">{tUi("segments:operators.exists")}</SelectItem>
                          </SelectContent>
                        </Select>
                        {prop.operator.type !== 'Exists' && (
                          <Input
                            placeholder={tUi("contacts:filter.value")}
                            value={prop.operator.value || ''}
                            onChange={e => {
                              const updated = [...performedProperties];
                              updated[i] = {
                                ...prop,
                                operator: { ...prop.operator, value: e.target.value },
                              };
                              setPerformedProperties(updated);
                            }}
                            className="flex-1"
                          />
                        )}
                        <Button variant="ghost" size="icon" onClick={() => removeProperty(i)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={addProperty} className="w-full">
                      <Plus className="h-3 w-3 mr-1" />
                      {tUi("segments:conditionEditor.addProperty")}</Button>
                  </div>
                </div>
              )}

              {/* Time Window Panel */}
              {showTimeWindow && (
                <div className="rounded-lg border p-4">
                  <h4 className="text-sm font-semibold mb-2">{tUi("segments:conditionEditor.timeWindow")}</h4>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={timeWindowValue}
                      onChange={e => {
                        const newValue = parseInt(e.target.value);
                        setTimeWindowValue(newValue);
                        updateTimeWindow(newValue, timeWindowUnit);
                      }}
                      className="w-24"
                    />
                    <Select
                      value={timeWindowUnit}
                      onValueChange={v => {
                        setTimeWindowUnit(v);
                        updateTimeWindow(timeWindowValue, v);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minutes">{tUi("segments:conditionEditor.timeUnits.minutes")}</SelectItem>
                        <SelectItem value="hours">{tUi("segments:conditionEditor.timeUnits.hours")}</SelectItem>
                        <SelectItem value="days">{tUi("segments:conditionEditor.timeUnits.days")}</SelectItem>
                        <SelectItem value="weeks">{tUi("segments:conditionEditor.timeUnits.weeks")}</SelectItem>
                        <SelectItem value="months">{tUi("segments:conditionEditor.timeUnits.months")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Last Performed Configuration */}
          {selectedConditionType === 'LastPerformed' && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-1">{tUi("segments:conditionEditor.eventName")}</Label>
                <ManifestEventSelect
                  value={(localCondition as LastPerformedNode).event}
                  onSelect={handleEventSelect}
                />
              </div>

              {/* Toggle Buttons */}
              <div className="flex gap-2">
                <Button
                  variant={showPropertyConfig ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setShowPropertyConfig(!showPropertyConfig);
                    if (!showPropertyConfig && performedProperties.length === 0) {
                      addProperty();
                    }
                  }}
                  className="flex items-center gap-1"
                >
                  <Settings className="h-3 w-3" />
                  {tUi("segments:conditionEditor.whereProperties")}</Button>
                <Button
                  variant={showTimeWindow ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    const newShowTimeWindow = !showTimeWindow;
                    setShowTimeWindow(newShowTimeWindow);
                    // Use the new state value directly since setState is async
                    if (
                      localCondition.type === 'Performed' ||
                      localCondition.type === 'LastPerformed'
                    ) {
                      const seconds = newShowTimeWindow
                        ? convertToSeconds(timeWindowValue, timeWindowUnit)
                        : undefined;
                      const node = {
                        ...localCondition,
                        withinSeconds: seconds,
                      } as PerformedNode | LastPerformedNode;
                      setLocalCondition(node);
                      onUpdate(index, node);
                    }
                  }}
                  className="flex items-center gap-1"
                >
                  <Clock className="h-3 w-3" />
                  {tUi("segments:conditionEditor.timeWindow")}</Button>
              </div>

              {/* Properties Panel */}
              {showPropertyConfig && (
                <div className="rounded-lg border p-4">
                  <h4 className="text-sm font-semibold mb-2">{tUi("segments:conditionEditor.whereProperties")}</h4>
                  <div className="space-y-2">
                    {performedProperties.map((prop, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded border">
                        {/* Special handling for attributeName in custom_attribute_changed */}
                        {(localCondition as LastPerformedNode).event ===
                          'contact.custom_attribute.changed' && prop.path === 'attributeName' ? (
                          <Select
                            value={(prop.operator.value as string) || ''}
                            onValueChange={value => {
                              const updated = [...performedProperties];
                              updated[i] = {
                                ...prop,
                                path: 'attributeName',
                                operator: { ...prop.operator, value: value },
                              };
                              setPerformedProperties(updated);

                              // Update condition for LastPerformed
                              if (localCondition.type === 'LastPerformed') {
                                const node = {
                                  ...localCondition,
                                  whereProperties: updated,
                                } as LastPerformedNode;
                                setLocalCondition(node);
                                onUpdate(index, node);
                              }
                            }}
                            disabled={loadingCustomAttributes}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue
                                placeholder={
                                  loadingCustomAttributes
                                    ? tUi("common:loading")
                                    : tUi("segments:conditionEditor.selectAttribute")
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {availableCustomAttributes.length === 0 &&
                                !loadingCustomAttributes && (
                                  <div className="p-2 text-sm text-muted-foreground text-center">
                                    {tUi("segments:conditionEditor.noAttributesFound")}</div>
                                )}
                              {availableCustomAttributes.map(attr => (
                                <SelectItem key={attr.id} value={attr.attribute_key}>
                                  <div className="flex flex-col">
                                    <span>{attr.attribute_display_name}</span>
                                    {attr.attribute_description && (
                                      <span className="text-xs text-muted-foreground">
                                        {attr.attribute_description}
                                      </span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : /* Special handling for labelName in label events */
                        ((localCondition as LastPerformedNode).event === 'contact.label.added' ||
                            (localCondition as LastPerformedNode).event === 'contact.label.removed') &&
                          prop.path === 'labelName' ? (
                          <Select
                            value={(prop.operator.value as string) || ''}
                            onValueChange={value => {
                              const updated = [...performedProperties];
                              updated[i] = {
                                ...prop,
                                path: 'labelName',
                                operator: { ...prop.operator, value: value },
                              };
                              setPerformedProperties(updated);

                              // Update condition for LastPerformed
                              if (localCondition.type === 'LastPerformed') {
                                const node = {
                                  ...localCondition,
                                  whereProperties: updated,
                                } as LastPerformedNode;
                                setLocalCondition(node);
                                onUpdate(index, node);
                              }
                            }}
                            disabled={loadingLabels}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue
                                placeholder={
                                  loadingLabels ? tUi("common:loading") : tUi("segments:conditionEditor.selectLabel")
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {availableLabels.length === 0 && !loadingLabels && (
                                <div className="p-2 text-sm text-muted-foreground text-center">
                                  {tUi("segments:conditionEditor.noLabelsFound")}</div>
                              )}
                              {availableLabels.map(label => (
                                <SelectItem key={label.id} value={label.title}>
                                  <span className="flex items-center gap-2">
                                    <span
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: label.color }}
                                    />
                                    {label.title}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            placeholder={tUi("segments:conditionEditor.path")}
                            value={prop.path}
                            onChange={e => {
                              const updated = [...performedProperties];
                              updated[i] = { ...prop, path: e.target.value };
                              setPerformedProperties(updated);

                              // Update condition for LastPerformed
                              if (localCondition.type === 'LastPerformed') {
                                const node = {
                                  ...localCondition,
                                  whereProperties: updated,
                                } as LastPerformedNode;
                                setLocalCondition(node);
                                onUpdate(index, node);
                              }
                            }}
                            className="flex-1"
                          />
                        )}
                        <Select
                          value={prop.operator.type}
                          onValueChange={v => {
                            const updated = [...performedProperties];
                            updated[i] = { ...prop, operator: { ...prop.operator, type: v } };
                            setPerformedProperties(updated);

                            // Update condition for LastPerformed
                            if (localCondition.type === 'LastPerformed') {
                              const node = {
                                ...localCondition,
                                whereProperties: updated,
                              } as LastPerformedNode;
                              setLocalCondition(node);
                              onUpdate(index, node);
                            }
                          }}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Equals">{tUi("segments:operators.equals")}</SelectItem>
                            <SelectItem value="NotEquals">{tUi("segments:operators.notEquals")}</SelectItem>
                            <SelectItem value="Contains">{tUi("common:filter.operators.contains")}</SelectItem>
                            <SelectItem value="Exists">{tUi("segments:operators.exists")}</SelectItem>
                          </SelectContent>
                        </Select>
                        {prop.operator.type !== 'Exists' && (
                          <Input
                            placeholder={tUi("contacts:filter.value")}
                            value={prop.operator.value || ''}
                            onChange={e => {
                              const updated = [...performedProperties];
                              updated[i] = {
                                ...prop,
                                operator: { ...prop.operator, value: e.target.value },
                              };
                              setPerformedProperties(updated);

                              // Update condition for LastPerformed
                              if (localCondition.type === 'LastPerformed') {
                                const node = {
                                  ...localCondition,
                                  whereProperties: updated,
                                } as LastPerformedNode;
                                setLocalCondition(node);
                                onUpdate(index, node);
                              }
                            }}
                            className="flex-1"
                          />
                        )}
                        <Button variant="ghost" size="icon" onClick={() => removeProperty(i)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={addProperty} className="w-full">
                      <Plus className="h-3 w-3 mr-1" />
                      {tUi("segments:conditionEditor.addProperty")}</Button>
                  </div>
                </div>
              )}

              {/* Time Window Panel */}
              {showTimeWindow && (
                <div className="rounded-lg border p-4">
                  <h4 className="text-sm font-semibold mb-2">{tUi("segments:conditionEditor.timeWindow")}</h4>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={timeWindowValue}
                      onChange={e => {
                        const newValue = parseInt(e.target.value);
                        setTimeWindowValue(newValue);
                        updateTimeWindow(newValue, timeWindowUnit);
                      }}
                      className="w-24"
                    />
                    <Select
                      value={timeWindowUnit}
                      onValueChange={v => {
                        setTimeWindowUnit(v);
                        updateTimeWindow(timeWindowValue, v);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minutes">{tUi("segments:conditionEditor.timeUnits.minutes")}</SelectItem>
                        <SelectItem value="hours">{tUi("segments:conditionEditor.timeUnits.hours")}</SelectItem>
                        <SelectItem value="days">{tUi("segments:conditionEditor.timeUnits.days")}</SelectItem>
                        <SelectItem value="weeks">{tUi("segments:conditionEditor.timeUnits.weeks")}</SelectItem>
                        <SelectItem value="months">{tUi("segments:conditionEditor.timeUnits.months")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Email Configuration */}
          {selectedConditionType === 'Email' && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-1">{tUi("segments:conditionEditor.channelEvents.email.label")}</Label>
                <Select
                  value={(localCondition as EmailNode).event || 'MessageSent'}
                  onValueChange={v => handlePropertyChange('event', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MessageSent">{tUi("segments:conditionEditor.channelEvents.email.messageSent")}</SelectItem>
                    <SelectItem value="EmailOpened">{tUi("segments:conditionEditor.eventTemplates.emailOpened")}</SelectItem>
                    <SelectItem value="EmailClicked">{tUi("segments:conditionEditor.channelEvents.email.emailClicked")}</SelectItem>
                    <SelectItem value="EmailBounced">{tUi("segments:conditionEditor.channelEvents.email.emailBounced")}</SelectItem>
                    <SelectItem value="EmailDelivered">{tUi("segments:conditionEditor.channelEvents.email.emailDelivered")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium mb-1">{tUi("segments:conditionEditor.channelEvents.web.templateIdLabel")}</Label>
                <Input
                  value={(localCondition as EmailNode).templateId || ''}
                  onChange={e => handlePropertyChange('templateId', e.target.value)}
                  placeholder={tUi("segments:conditionEditor.channelEvents.email.templateIdPlaceholder")}
                />
              </div>
            </div>
          )}

          {/* WhatsApp Configuration */}
          {selectedConditionType === 'WhatsApp' && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-1">{tUi("segments:conditionEditor.channelEvents.whatsapp.label")}</Label>
                <Select
                  value={(localCondition as EmailNode).event || 'MessageSent'}
                  onValueChange={v => handlePropertyChange('event', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MessageSent">{tUi("segments:conditionEditor.channelEvents.whatsapp.messageSent")}</SelectItem>
                    <SelectItem value="MessageRead">{tUi("segments:conditionEditor.channelEvents.whatsapp.messageRead")}</SelectItem>
                    <SelectItem value="MessageReplied">{tUi("segments:conditionEditor.channelEvents.whatsapp.messageReplied")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium mb-1">{tUi("segments:conditionEditor.channelEvents.web.templateIdLabel")}</Label>
                <Input
                  value={(localCondition as EmailNode).templateId || ''}
                  onChange={e => handlePropertyChange('templateId', e.target.value)}
                  placeholder={tUi("segments:conditionEditor.channelEvents.whatsapp.templateIdPlaceholder")}
                />
              </div>
            </div>
          )}

          {/* Web Configuration */}
          {selectedConditionType === 'Web' && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-1">{tUi("segments:conditionEditor.channelEvents.web.label")}</Label>
                <Select
                  value={(localCondition as EmailNode).event || 'MessageSent'}
                  onValueChange={v => handlePropertyChange('event', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MessageSent">{tUi("segments:conditionEditor.channelEvents.web.messageSent")}</SelectItem>
                    <SelectItem value="MessageOpened">{tUi("segments:conditionEditor.channelEvents.web.messageOpened")}</SelectItem>
                    <SelectItem value="MessageClicked">{tUi("segments:conditionEditor.channelEvents.web.messageClicked")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium mb-1">{tUi("segments:conditionEditor.channelEvents.web.templateIdLabel")}</Label>
                <Input
                  value={(localCondition as EmailNode).templateId || ''}
                  onChange={e => handlePropertyChange('templateId', e.target.value)}
                  placeholder={tUi("segments:conditionEditor.channelEvents.web.templateIdPlaceholder")}
                />
              </div>
            </div>
          )}

          {/* SMS Configuration */}
          {selectedConditionType === 'SMS' && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-1">{tUi("segments:conditionEditor.channelEvents.sms.label")}</Label>
                <Select
                  value={(localCondition as EmailNode).event || 'MessageSent'}
                  onValueChange={v => handlePropertyChange('event', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MessageSent">{tUi("segments:conditionEditor.channelEvents.sms.messageSent")}</SelectItem>
                    <SelectItem value="MessageRead">{tUi("segments:conditionEditor.channelEvents.sms.messageRead")}</SelectItem>
                    <SelectItem value="MessageReplied">{tUi("segments:conditionEditor.channelEvents.sms.messageReplied")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium mb-1">{tUi("segments:conditionEditor.channelEvents.web.templateIdLabel")}</Label>
                <Input
                  value={(localCondition as EmailNode).templateId || ''}
                  onChange={e => handlePropertyChange('templateId', e.target.value)}
                  placeholder={tUi("segments:conditionEditor.channelEvents.sms.templateIdPlaceholder")}
                />
              </div>
            </div>
          )}

          {/* Random Bucket Configuration */}
          {selectedConditionType === 'RandomBucket' && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-1">{tUi("segments:conditionEditor.randomBucket.percentageIncluded")}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={bucketPercent}
                    onChange={e => {
                      const percent = parseFloat(e.target.value);
                      setBucketPercent(percent);
                      const updated = {
                        ...localCondition,
                        percent: percent / 100,
                      } as RandomBucketNode;
                      setLocalCondition(updated);
                      onUpdate(index, updated);
                    }}
                    className="w-32"
                  />
                  <span className="text-lg font-semibold">%</span>
                </div>
              </div>
            </div>
          )}

          {/* Manual Configuration */}
          {selectedConditionType === 'Manual' && (
            <div className="text-center py-8 rounded-lg border">
              <h4 className="text-lg font-semibold mb-2">{tUi("segments:conditionEditor.manualUpload.title")}</h4>
              <p className="text-sm text-muted-foreground mb-4">
                {tUi("segments:conditionEditor.manualUpload.description")}</p>
              <Button variant="outline">{tUi("segments:conditionEditor.manualUpload.uploadButton")}</Button>
              <p className="text-xs text-muted-foreground mt-2">{tUi("segments:conditionEditor.manualUpload.format")}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
