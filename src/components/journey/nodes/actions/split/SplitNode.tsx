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
    const colorMap: Record<
      string,
      { bg: string; border: string; text: string; hoverBg: string; hoverBorder: string }
    > = {
      blue: {
        bg: 'bg-blue-50 dark:bg-blue-950/10',
        border: 'border-blue-300 dark:border-blue-700/40',
        text: 'text-blue-700 dark:text-blue-400',
        hoverBg: 'hover:bg-blue-100 dark:hover:bg-blue-900/20',
        hoverBorder: 'hover:border-blue-400 dark:hover:border-blue-600/50',
      },
      purple: {
        bg: 'bg-purple-50 dark:bg-purple-950/10',
        border: 'border-purple-300 dark:border-purple-700/40',
        text: 'text-purple-700 dark:text-purple-400',
        hoverBg: 'hover:bg-purple-100 dark:hover:bg-purple-900/20',
        hoverBorder: 'hover:border-purple-400 dark:hover:border-purple-600/50',
      },
      green: {
        bg: 'bg-green-50 dark:bg-green-950/10',
        border: 'border-green-300 dark:border-green-700/40',
        text: 'text-green-700 dark:text-green-400',
        hoverBg: 'hover:bg-green-100 dark:hover:bg-green-900/20',
        hoverBorder: 'hover:border-green-400 dark:hover:border-green-600/50',
      },
      orange: {
        bg: 'bg-orange-50 dark:bg-orange-950/10',
        border: 'border-orange-300 dark:border-orange-700/40',
        text: 'text-orange-700 dark:text-orange-400',
        hoverBg: 'hover:bg-orange-100 dark:hover:bg-orange-900/20',
        hoverBorder: 'hover:border-orange-400 dark:hover:border-orange-600/50',
      },
      red: {
        bg: 'bg-red-50 dark:bg-red-950/10',
        border: 'border-red-300 dark:border-red-700/40',
        text: 'text-red-700 dark:text-red-400',
        hoverBg: 'hover:bg-red-100 dark:hover:bg-red-900/20',
        hoverBorder: 'hover:border-red-400 dark:hover:border-red-600/50',
      },
      yellow: {
        bg: 'bg-yellow-50 dark:bg-yellow-950/10',
        border: 'border-yellow-300 dark:border-yellow-700/40',
        text: 'text-yellow-700 dark:text-yellow-400',
        hoverBg: 'hover:bg-yellow-100 dark:hover:bg-yellow-900/20',
        hoverBorder: 'hover:border-yellow-400 dark:hover:border-yellow-600/50',
      },
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
          colorClasses.hoverBg,
          colorClasses.hoverBorder,
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="font-medium text-foreground">
              <span className={cn('font-semibold', colorClasses.text)}>{variant.name}</span>{' '}
              <span className="text-muted-foreground">({variant.percentage}%)</span>
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
            <h3 className="text-sm font-medium text-foreground truncate">{t('panels.split.nodeTitle')}</h3>
          </div>
          <div className="flex-shrink-0">
            <Settings className="w-3 h-3 text-muted-foreground" />
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
