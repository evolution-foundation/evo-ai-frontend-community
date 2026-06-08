import { useMemo, useRef, useState, type ComponentType } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Activity, MessageSquare, User } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { BaseFlowEditor, type NodeCategory, type NodeType } from '@/components/base';
import type { SegmentNodeUnion } from '@/types/analytics/segments';
import SegmentConditionEditor from '@/components/segments/SegmentConditionEditor';
import { SegmentCanvasNode } from './SegmentCanvasNode';
import { SEGMENT_NODE_META } from './segmentCanvasMeta';
import {
  flowFromDefinition,
  reconcileCanvasToDefinition,
  type CanvasFlowData,
  type EntryType,
} from './segmentCanvasAdapters';

// React Flow node registry — one generic tile per type. Channel resolves to
// WhatsApp/Web/SMS, all rendered by SegmentCanvasNode.
const NODE_TYPES: Record<string, ComponentType<NodeProps>> = (() => {
  const reg: Record<string, ComponentType<NodeProps>> = {};
  SEGMENT_NODE_META.forEach((m) => {
    reg[m.type] = SegmentCanvasNode;
  });
  reg.Web = SegmentCanvasNode;
  reg.SMS = SegmentCanvasNode;
  return reg;
})();

export interface SegmentCanvasBuilderProps {
  definitionType: EntryType;
  nodes: SegmentNodeUnion[];
  onNodesChange: (nodes: SegmentNodeUnion[]) => void;
  onDefinitionTypeChange: (type: EntryType) => void;
}

/**
 * Drag-drop canvas editor for a segment, as an alternative to the form-based
 * condition list. Controlled by the page's `nodes`/`definitionType`. The canvas
 * owns structure (drag to add, select+delete to remove); the existing
 * SegmentConditionEditor edits the selected node's fields.
 */
export function SegmentCanvasBuilder({
  definitionType,
  nodes,
  onNodesChange,
  onDefinitionTypeChange,
}: SegmentCanvasBuilderProps) {
  const { t } = useLanguage('segments');

  // Palette labels/descriptions are translated here (not at module scope) so
  // they react to the active language. Categories mirror SegmentNodeMeta.category.
  const nodeCategories = useMemo<NodeCategory[]>(
    () => [
      { value: 'identity', label: t('canvas.categories.identity.label'), icon: User, description: t('canvas.categories.identity.description') },
      { value: 'behavior', label: t('canvas.categories.behavior.label'), icon: Activity, description: t('canvas.categories.behavior.description') },
      { value: 'messages', label: t('canvas.categories.messages.label'), icon: MessageSquare, description: t('canvas.categories.messages.description') },
    ],
    [t],
  );

  const palette = useMemo<Record<string, NodeType[]>>(
    () =>
      SEGMENT_NODE_META.reduce(
        (acc, m) => {
          (acc[m.category] ||= []).push({
            id: m.type,
            name: t(m.labelKey),
            description: t(m.descriptionKey),
            icon: m.icon,
            color: m.color,
            category: m.category,
          });
          return acc;
        },
        {} as Record<string, NodeType[]>,
      ),
    [t],
  );

  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>(undefined);
  // Bumped to force a canvas reseed when structure changes outside the canvas
  // (e.g. the inspector removes a node).
  const [reseedNonce, setReseedNonce] = useState(0);

  // Snapshot the latest state for the reconcile callback without re-seeding.
  const latest = useRef({ nodes, definitionType });
  latest.current = { nodes, definitionType };

  const seed: CanvasFlowData = useMemo(
    () => flowFromDefinition(definitionType, nodes),
    // Intentionally only re-seed on an explicit nonce bump (and at mount), not
    // on every field edit — canvas-driven add/remove already reflects locally.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reseedNonce],
  );

  const handleFlowDataChange = (flow: CanvasFlowData) => {
    const result = reconcileCanvasToDefinition(
      flow,
      latest.current.nodes,
      latest.current.definitionType,
    );
    onDefinitionTypeChange(result.definitionType);
    onNodesChange(result.nodes);
    const selected = flow.nodes.find((n) => n.selected);
    setSelectedNodeId(selected?.id);
  };

  const selectedIndex = nodes.findIndex((n) => n.id === selectedNodeId);
  const selectedNode = selectedIndex >= 0 ? nodes[selectedIndex] : undefined;

  const handleNodeUpdate = (index: number, node: SegmentNodeUnion) => {
    const next = [...nodes];
    next[index] = node;
    onNodesChange(next);
  };

  const handleNodeRemove = (index: number) => {
    onNodesChange(nodes.filter((_, i) => i !== index));
    setSelectedNodeId(undefined);
    setReseedNonce((n) => n + 1); // drop the tile from the canvas too
  };

  return (
    <div className="flex h-[640px] overflow-hidden rounded-lg border">
      <div className="min-w-0 flex-1">
        <BaseFlowEditor
          key={reseedNonce}
          title={t('canvas.title')}
          subtitle={t('canvas.subtitle')}
          flowData={seed}
          showToolbar={false}
          onFlowDataChange={handleFlowDataChange}
          nodeTypes={NODE_TYPES}
          nodePanelNodeTypes={palette}
          nodePanelCategories={nodeCategories}
          nodePanelTitle={t('canvas.panelTitle')}
        />
      </div>
      <aside className="flex w-[360px] flex-shrink-0 flex-col overflow-y-auto border-l bg-muted/20 p-3">
        {nodes.length > 1 && definitionType !== 'Everyone' && (
          <div className="mb-3 flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">{t('canvas.combineWith')}</span>
            {(['And', 'Or'] as const).map((type) => (
              <label key={type} className="flex items-center gap-1">
                <input
                  type="radio"
                  name="segment-canvas-combinator"
                  checked={definitionType === type}
                  onChange={() => onDefinitionTypeChange(type)}
                />
                {type.toUpperCase()}
              </label>
            ))}
          </div>
        )}
        {selectedNode ? (
          <SegmentConditionEditor
            key={selectedNode.id}
            condition={selectedNode}
            index={selectedIndex}
            onUpdate={handleNodeUpdate}
            onRemove={handleNodeRemove}
          />
        ) : (
          <p className="px-1 text-sm text-muted-foreground">{t('canvas.selectNode')}</p>
        )}
      </aside>
    </div>
  );
}
