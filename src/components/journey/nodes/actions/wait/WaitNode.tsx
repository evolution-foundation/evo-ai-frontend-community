import { Clock, Settings, Zap, GitBranch } from 'lucide-react';
import { BaseFlowNode } from '@/components/base';
import { Handle, Position, useEdges } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { type DataMapping } from '@/components/journey/environment-manager';
import { useLanguage } from '@/hooks/useLanguage';

export interface WaitNodeData {
  label: string;
  description?: string;
  waitType: 'time' | 'event' | 'condition' | 'time_or_condition';

  // Para tipo time
  duration?: number;
  timeUnit?: 'minutes' | 'hours' | 'days';

  // Para tipo event (mesmo padrão do trigger)
  eventType?: string;
  eventTemplate?: string;
  eventProperties?: Array<{ path: string; operator: { type: string; value?: any } }>;
  segmentId?: string;
  segmentAction?: 'entered' | 'exited';
  labelId?: string;
  labelAction?: 'applied' | 'removed';
  attributeName?: string;
  attributeOperator?: string;
  attributeValue?: string;
  webhookUrl?: string;
  webhookHeaders?: Array<{ key: string; value: string }>;

  // Para tipo condition (mesmo padrão do trigger)
  conditionType?: string;
  conditionField?: string;
  conditionOperator?: string;
  conditionValue?: any;
  contactFields?: Array<{ field: string; operator: string; value: string }>;

  // Para híbrido e timeout
  hasTimeout?: boolean;
  maxWaitTime?: number;
  maxWaitUnit?: 'minutes' | 'hours' | 'days';

  // Sistema de fallback
  enableFallback?: boolean;
  fallbackTime?: number;
  fallbackUnit?: 'minutes' | 'hours' | 'days';

  // Mapeamento de variáveis
  variableMappings?: DataMapping[];
}

export interface WaitNodeType {
  id: string;
  type: 'wait-node';
  position: { x: number; y: number };
  data: WaitNodeData;
}

interface WaitNodeProps {
  selected: boolean;
  data: WaitNodeData;
  id: string;
}

export function WaitNode({ selected, data, id }: WaitNodeProps) {
  const { t } = useLanguage('journey');
  const edges = useEdges();

  // Verificar se um handle está conectado
  const isHandleConnected = (handleId: string) => {
    return edges.some(edge => edge.source === id && edge.sourceHandle === handleId);
  };

  const getWaitTypeConfig = () => {
    const waitType = data.waitType || 'time';

    switch (waitType) {
      case 'time':
        return {
          icon: Clock,
          color: 'blue',
          title: t('flowEditor.nodes.wait.types.time'),
          hasMultipleOutputs: false,
        };
      case 'event':
        return {
          icon: Zap,
          color: 'green',
          title: t('flowEditor.nodes.wait.types.event'),
          hasMultipleOutputs: data.enableFallback || false,
        };
      case 'condition':
        return {
          icon: GitBranch,
          color: 'yellow',
          title: t('flowEditor.nodes.wait.types.condition'),
          hasMultipleOutputs: data.enableFallback || false,
        };
      case 'time_or_condition':
        return {
          icon: Clock,
          color: 'purple',
          title: t('flowEditor.nodes.wait.types.timeOrCondition'),
          hasMultipleOutputs: true,
        };
      default:
        return {
          icon: Clock,
          color: 'blue',
          title: t('flowEditor.nodes.wait.name'),
          hasMultipleOutputs: false,
        };
    }
  };

  const getWaitDescription = () => {
    const waitType = data.waitType || 'time';

    switch (waitType) {
      case 'time': {
        if (!data.duration || !data.timeUnit) {
          return t('flowEditor.nodes.wait.descriptions.configureTime');
        }
        const duration = data.duration;
        const unit = data.timeUnit;

        const unitKey = duration === 1 ? `units.${unit}.singular` : `units.${unit}.plural`;
        return t('flowEditor.nodes.wait.descriptions.duration', {
          duration,
          unit: t(unitKey),
        });
      }

      case 'event': {
        if (!data.eventType) {
          return t('flowEditor.nodes.wait.descriptions.configureEvent');
        }
        const eventTypeLabels: Record<string, string> = {
          event: t('flowEditor.nodes.wait.eventTypes.event'),
          segment: t('flowEditor.nodes.wait.eventTypes.segment'),
          contactCreated: t('flowEditor.nodes.wait.eventTypes.contactCreated'),
          contactUpdated: t('flowEditor.nodes.wait.eventTypes.contactUpdated'),
          label: t('flowEditor.nodes.wait.eventTypes.label'),
          customAttribute: t('flowEditor.nodes.wait.eventTypes.customAttribute'),
          webhook: t('flowEditor.nodes.wait.eventTypes.webhook'),
        };
        let eventLabel = eventTypeLabels[data.eventType] || data.eventType;

        // Adicionar detalhes específicos se disponíveis
        switch (data.eventType) {
          case 'event':
            if (data.eventTemplate) eventLabel += `: ${data.eventTemplate}`;
            break;
          case 'segment':
            if (data.segmentId) eventLabel += `: ${data.segmentId}`;
            break;
          case 'label':
            if (data.labelId) eventLabel += `: ${data.labelId}`;
            break;
          case 'customAttribute':
            if (data.attributeName) eventLabel += `: ${data.attributeName}`;
            break;
          case 'webhook':
            if (data.webhookUrl) eventLabel += `: ${data.webhookUrl}`;
            break;
        }

        // Adicionar info de timeout se habilitado
        if (data.enableFallback && data.fallbackTime && data.fallbackUnit) {
          const unitShort = t(`units.${data.fallbackUnit}.short`);
          eventLabel += ` (${t('flowEditor.nodes.wait.descriptions.maxTime', {
            time: data.fallbackTime,
            unit: unitShort,
          })})`;
        }

        return eventLabel;
      }

      case 'condition': {
        if (!data.conditionType) {
          return t('flowEditor.nodes.wait.descriptions.configureCondition');
        }
        const conditionTypeLabels: Record<string, string> = {
          contactCreated: t('flowEditor.nodes.wait.eventTypes.contactCreated'),
          contactUpdated: t('flowEditor.nodes.wait.eventTypes.contactUpdated'),
          label: t('flowEditor.nodes.wait.eventTypes.label'),
          customAttribute: t('flowEditor.nodes.wait.eventTypes.customAttribute'),
        };
        let conditionLabel = conditionTypeLabels[data.conditionType] || data.conditionType;

        // Adicionar detalhes específicos se disponíveis
        switch (data.conditionType) {
          case 'contactCreated':
          case 'contactUpdated':
            if (data.contactFields && data.contactFields.length > 0) {
              conditionLabel += ` ${t('flowEditor.nodes.wait.descriptions.withFilters')}`;
            }
            break;
          case 'label':
            if (data.labelId) {
              const actionKey = data.labelAction === 'removed' ? 'removed' : 'applied';
              conditionLabel += ` ${t(`flowEditor.nodes.wait.descriptions.${actionKey}`)}`;
            }
            break;
          case 'customAttribute':
            if (data.attributeName) {
              conditionLabel += `: ${data.attributeName}`;
              if (data.attributeOperator && data.attributeValue) {
                conditionLabel += ` ${data.attributeOperator} "${data.attributeValue}"`;
              }
            }
            break;
        }

        // Adicionar info de timeout se habilitado
        if (data.enableFallback && data.fallbackTime && data.fallbackUnit) {
          const unitShort = t(`units.${data.fallbackUnit}.short`);
          conditionLabel += ` (${t('flowEditor.nodes.wait.descriptions.maxTime', {
            time: data.fallbackTime,
            unit: unitShort,
          })})`;
        }

        return conditionLabel;
      }

      case 'time_or_condition': {
        const hasTime = data.maxWaitTime && data.maxWaitUnit;
        const hasCondition = data.conditionType || data.eventType;

        if (!hasTime && !hasCondition) {
          return t('flowEditor.nodes.wait.descriptions.configureTimeAndCondition');
        }
        if (!hasTime) {
          return t('flowEditor.nodes.wait.descriptions.configureMaxTime');
        }
        if (!hasCondition) {
          return t('flowEditor.nodes.wait.descriptions.configureCondition');
        }

        const maxDuration = data.maxWaitTime;
        const maxUnit = data.maxWaitUnit;
        const maxUnitKey =
          maxDuration === 1 ? `units.${maxUnit}.singular` : `units.${maxUnit}.plural`;
        const maxUnitLabel = t(maxUnitKey);

        return t('flowEditor.nodes.wait.descriptions.maxPrefix', {
          duration: maxDuration,
          unit: maxUnitLabel,
        });
      }

      default:
        return t('flowEditor.nodes.wait.descriptions.configureWaitType');
    }
  };

  const typeConfig = getWaitTypeConfig();
  const IconComponent = typeConfig.icon;

  // Determinar se precisa de múltiplas saídas
  const needsMultipleOutputs = typeConfig.hasMultipleOutputs;

  return (
    <BaseFlowNode
      selected={selected}
      hasTarget={true}
      borderColor={typeConfig.color}
      isExecuting={false}
      hasSource={!needsMultipleOutputs}
      nodeId={id}
      sourceHandleId="wait-output"
      targetHandleId="wait-input"
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className={`flex-shrink-0 w-8 h-8 bg-${typeConfig.color}-500 rounded-lg flex items-center justify-center`}
          >
            <IconComponent className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {typeConfig.title}
            </h3>
          </div>
          <div className="flex-shrink-0">
            <Settings className="w-3 h-3 text-gray-400" />
          </div>
        </div>

        {/* Descrição */}
        <div
          className={`p-2 rounded-md bg-${typeConfig.color}-50 dark:bg-${typeConfig.color}-950/20 border border-${typeConfig.color}-200 dark:border-${typeConfig.color}-800/30`}
        >
          <p
            className={`text-xs text-${typeConfig.color}-800 dark:text-${typeConfig.color}-200 leading-relaxed`}
          >
            {getWaitDescription()}
            {/* Indicador de caso contrário */}
            {data.enableFallback && (
              <span className="block mt-1 text-xs text-red-600 dark:text-red-400 font-medium">
                ⏱️{' '}
                {t('flowEditor.nodes.wait.descriptions.otherwiseAfter', {
                  time: data.fallbackTime || 1,
                  unit: t(`units.${data.fallbackUnit || 'minutes'}.short`),
                })}
              </span>
            )}
          </p>
        </div>

        {/* Handles customizados para múltiplas saídas */}
        {needsMultipleOutputs && (
          <div className="space-y-2">
            {/* Handle principal (condição/evento atendido) */}
            <div className="mb-3 cursor-pointer rounded-lg border border-green-700/40 bg-green-950/10 p-3 text-left transition-all duration-200 hover:border-green-600/50 hover:bg-green-900/10">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-neutral-300">
                    <span className="font-semibold text-green-400">
                      {data.waitType === 'event'
                        ? t('flowEditor.nodes.wait.outputs.eventOccurred')
                        : data.waitType === 'condition'
                        ? t('flowEditor.nodes.wait.outputs.conditionMet')
                        : t('flowEditor.nodes.wait.outputs.firstToOccur')}
                    </span>
                  </p>
                </div>
                <Handle
                  className={cn(
                    '!rounded-full transition-all duration-300',
                    isHandleConnected('wait-success')
                      ? '!bg-green-500 !border-green-400'
                      : '!bg-neutral-400 !border-neutral-500',
                  )}
                  style={{
                    top: '50%',
                    right: '-5px',
                    transform: 'translateY(-50%)',
                    height: '14px',
                    position: 'relative',
                    width: '14px',
                  }}
                  type="source"
                  position={Position.Right}
                  id="wait-success"
                />
              </div>
            </div>

            {/* Handle para fallback/timeout */}
            <div className="mb-3 cursor-pointer rounded-lg border border-red-700/40 bg-red-950/10 p-3 text-left transition-all duration-200 hover:border-red-600/50 hover:bg-red-900/10">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-neutral-300">
                    <span className="font-semibold text-red-400">
                      {data.waitType === 'time_or_condition'
                        ? t('flowEditor.nodes.wait.outputs.timeout')
                        : t('flowEditor.nodes.wait.outputs.otherwise')}
                    </span>
                    {data.enableFallback && data.fallbackTime && data.fallbackUnit && (
                      <span className="text-xs text-red-300 block mt-1">
                        {t('flowEditor.nodes.wait.descriptions.after', {
                          time: data.fallbackTime,
                          unit: t(`units.${data.fallbackUnit}.short`),
                        })}
                      </span>
                    )}
                  </p>
                </div>
                <Handle
                  className={cn(
                    '!rounded-full transition-all duration-300',
                    isHandleConnected('wait-otherwise')
                      ? '!bg-green-500 !border-green-400'
                      : '!bg-neutral-400 !border-neutral-500',
                  )}
                  style={{
                    top: '50%',
                    right: '-5px',
                    transform: 'translateY(-50%)',
                    height: '14px',
                    position: 'relative',
                    width: '14px',
                  }}
                  type="source"
                  position={Position.Right}
                  id="wait-otherwise"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </BaseFlowNode>
  );
}
