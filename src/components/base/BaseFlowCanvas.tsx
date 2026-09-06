import React, { useCallback, useContext, useState, useRef } from 'react';
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
  applyEdgeChanges,
  type NodeChange,
  type EdgeChange,
  type Node,
  type Edge,
  ConnectionLineType,
} from '@xyflow/react';
import './BaseFlow.css';

import { Button } from '@evoapi/design-system';
import { PanelRightOpen, PanelRightClose } from 'lucide-react';
import { useDnD } from '@/contexts/DnDContext';
import { DarkModeContext } from '@/contexts/ThemeContext';
import { BaseFlowContextMenu } from './BaseFlowContextMenu';
import { BaseFlowHelperLines } from './BaseFlowHelperLines';
import BaseDefaultEdge from './BaseDefaultEdge';
import { cn, getHelperLines, createMiniMapNodeColors } from '@/lib/utils';
import { flowTokens } from '@/components/journey/_ui/tokens';

// Default edge types
const defaultEdgeTypes = {
  default: BaseDefaultEdge,
  'base-default': BaseDefaultEdge,
};

export interface BaseFlowCanvasProps {
  // Flow data
  initialNodes?: Node[];
  initialEdges?: Edge[];

  // Canvas config
  nodeTypes: Record<string, React.ComponentType<any>>;

  // Core callbacks
  onNodesChange?: (changes: NodeChange[]) => void;
  onEdgesChange?: (changes: any[]) => void;
  onConnect?: OnConnect;
  onNodeClick?: (event: React.MouseEvent, node: Node) => void;
  onNodeDoubleClick?: (event: React.MouseEvent, node: Node) => void;
  onDrop?: (event: React.DragEvent) => void;
  onFlowDataChange?: (nodes: Node[], edges: Edge[]) => void;

  // Extended callback carrying the flow variables
  onFlowDataChangeExtended?: (flowData: { nodes: Node[]; edges: Edge[]; variables: any[] }) => void;
  flowVariables?: any[];

  // Visual config
  showMiniMap?: boolean;
  showControls?: boolean;
  showBackground?: boolean;
  backgroundVariant?: 'dots' | 'lines' | 'cross';

  // Side panel
  NodePanelComponent?: React.ComponentType<{ onClose: () => void }>;
  showNodePanelByDefault?: boolean;

  // Extra config
  connectionMode?: ConnectionMode;
  snapToGrid?: boolean;
  snapGrid?: [number, number];

  // MiniMap colors keyed by node type
  miniMapNodeColors?: Record<string, string>;

  // Custom panel rendering
  renderCustomPanels?: () => React.ReactNode;

  // Custom components
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

  // Helper line config
  enableHelperLines?: boolean;
  helperLinesConfig?: {
    strokeColor?: string;
    lineWidth?: number;
    dashPattern?: number[];
    opacity?: number;
  };

  // Use the custom snap instead of xyflow's own change handler
  customHelperLines?: boolean;

  // Custom CSS classes
  className?: string;
  canvasClassName?: string;
  style?: React.CSSProperties;

  // Config panel system
  configPanelSystem?: boolean;
  renderConfigPanel?: (
    nodeType: string,
    nodeData: any,
    nodeId: string,
    onUpdate: (nodeId: string, data: any) => void,
    onClose: () => void,
  ) => React.ReactNode;

  // ReactFlow overrides
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
  const colorMode = useContext(DarkModeContext)?.theme === 'dark' ? 'dark' : 'light';
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const { type, setPointerEvents, setType } = useDnD();

  // Canvas state
  const [nodes, setNodesState] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState(initialEdges);

  // Synchronous mirror of `nodes`: inside one React batch the closure still
  // holds the pre-batch value, so a payload built from it undoes the changes
  // the batch already applied.
  const nodesRef = useRef(nodes);

  // Single writer for node state, keeping the mirror and React state in step.
  // Payloads read `nodesRef.current`; `nodes` is for rendering only.
  const commitNodes = useCallback(
    (update: Node[] | ((current: Node[]) => Node[])): Node[] => {
      const next = typeof update === 'function' ? update(nodesRef.current) : update;
      nodesRef.current = next;
      setNodesState(next);
      return next;
    },
    [setNodesState],
  );

  const [showNodePanel, setShowNodePanel] = useState(showNodePanelByDefault);

  // Context menu
  const [contextMenu, setContextMenu] = useState<{
    show: boolean;
    x: number;
    y: number;
    nodeId?: string;
  }>({ show: false, x: 0, y: 0 });

  // Helper lines for visual snapping
  const [helperLineHorizontal, setHelperLineHorizontal] = useState<number | undefined>(undefined);
  const [helperLineVertical, setHelperLineVertical] = useState<number | undefined>(undefined);

  // Config panel state
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [configNodeData, setConfigNodeData] = useState<any>(null);
  const [configPanelType, setConfigPanelType] = useState<string>('');

  // Helper line side effect only, kept out of the state updater so it runs
  // once per batch.
  const applyHelperLineSnap = useCallback(
    (changes: NodeChange[], nodes: Node[]) => {
      if (!customHelperLines) {
        return;
      }

      // Reset helper lines
      setHelperLineHorizontal(undefined);
      setHelperLineVertical(undefined);

      // Single node being dragged
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
    },
    [customHelperLines],
  );

  // Change handlers
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Mutates changes[0].position for the snap; must run once per batch.
      applyHelperLineSnap(changes, nodesRef.current);

      const updatedNodes = commitNodes(current => applyNodeChanges(changes, current));

      if (onNodesChange) {
        onNodesChange(changes);
      }

      if (onFlowDataChange) {
        onFlowDataChange(updatedNodes, edges);
      }

      if (onFlowDataChangeExtended) {
        onFlowDataChangeExtended({
          nodes: updatedNodes,
          edges,
          variables: flowVariables,
        });
      }
    },
    [
      commitNodes,
      onNodesChange,
      onFlowDataChange,
      onFlowDataChangeExtended,
      edges,
      flowVariables,
      applyHelperLineSnap,
    ],
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChangeInternal(changes);

      // Selection is volatile UI state: propagating it would mark the journey
      // dirty without a real edit. Nodes are stripped downstream, edges are
      // not, so filter here.
      const persistChanges = changes.filter(c => c.type !== 'select');
      if (persistChanges.length > 0) {
        const updatedEdges = applyEdgeChanges(persistChanges, edges);
        if (onFlowDataChange) {
          onFlowDataChange(nodesRef.current, updatedEdges);
        }
        if (onFlowDataChangeExtended) {
          onFlowDataChangeExtended({
            nodes: nodesRef.current,
            edges: updatedEdges,
            variables: flowVariables,
          });
        }
      }

      if (onEdgesChange) {
        onEdgesChange(changes);
      }
    },
    [
      onEdgesChangeInternal,
      onEdgesChange,
      onFlowDataChange,
      onFlowDataChangeExtended,
      edges,
      flowVariables,
    ],
  );

  const handleConnect = useCallback(
    (connection: Parameters<OnConnect>[0]) => {
      const edge = { ...connection, animated: true, type: 'default' };
      // Bare value, not a functional updater: the side effects fire after the
      // state write, matching handleEdgesChange.
      const updatedEdges = addEdge(edge, edges);
      setEdges(updatedEdges);
      if (onFlowDataChange) {
        onFlowDataChange(nodesRef.current, updatedEdges);
      }
      if (onFlowDataChangeExtended) {
        onFlowDataChangeExtended({
          nodes: nodesRef.current,
          edges: updatedEdges,
          variables: flowVariables,
        });
      }
      if (onConnect) {
        onConnect(connection);
      }
    },
    [
      setEdges,
      edges,
      onConnect,
      onFlowDataChange,
      onFlowDataChangeExtended,
      flowVariables,
    ],
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
        // Default drop behaviour, with auto-select
        const newNodeId = `${type}-${Date.now()}`;
        const newNode: Node = {
          id: newNodeId,
          type,
          position,
          data: { label: `${type} node` },
        };

        // Drops bypass xyflow's NodeChange path, so this is the only place the
        // store hears about the new node: commit first, notify after.
        const updatedNodes = commitNodes(current => current.concat(newNode));
        if (onFlowDataChange) {
          onFlowDataChange(updatedNodes, edges);
        }
        if (onFlowDataChangeExtended) {
          onFlowDataChangeExtended({
            nodes: updatedNodes,
            edges,
            variables: flowVariables,
          });
        }
        
        // Leave drag mode
        setType(null);
        
        // Select the new node once it has been added
        setTimeout(() => {
          commitNodes(current =>
            current.map(node => ({
              ...node,
              selected: node.id === newNodeId,
            })),
          );
        }, 10);
      }
    },
    [
      type,
      screenToFlowPosition,
      onDrop,
      commitNodes,
      setType,
      edges,
      onFlowDataChange,
      onFlowDataChangeExtended,
      flowVariables,
    ],
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
    // Close the config panel too
    if (configPanelSystem) {
      setShowConfigPanel(false);
      setConfigNodeData(null);
      setConfigPanelType('');
    }
  }, [configPanelSystem]);

  // Node click handler for the config panel system
  const handleNodeClickInternal = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (configPanelSystem) {
        event.preventDefault();
        setConfigNodeData(node);
        setConfigPanelType(node.type || '');
        setShowConfigPanel(true);
      }

      if (onNodeClick) {
        onNodeClick(event, node);
      }
    },
    [configPanelSystem, onNodeClick],
  );

  // Config panel edits mutate `node.data` outside xyflow's NodeChange path, so
  // this is the only place the store hears about them. Side effects run after
  // commitNodes returns, never inside the updater it receives.
  const updateNode = useCallback(
    (nodeId: string, newData: any) => {
      const updated = commitNodes(current =>
        current.map(node => (node.id === nodeId ? { ...node, data: newData } : node)),
      );
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
    [commitNodes, onFlowDataChange, onFlowDataChangeExtended, edges, flowVariables],
  );

  // Connection lifecycle
  const handleConnectStart = useCallback(() => {
    setPointerEvents('auto');
  }, [setPointerEvents]);

  const handleConnectEnd = useCallback(() => {
    setPointerEvents('none');
  }, [setPointerEvents]);

  const defaultMiniMapColors = createMiniMapNodeColors(miniMapNodeColors);

  // ReactFlow config: defaults plus caller overrides
  const finalReactFlowProps = {
    // Defaults
    minZoom: 0.1,
    maxZoom: 10,
    fitView: false,
    defaultViewport: { x: 0, y: 0, zoom: 1 },
    elevateEdgesOnSelect: true,
    elevateNodesOnSelect: true,
    // Caller overrides
    ...reactFlowProps,
  };

  // Edge deletion bypasses xyflow's change pipeline, so notify the store here
  // or the next save loses it.
  const handleDeleteEdge = useCallback(
    (id: string) => {
      const updatedEdges = edges.filter(edge => edge.id !== id);
      setEdges(updatedEdges);
      if (onFlowDataChange) {
        onFlowDataChange(nodesRef.current, updatedEdges);
      }
      if (onFlowDataChangeExtended) {
        onFlowDataChangeExtended({
          nodes: nodesRef.current,
          edges: updatedEdges,
          variables: flowVariables,
        });
      }
    },
    [edges, setEdges, onFlowDataChange, onFlowDataChangeExtended, flowVariables],
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      const updatedEdges = edges.filter(
        edge => edge.source !== nodeId && edge.target !== nodeId,
      );
      const updatedNodes = commitNodes(current => current.filter(node => node.id !== nodeId));
      setEdges(updatedEdges);
      if (onFlowDataChange) {
        onFlowDataChange(updatedNodes, updatedEdges);
      }
      if (onFlowDataChangeExtended) {
        onFlowDataChangeExtended({
          nodes: updatedNodes,
          edges: updatedEdges,
          variables: flowVariables,
        });
      }
    },
    [edges, commitNodes, setEdges, onFlowDataChange, onFlowDataChangeExtended, flowVariables],
  );

  const handleDuplicateNode = useCallback(
    (nodeId: string) => {
      const original = nodesRef.current.find(node => node.id === nodeId);
      if (!original) return;
      const copy: Node = {
        ...original,
        id: `${original.id}-copy-${Date.now()}`,
        position: { x: original.position.x + 50, y: original.position.y + 50 },
        selected: false,
        dragging: false,
      };
      const updatedNodes = commitNodes(current => current.concat(copy));
      if (onFlowDataChange) {
        onFlowDataChange(updatedNodes, edges);
      }
      if (onFlowDataChangeExtended) {
        onFlowDataChangeExtended({ nodes: updatedNodes, edges, variables: flowVariables });
      }
    },
    [edges, commitNodes, onFlowDataChange, onFlowDataChangeExtended, flowVariables],
  );

  return (
    <div
      className={cn('base-flow-canvas w-full h-full', className)}
      ref={reactFlowWrapper}
      style={style}
    >
      {/* colorMode follows the app theme (CRM-520): a forced "light" left the
          canvas chrome and the cards as a light island inside the dark page.
          Read the context directly so a host without DarkModeProvider (tests,
          previews) falls back to light instead of throwing. */}
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
        colorMode={colorMode}
        deleteKeyCode={['Backspace', 'Delete']}
        multiSelectionKeyCode={['Meta', 'Ctrl']}
        panOnDrag={true}
        panOnScroll={false}
        zoomOnScroll={true}
        zoomOnPinch={true}
        zoomOnDoubleClick={false}
        selectNodesOnDrag={false}
        connectionLineType={ConnectionLineType.Bezier}
        // Caller overrides
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
            className="bg-flow-canvas-bg"
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

        {/* Node panel toggle */}
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

        {/* Node panel */}
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

        {/* Custom panels */}
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
              handleDeleteNode(nodeId);
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
              handleDeleteNode(nodeId);
              setContextMenu({ show: false, x: 0, y: 0 });
            }}
            onDuplicateNode={nodeId => {
              handleDuplicateNode(nodeId);
              setContextMenu({ show: false, x: 0, y: 0 });
            }}
          />
        ))}

      {configPanelSystem &&
        showConfigPanel &&
        configNodeData &&
        configPanelType &&
        renderConfigPanel &&
        renderConfigPanel(
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
  );
}
