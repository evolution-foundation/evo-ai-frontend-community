import { useUnsavedNavigationGuard } from './useUnsavedNavigationGuard';
import { useCallback, useEffect, useState, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type NodeProps,
  type Connection,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  initialGraph,
  cleanGraph,
  stages,
  labels,
  fixtures,
  type Graph,
  type Stage,
  type Proof,
  type ProofNode,
  type Parameters,
  type Run,
} from './contract';
import { proofApi, type ProofApi } from './api';
import { extractError } from '@/utils/apiHelpers';
import './amh-visual.css';

const statusLabels: Record<string, string> = {
  passed: 'Satisfeito',
  skipped: 'Repetido',
  rejected: 'Recusado',
  conflict: 'Conflito',
  failed: 'Falha',
  blocked: 'Bloqueado',
  uncertain: 'Incerto',
  not_reached: 'Não executado',
  simulated_accepted: 'Aceite simulado',
};
function StageNode({ id, data, selected }: NodeProps<ProofNode>) {
  const stage = id as Stage;
  const summary =
    stage === 'scope'
      ? `${data.account} · ${data.ad || data.media}`
      : stage === 'keyword'
        ? data.keywords?.join(' / ')
        : stage === 'material'
          ? data.material
          : stage === 'reply'
            ? 'Prévia · transporte inerte'
            : stage === 'comment'
              ? 'Fixture identificável'
              : 'Recibo por versão';
  return (
    <div
      className={`amh-node ${selected ? 'amh-selected' : ''} amh-trace-${data.traceStatus || 'none'}`}
    >
      {stage !== 'comment' ? <Handle type="target" position={Position.Left} /> : null}
      <small>{String(stages.indexOf(stage) + 1).padStart(2, '0')} · INSTAGRAM AMH</small>
      <strong>{labels[stage]}</strong>
      <span>{summary}</span>
      {data.traceStatus ? <em>{statusLabels[data.traceStatus] || data.traceStatus}</em> : null}
      {stage !== 'result' ? <Handle type="source" position={Position.Right} /> : null}
    </div>
  );
}
const nodeTypes = Object.fromEntries(stages.map(id => [id, StageNode]));
export type ProofPermissions = { create: boolean; edit: boolean; publish: boolean };
export function AmhVisualProof({
  api = proofApi,
  permissions,
}: {
  api?: ProofApi;
  permissions: ProofPermissions;
}) {
  const [items, setItems] = useState<Pick<Proof, 'id' | 'name'>[]>([]);
  const [proof, setProof] = useState<Proof | null>(null);
  const [graph, setGraph] = useState<Graph>(initialGraph);
  const [selected, setSelected] = useState<Stage>('keyword');
  const [versionId, setVersionId] = useState('');
  const [fixture, setFixture] = useState('eligible');
  const [text, setText] = useState('');
  const [run, setRun] = useState<Run | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [dirty, setDirty] = useState(false);
  const createKey = useRef(crypto.randomUUID());
  useUnsavedNavigationGuard(dirty);
  const [name, setName] = useState('Instagram AMH — prova visual');
  const [viewVersion, setViewVersion] = useState(false);
  const errorText = (error: unknown) =>
    extractError(error).message || 'Falha na operação. Tente reabrir a prova.';
  useEffect(() => {
    let live = true;
    api
      .list()
      .then(data => {
        if (live) setItems(data);
      })
      .catch(error => {
        if (live) setMessage(errorText(error));
      });
    return () => {
      live = false;
    };
  }, [api]);
  useEffect(() => {
    if (!dirty) return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [dirty]);
  const hydrate = (next: Proof) => {
    setProof(next);
    setGraph(next.draft);
    setDirty(false);
    setRun(null);
    setViewVersion(false);
    setVersionId(next.versions.at(-1)?.id || '');
    setItems(old => [next, ...old.filter(item => item.id !== next.id)]);
  };
  const perform = async (action: () => Promise<void>) => {
    setBusy(true);
    setMessage('');
    try {
      await action();
    } catch (error) {
      setMessage(errorText(error));
    } finally {
      setBusy(false);
    }
  };
  const change = (data: Parameters) => {
    setGraph(old => ({
      ...old,
      nodes: old.nodes.map(node =>
        node.id === selected ? { ...node, data: { ...node.data, ...data } } : node,
      ),
    }));
    setDirty(true);
    setRun(null);
  };
  const onConnect = useCallback((connection: Connection) => {
    setGraph(old => ({ ...old, edges: addEdge(connection, old.edges) }));
    setDirty(true);
    setRun(null);
  }, []);
  const version = proof?.versions.find(v => v.id === versionId);
  const displayed = viewVersion && version ? version.graph : graph;
  const active = displayed.nodes.find(node => node.id === selected);
  const data = active?.data || {};
  const readonly = !(proof ? permissions.edit : permissions.create) || viewVersion || busy;
  const updateGraph = (next: Graph) => {
    setGraph(next);
    setDirty(true);
    setRun(null);
  };
  const save = () =>
    perform(async () => {
      const next = proof
        ? await api.save(proof, cleanGraph(graph))
        : await api.create(name, cleanGraph(graph), createKey.current);
      hydrate(next);
      setMessage('Rascunho salvo no CRM. Reabra para conferir.');
    });
  return (
    <section className="amh-proof">
      <header className="amh-header">
        <div>
          <small>JORNADAS / INSTAGRAM</small>
          <h1>Automação AMH</h1>
          <p>Construa, revise e simule o caminho do comentário ao material.</p>
        </div>
        <span className="amh-paused">Pausada · saídas bloqueadas</span>
      </header>
      <div className="amh-toolbar">
        <label>
          Prova salva
          <select
            aria-label="Prova salva"
            disabled={busy || dirty}
            value={proof?.id || ''}
            onChange={event => {
              const id = event.target.value;
              if (id) void perform(async () => hydrate(await api.get(id)));
              else {
                setProof(null);
                createKey.current = crypto.randomUUID();
                setGraph(initialGraph());
                setVersionId('');
                setRun(null);
                setViewVersion(false);
              }
            }}
          >
            <option value="">Nova prova</option>
            {items.map(item => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        {!proof ? (
          <label>
            Nome
            <input
              aria-label="Nome da prova"
              maxLength={100}
              value={name}
              onChange={event => setName(event.target.value)}
            />
          </label>
        ) : null}
        <button
          disabled={
            busy || (!proof && !permissions.create) || (!!proof && !permissions.edit) || viewVersion
          }
          onClick={() => void save()}
        >
          Salvar rascunho
        </button>
        <button
          disabled={!proof || busy || dirty || !permissions.publish || viewVersion}
          onClick={() =>
            void perform(async () => {
              if (!proof) return;
              hydrate(await api.publish(proof));
              setMessage('Versão de simulação publicada e pausada. Nenhuma saída ativada.');
            })
          }
        >
          Publicar versão de simulação
        </button>
        {proof ? (
          <button
            disabled={busy}
            onClick={() => void perform(async () => hydrate(await api.get(proof.id)))}
          >
            {dirty ? 'Descartar edição e reabrir' : 'Reabrir do CRM'}
          </button>
        ) : null}
      </div>
      <p className="amh-notice">
        Prova inerte: nenhum link real é emitido e nenhuma mensagem é enviada. A publicação congela
        uma versão para simular; o canal permanece pausado.
      </p>
      {message ? (
        <p role="status" className="amh-feedback">
          {message}
        </p>
      ) : null}
      {dirty ? (
        <p className="amh-feedback">
          Alterações não salvas. Salve ou descarte antes de trocar a prova ou simular.
        </p>
      ) : null}
      <div className="amh-workspace">
        <div className="amh-canvas" aria-label="Canvas da automação">
          <ReactFlow<ProofNode, Edge>
            nodes={displayed.nodes.map(node => ({
              ...node,
              selected: node.id === selected,
              data: {
                ...node.data,
                traceStatus:
                  viewVersion && run?.version_id === versionId
                    ? run.trace.find(t => t.node === node.id)?.status
                    : undefined,
              },
            }))}
            edges={displayed.edges.map(edge => ({
              ...edge,
              animated: false,
              style:
                viewVersion &&
                run?.version_id === versionId &&
                run.trace.find(t => t.node === edge.target)?.status !== 'not_reached'
                  ? { stroke: '#0284c7', strokeWidth: 3 }
                  : undefined,
            }))}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.15}
            nodesDraggable={!readonly}
            nodesConnectable={!readonly}
            elementsSelectable
            deleteKeyCode={readonly ? null : ['Backspace', 'Delete']}
            onNodesChange={changes => {
              if (!readonly) {
                setGraph(old => ({
                  ...old,
                  nodes: applyNodeChanges(
                    changes.filter(c => c.type !== 'remove'),
                    old.nodes,
                  ),
                }));
                if (changes.some(c => c.type === 'position')) setDirty(true);
              }
            }}
            onEdgesChange={changes => {
              if (!readonly) {
                setGraph(old => ({ ...old, edges: applyEdgeChanges(changes, old.edges) }));
                if (changes.some(c => c.type !== 'select')) {
                  setDirty(true);
                  setRun(null);
                }
              }
            }}
            onConnect={onConnect}
            onNodeClick={(_, node) => setSelected(node.id as Stage)}
          >
            <Background gap={20} />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
        <aside className="amh-inspector">
          <h2>Inspecionar nó</h2>
          <label>
            Nó
            <select
              aria-label="Nó selecionado"
              value={selected}
              onChange={e => setSelected(e.target.value as Stage)}
            >
              {stages.map(id => (
                <option key={id} value={id}>
                  {labels[id]}
                </option>
              ))}
            </select>
          </label>
          <h3>{labels[selected]}</h3>
          <fieldset disabled={readonly}>
            {selected === 'scope' ? (
              <>
                {(['account', 'ad', 'media'] as const).map((key, i) => (
                  <label key={key}>
                    {['Conta profissional', 'ID do anúncio', 'ID da publicação'][i]}
                    <input
                      maxLength={100}
                      value={data[key] || ''}
                      onChange={e => change({ [key]: e.target.value })}
                    />
                  </label>
                ))}
                <p>
                  Anúncio exato tem prioridade. Divergência ou múltiplas regras interrompem a
                  execução.
                </p>
              </>
            ) : null}
            {selected === 'keyword' ? (
              <>
                <label>
                  Palavras-chave (uma por linha)
                  <textarea
                    aria-label="Palavras-chave"
                    value={data.keywords?.join('\n') || ''}
                    onChange={e => change({ keywords: e.target.value.split('\n') })}
                  />
                </label>
                <label>
                  Correspondência
                  <select
                    value={data.mode}
                    onChange={e => change({ mode: e.target.value as 'word' | 'contains' })}
                  >
                    <option value="word">Palavra inteira</option>
                    <option value="contains">Contém</option>
                  </select>
                </label>
                <label className="amh-check">
                  <input
                    type="checkbox"
                    checked={data.ignoreCase || false}
                    onChange={e => change({ ignoreCase: e.target.checked })}
                  />
                  Ignorar maiúsculas
                </label>
                <label className="amh-check">
                  <input
                    type="checkbox"
                    checked={data.ignoreAccents || false}
                    onChange={e => change({ ignoreAccents: e.target.checked })}
                  />
                  Ignorar acentos
                </label>
                <p>
                  Inteira: “AMH!” corresponde a AMH; “XAMH” não. Contém: “XAMH” corresponde.
                  Alternativas desta regra não geram envios múltiplos.
                </p>
              </>
            ) : null}
            {selected === 'material' ? (
              <>
                <label>
                  Material
                  <select
                    value={data.material}
                    onChange={e => change({ material: e.target.value })}
                  >
                    <option value="amh">AMH — highlights</option>
                    <option value="amh-consultorio">AMH — consultório</option>
                  </select>
                </label>
                <p>Link de fixture: QA000000. Emissão de link real pertence à etapa 5.</p>
              </>
            ) : null}
            {selected === 'reply' ? (
              <>
                <label>
                  Texto da resposta
                  <textarea
                    aria-label="Texto da resposta"
                    maxLength={1000}
                    rows={7}
                    value={data.text}
                    onChange={e => change({ text: e.target.value })}
                  />
                </label>
                <p>Use {'{{link}}'}. URL em texto; botão Meta ainda sem homologação.</p>
              </>
            ) : null}
            {selected === 'comment' ? (
              <p>
                Somente fixtures. Eventos reais e o ledger inbound continuam sob os gates do canal.
                Eco e histórico não são processados aqui.
              </p>
            ) : null}
            {selected === 'result' ? (
              <p>
                Recibo imutável por versão e fixture. Repetição retorna o mesmo recibo. Timeout fica
                incerto e exige reconciliação. Mautic tem estado separado.
              </p>
            ) : null}
          </fieldset>
          {!readonly ? (
            <button onClick={() => updateGraph({ ...graph, edges: initialGraph().edges })}>
              Restaurar conexões do caminho
            </button>
          ) : null}
        </aside>
      </div>
      <section className="amh-simulator">
        <div>
          <h2>Simulador e histórico</h2>
          <p>Executa a versão selecionada no servidor e grava o caminho no ledger da prova.</p>
        </div>
        <div className="amh-toolbar">
          <label>
            Versão publicada
            <select
              aria-label="Versão publicada"
              value={versionId}
              disabled={busy}
              onChange={e => {
                setVersionId(e.target.value);
                setRun(null);
              }}
            >
              <option value="">Publique uma versão</option>
              {proof?.versions.map(v => (
                <option key={v.id} value={v.id}>
                  v{v.number} · {new Date(v.at).toLocaleString('pt-BR')} · pausada
                </option>
              ))}
            </select>
          </label>
          <label className="amh-check">
            <input
              type="checkbox"
              disabled={!version}
              checked={viewVersion}
              onChange={e => setViewVersion(e.target.checked)}
            />
            Inspecionar versão congelada
          </label>
          <label>
            Cenário
            <select aria-label="Cenário" value={fixture} onChange={e => setFixture(e.target.value)}>
              {Object.entries(fixtures).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Texto sintético de teste
            <input
              aria-label="Texto sintético de teste"
              maxLength={200}
              placeholder="Vazio usa o exemplo do cenário"
              value={text}
              onChange={e => setText(e.target.value)}
            />
          </label>
          <button
            disabled={!proof || !version || busy || dirty || !permissions.edit}
            onClick={() =>
              void perform(async () => {
                if (!proof) return;
                const result = await api.simulate(proof.id, versionId, fixture, text || undefined);
                setProof(result.proof);
                setRun(result.run);
                setViewVersion(true);
                setMessage('Simulação registrada. Zero chamadas externas.');
              })
            }
          >
            Simular sem enviar
          </button>
        </div>
        {run ? (
          <div className="amh-run">
            <h3>
              v{run.version_number} · {statusLabels[run.outcome] || run.outcome}
            </h3>
            <p>
              Material: {run.material} · Envios externos: {run.outbound_calls} · Mautic: não
              executado · recibo {run.id}
            </p>
            <h3>Prévia — não enviada</h3>
            <blockquote>{run.preview}</blockquote>
            <div className="amh-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nó</th>
                    <th>Estado</th>
                    <th>Motivo</th>
                    <th>Horário</th>
                    <th>Tentativas</th>
                  </tr>
                </thead>
                <tbody>
                  {run.trace.map(t => (
                    <tr key={t.node}>
                      <td>{labels[t.node]}</td>
                      <td>{statusLabels[t.status] || t.status}</td>
                      <td>{t.reason}</td>
                      <td>{new Date(t.at).toLocaleTimeString('pt-BR')}</td>
                      <td>{t.attempts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p>
            Escolha uma versão para acompanhar o caminho completo. Rascunhos não alteram execuções
            anteriores.
          </p>
        )}
        {proof?.ledger.length ? (
          <details>
            <summary>Recibos anteriores ({proof.ledger.length})</summary>
            {[...proof.ledger].reverse().map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setRun(item);
                  setVersionId(item.version_id);
                  setViewVersion(true);
                }}
              >
                v{item.version_number} · {fixtures[item.fixture as keyof typeof fixtures]} ·{' '}
                {statusLabels[item.outcome] || item.outcome}
              </button>
            ))}
          </details>
        ) : null}
      </section>
    </section>
  );
}
