import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { BaseFlowNode } from '@/components/base/BaseFlowNode';
import { metaForType } from './segmentCanvasMeta';

/**
 * One generic canvas tile used for every segment node type. It shows the node
 * type's label + icon; the detailed configuration is edited in the inspector
 * (the existing SegmentConditionEditor) when the node is selected.
 */
function SegmentCanvasNodeComponent({ type, selected }: NodeProps) {
  const meta = metaForType(String(type));
  const Icon = meta.icon;
  return (
    <BaseFlowNode
      selected={!!selected}
      hasTarget={false}
      hasSource={false}
      borderColor={meta.color}
      width="w-[220px]"
    >
      <div className="flex items-start gap-2">
        <Icon className="h-4 w-4 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-neutral-100">{meta.label}</p>
          <p className="truncate text-xs text-neutral-400">{meta.description}</p>
        </div>
      </div>
    </BaseFlowNode>
  );
}

export const SegmentCanvasNode = memo(SegmentCanvasNodeComponent);
