import i18n from '@/i18n/config';
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Node, NodePositionChange, XYPosition } from "@xyflow/react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============================================================================
// FLOW UTILITIES
// ============================================================================

// Tipos para helper lines
export type GetHelperLinesResult = {
  horizontal?: number;
  vertical?: number;
  snapPosition: Partial<XYPosition>;
};

// Configurações para snap
export interface SnapConfig {
  distance?: number;
  enableHorizontal?: boolean;
  enableVertical?: boolean;
  enableCenter?: boolean;
  enableEdges?: boolean;
}

/**
 * Calcula as linhas de ajuda e posição de snap para um node
 * @param change - Mudança de posição do node
 * @param nodes - Todos os nodes do flow
 * @param config - Configurações de snap
 */
export function getHelperLines(
  change: NodePositionChange,
  nodes: Node[],
  config: SnapConfig = {}
): GetHelperLinesResult {
  const {
    distance = 5,
    enableHorizontal = true,
    enableVertical = true,
    enableCenter = true,
    enableEdges = true,
  } = config;

  const defaultResult = {
    horizontal: undefined,
    vertical: undefined,
    snapPosition: { x: undefined, y: undefined },
  };

  const nodeA = nodes.find((node) => node.id === change.id);

  if (!nodeA || !change.position) {
    return defaultResult;
  }

  const nodeABounds = {
    left: change.position.x,
    right: change.position.x + (nodeA.width || 0),
    top: change.position.y,
    bottom: change.position.y + (nodeA.height || 0),
    centerX: change.position.x + (nodeA.width || 0) / 2,
    centerY: change.position.y + (nodeA.height || 0) / 2,
  };

  let horizontalDistance = distance;
  let verticalDistance = distance;

  return nodes
    .filter((node) => node.id !== nodeA.id)
    .reduce<GetHelperLinesResult>((result, nodeB) => {
      const nodeBBounds = {
        left: nodeB.position.x,
        right: nodeB.position.x + (nodeB.width || 0),
        top: nodeB.position.y,
        bottom: nodeB.position.y + (nodeB.height || 0),
        centerX: nodeB.position.x + (nodeB.width || 0) / 2,
        centerY: nodeB.position.y + (nodeB.height || 0) / 2,
      };

      // Verificar alinhamento horizontal
      if (enableHorizontal) {
        // Alinhamento pelo topo
        if (enableEdges && Math.abs(nodeABounds.top - nodeBBounds.top) < horizontalDistance) {
          result.snapPosition.y = nodeBBounds.top;
          result.horizontal = nodeBBounds.top;
          horizontalDistance = Math.abs(nodeABounds.top - nodeBBounds.top);
        }

        // Alinhamento pelo centro horizontal
        if (enableCenter && Math.abs(nodeABounds.centerY - nodeBBounds.centerY) < horizontalDistance) {
          result.snapPosition.y = nodeBBounds.centerY - (nodeA.height || 0) / 2;
          result.horizontal = nodeBBounds.centerY;
          horizontalDistance = Math.abs(nodeABounds.centerY - nodeBBounds.centerY);
        }

        // Alinhamento pela base
        if (enableEdges && Math.abs(nodeABounds.bottom - nodeBBounds.bottom) < horizontalDistance) {
          result.snapPosition.y = nodeBBounds.bottom - (nodeA.height || 0);
          result.horizontal = nodeBBounds.bottom;
          horizontalDistance = Math.abs(nodeABounds.bottom - nodeBBounds.bottom);
        }
      }

      // Verificar alinhamento vertical
      if (enableVertical) {
        // Alinhamento pela esquerda
        if (enableEdges && Math.abs(nodeABounds.left - nodeBBounds.left) < verticalDistance) {
          result.snapPosition.x = nodeBBounds.left;
          result.vertical = nodeBBounds.left;
          verticalDistance = Math.abs(nodeABounds.left - nodeBBounds.left);
        }

        // Alinhamento pelo centro vertical
        if (enableCenter && Math.abs(nodeABounds.centerX - nodeBBounds.centerX) < verticalDistance) {
          result.snapPosition.x = nodeBBounds.centerX - (nodeA.width || 0) / 2;
          result.vertical = nodeBBounds.centerX;
          verticalDistance = Math.abs(nodeABounds.centerX - nodeBBounds.centerX);
        }

        // Alinhamento pela direita
        if (enableEdges && Math.abs(nodeABounds.right - nodeBBounds.right) < verticalDistance) {
          result.snapPosition.x = nodeBBounds.right - (nodeA.width || 0);
          result.vertical = nodeBBounds.right;
          verticalDistance = Math.abs(nodeABounds.right - nodeBBounds.right);
        }
      }

      return result;
    }, defaultResult);
}

/**
 * Aplica snap a uma mudança de posição de node
 * @param change - Mudança de posição original
 * @param snapPosition - Posição de snap calculada
 */
export function applySnapToChange(
  change: NodePositionChange,
  snapPosition: Partial<XYPosition>
): NodePositionChange {
  if (change.position) {
    return {
      ...change,
      position: {
        x: snapPosition.x ?? change.position.x,
        y: snapPosition.y ?? change.position.y,
      },
    };
  }

  return change;
}

/**
 * Calcula a posição central de um conjunto de nodes
 * @param nodes - Array de nodes
 */
export function getNodesCenter(nodes: Node[]): XYPosition {
  if (nodes.length === 0) {
    return { x: 0, y: 0 };
  }

  const bounds = nodes.reduce(
    (acc, node) => {
      const left = node.position.x;
      const right = node.position.x + (node.width || 0);
      const top = node.position.y;
      const bottom = node.position.y + (node.height || 0);

      return {
        left: Math.min(acc.left, left),
        right: Math.max(acc.right, right),
        top: Math.min(acc.top, top),
        bottom: Math.max(acc.bottom, bottom),
      };
    },
    {
      left: Infinity,
      right: -Infinity,
      top: Infinity,
      bottom: -Infinity,
    }
  );

  return {
    x: (bounds.left + bounds.right) / 2,
    y: (bounds.top + bounds.bottom) / 2,
  };
}

/**
 * Gera um ID único para nodes
 * @param prefix - Prefixo para o ID
 */
export function generateNodeId(prefix: string = 'node'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Valida se um flow tem pelo menos um node de início
 * @param nodes - Array de nodes
 * @param startNodeTypes - Tipos de nodes considerados como início
 */
export function validateFlowStart(
  nodes: Node[],
  startNodeTypes: string[] = ['trigger-node', 'start-node']
): { isValid: boolean; error?: string } {
  const startNodes = nodes.filter(node => startNodeTypes.includes(node.type || ''));

  if (startNodes.length === 0) {
    return {
      isValid: false,
      error: i18n.t("interface:utils.theFlowMustHaveAtLeastOneStartNode")
    };
  }

  if (startNodes.length > 1) {
    return {
      isValid: false,
      error: i18n.t("interface:utils.theFlowMustHaveOnlyOneStartNode")
    };
  }

  return { isValid: true };
}

/**
 * Encontra nodes órfãos (sem conexões)
 * @param nodes - Array de nodes
 * @param edges - Array de edges
 */
export function findOrphanNodes(nodes: Node[], edges: any[]): Node[] {
  return nodes.filter(node => {
    const hasIncoming = edges.some(edge => edge.target === node.id);
    const hasOutgoing = edges.some(edge => edge.source === node.id);
    return !hasIncoming && !hasOutgoing;
  });
}

/**
 * Calcula estatísticas do flow
 * @param nodes - Array de nodes
 * @param edges - Array de edges
 */
export function getFlowStats(nodes: Node[], edges: any[]) {
  const nodesByType = nodes.reduce((acc, node) => {
    const type = node.type || 'unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const orphanNodes = findOrphanNodes(nodes, edges);

  return {
    totalNodes: nodes.length,
    totalEdges: edges.length,
    nodesByType,
    orphanNodes: orphanNodes.length,
    orphanNodeIds: orphanNodes.map(node => node.id),
  };
}

// ============================================================================
// BASE FLOW COMPONENTS UTILITIES
// ============================================================================

/**
 * Utilitário para criar configuração de MiniMap com cores por tipo de node
 */
export function createMiniMapNodeColors(customColors: Record<string, string> = {}): Record<string, string> {
  const defaultColors = {
    'trigger-node': '#10b981',
    'action-node': '#3b82f6',
    'condition-node': '#f59e0b',
    'communication-node': '#8b5cf6',
    'flow-node': '#06b6d4',
    'assign-agent-node': '#3b82f6',
    'assign-team-node': '#6366f1',
    'add-label-node': '#10b981',
    'remove-label-node': '#ef4444',
    'send-message-node': '#f97316',
    'send-attachment-node': '#06b6d4',
    'send-email-team-node': '#a855f7',
    'send-transcript-node': '#14b8a6',
    'send-webhook-node': '#8b5cf6',
    'mute-conversation-node': '#f97316',
    'snooze-conversation-node': '#eab308',
    'resolve-conversation-node': '#10b981',
    'change-priority-node': '#6366f1',
  };

  return {
    ...defaultColors,
    ...customColors,
  };
}

/**
 * Resultado da validação de flow
 */
export interface FlowValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Utilitário para validar dados de flow (versão estendida)
 */
export function validateFlowExtended(nodes: Node[], edges: any[]): FlowValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Verificar se há pelo menos um node
  if (nodes.length === 0) {
    errors.push(i18n.t("interface:utils.theFlowMustHaveAtLeastOneNode"));
  }

  // Verificar se há um node trigger
  const triggerNodes = nodes.filter(node => node.type === 'trigger-node');
  if (triggerNodes.length === 0) {
    errors.push(i18n.t("interface:utils.theFlowMustHaveAtLeastOneTriggerNode"));
  }

  // Verificar nodes órfãos (sem conexões)
  const connectedNodeIds = new Set();
  edges.forEach(edge => {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  });

  const orphanNodes = nodes.filter(node =>
    node.type !== 'trigger-node' && !connectedNodeIds.has(node.id)
  );

  if (orphanNodes.length > 0) {
    warnings.push(i18n.t("interface:messages.unconnectedNodes", { count: orphanNodes.length }));
  }

  // Verificar dados obrigatórios nos nodes
  nodes.forEach(node => {
    if (!node.data?.label) {
      warnings.push(i18n.t("interface:messages.nodeWithoutLabel", { id: node.id }));
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Utilitário para criar configurações padrão do ReactFlow para automação
 */
export function createAutomationReactFlowProps() {
  return {
    minZoom: 0.1,
    maxZoom: 10,
    fitView: false,
    defaultViewport: { x: 250, y: 0, zoom: 1 },
    elevateEdgesOnSelect: true,
    elevateNodesOnSelect: true,
    defaultEdgeOptions: { type: 'default' },
  };
}
