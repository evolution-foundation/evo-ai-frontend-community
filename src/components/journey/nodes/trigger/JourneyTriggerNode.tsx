import { Play, Settings } from 'lucide-react';
import { BaseFlowNode } from '@/components/base';
import { type DataMapping } from '@/components/journey/environment-manager';
import { useLanguage } from '@/hooks/useLanguage';

export interface JourneyTriggerNodeData {
  label: string;
  description?: string;
  triggerType:
    | 'manual'
    | 'event'
    | 'segment'
    | 'webhook'
    | 'contactCreated'
    | 'contactUpdated'
    | 'label'
    | 'customAttribute';
  // Configurações de evento
  eventName?: string;
  eventProperties?: Array<{
    path: string;
    operator: { type: string; value?: unknown };
  }>;
  // Configurações de segmento
  segmentId?: string;
  segmentName?: string;
  segmentAction?: 'entered' | 'exited';
  // Configurações de campos de contato (para contactCreated/contactUpdated)
  contactFields?: Array<{
    field: string;
    operator: string;
    value?: unknown;
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
  // Outras condições
  conditions?: Array<{
    field?: string;
    operator?: string;
    value?: unknown;
    eventName?: string;
    segmentId?: string;
  }>;
  // Mapeamento de variáveis
  variableMappings?: DataMapping[];
}

export interface JourneyTriggerNodeType {
  id: string;
  type: 'journey-trigger-node';
  position: { x: number; y: number };
  data: JourneyTriggerNodeData;
}

interface JourneyTriggerNodeProps {
  selected: boolean;
  data: JourneyTriggerNodeData;
  id: string;
}

export function JourneyTriggerNode({ selected, data, id }: JourneyTriggerNodeProps) {
  const { t } = useLanguage('journey');

  const getTriggerLabel = () => {
    switch (data.triggerType) {
      case 'manual':
        return t('flowEditor.nodes.trigger.types.manual');
      case 'event':
        return t('flowEditor.nodes.trigger.types.event');
      case 'segment':
        return t('flowEditor.nodes.trigger.types.segment');
      case 'webhook':
        return t('flowEditor.nodes.trigger.types.webhook');
      case 'contactCreated':
        return t('flowEditor.nodes.trigger.types.contactCreated');
      case 'contactUpdated':
        return t('flowEditor.nodes.trigger.types.contactUpdated');
      case 'label':
        return t('flowEditor.nodes.trigger.types.label');
      case 'customAttribute':
        return t('flowEditor.nodes.trigger.types.customAttribute');
      default:
        return t('flowEditor.nodes.trigger.label');
    }
  };

  const getConditionsDescription = () => {
    switch (data.triggerType) {
      case 'manual':
        return t('flowEditor.nodes.trigger.descriptions.manual');

      case 'event':
        if (data.eventName) {
          return `${t('flowEditor.nodes.trigger.types.event')}: ${data.eventName}`;
        }
        return t('flowEditor.nodes.trigger.descriptions.configureEvent');

      case 'segment':
        if (data.segmentId && data.segmentName) {
          const action =
            data.segmentAction === 'entered'
              ? t('flowEditor.nodes.trigger.descriptions.segmentEnters')
              : t('flowEditor.nodes.trigger.descriptions.segmentExits');
          return `Quando ${action} "${data.segmentName}"`;
        } else if (data.segmentId) {
          const action =
            data.segmentAction === 'entered'
              ? t('flowEditor.nodes.trigger.descriptions.whenEnters')
              : t('flowEditor.nodes.trigger.descriptions.whenExits');
          return `${action} ${t('flowEditor.nodes.trigger.descriptions.segment')}`;
        }
        return t('flowEditor.nodes.trigger.descriptions.configureSegment');

      case 'contactCreated':
        if (data.contactFields && data.contactFields.length > 0) {
          const filterText =
            data.contactFields.length > 1
              ? t('flowEditor.nodes.trigger.descriptions.filters')
              : t('flowEditor.nodes.trigger.descriptions.filter');
          return `${t('flowEditor.nodes.trigger.types.contactCreated')} (${
            data.contactFields.length
          } ${filterText})`;
        }
        return t('flowEditor.nodes.trigger.descriptions.anyContactCreated');

      case 'contactUpdated':
        if (data.contactFields && data.contactFields.length > 0) {
          const fieldText =
            data.contactFields.length > 1
              ? t('flowEditor.nodes.trigger.descriptions.fields')
              : t('flowEditor.nodes.trigger.descriptions.field');
          return `${t('flowEditor.nodes.trigger.types.contactUpdated')} (${
            data.contactFields.length
          } ${fieldText})`;
        }
        return t('flowEditor.nodes.trigger.descriptions.anyContactUpdated');

      case 'label':
        if (data.labelId && data.labelName) {
          const action =
            data.labelAction === 'applied'
              ? t('flowEditor.nodes.trigger.descriptions.applied')
              : t('flowEditor.nodes.trigger.descriptions.removed');
          return `"${data.labelName}" ${action}`;
        } else if (data.labelId) {
          const action =
            data.labelAction === 'applied'
              ? t('flowEditor.nodes.trigger.descriptions.applied')
              : t('flowEditor.nodes.trigger.descriptions.removed');
          return `${t('flowEditor.nodes.trigger.types.label')} ${action}`;
        }
        return t('flowEditor.nodes.trigger.descriptions.configureLabel');

      case 'customAttribute':
        if (data.customAttributeName && data.customAttributeDisplayName) {
          return `"${data.customAttributeDisplayName}"`;
        } else if (data.customAttributeName) {
          return `${t('flowEditor.nodes.trigger.descriptions.attribute')}: ${
            data.customAttributeName
          }`;
        }
        return t('flowEditor.nodes.trigger.descriptions.configureAttribute');

      case 'webhook':
        if (data.webhookUrl) {
          return t('flowEditor.nodes.trigger.descriptions.webhook', {
            method: data.webhookMethod || 'POST',
          });
        }
        return t('flowEditor.nodes.trigger.descriptions.configureWebhook');

      default:
        return t('flowEditor.nodes.trigger.descriptions.configureTrigger');
    }
  };

  return (
    <BaseFlowNode
      selected={selected}
      hasTarget={false}
      borderColor="green"
      isExecuting={false}
      hasSource={true}
      nodeId={id}
      sourceHandleId="trigger-output"
    >
      <div className="space-y-3">
        {/* Header com trigger */}
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
            <Play className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-foreground truncate">
              {getTriggerLabel()}
            </h3>
          </div>
          <div className="flex-shrink-0">
            <Settings className="w-3 h-3 text-muted-foreground" />
          </div>
        </div>

        {/* Descrição das condições */}
        <div className="p-2 rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/30">
          <p className="text-xs text-green-800 dark:text-green-200 leading-relaxed whitespace-pre-line">
            {getConditionsDescription()}
          </p>
        </div>
      </div>
    </BaseFlowNode>
  );
}
