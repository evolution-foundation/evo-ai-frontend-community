import { useState, useEffect, useCallback } from 'react';
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

export default function SegmentConditionEditor({
  condition,
  index,
  onUpdate,
  onRemove,
}: SegmentConditionEditorProps) {
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
        // Para manter compatibilidade, verificar se labelId é um UUID (formato antigo) ou nome (formato novo)
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          node.labelId,
        );
        if (isUUID) {
          // Formato antigo com UUID - precisamos encontrar o nome da label
          // Por enquanto, usar o UUID e converter depois que as labels carregarem
          setSelectedLabelId(node.labelId);
        } else {
          // Formato novo com nome da label
          setSelectedLabelId(node.labelId);
        }
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

  // Convert UUID labelId to label name after labels are loaded (for backward compatibility)
  useEffect(() => {
    if (selectedConditionType === 'Label' && selectedLabelId && availableLabels.length > 0) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        selectedLabelId,
      );
      if (isUUID) {
        // Find label by ID and update to use name instead
        const label = availableLabels.find(l => l.id === selectedLabelId);
        if (label) {
          setSelectedLabelId(label.title);
          // Update the condition to use the label name
          const node = localCondition as LabelNode;
          const updatedCondition = { ...node, labelId: label.title };
          setLocalCondition(updatedCondition);
          onUpdate(index, updatedCondition);
        }
      }
    }
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

  // Event templates with predefined properties
  const applyEventTemplate = (templateKey: string) => {
    const templates: Record<string, { event: string; properties?: PropertyFilter[] }> = {
      // Eventos de Contato
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
      label_added: {
        event: 'label_added',
        properties: [
          { path: 'labelName', operator: { type: 'Equals', value: '' } },
          { path: 'labelId', operator: { type: 'Exists', value: undefined } },
        ],
      },
      label_removed: {
        event: 'label_removed',
        properties: [
          { path: 'labelName', operator: { type: 'Equals', value: '' } },
          { path: 'labelId', operator: { type: 'Exists', value: undefined } },
        ],
      },
      custom_attribute_changed: {
        event: 'custom_attribute_changed',
        properties: [
          { path: 'attributeName', operator: { type: 'Equals', value: '' } },
          { path: 'attributeValue', operator: { type: 'Exists', value: undefined } },
          { path: 'changeType', operator: { type: 'Equals', value: 'modified' } },
        ],
      },

      // Eventos de Conversa
      conversation_created: {
        event: 'conversation_created',
        properties: [
          { path: 'inbox_name', operator: { type: 'Equals', value: '' } },
          { path: 'channel_type', operator: { type: 'Equals', value: 'Channel::Api' } },
        ],
      },
      conversation_updated: {
        event: 'conversation_updated',
        properties: [
          { path: 'changes', operator: { type: 'Contains', value: '' } },
          { path: 'inbox_name', operator: { type: 'Equals', value: '' } },
        ],
      },
      message_created: {
        event: 'message_created',
        properties: [
          { path: 'message_type', operator: { type: 'Equals', value: 'incoming' } },
          { path: 'content_type', operator: { type: 'Equals', value: 'text' } },
          { path: 'channel_type', operator: { type: 'Equals', value: 'Channel::Api' } },
        ],
      },
      message_updated: {
        event: 'message_updated',
        properties: [
          { path: 'message_type', operator: { type: 'Equals', value: '' } },
          { path: 'content_type', operator: { type: 'Equals', value: 'text' } },
        ],
      },

      // Eventos de Pipeline
      pipeline_conversation_added: {
        event: 'pipeline_conversation_added',
        properties: [
          { path: 'pipeline_name', operator: { type: 'Equals', value: '' } },
          { path: 'pipeline_stage_name', operator: { type: 'Equals', value: '' } },
        ],
      },
      pipeline_stage_changed: {
        event: 'pipeline_stage_changed',
        properties: [
          { path: 'pipeline_name', operator: { type: 'Equals', value: '' } },
          { path: 'old_stage_name', operator: { type: 'Equals', value: '' } },
          { path: 'new_stage_name', operator: { type: 'Equals', value: '' } },
        ],
      },
      pipeline_custom_fields_updated: {
        event: 'pipeline_custom_fields_updated',
        properties: [
          { path: 'pipeline_name', operator: { type: 'Equals', value: '' } },
          { path: 'services_total_value', operator: { type: 'GreaterThan', value: '0' } },
        ],
      },

      // Eventos de Segmento
      segment_entered: {
        event: 'segment_entered',
        properties: [
          { path: 'segmentName', operator: { type: 'Equals', value: '' } },
          { path: 'changeType', operator: { type: 'Equals', value: 'entered' } },
        ],
      },
      segment_exited: {
        event: 'segment_exited',
        properties: [
          { path: 'segmentName', operator: { type: 'Equals', value: '' } },
          { path: 'changeType', operator: { type: 'Equals', value: 'exited' } },
        ],
      },

      // Eventos Personalizados
      button_clicked: {
        event: 'button_clicked',
        properties: [
          { path: 'button_id', operator: { type: 'Equals', value: '' } },
          { path: 'page_url', operator: { type: 'Contains', value: '' } },
          { path: 'button_text', operator: { type: 'Equals', value: '' } },
        ],
      },
      page_viewed: {
        event: 'page_viewed',
        properties: [
          { path: 'page_url', operator: { type: 'Equals', value: '' } },
          { path: 'page_title', operator: { type: 'Contains', value: '' } },
          { path: 'referrer', operator: { type: 'Exists', value: undefined } },
        ],
      },
      form_submitted: {
        event: 'form_submitted',
        properties: [
          { path: 'form_id', operator: { type: 'Equals', value: '' } },
          { path: 'form_name', operator: { type: 'Equals', value: '' } },
          { path: 'page_url', operator: { type: 'Contains', value: '' } },
        ],
      },
      product_purchased: {
        event: 'product_purchased',
        properties: [
          { path: 'product_id', operator: { type: 'Equals', value: '' } },
          { path: 'product_name', operator: { type: 'Contains', value: '' } },
          { path: 'price', operator: { type: 'GreaterThan', value: '0' } },
          { path: 'currency', operator: { type: 'Equals', value: 'BRL' } },
        ],
      },
      email_opened: {
        event: 'email_opened',
        properties: [
          { path: 'campaign_id', operator: { type: 'Equals', value: '' } },
          { path: 'subject', operator: { type: 'Contains', value: '' } },
          { path: 'email_type', operator: { type: 'Equals', value: 'marketing' } },
        ],
      },
      link_clicked: {
        event: 'link_clicked',
        properties: [
          { path: 'link_url', operator: { type: 'Equals', value: '' } },
          { path: 'link_text', operator: { type: 'Contains', value: '' } },
          { path: 'source', operator: { type: 'Equals', value: 'email' } },
        ],
      },
    };

    const template = templates[templateKey];
    if (!template) return;

    // Special handling for custom_attribute_changed - load custom attributes
    if (templateKey === 'custom_attribute_changed') {
      loadCustomAttributes();
    }

    // Special handling for label events - load labels
    if (templateKey === 'label_added' || templateKey === 'label_removed') {
      loadLabels();
    }

    // Apply the template
    const updatedCondition = {
      ...localCondition,
      event: template.event,
      properties: template.properties,
    } as PerformedNode;

    setLocalCondition(updatedCondition);
    setPerformedProperties(template.properties || []);
    setShowPropertyConfig(!!(template.properties && template.properties.length > 0));
    onUpdate(index, updatedCondition);
  };

  // Apply template for LastPerformed events
  const applyLastPerformedTemplate = (templateKey: string) => {
    const templates: Record<string, { event: string; properties?: PropertyFilter[] }> = {
      // Eventos de Contato
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
      label_added: {
        event: 'label_added',
        properties: [{ path: 'labelName', operator: { type: 'Equals', value: '' } }],
      },
      label_removed: {
        event: 'label_removed',
        properties: [{ path: 'labelName', operator: { type: 'Equals', value: '' } }],
      },
      custom_attribute_changed: {
        event: 'custom_attribute_changed',
        properties: [
          { path: 'attributeName', operator: { type: 'Equals', value: '' } },
          { path: 'attributeValue', operator: { type: 'Exists', value: undefined } },
        ],
      },

      // Eventos de Conversa
      conversation_created: {
        event: 'conversation_created',
        properties: [
          { path: 'inbox_name', operator: { type: 'Equals', value: '' } },
          { path: 'channel_type', operator: { type: 'Equals', value: 'Channel::Api' } },
        ],
      },
      conversation_updated: {
        event: 'conversation_updated',
        properties: [
          { path: 'changes', operator: { type: 'Contains', value: '' } },
          { path: 'inbox_name', operator: { type: 'Equals', value: '' } },
        ],
      },
      message_created: {
        event: 'message_created',
        properties: [
          { path: 'message_type', operator: { type: 'Equals', value: 'incoming' } },
          { path: 'content_type', operator: { type: 'Equals', value: 'text' } },
        ],
      },
      message_updated: {
        event: 'message_updated',
        properties: [
          { path: 'message_type', operator: { type: 'Equals', value: '' } },
          { path: 'content_type', operator: { type: 'Equals', value: 'text' } },
        ],
      },

      // Eventos de Pipeline
      pipeline_conversation_added: {
        event: 'pipeline_conversation_added',
        properties: [
          { path: 'pipeline_name', operator: { type: 'Equals', value: '' } },
          { path: 'pipeline_stage_name', operator: { type: 'Equals', value: '' } },
        ],
      },
      pipeline_stage_changed: {
        event: 'pipeline_stage_changed',
        properties: [
          { path: 'pipeline_name', operator: { type: 'Equals', value: '' } },
          { path: 'new_stage_name', operator: { type: 'Equals', value: '' } },
        ],
      },
      pipeline_custom_fields_updated: {
        event: 'pipeline_custom_fields_updated',
        properties: [
          { path: 'pipeline_name', operator: { type: 'Equals', value: '' } },
          { path: 'services_total_value', operator: { type: 'GreaterThan', value: '0' } },
        ],
      },

      // Eventos de Segmento
      segment_entered: {
        event: 'segment_entered',
        properties: [
          { path: 'segmentName', operator: { type: 'Equals', value: '' } },
          { path: 'changeType', operator: { type: 'Equals', value: 'entered' } },
        ],
      },
      segment_exited: {
        event: 'segment_exited',
        properties: [
          { path: 'segmentName', operator: { type: 'Equals', value: '' } },
          { path: 'changeType', operator: { type: 'Equals', value: 'exited' } },
        ],
      },

      // Eventos Personalizados
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
      email_opened: {
        event: 'email_opened',
        properties: [
          { path: 'campaign_id', operator: { type: 'Equals', value: '' } },
          { path: 'subject', operator: { type: 'Contains', value: '' } },
        ],
      },
      link_clicked: {
        event: 'link_clicked',
        properties: [
          { path: 'link_url', operator: { type: 'Equals', value: '' } },
          { path: 'source', operator: { type: 'Equals', value: 'email' } },
        ],
      },
    };

    const template = templates[templateKey];
    if (!template) return;

    // Special handling for custom_attribute_changed - load custom attributes
    if (templateKey === 'custom_attribute_changed') {
      loadCustomAttributes();
    }

    // Special handling for label events - load labels
    if (templateKey === 'label_added' || templateKey === 'label_removed') {
      loadLabels();
    }

    // Apply the template for LastPerformed
    const updatedCondition = {
      ...localCondition,
      event: template.event,
      whereProperties: template.properties,
    } as LastPerformedNode;

    setLocalCondition(updatedCondition);
    setPerformedProperties(template.properties || []);
    setShowPropertyConfig(!!(template.properties && template.properties.length > 0));
    onUpdate(index, updatedCondition);
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
                <Label className="text-sm font-medium mb-1">Nome do Evento</Label>
                <div className="flex gap-2">
                  <Input
                    value={(localCondition as PerformedNode).event}
                    onChange={e => handlePropertyChange('event', e.target.value)}
                    placeholder="Ex: button_clicked, page_viewed"
                    className="flex-1"
                  />
                  <Select
                    value=""
                    onValueChange={templateKey => {
                      if (templateKey) {
                        applyEventTemplate(templateKey);
                      }
                    }}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Templates" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Eventos de Contato */}
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                        Eventos de Contato
                      </div>
                      <SelectItem value="contact_created">Contato Criado</SelectItem>
                      <SelectItem value="contact_updated">Contato Atualizado</SelectItem>
                      <SelectItem value="label_added">Label Adicionada</SelectItem>
                      <SelectItem value="label_removed">Label Removida</SelectItem>
                      <SelectItem value="custom_attribute_changed">
                        Atributo Personalizado
                      </SelectItem>

                      {/* Eventos de Conversa */}
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                        Eventos de Conversa
                      </div>
                      <SelectItem value="conversation_created">Conversa Criada</SelectItem>
                      <SelectItem value="conversation_updated">Conversa Atualizada</SelectItem>
                      <SelectItem value="message_created">Mensagem Criada</SelectItem>
                      <SelectItem value="message_updated">Mensagem Atualizada</SelectItem>

                      {/* Eventos de Pipeline */}
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                        Eventos de Pipeline
                      </div>
                      <SelectItem value="pipeline_conversation_added">
                        Adicionado ao Pipeline
                      </SelectItem>
                      <SelectItem value="pipeline_stage_changed">Mudança de Estágio</SelectItem>
                      <SelectItem value="pipeline_custom_fields_updated">
                        Campos Personalizados
                      </SelectItem>

                      {/* Eventos de Segmento */}
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                        Eventos de Segmento
                      </div>
                      <SelectItem value="segment_entered">Entrou no Segmento</SelectItem>
                      <SelectItem value="segment_exited">Saiu do Segmento</SelectItem>

                      {/* Eventos Personalizados */}
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                        Eventos Personalizados
                      </div>
                      <SelectItem value="button_clicked">Botão Clicado</SelectItem>
                      <SelectItem value="page_viewed">Página Visualizada</SelectItem>
                      <SelectItem value="form_submitted">Formulário Enviado</SelectItem>
                      <SelectItem value="product_purchased">Produto Comprado</SelectItem>
                      <SelectItem value="email_opened">Email Aberto</SelectItem>
                      <SelectItem value="link_clicked">Link Clicado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <Label className="text-sm font-medium mb-1">Vezes Executado</Label>
                  <Select
                    value={(localCondition as PerformedNode).timesOperator}
                    onValueChange={v => handlePropertyChange('timesOperator', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GreaterThanOrEqual">Pelo menos</SelectItem>
                      <SelectItem value="LessThan">Menos que</SelectItem>
                      <SelectItem value="Equals">Exatamente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label className="text-sm font-medium mb-1">Quantidade</Label>
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
                  Propriedades
                </Button>
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
                  Janela de Tempo
                </Button>
              </div>

              {/* Properties Panel */}
              {showPropertyConfig && (
                <div className="rounded-lg border p-4">
                  <h4 className="text-sm font-semibold mb-2">Propriedades do Evento</h4>
                  <div className="space-y-2">
                    {performedProperties.map((prop, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded border">
                        {/* Special handling for attributeName in custom_attribute_changed */}
                        {(localCondition as PerformedNode).event === 'custom_attribute_changed' &&
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
                                    ? 'Carregando...'
                                    : 'Selecione um atributo'
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {availableCustomAttributes.length === 0 &&
                                !loadingCustomAttributes && (
                                  <div className="p-2 text-sm text-muted-foreground text-center">
                                    Nenhum atributo personalizado cadastrado
                                  </div>
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
                        ((localCondition as PerformedNode).event === 'label_added' ||
                            (localCondition as PerformedNode).event === 'label_removed') &&
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
                                  loadingLabels ? 'Carregando...' : 'Selecione uma label'
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {availableLabels.length === 0 && !loadingLabels && (
                                <div className="p-2 text-sm text-muted-foreground text-center">
                                  Nenhuma label cadastrada
                                </div>
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
                            placeholder="Caminho"
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
                            <SelectItem value="Equals">Igual</SelectItem>
                            <SelectItem value="NotEquals">Diferente</SelectItem>
                            <SelectItem value="Contains">Contém</SelectItem>
                            <SelectItem value="Exists">Existe</SelectItem>
                          </SelectContent>
                        </Select>
                        {prop.operator.type !== 'Exists' && (
                          <Input
                            placeholder="Valor"
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
                      Adicionar Propriedade
                    </Button>
                  </div>
                </div>
              )}

              {/* Time Window Panel */}
              {showTimeWindow && (
                <div className="rounded-lg border p-4">
                  <h4 className="text-sm font-semibold mb-2">Janela de Tempo</h4>
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
                        <SelectItem value="minutes">Minutos</SelectItem>
                        <SelectItem value="hours">Horas</SelectItem>
                        <SelectItem value="days">Dias</SelectItem>
                        <SelectItem value="weeks">Semanas</SelectItem>
                        <SelectItem value="months">Meses</SelectItem>
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
                <Label className="text-sm font-medium mb-1">Nome do Evento</Label>
                <div className="flex gap-2">
                  <Input
                    value={(localCondition as LastPerformedNode).event}
                    onChange={e => handlePropertyChange('event', e.target.value)}
                    placeholder="Ex: button_clicked, page_viewed"
                    className="flex-1"
                  />
                  <Select
                    value=""
                    onValueChange={templateKey => {
                      if (templateKey) {
                        applyLastPerformedTemplate(templateKey);
                      }
                    }}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Templates" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Eventos de Contato */}
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                        Eventos de Contato
                      </div>
                      <SelectItem value="contact_created">Contato Criado</SelectItem>
                      <SelectItem value="contact_updated">Contato Atualizado</SelectItem>
                      <SelectItem value="label_added">Label Adicionada</SelectItem>
                      <SelectItem value="label_removed">Label Removida</SelectItem>
                      <SelectItem value="custom_attribute_changed">
                        Atributo Personalizado
                      </SelectItem>

                      {/* Eventos de Conversa */}
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                        Eventos de Conversa
                      </div>
                      <SelectItem value="conversation_created">Conversa Criada</SelectItem>
                      <SelectItem value="conversation_updated">Conversa Atualizada</SelectItem>
                      <SelectItem value="message_created">Mensagem Criada</SelectItem>
                      <SelectItem value="message_updated">Mensagem Atualizada</SelectItem>

                      {/* Eventos de Pipeline */}
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                        Eventos de Pipeline
                      </div>
                      <SelectItem value="pipeline_conversation_added">
                        Adicionado ao Pipeline
                      </SelectItem>
                      <SelectItem value="pipeline_stage_changed">Mudança de Estágio</SelectItem>
                      <SelectItem value="pipeline_custom_fields_updated">
                        Campos Personalizados
                      </SelectItem>

                      {/* Eventos de Segmento */}
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                        Eventos de Segmento
                      </div>
                      <SelectItem value="segment_entered">Entrou no Segmento</SelectItem>
                      <SelectItem value="segment_exited">Saiu do Segmento</SelectItem>

                      {/* Eventos Personalizados */}
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                        Eventos Personalizados
                      </div>
                      <SelectItem value="button_clicked">Botão Clicado</SelectItem>
                      <SelectItem value="page_viewed">Página Visualizada</SelectItem>
                      <SelectItem value="form_submitted">Formulário Enviado</SelectItem>
                      <SelectItem value="product_purchased">Produto Comprado</SelectItem>
                      <SelectItem value="email_opened">Email Aberto</SelectItem>
                      <SelectItem value="link_clicked">Link Clicado</SelectItem>
                    </SelectContent>
                  </Select>
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
                  Onde Propriedades
                </Button>
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
                  Janela de Tempo
                </Button>
              </div>

              {/* Properties Panel */}
              {showPropertyConfig && (
                <div className="rounded-lg border p-4">
                  <h4 className="text-sm font-semibold mb-2">Onde Propriedades</h4>
                  <div className="space-y-2">
                    {performedProperties.map((prop, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded border">
                        {/* Special handling for attributeName in custom_attribute_changed */}
                        {(localCondition as LastPerformedNode).event ===
                          'custom_attribute_changed' && prop.path === 'attributeName' ? (
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
                                    ? 'Carregando...'
                                    : 'Selecione um atributo'
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {availableCustomAttributes.length === 0 &&
                                !loadingCustomAttributes && (
                                  <div className="p-2 text-sm text-muted-foreground text-center">
                                    Nenhum atributo personalizado cadastrado
                                  </div>
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
                        ((localCondition as LastPerformedNode).event === 'label_added' ||
                            (localCondition as LastPerformedNode).event === 'label_removed') &&
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
                                  loadingLabels ? 'Carregando...' : 'Selecione uma label'
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {availableLabels.length === 0 && !loadingLabels && (
                                <div className="p-2 text-sm text-muted-foreground text-center">
                                  Nenhuma label cadastrada
                                </div>
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
                            placeholder="Caminho"
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
                            <SelectItem value="Equals">Igual</SelectItem>
                            <SelectItem value="NotEquals">Diferente</SelectItem>
                            <SelectItem value="Contains">Contém</SelectItem>
                            <SelectItem value="Exists">Existe</SelectItem>
                          </SelectContent>
                        </Select>
                        {prop.operator.type !== 'Exists' && (
                          <Input
                            placeholder="Valor"
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
                      Adicionar Propriedade
                    </Button>
                  </div>
                </div>
              )}

              {/* Time Window Panel */}
              {showTimeWindow && (
                <div className="rounded-lg border p-4">
                  <h4 className="text-sm font-semibold mb-2">Janela de Tempo</h4>
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
                        <SelectItem value="minutes">Minutos</SelectItem>
                        <SelectItem value="hours">Horas</SelectItem>
                        <SelectItem value="days">Dias</SelectItem>
                        <SelectItem value="weeks">Semanas</SelectItem>
                        <SelectItem value="months">Meses</SelectItem>
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
                <Label className="text-sm font-medium mb-1">Evento de Email</Label>
                <Select
                  value={(localCondition as EmailNode).event || 'MessageSent'}
                  onValueChange={v => handlePropertyChange('event', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MessageSent">Email Enviado</SelectItem>
                    <SelectItem value="EmailOpened">Email Aberto</SelectItem>
                    <SelectItem value="EmailClicked">Email Clicado</SelectItem>
                    <SelectItem value="EmailBounced">Email Retornado</SelectItem>
                    <SelectItem value="EmailDelivered">Email Entregue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium mb-1">Template ID (opcional)</Label>
                <Input
                  value={(localCondition as EmailNode).templateId || ''}
                  onChange={e => handlePropertyChange('templateId', e.target.value)}
                  placeholder="ID do template de email"
                />
              </div>
            </div>
          )}

          {/* WhatsApp Configuration */}
          {selectedConditionType === 'WhatsApp' && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-1">Evento de WhatsApp</Label>
                <Select
                  value={(localCondition as EmailNode).event || 'MessageSent'}
                  onValueChange={v => handlePropertyChange('event', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MessageSent">WhatsApp Enviado</SelectItem>
                    <SelectItem value="MessageRead">WhatsApp Lido</SelectItem>
                    <SelectItem value="MessageReplied">WhatsApp Respondido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium mb-1">Template ID (opcional)</Label>
                <Input
                  value={(localCondition as EmailNode).templateId || ''}
                  onChange={e => handlePropertyChange('templateId', e.target.value)}
                  placeholder="ID do template de WhatsApp"
                />
              </div>
            </div>
          )}

          {/* Web Configuration */}
          {selectedConditionType === 'Web' && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-1">Evento Web</Label>
                <Select
                  value={(localCondition as EmailNode).event || 'MessageSent'}
                  onValueChange={v => handlePropertyChange('event', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MessageSent">Mensagem Web Enviada</SelectItem>
                    <SelectItem value="MessageOpened">Mensagem Web Aberta</SelectItem>
                    <SelectItem value="MessageClicked">Mensagem Web Clicada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium mb-1">Template ID (opcional)</Label>
                <Input
                  value={(localCondition as EmailNode).templateId || ''}
                  onChange={e => handlePropertyChange('templateId', e.target.value)}
                  placeholder="ID do template web"
                />
              </div>
            </div>
          )}

          {/* SMS Configuration */}
          {selectedConditionType === 'SMS' && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-1">Evento de SMS</Label>
                <Select
                  value={(localCondition as EmailNode).event || 'MessageSent'}
                  onValueChange={v => handlePropertyChange('event', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MessageSent">SMS Enviado</SelectItem>
                    <SelectItem value="MessageRead">SMS Lido</SelectItem>
                    <SelectItem value="MessageReplied">SMS Respondido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium mb-1">Template ID (opcional)</Label>
                <Input
                  value={(localCondition as EmailNode).templateId || ''}
                  onChange={e => handlePropertyChange('templateId', e.target.value)}
                  placeholder="ID do template de SMS"
                />
              </div>
            </div>
          )}

          {/* Random Bucket Configuration */}
          {selectedConditionType === 'RandomBucket' && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-1">Porcentagem Incluída</Label>
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
              <h4 className="text-lg font-semibold mb-2">Upload Manual de Segmento</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Faça upload de um arquivo CSV com os IDs dos usuários
              </p>
              <Button variant="outline">📁 Upload CSV</Button>
              <p className="text-xs text-muted-foreground mt-2">Formato: Uma coluna com user_id</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
