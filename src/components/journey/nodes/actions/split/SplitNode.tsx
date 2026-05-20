import { Split, Settings } from 'lucide-react';
import { BaseFlowNode } from '@/components/base';
import { Handle, Position, useEdges } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/hooks/useLanguage';

export interface SplitVariant {
  id: string;
  name: string;
  percentage: number;
  color: string;
}

export interface SplitNodeData {
  label: string;
  description?: string;
  variants: SplitVariant[];
}

export interface SplitNodeType {
  id: string;
  type: 'split-node';
  position: { x: number; y: number };
  data: SplitNodeData;
}

interface SplitNodeProps {
  selected: boolean;
  data: SplitNodeData;
  id: string;
}

export function SplitNode({ selected, data, id }: SplitNodeProps) {
  const { t } = useLanguage('journey');
  const edges = useEdges();

  const defaultVariants: SplitVariant[] = [
    { id: 'variant-a', name: t('panels.split.variants.defaultNames.variantA'), percentage: 50, color: 'blue' },
    { id: 'variant-b', name: t('panels.split.variants.defaultNames.variantB'), percentage: 50, color: 'purple' },
  ];

  // Verificar se um handle está conectado
  const isHandleConnected = (handleId: string) => {
    return edges.some(edge => edge.source === id && edge.sourceHandle === handleId);
  };

  const variants = data.variants && data.variants.length > 0 ? data.variants : defaultVariants;

  const getVariantColorClasses = (color: string) => {
    const colorMap: Record<string, { bg: string; border: string; text: string }> = {
      blue: { bg: 'bg-blue-950/10', border: 'border-blue-700/40', text: 'text-blue-400' },
      purple: { bg: 'bg-purple-950/10', border: 'border-purple-700/40', text: 'text-purple-400' },
      green: { bg: 'bg-green-950/10', border: 'border-green-700/40', text: 'text-green-400' },
      orange: { bg: 'bg-orange-950/10', border: 'border-orange-700/40', text: 'text-orange-400' },
      red: { bg: 'bg-red-950/10', border: 'border-red-700/40', text: 'text-red-400' },
      yellow: { bg: 'bg-yellow-950/10', border: 'border-yellow-700/40', text: 'text-yellow-400' },
    };
    return colorMap[color] || colorMap.blue;
  };

  const renderVariant = (variant: SplitVariant) => {
    const handleId = `split-variant-${variant.id}`;
    const isConnected = isHandleConnected(handleId);
    const colorClasses = getVariantColorClasses(variant.color);

    return (
      <div
        key={variant.id}
        className={cn(
          'mb-3 cursor-pointer rounded-lg border p-3 text-left transition-all duration-200',
          colorClasses.bg,
          colorClasses.border,
          `hover:${colorClasses.border.replace('/40', '/50')} hover:${colorClasses.bg.replace(
            '/10',
            '/20',
          )}`,
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="font-medium text-neutral-300">
              <span className={cn('font-semibold', colorClasses.text)}>{variant.name}</span>{' '}
              <span className="text-neutral-400">({variant.percentage}%)</span>
            </p>
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

  return (
    <BaseFlowNode
      selected={selected}
      hasTarget={true}
      borderColor="purple"
      isExecuting={false}
      hasSource={false}
      nodeId={id}
      targetHandleId="split-input"
    >
      <div className="space-y-3">
        {/* Header seguindo nosso padrão */}
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
            <Split className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{t('panels.split.nodeTitle')}</h3>
          </div>
          <div className="flex-shrink-0">
            <Settings className="w-3 h-3 text-gray-400" />
          </div>
        </div>

        {/* Renderizar cada variante */}
        {variants && variants.length > 0 ? (
          <div className="space-y-2">{variants.map(variant => renderVariant(variant))}</div>
        ) : (
          <div className="p-3 rounded-lg border-2 border-dashed border-purple-300 bg-purple-50 dark:bg-purple-950/20 text-center">
            <Split className="h-6 w-6 text-purple-400 mx-auto mb-2" />
            <p className="text-xs text-purple-600 dark:text-purple-300">{t('panels.split.configure')}</p>
          </div>
        )}
      </div>
    </BaseFlowNode>
  );
}
