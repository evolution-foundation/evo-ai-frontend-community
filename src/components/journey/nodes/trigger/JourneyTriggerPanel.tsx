import { useState, useEffect } from 'react';
import { Button } from '@evoapi/design-system';
import { Play } from 'lucide-react';
import { JourneyTriggerNodeData } from './JourneyTriggerNode';
import { BaseFlowPanel } from '@/components/base';
import { JourneyVariable } from '@/components/journey/environment-manager';
import { useLanguage } from '@/hooks/useLanguage';
import {
  TriggerTypeSelector,
  TriggerDescription,
  EventConfiguration,
  SegmentConfiguration,
  ContactConfiguration,
  LabelConfiguration,
  CustomAttributeConfiguration,
  WebhookConfiguration,
} from './components';

interface JourneyTriggerPanelProps {
  nodeId: string;
  data: JourneyTriggerNodeData;
  onUpdate: (nodeId: string, newData: JourneyTriggerNodeData) => void;
  onClose: () => void;
  journeyId: string;
  onVariablesChange?: (variables: JourneyVariable[]) => void;
}

export function JourneyTriggerPanel({
  nodeId,
  data,
  onUpdate,
  onClose,
  journeyId,
  onVariablesChange,
}: JourneyTriggerPanelProps) {
  const { t } = useLanguage('journey');
  const [formData, setFormData] = useState<JourneyTriggerNodeData>(data);
  const [eventProperties, setEventProperties] = useState(data.eventProperties || []);
  const [contactFields, setContactFields] = useState(data.contactFields || []);
  const [showEventConfig, setShowEventConfig] = useState(data.triggerType === 'event');
  const [showSegmentConfig, setShowSegmentConfig] = useState(data.triggerType === 'segment');
  const [showContactConfig, setShowContactConfig] = useState(
    ['contactCreated', 'contactUpdated'].includes(data.triggerType),
  );
  const [showLabelConfig, setShowLabelConfig] = useState(data.triggerType === 'label');
  const [showCustomAttributeConfig, setShowCustomAttributeConfig] = useState(
    data.triggerType === 'customAttribute',
  );
  const [showWebhookConfig, setShowWebhookConfig] = useState(data.triggerType === 'webhook');

  useEffect(() => {
    setFormData(data);
    setEventProperties(data.eventProperties || []);
    setContactFields(data.contactFields || []);
    setShowEventConfig(data.triggerType === 'event');
    setShowSegmentConfig(data.triggerType === 'segment');
    setShowContactConfig(['contactCreated', 'contactUpdated'].includes(data.triggerType));
    setShowLabelConfig(data.triggerType === 'label');
    setShowCustomAttributeConfig(data.triggerType === 'customAttribute');
    setShowWebhookConfig(data.triggerType === 'webhook');
  }, [data]);

  const handleSave = () => {
    const updatedData = {
      ...formData,
      eventProperties: showEventConfig ? eventProperties : undefined,
      segmentId: showSegmentConfig ? formData.segmentId : undefined,
      segmentName: showSegmentConfig ? formData.segmentName : undefined,
      segmentAction: showSegmentConfig ? formData.segmentAction : undefined,
      contactFields: showContactConfig ? contactFields : undefined,
      labelId: showLabelConfig ? formData.labelId : undefined,
      labelName: showLabelConfig ? formData.labelName : undefined,
      labelAction: showLabelConfig ? formData.labelAction : undefined,
      customAttributeName: showCustomAttributeConfig ? formData.customAttributeName : undefined,
      customAttributeDisplayName: showCustomAttributeConfig
        ? formData.customAttributeDisplayName
        : undefined,
      customAttributeOperator: showCustomAttributeConfig
        ? formData.customAttributeOperator
        : undefined,
      customAttributeValue: showCustomAttributeConfig ? formData.customAttributeValue : undefined,
      webhookUrl: showWebhookConfig ? formData.webhookUrl : undefined,
      webhookSecret: showWebhookConfig ? formData.webhookSecret : undefined,
      webhookMethod: showWebhookConfig ? formData.webhookMethod : undefined,
      expectedHeaders: showWebhookConfig ? formData.expectedHeaders : undefined,
    };
    onUpdate(nodeId, updatedData);
    onClose();
  };

  const handleTriggerTypeChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      triggerType: value as JourneyTriggerNodeData['triggerType'],
    }));
    setShowEventConfig(value === 'event');
    setShowSegmentConfig(value === 'segment');
    setShowContactConfig(['contactCreated', 'contactUpdated'].includes(value));
    setShowLabelConfig(value === 'label');
    setShowCustomAttributeConfig(value === 'customAttribute');
    setShowWebhookConfig(value === 'webhook');
  };

  const handleEventNameChange = (name: string) => {
    setFormData(prev => ({ ...prev, eventName: name }));
  };

  const handleSegmentIdChange = (segmentId: string, segmentName?: string) => {
    setFormData(prev => ({ ...prev, segmentId, segmentName }));
  };

  const handleSegmentActionChange = (action: 'entered' | 'exited') => {
    setFormData(prev => ({ ...prev, segmentAction: action }));
  };

  const handleLabelIdChange = (labelId: string, labelName?: string) => {
    setFormData(prev => ({ ...prev, labelId, labelName }));
  };

  const handleLabelActionChange = (action: 'applied' | 'removed') => {
    setFormData(prev => ({ ...prev, labelAction: action }));
  };

  const handleCustomAttributeNameChange = (name: string, displayName?: string) => {
    setFormData(prev => ({
      ...prev,
      customAttributeName: name,
      customAttributeDisplayName: displayName,
    }));
  };

  const handleCustomAttributeOperatorChange = (operator: string) => {
    setFormData(prev => ({ ...prev, customAttributeOperator: operator }));
  };

  const handleCustomAttributeValueChange = (value: string) => {
    setFormData(prev => ({ ...prev, customAttributeValue: value }));
  };

  // Webhook handlers
  const handleWebhookUrlChange = (url: string) => {
    setFormData(prev => ({ ...prev, webhookUrl: url }));
  };

  const handleExpectedHeadersChange = (headers: Array<{ name: string; value: string }>) => {
    setFormData(prev => ({ ...prev, expectedHeaders: headers }));
  };

  return (
    <BaseFlowPanel
      title={t('panels.trigger.title')}
      icon={<Play className="w-5 h-5 text-green-500" />}
      onClose={onClose}
      width="w-[800px]"
    >
      {/* Tipo do Trigger */}
      <TriggerTypeSelector value={formData.triggerType} onChange={handleTriggerTypeChange} />

      {/* Descrição baseada no tipo */}
      <TriggerDescription triggerType={formData.triggerType} />

      {/* Configuração de Evento */}
      {showEventConfig && (
        <EventConfiguration
          eventName={formData.eventName || ''}
          eventProperties={eventProperties}
          onEventNameChange={handleEventNameChange}
          onEventPropertiesChange={setEventProperties}
          variableMappings={formData.variableMappings || []}
          onVariableMappingsChange={mappings =>
            setFormData(prev => ({ ...prev, variableMappings: mappings }))
          }
          journeyId={journeyId}
        />
      )}

      {/* Configuração de Segmento */}
      {showSegmentConfig && (
        <SegmentConfiguration
          segmentId={formData.segmentId || ''}
          segmentAction={formData.segmentAction || 'entered'}
          onSegmentIdChange={handleSegmentIdChange}
          onSegmentActionChange={handleSegmentActionChange}
        />
      )}

      {/* Configuração de Contato */}
      {showContactConfig && (
        <ContactConfiguration
          triggerType={formData.triggerType as 'contactCreated' | 'contactUpdated'}
          contactFields={contactFields}
          onContactFieldsChange={setContactFields}
          variableMappings={formData.variableMappings || []}
          onVariableMappingsChange={mappings =>
            setFormData(prev => ({ ...prev, variableMappings: mappings }))
          }
          journeyId={journeyId}
        />
      )}

      {/* Configuração de Etiqueta */}
      {showLabelConfig && (
        <LabelConfiguration
          labelId={formData.labelId || ''}
          labelAction={formData.labelAction || 'applied'}
          onLabelIdChange={handleLabelIdChange}
          onLabelActionChange={handleLabelActionChange}
        />
      )}

      {/* Configuração de Atributo Personalizado */}
      {showCustomAttributeConfig && (
        <CustomAttributeConfiguration
          attributeName={formData.customAttributeName || ''}
          operator={formData.customAttributeOperator || 'equals'}
          value={formData.customAttributeValue || ''}
          onAttributeNameChange={handleCustomAttributeNameChange}
          onOperatorChange={handleCustomAttributeOperatorChange}
          onValueChange={handleCustomAttributeValueChange}
          variableMappings={formData.variableMappings || []}
          onVariableMappingsChange={mappings =>
            setFormData(prev => ({ ...prev, variableMappings: mappings }))
          }
          journeyId={journeyId}
        />
      )}

      {/* Configuração de Webhook */}
      {showWebhookConfig && (
        <WebhookConfiguration
          webhookUrl={formData.webhookUrl || ''}
          expectedHeaders={formData.expectedHeaders}
          onWebhookUrlChange={handleWebhookUrlChange}
          onExpectedHeadersChange={handleExpectedHeadersChange}
          journeyId={journeyId}
          variableMappings={formData.variableMappings || []}
          onVariableMappingsChange={mappings =>
            setFormData(prev => ({ ...prev, variableMappings: mappings }))
          }
          onVariablesChange={onVariablesChange}
        />
      )}

      {/* Botões de ação */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onClose} className="flex-1 h-10">
          {t('panels.trigger.cancel')}
        </Button>
        <Button onClick={handleSave} className="flex-1 h-10">
          {t('panels.trigger.save')}
        </Button>
      </div>
    </BaseFlowPanel>
  );
}
