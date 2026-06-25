import { GitBranch, Settings } from 'lucide-react';
import { BaseFlowNode } from '@/components/base';
import { Handle, Position, useEdges } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/hooks/useLanguage';
import { usePipelineStageNames } from '@/hooks/usePipelineStageNames';

export const PIPELINE_STAGE_FIELD = '{{conversation.pipeline_stage_id}}';

export interface Condition {
  id: string;
  type: 'trigger' | 'contact' | 'system' | 'custom';
  field: string;
  operator: string;
  value: any;
  /** Human-readable label for `value` when it is an opaque id (e.g. a pipeline stage). Display-only. */
  valueLabel?: string;
  customVariable?: string;
}

export interface ConditionalPath {
  id: string;
  name: string;
  color?: string;
  logicalOperator: 'AND' | 'OR';
  conditions: Condition[];
}

export interface ConditionalNodeData {
  label: string;
  description?: string;
  paths: ConditionalPath[];
  // Mantendo compatibilidade temporária
  rules?: ConditionalRule[];
  logicalOperator?: 'AND' | 'OR';
}

// Interface legada para compatibilidade
export interface ConditionalRule {
  id: string;
  type: 'trigger' | 'contact' | 'system';
  field: string;
  operator: string;
  value: any;
  connector?: 'AND' | 'OR';
}

export interface ConditionalNodeType {
  id: string;
  type: 'conditional-node';
  position: { x: number; y: number };
  data: ConditionalNodeData;
}

interface ConditionalNodeProps {
  selected: boolean;
  data: ConditionalNodeData;
  id: string;
}

export function ConditionalNode({ selected, data, id }: ConditionalNodeProps) {
  const edges = useEdges();
  const { t } = useLanguage('journey');

  const hasPipelineStageCondition = (data.paths || []).some(path =>
    (path.conditions || []).some(condition => condition.field === PIPELINE_STAGE_FIELD),
  );
  const stageNames = usePipelineStageNames(hasPipelineStageCondition);

  // Verificar se um handle está conectado
  const isHandleConnected = (handleId: string) => {
    return edges.some(edge => edge.source === id && edge.sourceHandle === handleId);
  };

  const getFieldLabel = (field: string) => {
    const fieldLabels: Record<string, string> = {
      'contact.name': t('panels.conditional.fieldLabels.contactName'),
      'contact.email': t('panels.conditional.fieldLabels.contactEmail'),
      'contact.phone': t('panels.conditional.fieldLabels.contactPhone'),
      'event.name': t('panels.conditional.fieldLabels.eventName'),
      'event.value': t('panels.conditional.fieldLabels.eventValue'),
      'event.properties': t('panels.conditional.fieldLabels.eventProperties'),
      'system.current_time': t('panels.conditional.fieldLabels.systemCurrentTime'),
      'system.current_day': t('panels.conditional.fieldLabels.systemCurrentDay'),
      'system.current_date': t('panels.conditional.fieldLabels.systemCurrentDate'),
      '{{conversation.pipeline_stage_id}}': t(
        'panels.conditional.fieldLabels.conversationPipelineStage',
      ),
    };
    return fieldLabels[field] || field;
  };

  const getOperatorLabel = (operator: string) => {
    const operatorLabels: Record<string, string> = {
      equals: t('panels.conditional.operators.equalsSymbol'),
      not_equals: t('panels.conditional.operators.notEqualsSymbol'),
      greater_than: t('panels.conditional.operators.greaterThanSymbol'),
      less_than: t('panels.conditional.operators.lessThanSymbol'),
      contains: t('panels.conditional.operators.containsText'),
      not_contains: t('panels.conditional.operators.notContainsText'),
      starts_with: t('panels.conditional.operators.startsWithText'),
      ends_with: t('panels.conditional.operators.endsWithText'),
      is_empty: t('panels.conditional.operators.isEmptyText'),
      is_not_empty: t('panels.conditional.operators.isNotEmptyText'),
    };
    return operatorLabels[operator] || operator;
  };

  const needsValue = (operator: string) => {
    return !['is_empty', 'is_not_empty'].includes(operator);
  };

  const getPathColor = (color?: string) => {
    const colors: Record<
      string,
      { border: string; bg: string; text: string; hoverBorder: string; hoverBg: string }
    > = {
      green: {
        border: 'border-green-300 dark:border-green-700/40',
        bg: 'bg-green-50 dark:bg-green-950/10',
        text: 'text-green-700 dark:text-green-400',
        hoverBorder: 'hover:border-green-400 dark:hover:border-green-600/50',
        hoverBg: 'hover:bg-green-100 dark:hover:bg-green-900/20',
      },
      blue: {
        border: 'border-blue-300 dark:border-blue-700/40',
        bg: 'bg-blue-50 dark:bg-blue-950/10',
        text: 'text-blue-700 dark:text-blue-400',
        hoverBorder: 'hover:border-blue-400 dark:hover:border-blue-600/50',
        hoverBg: 'hover:bg-blue-100 dark:hover:bg-blue-900/20',
      },
      purple: {
        border: 'border-purple-300 dark:border-purple-700/40',
        bg: 'bg-purple-50 dark:bg-purple-950/10',
        text: 'text-purple-700 dark:text-purple-400',
        hoverBorder: 'hover:border-purple-400 dark:hover:border-purple-600/50',
        hoverBg: 'hover:bg-purple-100 dark:hover:bg-purple-900/20',
      },
      orange: {
        border: 'border-orange-300 dark:border-orange-700/40',
        bg: 'bg-orange-50 dark:bg-orange-950/10',
        text: 'text-orange-700 dark:text-orange-400',
        hoverBorder: 'hover:border-orange-400 dark:hover:border-orange-600/50',
        hoverBg: 'hover:bg-orange-100 dark:hover:bg-orange-900/20',
      },
      yellow: {
        border: 'border-yellow-300 dark:border-yellow-700/40',
        bg: 'bg-yellow-50 dark:bg-yellow-950/10',
        text: 'text-yellow-700 dark:text-yellow-400',
        hoverBorder: 'hover:border-yellow-400 dark:hover:border-yellow-600/50',
        hoverBg: 'hover:bg-yellow-100 dark:hover:bg-yellow-900/20',
      },
    };
    return colors[color || 'yellow'] || colors.yellow;
  };

  const renderPath = (path: ConditionalPath, index: number) => {
    // The backend matches `edge.sourceHandle === path.id` exactly, without
    // stripping any prefix (conditional.node.ts / journey-execution.workflow.ts).
    // So the source Handle id — which React Flow copies into the new edge's
    // sourceHandle — must be the raw `path.id`, with no `path-` prefix.
    // (EVO-1902 / e2e D13. The Split node uses a prefix on both sides, so it's fine.)
    const handleId = path.id;
    const isConnected = isHandleConnected(handleId);
    const colors = getPathColor(path.color);

    if (!path.conditions || path.conditions.length === 0) {
      return (
        <div
          key={path.id}
          className={cn(
            'mb-3 cursor-pointer rounded-lg border border-dashed p-3 text-left transition-all duration-200',
            colors.border,
            colors.bg,
            colors.hoverBorder,
            colors.hoverBg,
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className={cn('text-xs font-medium', colors.text)}>
                {path.name || t('panels.conditional.pathNumber', { number: index + 1 })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{t('panels.conditional.noConditionsConfigured')}</p>
            </div>
            <Handle
              className={cn(
                '!rounded-full transition-all duration-300',
                isConnected
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
              id={handleId}
            />
          </div>
        </div>
      );
    }

    return (
      <div
        key={path.id}
        className={cn(
          'mb-3 cursor-pointer rounded-lg border p-3 text-left transition-all duration-200',
          colors.border,
          colors.bg,
          colors.hoverBorder,
          colors.hoverBg,
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className={cn('text-xs font-bold mb-2', colors.text)}>
              {path.name || t('panels.conditional.pathNumber', { number: index + 1 })}
            </p>
            <div className="space-y-1">
              {path.conditions.map((condition, idx) => (
                <div key={condition.id} className="text-xs">
                  {idx > 0 && (
                    <span className="text-muted-foreground font-medium mr-1">
                      {path.logicalOperator === 'AND' ? t('panels.conditional.logicalOperators.and') : t('panels.conditional.logicalOperators.or')}
                    </span>
                  )}
                  <span className="text-foreground">{getFieldLabel(condition.field)}</span>{' '}
                  <span className="text-muted-foreground">{getOperatorLabel(condition.operator)}</span>
                  {needsValue(condition.operator) && condition.value && (
                    <>
                      {' '}
                      <span className="text-green-700 dark:text-green-400 font-medium">
                        "
                        {stageNames.get(condition.value) ||
                          condition.valueLabel ||
                          condition.value}
                        "
                      </span>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
          <Handle
            className={cn(
              '!rounded-full transition-all duration-300',
              isConnected
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
            id={handleId}
          />
        </div>
      </div>
    );
  };

  // Compatibilidade com estrutura antiga
  const paths = data.paths || [];
  const hasLegacyRules = data.rules && data.rules.length > 0;

  return (
    <BaseFlowNode
      selected={selected}
      hasTarget={true}
      borderColor="yellow"
      isExecuting={false}
      hasSource={false}
      nodeId={id}
      targetHandleId="conditional-input"
    >
      <div className="space-y-3">
        {/* Header seguindo nosso padrão */}
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
            <GitBranch className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-foreground truncate">
              {t('panels.conditional.nodeTitle')}
            </h3>
          </div>
          <div className="flex-shrink-0">
            <Settings className="w-3 h-3 text-muted-foreground" />
          </div>
        </div>

        {/* Renderizar caminhos */}
        {paths.length > 0 ? (
          <div className="space-y-2">{paths.map((path, index) => renderPath(path, index))}</div>
        ) : hasLegacyRules ? (
          // Fallback para estrutura antiga
          <div className="p-3 rounded-lg border border-yellow-300 bg-yellow-50 dark:border-yellow-700/40 dark:bg-yellow-950/10">
            <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-2">
              {t('panels.conditional.oldStructureDetected')}
            </p>
          </div>
        ) : (
          <div className="p-3 rounded-lg border-2 border-dashed border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 text-center">
            <GitBranch className="h-6 w-6 text-yellow-400 mx-auto mb-2" />
            <p className="text-xs text-yellow-700 dark:text-yellow-300">{t('panels.conditional.configurePaths')}</p>
          </div>
        )}

        {/* Handle para "caso contrário" - sempre presente */}
        <div className="cursor-pointer rounded-lg border border-red-300 bg-red-50 hover:border-red-400 hover:bg-red-100 dark:border-red-700/40 dark:bg-red-950/10 dark:hover:border-red-600/50 dark:hover:bg-red-900/10 p-3 text-left transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="font-medium text-foreground">
                <span className="font-semibold text-red-700 dark:text-red-400">{t('panels.conditional.otherwiseCase')}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('panels.conditional.otherwiseDescription')}
              </p>
            </div>
            <Handle
              className={cn(
                '!rounded-full transition-all duration-300',
                isHandleConnected('else')
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
              id="else"
            />
          </div>
        </div>
      </div>
    </BaseFlowNode>
  );
}
