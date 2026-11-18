import { memo, useCallback, useState } from 'react';
import { ReactFlow, Background, BaseEdge, Handle, MarkerType, Position, applyEdgeChanges, applyNodeChanges, getSmoothStepPath, type Edge, type EdgeProps, type ReactFlowInstance, type Connection, type NodeProps } from '@xyflow/react';
import { GitBranch, MessageCircle, MousePointer2, Send, ThumbsUp, Flag, FileText, Filter, Instagram, Plus, LayoutGrid, ZoomIn, ZoomOut, Maximize, Focus, MessagesSquare } from 'lucide-react';
import '@xyflow/react/dist/style.css';
import { receiptLabels } from './receiptLabels';
import { blockLabels, portLabels, ports, defaults, localIssues, type Block, type BlockKind, type Issue, type StudioGraph, type StudioRun } from './graph';
const icons = { comment: Instagram, scope: Filter, keyword: GitBranch, material: FileText, invitation: MessageCircle, confirmation: MousePointer2, public_reply: MessagesSquare, like: ThumbsUp, delivery: Send, end: Flag };
function roundedOrthogonalPath(points: [number, number][], radius = 10): string {
  if (points.length < 2) return '';
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i - 1];
    const [cx, cy] = points[i];
    const [nx, ny] = points[i + 1];
    const dx1 = cx - px, dy1 = cy - py;
    const dx2 = nx - cx, dy2 = ny - cy;
    const len1 = Math.hypot(dx1, dy1), len2 = Math.hypot(dx2, dy2);
    const r = Math.min(radius, len1 / 2, len2 / 2);
    if (r < 1) { d += ` L ${cx} ${cy}`; continue; }
    const sx = cx - (dx1 / len1) * r, sy = cy - (dy1 / len1) * r;
    const ex = cx + (dx2 / len2) * r, ey = cy + (dy2 / len2) * r;
    d += ` L ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`;
  }
  const [lx, ly] = points[points.length - 1];
  return `${d} L ${lx} ${ly}`;
}
const StudioEdge = memo(function StudioEdge({ sourceX, sourceY, targetX, targetY, style, markerEnd, data }: EdgeProps) {
  const isAdjacent = targetX > sourceX && targetX - sourceX < 95 && Math.abs(targetY - sourceY) < 180;
  if (isAdjacent) {
    const [path] = getSmoothStepPath({ sourceX, sourceY, sourcePosition: Position.Right, targetX, targetY, targetPosition: Position.Left, borderRadius: 10 });
    return <BaseEdge path={path} style={style} markerEnd={markerEnd} />;
  }
  const lane = data?.fallback ? 270 : 288;
  const outX = sourceX + (data?.fallback ? 14 : 22);
  const inX = targetX - (data?.fallback ? 14 : 18);
  const path = roundedOrthogonalPath([[sourceX, sourceY], [outX, sourceY], [outX, lane], [inX, lane], [inX, targetY], [targetX, targetY]], 10);
  return <BaseEdge path={path} style={style} markerEnd={markerEnd} />;
});
const edgeTypes = { studio: StudioEdge };
function summary(n: Block) {
  const d = n.data;
  switch (n.type) {
    case 'comment': return 'Novos comentários da conta conectada';
    case 'scope': return d.allContent ? 'Todos os conteúdos da conta' : d.media || d.ad || 'Escolher conteúdo';
    case 'keyword': return d.keywords?.join(' · ') || 'Configurar palavras';
    case 'material': return d.mode === 'context' ? 'Por criativo e assunto' : d.material === 'amh-consultorio' ? 'AMH · No consultório' : 'AMH · Highlights';
    case 'invitation': case 'delivery': return d.text || 'Escrever mensagem';
    case 'public_reply': return `${d.variants?.length || 0} variação(ões)`;
    case 'confirmation': return 'Aguarda clique real no Instagram';
    case 'like': return 'Curtir o comentário recebido';
    default: return d.label || 'Fim deste caminho';
  }
}
function metaTag(n: Block) {
  const d = n.data;
  switch (n.type) {
    case 'comment': return 'Webhook em tempo real';
    case 'scope': return d.allContent ? 'Publicações e anúncios' : 'Escopo dedicado';
    case 'keyword': return d.mode === 'contains' ? 'Qualquer trecho' : 'Palavra inteira';
    case 'material': return d.mode === 'context' ? 'Roteamento dinâmico' : 'Material fixo';
    case 'invitation': return 'Botão: Pode enviar';
    case 'public_reply': return 'Após convite aceito';
    case 'like': return 'Falha não interrompe';
    case 'confirmation': return 'Trava de segurança';
    case 'delivery': return `Botão: ${d.buttonLabel || 'Acessar material'}`;
    default: return d.label === 'Sem envio' ? 'Saída de descarte' : 'Entrega concluída';
  }
}
const BlockNode = memo(function BlockNode({ data, type, selected }: NodeProps<Block>) {
  const Icon = icons[type!];
  const nodePorts = ports[type!];
  const category = type === 'scope' || type === 'keyword' ? 'CONDIÇÃO' : type === 'comment' ? 'GATILHO' : type === 'end' ? 'RESULTADO' : 'AÇÃO';
  return <div className={`studio-node kind-card-${type} ${selected ? 'is-selected' : ''} ${data._issue ? 'has-issue' : ''} ${data._trace ? `trace-${data._trace}` : ''}`}>
    {type !== 'comment' && <Handle type="target" position={Position.Left} style={{ top: 24 }} />}
    <div className="studio-node-head"><span className={`studio-node-icon kind-${type}`}><Icon size={15} /></span><span className="studio-node-badge">{category}</span>{Boolean(data._issue) && <strong className="studio-node-issue-flag" title={String(data._issue)}>!</strong>}</div>
    <div className="studio-node-body">
      <strong>{blockLabels[type!]}</strong>
      <p>{summary({ data, type } as Block)}</p>
      <div className="studio-node-meta" aria-hidden="true"><span>{metaTag({ data, type } as Block)}</span></div>
    </div>
    {Boolean(data._trace) && <small className="studio-node-trace">{receiptLabels[String(data._trace)] || String(data._trace)}</small>}
    {nodePorts.length > 0 && <div className="studio-ports">{nodePorts.map(port => {
      const isFallback = ['no_match', 'failed', 'blocked'].includes(port);
      return <div key={port} className={`port-${port} ${isFallback ? 'is-fallback' : 'is-positive'}`}><span className="port-dot" aria-hidden="true" /><span>{portLabels[port]}</span><Handle id={port} type="source" position={Position.Right} style={{ top: '50%' }} /></div>;
    })}</div>}
  </div>;
});
const nodeTypes = Object.fromEntries(Object.keys(blockLabels).map(k => [k, BlockNode]));
export function StudioCanvas({ graph, change, selected, select, issues, run, readonly, account }: { graph: StudioGraph; change: (g: StudioGraph | ((old: StudioGraph) => StudioGraph)) => void; selected: string; select: (id: string) => void; issues: Issue[]; run?: StudioRun | null; readonly: boolean; account: string }) {
  const [flow, setFlow] = useState<ReactFlowInstance<Block> | null>(null);
  const [zoom, setZoom] = useState(0.8);
  const [error, setError] = useState('');
  const connect = useCallback((c: Connection) => {
    if (!c.source || !c.target || !c.sourceHandle) return;
    const candidate = { ...graph, edges: [...graph.edges.filter(e => !(e.source === c.source && e.sourceHandle === c.sourceHandle)), { id: crypto.randomUUID(), source: c.source, target: c.target, sourceHandle: c.sourceHandle }] };
    const target = graph.nodes.find(n => n.id === c.target);
    const reaches = (id: string, seen: Set<string>): boolean => { if (id === c.source) return true; if (seen.has(id)) return false; seen.add(id); return candidate.edges.filter(e => e.source === id).some(e => reaches(e.target, seen)); };
    if (target?.type === 'comment' || reaches(c.target, new Set())) { setError('Conexão recusada: o gatilho não recebe entrada e o fluxo não aceita ciclos.'); return; }
    const invalid = localIssues(candidate).find(i => i.field === 'safety');
    if (invalid) { setError(`Conexão recusada: ${invalid.message}`); return; }
    setError(''); change(candidate);
  }, [graph, change]);
  const arrange = () => {
    const root = graph.nodes.find(n => n.type === 'comment');
    const depth = new Map<string, number>();
    const visit = (id: string, level: number) => {
      if ((depth.get(id) ?? -1) >= level || level > graph.nodes.length) return;
      depth.set(id, level);
      graph.edges
        .filter(e => e.source === id && !(['no_match', 'blocked', 'failed'].includes(e.sourceHandle || '') && e.target === 'stop'))
        .forEach(e => visit(e.target, level + 1));
    };
    if (root) visit(root.id, 0);
    const ordered = [...graph.nodes].sort((a, b) => (depth.get(a.id) ?? 99) - (depth.get(b.id) ?? 99));
    let mainIndex = 0;
    change({
      ...graph,
      nodes: ordered.map(n => {
        if (n.id === 'stop' || (n.type === 'end' && !depth.has(n.id))) {
          return { ...n, position: { x: 1312, y: 56 } };
        }
        const col = mainIndex % 5;
        const row = Math.floor(mainIndex / 5);
        mainIndex++;
        return { ...n, position: { x: col * 256 + 32, y: row * 272 + 56 } };
      }),
    });
    window.setTimeout(() => void flow?.fitView({ padding: 0.12, duration: 240 }), 30);
  };
  const add = (kind: BlockKind) => {
    const id = `${kind}-${crypto.randomUUID().slice(0, 8)}`;
    change({ ...graph, nodes: [...graph.nodes, { id, type: kind, data: defaults(kind, account), position: { x: 292, y: 316 + (graph.nodes.length % 3) * 48 } }] }); select(id);
  };
  const display: Block[] = graph.nodes.map(n => ({ ...n, selected: n.id === selected, data: { ...n.data, _issue: issues.find(i => i.node === n.id)?.message, _trace: run?.trace.find(t => t.node === n.id)?.status } }));
  const edges: Edge[] = graph.edges.map(e => {
    const isFallback = ['no_match', 'failed', 'blocked'].includes(e.sourceHandle || '') && (e.target === 'stop' || graph.nodes.find(n => n.id === e.target)?.type === 'end');
    const isFocused = e.source === selected || e.target === selected;
    const isTraced = Boolean(run?.trace.some(t => t.node === e.source && t.port === e.sourceHandle));
    const color = isTraced ? '#16795b' : isFocused ? '#5D0507' : isFallback ? '#bfb6a8' : '#3F0305';
    return {
      ...e,
      type: 'studio',
      data: { fallback: isFallback },
      animated: isTraced,
      zIndex: isTraced || isFocused ? 4 : isFallback ? 0 : 2,
      markerEnd: { type: MarkerType.ArrowClosed, width: 13, height: 13, color },
      style: {
        stroke: color,
        strokeWidth: isTraced || isFocused ? 2.2 : isFallback ? 1.15 : 1.75,
        strokeDasharray: isFallback && !isTraced ? '4 4' : undefined,
        opacity: isFallback && !isFocused && !isTraced ? 0.42 : 1,
      },
    };
  });
  return <div className="studio-canvas-area">
    <div className="studio-canvas-toolbar"><span><strong>{graph.nodes.length}</strong> blocos · <strong>{graph.edges.length}</strong> conexões</span><button disabled={readonly} onClick={arrange}><LayoutGrid size={14} /> Organizar</button></div>
    {!readonly && <details className="studio-library"><summary><Plus size={15} /> Adicionar bloco</summary><div className="studio-library-menu">{(Object.keys(blockLabels) as BlockKind[]).map(kind => { const Icon = icons[kind]; return <button key={kind} onClick={() => add(kind)} disabled={kind === 'comment' && graph.nodes.some(n => n.type === 'comment')}><span className={`studio-node-icon kind-${kind}`} aria-hidden="true"><Icon size={14} /></span><span>{blockLabels[kind]}</span></button>; })}</div></details>}
    {error && <p role="alert" className="studio-canvas-error">{error}</p>}
    <div className="studio-desktop-canvas"><ReactFlow proOptions={{ account: 'paid-pro', hideAttribution: true }} onInit={instance => { setFlow(instance); window.setTimeout(() => void instance.fitView({ padding: 0.1, maxZoom: 0.9 }), 10); }} onMove={(_, viewport) => setZoom(viewport.zoom)} nodes={display} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} defaultViewport={{ x: 16, y: 16, zoom: 0.8 }} minZoom={0.15} maxZoom={1.5} nodesDraggable={!readonly} nodesConnectable={!readonly} elementsSelectable onNodeClick={(_, n) => select(n.id)}
      onNodesChange={changes => { const persistent = changes.filter(c => c.type === 'position' || c.type === 'remove'); if (persistent.length && !readonly) change(old => { const nodes = applyNodeChanges(persistent, old.nodes); return { ...old, nodes, edges: old.edges.filter(e => nodes.some(n => n.id === e.source) && nodes.some(n => n.id === e.target)) }; }); }}
      onEdgesChange={changes => { const removals = changes.filter(c => c.type === 'remove'); if (!readonly && removals.length) change(old => ({ ...old, edges: applyEdgeChanges(removals, old.edges) })); }} onConnect={connect} deleteKeyCode={readonly ? null : ['Backspace', 'Delete']}><Background gap={20} size={1.2} color="var(--st-grid)" /></ReactFlow></div>
    <div className="studio-viewport-controls" role="group" aria-label="Navegação do canvas"><button aria-label="Aproximar" title="Aproximar" onClick={() => void flow?.zoomIn({ duration: 180 })}><ZoomIn size={16} /></button><button aria-label="Restaurar zoom de 100%" title="Restaurar zoom de 100%" onClick={() => void flow?.zoomTo(1, { duration: 180 })}>{Math.round(zoom * 100)}%</button><button aria-label="Afastar" title="Afastar" onClick={() => void flow?.zoomOut({ duration: 180 })}><ZoomOut size={16} /></button><span /><button aria-label="Enquadrar fluxo" title="Enquadrar fluxo" onClick={() => void flow?.fitView({ padding: 0.12, duration: 250 })}><Maximize size={16} /></button><button aria-label="Focar bloco selecionado" title="Focar bloco selecionado" disabled={!selected} onClick={() => void flow?.fitView({ nodes: [{ id: selected }], maxZoom: 1, duration: 250 })}><Focus size={16} /></button></div>
    <nav className="studio-node-list" aria-label="Blocos do fluxo">{graph.nodes.map(n => <button key={n.id} aria-current={selected === n.id ? 'step' : undefined} onClick={() => select(n.id)}>{blockLabels[n.type!]}<small>{summary(n)}</small></button>)}</nav>
  </div>;
}
