import { useState, useEffect } from 'react';
import { Separator } from '@evoapi/design-system';
import {
  TriggerTypeSelector,
  TriggerDescription,
  EventConfiguration,
  SegmentConfiguration,
  ContactConfiguration,
  LabelConfiguration,
  CustomAttributeConfiguration,
  WebhookConfiguration,
} from '@/components/journey/nodes/trigger/components';

export type CampaignTriggerType =
  | 'manual'
  | 'event'
  | 'segment'
  | 'webhook'
  | 'contactCreated'
  | 'contactUpdated'
  | 'label'
  | 'customAttribute';

export interface CampaignTriggerConfig {
  triggerType: CampaignTriggerType;
  // Configurações de evento
  eventName?: string;
  eventProperties?: Array<{
    path: string;
    operator: { type: string; value?: any };
  }>;
  // Configurações de segmento
  segmentId?: string;
  segmentName?: string;
  segmentAction?: 'entered' | 'exited';
  // Configurações de campos de contato (para contactCreated/contactUpdated)
  contactFields?: Array<{
    field: string;
    operator: string;
    value?: any;
  }>;
  // Configurações de etiqueta
  labelId?: string;
  labelName?: string;
  labelAction?: 'applied' | 'removed';
  // Configurações de atributo personalizado
  customAttributeName?: string;
  customAttributeDisplayName?: string;
  customAttributeOperator?: string;
  customAttributeValue?: string;
  // Configurações de webhook
  webhookUrl?: string;
  webhookSecret?: string;
  webhookMethod?: 'POST' | 'PUT' | 'PATCH';
  expectedHeaders?: Array<{
    name: string;
    value: string;
  }>;
}

interface CampaignTriggerConfigProps {
  config: CampaignTriggerConfig;
  onChange: (config: CampaignTriggerConfig) => void;
}

export function CampaignTriggerConfig({ config, onChange }: CampaignTriggerConfigProps) {
  const [formData, setFormData] = useState<CampaignTriggerConfig>(config);
  const [eventProperties, setEventProperties] = useState(config.eventProperties || []);
  const [contactFields, setContactFields] = useState(config.contactFields || []);

  useEffect(() => {
    setFormData(config);
    setEventProperties(config.eventProperties || []);
    setContactFields(config.contactFields || []);
  }, [config]);

  const showEventConfig = formData.triggerType === 'event';
  const showSegmentConfig = formData.triggerType === 'segment';
  const showContactConfig = ['contactCreated', 'contactUpdated'].includes(formData.triggerType);
  const showLabelConfig = formData.triggerType === 'label';
  const showCustomAttributeConfig = formData.triggerType === 'customAttribute';
  const showWebhookConfig = formData.triggerType === 'webhook';

  const updateFormData = (updates: Partial<CampaignTriggerConfig>) => {
    const updated = { ...formData, ...updates };
    setFormData(updated);
    onChange(updated);
  };

  const handleTriggerTypeChange = (value: string) => {
    const triggerType = value as CampaignTriggerType;
    // Limpar configurações específicas quando mudar o tipo
    const cleaned: CampaignTriggerConfig = {
      triggerType,
      // Manter apenas o que é relevante para o novo tipo
      ...(triggerType === 'event' && {
        eventName: formData.eventName,
        eventProperties: formData.eventProperties,
      }),
      ...(triggerType === 'segment' && {
        segmentId: formData.segmentId,
        segmentName: formData.segmentName,
        segmentAction: formData.segmentAction,
      }),
      ...(['contactCreated', 'contactUpdated'].includes(triggerType) && {
        contactFields: formData.contactFields,
      }),
      ...(triggerType === 'label' && {
        labelId: formData.labelId,
        labelName: formData.labelName,
        labelAction: formData.labelAction,
      }),
      ...(triggerType === 'customAttribute' && {
        customAttributeName: formData.customAttributeName,
        customAttributeDisplayName: formData.customAttributeDisplayName,
        customAttributeOperator: formData.customAttributeOperator,
        customAttributeValue: formData.customAttributeValue,
      }),
      ...(triggerType === 'webhook' && {
        webhookUrl: formData.webhookUrl,
        webhookSecret: formData.webhookSecret,
        webhookMethod: formData.webhookMethod,
        expectedHeaders: formData.expectedHeaders,
      }),
    };
    updateFormData(cleaned);
  };

  const handleEventNameChange = (name: string) => {
    updateFormData({ eventName: name });
  };

  const handleSegmentIdChange = (segmentId: string, segmentName?: string) => {
    updateFormData({ segmentId, segmentName });
  };

  const handleSegmentActionChange = (action: 'entered' | 'exited') => {
    updateFormData({ segmentAction: action });
  };

  const handleLabelIdChange = (labelId: string, labelName?: string) => {
    updateFormData({ labelId, labelName });
  };

  const handleLabelActionChange = (action: 'applied' | 'removed') => {
    updateFormData({ labelAction: action });
  };

  const handleCustomAttributeNameChange = (name: string, displayName?: string) => {
    updateFormData({
      customAttributeName: name,
      customAttributeDisplayName: displayName,
    });
  };

  const handleCustomAttributeOperatorChange = (operator: string) => {
    updateFormData({ customAttributeOperator: operator });
  };

  const handleCustomAttributeValueChange = (value: string) => {
    updateFormData({ customAttributeValue: value });
  };

  const handleWebhookUrlChange = (url: string) => {
    updateFormData({ webhookUrl: url });
  };

  const handleExpectedHeadersChange = (headers: Array<{ name: string; value: string }>) => {
    updateFormData({ expectedHeaders: headers });
  };

  // Os componentes de config abaixo (EventConfiguration etc.) são INTENCIONALMENTE os
  // MESMOS compartilhados com o Flow Builder (JourneyTriggerPanel), do mesmo barrel
  // `@/components/journey/nodes/trigger/components`. A única diferença é o contexto via
  // props. Campanha NÃO tem jornada, então `journeyId` é omitido (prop opcional): o
  // autocomplete de variáveis cai para variáveis de sistema sem disparar fetch a
  // getJourneyVariables (EVO-1608, removendo o antigo sentinel 'campaign-trigger').
  return (
    <>
      <Separator className="my-4" />
      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-base font-semibold">Configuração de Trigger</h3>
          <p className="text-sm text-muted-foreground">
            Configure como a campanha será disparada automaticamente
          </p>
        </div>

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
            onEventPropertiesChange={props => {
              setEventProperties(props);
              updateFormData({ eventProperties: props });
            }}
            variableMappings={[]}
            onVariableMappingsChange={undefined}          />
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
            onContactFieldsChange={fields => {
              setContactFields(fields);
              updateFormData({ contactFields: fields });
            }}
            variableMappings={[]}
            onVariableMappingsChange={undefined}          />
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
            variableMappings={[]}
            onVariableMappingsChange={undefined}          />
        )}

        {/* Configuração de Webhook */}
        {showWebhookConfig && (
          <WebhookConfiguration
            webhookUrl={formData.webhookUrl || ''}
            expectedHeaders={formData.expectedHeaders}
            onWebhookUrlChange={handleWebhookUrlChange}
            onExpectedHeadersChange={handleExpectedHeadersChange}            variableMappings={[]}
            onVariableMappingsChange={undefined}
          />
        )}
      </div>
    </>
  );
}
