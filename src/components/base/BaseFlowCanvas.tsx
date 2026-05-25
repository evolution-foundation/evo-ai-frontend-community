import React, { useCallback, useState, useRef } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  type OnConnect,
  ConnectionMode,
  Panel,
  MiniMap,
  ProOptions,
  applyNodeChanges,
  type NodeChange,
  type Node,
  type Edge,
  ConnectionLineType,
} from '@xyflow/react';
import './BaseFlow.css';

import { Button } from '@evoapi/design-system';
import { PanelRightOpen, PanelRightClose } from 'lucide-react';
import { useDnD } from '@/contexts/DnDContext';
import { BaseFlowContextMenu } from './BaseFlowContextMenu';
import { BaseFlowHelperLines } from './BaseFlowHelperLines';
import BaseDefaultEdge from './BaseDefaultEdge';
import { cn, getHelperLines, createMiniMapNodeColors } from '@/lib/utils';
import { useDarkMode } from '@/hooks/useDarkMode';
import { flowTokens } from '@/components/journey/_ui/tokens';

// Edge types padrão
const defaultEdgeTypes = {
  default: BaseDefaultEdge,
  'base-default': BaseDefaultEdge,
};

// Tipos base para configuração do canvas
export interface BaseFlowCanvasProps {
  // Dados do flow
  initialNodes?: Node[];
  initialEdges?: Edge[];

  // Configurações do canvas
  nodeTypes: Record<string, React.ComponentType<any>>;

  // Callbacks essenciais
  onNodesChange?: (changes: NodeChange[]) => void;
  onEdgesChange?: (changes: any[]) => void;
  onConnect?: OnConnect;
  onNodeClick?: (event: React.MouseEvent, node: Node) => void;
  onNodeDoubleClick?: (event: React.MouseEvent, node: Node) => void;
  onDrop?: (event: React.DragEvent) => void;
  onFlowDataChange?: (nodes: Node[], edges: Edge[]) => void;

  // 🆕 Callback estendido com variables (compatibilidade com automação)
  onFlowDataChangeExtended?: (flowData: { nodes: Node[]; edges: Edge[]; variables: any[] }) => void;
  flowVariables?: any[]; // Variables do flow para compatibilidade

  // Configurações visuais
  showMiniMap?: boolean;
  showControls?: boolean;
  showBackground?: boolean;
  backgroundVariant?: 'dots' | 'lines' | 'cross';

  // Painel lateral
  NodePanelComponent?: React.ComponentType<{ onClose: () => void }>;
  showNodePanelByDefault?: boolean;

  // Configurações adicionais
  connectionMode?: ConnectionMode;
  snapToGrid?: boolean;
  snapGrid?: [number, number];

  // Cores do MiniMap por tipo de node
  miniMapNodeColors?: Record<string, string>;

  // Renderização de painéis customizados
  renderCustomPanels?: () => React.ReactNode;

  // Componentes customizados
  ContextMenuComponent?: React.ComponentType<{
    x: number;
    y: number;
    nodeId?: string;
    onClose: () => void;
    onDeleteNode: (nodeId: string) => void;
  }>;
  HelperLinesComponent?: React.ComponentType<{
    horizontal?: number;
    vertical?: number;
  }>;

  // Configurações de helper lines
  enableHelperLines?: boolean;
  helperLinesConfig?: {
    strokeColor?: string;
    lineWidth?: number;
    dashPattern?: number[];
    opacity?: number;
  };

  // 🆕 Helper lines customizado (compatibilidade com automação)
  customHelperLines?: boolean;

  // Classes CSS customizadas
  className?: string;
  canvasClassName?: string;
  style?: React.CSSProperties;

  // 🆕 Sistema de painéis de configuração (compatibilidade com automação)
  configPanelSystem?: boolean;
  renderConfigPanel?: (
    nodeType: string,
    nodeData: any,
    nodeId: string,
    onUpdate: (nodeId: string, data: any) => void,
    onClose: () => void,
  ) => React.ReactNode;

  // 🆕 Configurações específicas do ReactFlow (compatibilidade com automação)
  reactFlowProps?: {
    minZoom?: number;
    maxZoom?: number;
    fitView?: boolean;
    defaultViewport?: { x: number; y: number; zoom: number };
    elevateEdgesOnSelect?: boolean;
    elevateNodesOnSelect?: boolean;
  };
}

const proOptions: ProOptions = { account: 'paid-pro', hideAttribution: true };

export function BaseFlowCanvas({
  initialNodes = [],
  initialEdges = [],
  nodeTypes,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onNodeDoubleClick,
  onDrop,
  onFlowDataChange,
  onFlowDataChangeExtended,
  flowVariables = [],
  showMiniMap = true,
  showControls = true,
  showBackground = true,
  backgroundVariant = 'dots',
  NodePanelComponent,
  showNodePanelByDefault = false,
  connectionMode = ConnectionMode.Strict,
  snapToGrid = false,
  snapGrid = [15, 15],
  miniMapNodeColors = {},
  renderCustomPanels,
  ContextMenuComponent,
  HelperLinesComponent,
  enableHelperLines = true,
  helperLinesConfig = {},
  customHelperLines = false,
  configPanelSystem = false,
  renderConfigPanel,
  reactFlowProps = {},
  className,
  canvasClassName,
  style,
}: BaseFlowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const { type, setPointerEvents, setType } = useDnD();
  const { theme } = useDarkMode();

  // Estados do canvas
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState(initialEdges);
  const [showNodePanel, setShowNodePanel] = useState(showNodePanelByDefault);

  // Context menu
  const [contextMenu, setContextMenu] = useState<{
    show: boolean;
    x: number;
    y: number;
    nodeId?: string;
  }>({ show: false, x: 0, y: 0 });

  // Helper lines para snap visual
  const [helperLineHorizontal, setHelperLineHorizontal] = useState<number | undefined>(undefined);
  const [helperLineVertical, setHelperLineVertical] = useState<number | undefined>(undefined);

  // 🆕 Estados para sistema de painéis de configuração
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [configNodeData, setConfigNodeData] = useState<any>(null);
  const [configPanelType, setConfigPanelType] = useState<string>('');

  // 🆕 Custom onNodesChange com helper lines customizado
  const customApplyNodeChanges = useCallback(
    (changes: NodeChange[], nodes: Node[]): Node[] => {
      // Reset helper lines
      setHelperLineHorizontal(undefined);
      setHelperLineVertical(undefined);

      // Se helper lines customizado está habilitado
      if (customHelperLines) {
        // Se single node sendo arrastado
        if (
          changes.length === 1 &&
          changes[0].type === 'position' &&
          changes[0].dragging &&
          changes[0].position
        ) {
          const helperLines = getHelperLines(changes[0], nodes);

          // Snap to helper line position
          changes[0].position.x = helperLines.snapPosition.x ?? changes[0].position.x;
          changes[0].position.y = helperLines.snapPosition.y ?? changes[0].position.y;

          // Set helper lines for display
          setHelperLineHorizontal(helperLines.horizontal);
          setHelperLineVertical(helperLines.vertical);
        }
      }

      return applyNodeChanges(changes, nodes);
    },
    [customHelperLines],
  );

  // Handlers de mudanças
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Usar custom apply se helper lines customizado está habilitado
      if (customHelperLines) {
        setNodes(nodes => customApplyNodeChanges(changes, nodes));
      } else {
        onNodesChangeInternal(changes);
      }

      if (onNodesChange) {
        onNodesChange(changes);
      }

      // Notificar mudanças no flow
      const updatedNodes = customHelperLines
        ? customApplyNodeChanges(changes, nodes)
        : applyNodeChanges(changes, nodes);

      if (onFlowDataChange) {
        onFlowDataChange(updatedNodes, edges);
      }

      // 🆕 Callback estendido com variables
      if (onFlowDataChangeExtended) {
        onFlowDataChangeExtended({
          nodes: updatedNodes,
          edges,
          variables: flowVariables,
        });
      }
    },
    [
      onNodesChangeInternal,
      onNodesChange,
      onFlowDataChange,
      onFlowDataChangeExtended,
      nodes,
      edges,
      flowVariables,
      customHelperLines,
      customApplyNodeChanges,
    ],
  );

  const handleEdgesChange = useCallback(
    (changes: any[]) => {
      onEdgesChangeInternal(changes);
      if (onEdgesChange) {
        onEdgesChange(changes);
      }
    },
    [onEdgesChangeInternal, onEdgesChange],
  );

  const handleConnect = useCallback(
    (connection: Parameters<OnConnect>[0]) => {
      const edge = { ...connection, animated: true, type: 'default' };
      setEdges(eds => addEdge(edge, eds));
      if (onConnect) {
        onConnect(connection);
      }
    },
    [setEdges, onConnect],
  );

  // Drag and drop
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!type || !reactFlowWrapper.current) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      if (onDrop) {
        onDrop(event);
      } else {
        // Comportamento padrão de drop com auto-seleção
        const newNodeId = `${type}-${Date.now()}`;
        const newNode: Node = {
          id: newNodeId,
          type,
          position,
          data: { label: `${type} node` },
        };

        // Adicionar o novo node
        setNodes(nds => nds.concat(newNode));
        
        // Limpar o type do DnD context para sair do modo de drag
        setType(null);
        
        // Selecionar o novo node após um pequeno delay para garantir que foi adicionado
        setTimeout(() => {
          setNodes(nds => 
            nds.map(node => ({ 
              ...node, 
              selected: node.id === newNodeId 
            }))
          );
        }, 10);
      }
    },
    [type, screenToFlowPosition, onDrop, setNodes, setType],
  );

  // Context menu
  const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    setContextMenu({
      show: true,
      x: event.clientX,
      y: event.clientY,
      nodeId: node.id,
    });
  }, []);

  const handlePaneClick = useCallback(() => {
    setContextMenu({ show: false, x: 0, y: 0 });
    // 🆕 Fechar painel de configuração também
    if (configPanelSystem) {
      setShowConfigPanel(false);
      setConfigNodeData(null);
      setConfigPanelType('');
    }
  }, [configPanelSystem]);

  // 🆕 Handler para click em node (sistema de painéis de configuração)
  const handleNodeClickInternal = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (configPanelSystem) {
        event.preventDefault();
        setConfigNodeData(node);
        setConfigPanelType(node.type || '');
        setShowConfigPanel(true);
      }

      // Callback original
      if (onNodeClick) {
        onNodeClick(event, node);
      }
    },
    [configPanelSystem, onNodeClick],
  );

  // 🆕 Função para atualizar node (sistema de painéis de configuração).
  // Config-panel updates bypass xyflow's NodeChange path because they mutate
  // `node.data` directly via `setNodes`. The parent's `onFlowDataChange`
  // listener would otherwise never see the edit, so the journey editor's
  // dirty/autosave/IDB pipeline would stay clean despite a real change in
  // a panel field. Wire the callbacks here so the data path matches what
  // `handleNodesChange` does for canvas-level edits.
  //
  // IMPORTANT: side effects (onFlowDataChange / onFlowDataChangeExtended)
  // run AFTER setNodes returns, NOT inside the updater callback. Updaters
  // must be pure — React (and StrictMode in particular) double-invokes
  // them in dev to surface non-idempotency, which would cause the store
  // notifications to fire twice. This mirrors the pattern used by
  // `handleNodesChange` above.
  const updateNode = useCallback(
    (nodeId: string, newData: any) => {
      const updated = nodes.map(node =>
        node.id === nodeId ? { ...node, data: newData } : node,
      );
      setNodes(updated);
      if (onFlowDataChange) {
        onFlowDataChange(updated, edges);
      }
      if (onFlowDataChangeExtended) {
        onFlowDataChangeExtended({
          nodes: updated,
          edges,
          variables: flowVariables,
        });
      }
    },
    [nodes, setNodes, onFlowDataChange, onFlowDataChangeExtended, edges, flowVariables],
  );

  // Controle de conexões
  const handleConnectStart = useCallback(() => {
    setPointerEvents('auto');
  }, [setPointerEvents]);

  const handleConnectEnd = useCallback(() => {
    setPointerEvents('none');
  }, [setPointerEvents]);

  // Cores padrão do MiniMap usando utilitário
  const defaultMiniMapColors = createMiniMapNodeColors(miniMapNodeColors);

  // 🆕 Configurações do ReactFlow com defaults e customizações
  const finalReactFlowProps = {
    // Defaults padrão
    minZoom: 0.1,
    maxZoom: 10,
    fitView: false,
    defaultViewport: { x: 0, y: 0, zoom: 1 },
    elevateEdgesOnSelect: true,
    elevateNodesOnSelect: true,
    // Customizações do usuário
    ...reactFlowProps,
  };

  const handleDeleteEdge = useCallback(
    (id: any) => {
      setEdges(edges => {
        const left = edges.filter((edge: any) => edge.id !== id);
        return left;
      });
    },
    [setEdges],
  );

  return (
    <div
      className={cn('base-flow-canvas w-full h-full', className)}
      ref={reactFlowWrapper}
      style={style}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onNodeClick={handleNodeClickInternal}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeContextMenu={handleNodeContextMenu}
        onPaneClick={handlePaneClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onConnectStart={handleConnectStart}
        onConnectEnd={handleConnectEnd}
        nodeTypes={nodeTypes}
        edgeTypes={defaultEdgeTypes}
        connectionMode={connectionMode}
        snapToGrid={snapToGrid}
        snapGrid={snapGrid}
        proOptions={proOptions}
        colorMode={theme === 'dark' ? 'dark' : 'light'}
        deleteKeyCode={['Backspace', 'Delete']}
        multiSelectionKeyCode={['Meta', 'Ctrl']}
        panOnDrag={true}
        panOnScroll={false}
        zoomOnScroll={true}
        zoomOnPinch={true}
        zoomOnDoubleClick={false}
        selectNodesOnDrag={false}
        connectionLineType={ConnectionLineType.Bezier}
        // 🆕 Props customizáveis
        {...finalReactFlowProps}
        fitViewOptions={{
          padding: 0.1,
          includeHiddenNodes: false,
        }}
        connectionLineStyle={{
          stroke: 'gray',
          strokeWidth: 2,
          strokeDashoffset: 5,
          strokeDasharray: 5,
        }}
        defaultEdgeOptions={{
          type: 'default',
          style: {
            strokeWidth: 3,
          },
          data: {
            handleDeleteEdge,
          },
        }}
        className={canvasClassName}
      >
        {/* Background */}
        {showBackground && (
          <Background
            variant={backgroundVariant as any}
            gap={24}
            size={1.5}
            color={flowTokens.canvas.grid}
            className="bg-sidebar"
          />
        )}

        {/* Controls */}
        {showControls && (
          <Controls
            className="bg-sidebar border-sidebar-border"
            showZoom={true}
            showFitView={true}
            showInteractive={true}
            orientation="vertical"
            position="bottom-left"
          />
        )}

        {/* MiniMap */}
        {showMiniMap && (
          <MiniMap
            className="bg-flow-palette-bg/85 border border-flow-palette-divider rounded-lg shadow-lg backdrop-blur-sm"
            nodeColor={node => defaultMiniMapColors[node.type || 'default'] || 'var(--color-muted-foreground)'}
            maskColor="color-mix(in srgb, var(--color-foreground) 12%, transparent)"
          />
        )}

        {/* Botão do painel de nodes */}
        {NodePanelComponent && (
          <Panel position="top-right">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNodePanel(!showNodePanel)}
              className="h-10 w-10 p-0"
            >
              {showNodePanel ? (
                <PanelRightClose className="h-4 w-4" />
              ) : (
                <PanelRightOpen className="h-4 w-4" />
              )}
            </Button>
          </Panel>
        )}

        {/* Painel de nodes */}
        {NodePanelComponent && showNodePanel && (
          <Panel position="top-right" className="mt-12">
            <NodePanelComponent onClose={() => setShowNodePanel(false)} />
          </Panel>
        )}

        {/* Helper Lines */}
        {enableHelperLines &&
          (HelperLinesComponent ? (
            <HelperLinesComponent horizontal={helperLineHorizontal} vertical={helperLineVertical} />
          ) : (
            <BaseFlowHelperLines
              horizontal={helperLineHorizontal}
              vertical={helperLineVertical}
              {...helperLinesConfig}
            />
          ))}

        {/* Painéis customizados */}
        {renderCustomPanels && renderCustomPanels()}
      </ReactFlow>

      {/* Context Menu */}
      {contextMenu.show &&
        (ContextMenuComponent ? (
          <ContextMenuComponent
            x={contextMenu.x}
            y={contextMenu.y}
            nodeId={contextMenu.nodeId}
            onClose={() => setContextMenu({ show: false, x: 0, y: 0 })}
            onDeleteNode={nodeId => {
              setNodes(nds => nds.filter(n => n.id !== nodeId));
              setContextMenu({ show: false, x: 0, y: 0 });
            }}
          />
        ) : (
          <BaseFlowContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            nodeId={contextMenu.nodeId}
            onClose={() => setContextMenu({ show: false, x: 0, y: 0 })}
            onDeleteNode={nodeId => {
              setNodes(nds => nds.filter(n => n.id !== nodeId));
              setContextMenu({ show: false, x: 0, y: 0 });
            }}
          />
        ))}

      {/* 🆕 Sistema de painéis de configuração */}
      {configPanelSystem &&
        showConfigPanel &&
        configNodeData &&
        configPanelType &&
        renderConfigPanel && (
          <div className="absolute top-16 left-4 z-50">
            {renderConfigPanel(
              configPanelType,
              configNodeData.data,
              configNodeData.id,
              updateNode,
              () => {
                setShowConfigPanel(false);
                setConfigNodeData(null);
                setConfigPanelType('');
              },
            )}
          </div>
        )}
    </div>
  );
}
