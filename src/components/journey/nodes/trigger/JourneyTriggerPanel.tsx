import { useState, useEffect, useMemo } from 'react';
import { Play } from 'lucide-react';
import { JourneyTriggerNodeData } from './JourneyTriggerNode';
import { NodeConfigModal } from '@/components/journey/shared/NodeConfigModal';
import { JourneyVariable } from '@/components/journey/environment-manager';
import { FlowFeedbackBanner } from '@/components/journey/_ui';
import { useLanguage } from '@/hooks/useLanguage';
import {
  TriggerTypeSelector,
  TriggerDescription,
  EventBasicConfig,
  EventAdvancedConfig,
  SegmentConfiguration,
  ContactConfiguration,
  LabelConfiguration,
  CustomAttributeConfiguration,
  WebhookConfiguration,
  PipelineStageChangedConfiguration,
  type PipelineStageChangedSelection,
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
  const [originalData] = useState<JourneyTriggerNodeData>(() => ({
    ...data,
    eventProperties: data.eventProperties || [],
    contactFields: data.contactFields || [],
  }));
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
  const [showPipelineStageChangedConfig, setShowPipelineStageChangedConfig] = useState(
    data.triggerType === 'pipelineStageChanged',
  );
  // Required-field validity reported by EventBasicConfig. True (non-blocking)
  // whenever the event config isn't shown, so other trigger types can always Save.
  const [eventPropsValid, setEventPropsValid] = useState(true);
  // Active tab for the event trigger's Básico/Avançado layout (EVO-1276).
  const [activeTab, setActiveTab] = useState<'basico' | 'avancado'>('basico');

  useEffect(() => {
    setFormData(data);
    setEventProperties(data.eventProperties || []);
    setContactFields(data.contactFields || []);
    if (data.triggerType !== 'event') setEventPropsValid(true);
    setActiveTab('basico');
    setShowEventConfig(data.triggerType === 'event');
    setShowSegmentConfig(data.triggerType === 'segment');
    setShowContactConfig(['contactCreated', 'contactUpdated'].includes(data.triggerType));
    setShowLabelConfig(data.triggerType === 'label');
    setShowCustomAttributeConfig(data.triggerType === 'customAttribute');
    setShowWebhookConfig(data.triggerType === 'webhook');
    setShowPipelineStageChangedConfig(data.triggerType === 'pipelineStageChanged');
  }, [data]);

  const handleSave = () => {
    // Event-tabs path uses an enabled Save + this guard (instead of saveDisabled)
    // so an invalid save snaps the user back to Básico where the inline
    // required-field error lives, rather than silently doing nothing. See EVO-1276.
    if (showEventConfig && !eventPropsValid) {
      setActiveTab('basico');
      return;
    }
    const updatedData = {
      ...formData,
      eventProperties: showEventConfig ? eventProperties : undefined,
      segmentId: showSegmentConfig ? formData.segmentId : undefined,
      segmentName: showSegmentConfig ? formData.segmentName : undefined,
      segmentAction: showSegmentConfig ? (formData.segmentAction ?? 'entered') : undefined,
      contactFields: showContactConfig ? contactFields : undefined,
      labelId: showLabelConfig ? formData.labelId : undefined,
      labelName: showLabelConfig ? formData.labelName : undefined,
      labelAction: showLabelConfig ? (formData.labelAction ?? 'applied') : undefined,
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
      pipelineId: showPipelineStageChangedConfig ? formData.pipelineId : undefined,
      pipelineName: showPipelineStageChangedConfig ? formData.pipelineName : undefined,
      fromStageId: showPipelineStageChangedConfig ? formData.fromStageId : undefined,
      fromStageName: showPipelineStageChangedConfig ? formData.fromStageName : undefined,
      toStageId: showPipelineStageChangedConfig ? formData.toStageId : undefined,
      toStageName: showPipelineStageChangedConfig ? formData.toStageName : undefined,
      eventName: showPipelineStageChangedConfig ? 'pipeline.stage_changed' : formData.eventName,
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
    setShowPipelineStageChangedConfig(value === 'pipelineStageChanged');
    if (value !== 'event') setEventPropsValid(true);
    setActiveTab('basico');
  };

  const handlePipelineStageChangedChange = (next: PipelineStageChangedSelection) => {
    setFormData(prev => ({
      ...prev,
      pipelineId: next.pipelineId,
      pipelineName: next.pipelineName,
      fromStageId: next.fromStageId,
      fromStageName: next.fromStageName,
      toStageId: next.toStageId,
      toStageName: next.toStageName,
    }));
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

  const dirty = useMemo(
    () =>
      JSON.stringify({ ...formData, eventProperties, contactFields }) !==
      JSON.stringify(originalData),
    [formData, eventProperties, contactFields, originalData],
  );

  // Count only fully-filled mappings — an empty placeholder row (added via
  // "New Variable" but not yet completed) must NOT light the Avançado badge.
  // Mirrors VariableMapping's own `validMappings` notion. See EVO-1276 review M1.
  const variableMappingsCount = (formData.variableMappings ?? []).filter(
    m => m.sourcePath && m.variableName,
  ).length;

  // Shared chrome props for both the tabs (event) and simple (other types) modals.
  const commonModalProps = {
    open: true as const,
    title: t('panels.trigger.title'),
    icon: <Play className="w-5 h-5 text-green-500" />,
    onCancel: onClose,
    onSave: handleSave,
    dirty,
    saveLabel: t('panels.actions.save'),
    cancelLabel: t('panels.actions.cancel'),
    savingAriaLabel: t('modal.actions.saving'),
    contentClassName: 'max-w-[800px]',
  };

  // Event trigger type: Básico/Avançado tabs (EVO-1276). Save is enabled and the
  // empty-required-field case is handled by handleSave's guard, so the user is
  // bounced to Básico where the inline error is visible.
  if (showEventConfig) {
    const advancedBadge =
      variableMappingsCount > 0 ? (
        <span
          aria-label={t('panels.trigger.tabs.advancedBadgeLabel')}
          className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium leading-none text-primary-foreground"
        >
          {variableMappingsCount}
        </span>
      ) : undefined;

    return (
      <NodeConfigModal
        {...commonModalProps}
        variant="tabs"
        value={activeTab}
        onTabChange={value => setActiveTab(value as 'basico' | 'avancado')}
        header={
          <div className="space-y-4">
            <TriggerTypeSelector value={formData.triggerType} onChange={handleTriggerTypeChange} />
            <TriggerDescription triggerType={formData.triggerType} />
          </div>
        }
        tabs={[
          {
            value: 'basico',
            label: t('panels.trigger.tabs.basic'),
            // Kept mounted so the selector's local custom-event mode survives a
            // tab switch even before a name is typed (lifted eventName can't
            // encode the empty-custom case). See EVO-1276 review F1.
            forceMount: true,
            content: (
              <EventBasicConfig
                eventName={formData.eventName || ''}
                eventProperties={eventProperties}
                onEventNameChange={handleEventNameChange}
                onEventPropertiesChange={setEventProperties}
                onValidityChange={setEventPropsValid}
                journeyId={journeyId}
              />
            ),
          },
          {
            value: 'avancado',
            label: t('panels.trigger.tabs.advanced'),
            badge: advancedBadge,
            content: (
              <div className="space-y-4">
                <FlowFeedbackBanner variant="info" className="text-xs">
                  {t('panels.trigger.advancedHelp')}
                </FlowFeedbackBanner>
                <EventAdvancedConfig
                  eventProperties={eventProperties}
                  variableMappings={formData.variableMappings || []}
                  onVariableMappingsChange={mappings =>
                    setFormData(prev => ({ ...prev, variableMappings: mappings }))
                  }
                  journeyId={journeyId}
                />
              </div>
            ),
          },
        ]}
      />
    );
  }

  return (
    <NodeConfigModal {...commonModalProps} variant="simple">
      {/* Tipo do Trigger */}
      <TriggerTypeSelector value={formData.triggerType} onChange={handleTriggerTypeChange} />

      {/* Descrição baseada no tipo */}
      <TriggerDescription triggerType={formData.triggerType} />

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

      {/* Configuração de Pipeline Stage Changed (EVO-1266) */}
      {showPipelineStageChangedConfig && (
        <PipelineStageChangedConfiguration
          selection={{
            pipelineId: formData.pipelineId,
            pipelineName: formData.pipelineName,
            fromStageId: formData.fromStageId,
            fromStageName: formData.fromStageName,
            toStageId: formData.toStageId,
            toStageName: formData.toStageName,
          }}
          onChange={handlePipelineStageChangedChange}
        />
      )}
    </NodeConfigModal>
  );
}
