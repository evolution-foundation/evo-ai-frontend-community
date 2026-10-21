import { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronRight,
  Instagram,
  MessageCircle,
  Plus,
  Send,
  Settings2,
  X,
} from 'lucide-react';
import {
  automationApi,
  type AutomationApi,
  type Catalog,
  type Delivery,
  type TestEvent,
} from './automationApi';
import { initialGraph, type Graph, type Parameters, type Proof, type Stage } from './contract';
import { extractError } from '@/utils/apiHelpers';
import { useUnsavedNavigationGuard } from './useUnsavedNavigationGuard';
import type { ProofPermissions } from './AmhVisualProof';
import './automation.css';
import { keywordMatches } from './keywordMatches';

const steps = ['Publicação', 'Palavras-chave', 'Mensagem e material', 'Testar e ativar'];
const states: Record<string, string> = {
  paused: 'Pausada',
  test: 'Em teste',
  active: 'Ativa',
  accepted: 'Material aceito pelo Instagram',
  awaiting_confirmation: 'Aguardando clique em Pode enviar',
  prompt_sending: 'Convite reservado',
  prompt_failed: 'Convite recusado pelo Instagram',
  prompt_uncertain: 'Convite com resultado incerto · não reenviar',
  failed: 'Envio recusado',
  uncertain: 'Resultado incerto · revisar antes de reenviar',
  sending: 'Entrega após o clique em processamento',
  pending: 'Na fila',
  blocked: 'Envio bloqueado',
};
const likeStates: Record<string, string> = {
  not_requested: 'Curtida não solicitada nesta execução',
  pending: 'Curtida pendente',
  sending: 'Curtida reservada · aguarde o resultado',
  accepted: 'Curtida confirmada pelo Instagram',
  failed: 'Curtida recusada pelo Instagram',
  uncertain: 'Curtida com resultado incerto · revisar',
  blocked: 'Curtida bloqueada',
};
const likeReasons: Record<string, string> = {
  like_gate_disabled: 'curtida automática desligada',
  facebook_connection_required: 'conecte o Facebook para autorizar curtidas',
  engagement_permission_required: 'autorize a permissão de curtidas no Facebook',
  facebook_account_mismatch: 'a conta do Facebook não corresponde ao Instagram',
  rule_unavailable: 'configuração pausada ou comentário inelegível',
  like_rate_limited: 'limite de curtidas atingido · revisar',
};
export function AmhAutomation({
  permissions,
  api = automationApi,
}: {
  permissions: ProofPermissions;
  api?: AutomationApi;
}) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [items, setItems] = useState<Pick<Proof, 'id' | 'name'>[]>([]);
  const [proof, setProof] = useState<Proof | null>(null);
  const [graph, setGraph] = useState<Graph>(() => {
    const next = initialGraph();
    next.nodes.find(n => n.id === 'scope')!.data = { account: '', media: '', ad: '' };
    return next;
  });
  const [name, setName] = useState('Entrega de material AMH');
  const [step, setStep] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [loadError, setLoadError] = useState('');
  const [word, setWord] = useState('');
  const [sample, setSample] = useState('Quero o AMH!');
  const [previewConfirmed, setPreviewConfirmed] = useState(false);
  const [events, setEvents] = useState<TestEvent[]>([]);
  const [eventId, setEventId] = useState('');
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const createKey = useRef(crypto.randomUUID());
  const request = useRef(0);
  useUnsavedNavigationGuard(dirty);
  useEffect(() => {
    let live = true;
    void Promise.all([api.catalog(), api.list()])
      .then(([inventory, list]) => {
        if (!live) return;
        setCatalog(inventory);
        setItems(list);
        setGraph(old => ({
          ...old,
          nodes: old.nodes.map(node =>
            node.id === 'scope' && !node.data.account
              ? { ...node, data: { ...node.data, account: inventory.account.id } }
              : node,
          ),
        }));
      })
      .catch(error => {
        if (live)
          setLoadError(
            extractError(error).message ||
              'Não foi possível carregar a conta. Recarregue para tentar novamente.',
          );
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
  const data = Object.fromEntries(graph.nodes.map(node => [node.id, node.data])) as Record<
    Stage,
    Parameters
  >;
  const editable = !busy && (proof ? permissions.edit : permissions.create);
  const change = (stage: Stage, patch: Parameters) => {
    setPreviewConfirmed(false);
    setGraph(old => ({
      ...old,
      nodes: old.nodes.map(node =>
        node.id === stage ? { ...node, data: { ...node.data, ...patch } } : node,
      ),
    }));
    setDirty(true);
  };
  const hydrate = (next: Proof) => {
    setPreviewConfirmed(false);
    setProof(next);
    setGraph(next.draft);
    setName(next.name);
    setDirty(false);
    setItems(old => [next, ...old.filter(item => item.id !== next.id)]);
  };
  const perform = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      await action();
    } catch (error) {
      setMessage(extractError(error).message || 'Não foi possível concluir. Tente novamente.');
    } finally {
      setBusy(false);
    }
  };
  const words = data.keyword.keywords || [];
  const addWord = () => {
    const next = word.trim();
    if (!next || words.includes(next) || words.length >= 10) return;
    change('keyword', { keywords: [...words, next] });
    setWord('');
  };
  const valid = [
    Boolean(data.scope.account && (data.scope.media || data.scope.ad)),
    words.length > 0 && !word.trim(),
    Boolean(
      data.reply.confirmationRequired &&
      data.reply.openingText?.trim() &&
      data.reply.text?.trim() &&
      data.reply.buttonLabel?.trim() &&
      !/https?:|www\.|\{\{link\}\}/i.test(data.reply.text + data.reply.openingText),
    ),
  ];
  const version = proof?.versions.at(-1);
  const ready = Boolean(
    proof &&
    version &&
    !dirty &&
    data.reply.confirmationRequired &&
    version.graph.nodes.find(n => n.id === 'reply')?.data.confirmationRequired,
  );
  const matching = keywordMatches(sample, data.keyword);
  const publication = catalog?.publications.find(item => item.id === data.scope.media);
  const preview = data.reply.text || '';
  const legacy = data.reply.confirmationRequired !== true;
  const isCurrentVersion = proof?.active_version_id === version?.id;
  return (
    <section className="ig-automation">
      <header className="ig-title">
        <div>
          <span className="ig-eyebrow">AUTOMAÇÕES / INSTAGRAM</span>
          <h1>Do comentário ao material.</h1>
          <p>Configure o convite, a confirmação, a curtida e a entrega do material no Direct.</p>
        </div>
        <span className={`ig-status ig-status-${proof?.state || 'paused'}`}>
          {states[proof?.state || 'paused']}
        </span>
      </header>
      {loadError && (
        <p role="alert" className="ig-alert">
          {loadError}
        </p>
      )}
      {catalog?.comment_like_status === 'connection_required' && (
        <p role="status" className="ig-alert">
          Para curtir comentários, autorize a conexão Facebook da mesma conta Instagram. O convite e
          a entrega do material continuam funcionando.
        </p>
      )}
      {catalog?.comment_like_status === 'disabled' && (
        <p role="status" className="ig-alert">
          A curtida automática está desligada.
        </p>
      )}
      <div className="ig-topbar">
        <label>
          Automação
          <select
            aria-label="Automação"
            disabled={busy || dirty}
            value={proof?.id || ''}
            onChange={event => {
              const id = event.target.value;
              const generation = ++request.current;
              if (id)
                void perform(async () => {
                  const next = await api.get(id);
                  if (generation === request.current) {
                    hydrate(next);
                    setDeliveries([]);
                    setEvents([]);
                  }
                });
              else {
                setProof(null);
                const next = initialGraph();
                next.nodes.find(n => n.id === 'scope')!.data = {
                  account: catalog?.account.id || '',
                  media: '',
                  ad: '',
                };
                setGraph(next);
                setName('Entrega de material AMH');
                setDeliveries([]);
                setEvents([]);
                setEventId('');
                setStep(0);
                createKey.current = crypto.randomUUID();
              }
            }}
          >
            <option value="">Nova automação</option>
            {items.map(item => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Nome da automação
          <input
            disabled={!editable}
            maxLength={100}
            value={name}
            onChange={e => {
              setName(e.target.value);
              setDirty(true);
            }}
          />
        </label>
        <button
          className="ig-secondary"
          disabled={!editable || !valid.every(Boolean) || !name.trim()}
          onClick={() =>
            void perform(async () => {
              hydrate(
                proof
                  ? await api.save(proof, graph, name)
                  : await api.create(name, graph, createKey.current),
              );
              setMessage(
                'Rascunho salvo. Os envios usam a versão ativada, até você publicar e testar a nova configuração.',
              );
            })
          }
        >
          Salvar rascunho{dirty ? ' •' : ''}
        </button>
        {dirty && proof && (
          <button
            disabled={busy}
            onClick={() => void perform(async () => hydrate(await api.get(proof.id)))}
          >
            Descartar alterações
          </button>
        )}
      </div>
      <nav className="ig-steps" aria-label="Etapas da automação">
        {steps.map((label, index) => (
          <button
            key={label}
            aria-current={step === index ? 'step' : undefined}
            onClick={() => setStep(index)}
          >
            <span>{index < 3 && valid[index] ? <Check size={16} /> : index + 1}</span>
            {label}
            <ChevronRight size={15} />
          </button>
        ))}
      </nav>
      {message && (
        <p role="status" className="ig-alert">
          {message}
        </p>
      )}
      <div className="ig-layout">
        <main className="ig-card">
          {step === 0 && (
            <>
              <span className="ig-eyebrow">01 / O GATILHO</span>
              <h2>Em qual publicação?</h2>
              <p>A automação só responde aos comentários da publicação escolhida nesta conta.</p>
              <fieldset disabled={!editable}>
                <label>
                  Conta conectada
                  <input readOnly value={catalog?.account.label || 'Carregando conexão…'} />
                </label>
                <label>
                  Publicação ou anúncio
                  <select
                    aria-label="Publicação ou anúncio"
                    value={data.scope.media || ''}
                    onChange={e => {
                      const item = catalog?.publications.find(p => p.id === e.target.value);
                      change('scope', { media: e.target.value, ad: item?.ad || '' });
                    }}
                  >
                    <option value="">Selecione uma publicação</option>
                    {data.scope.media && !publication && (
                      <option value={data.scope.media}>
                        Publicação salva · {data.scope.media}
                      </option>
                    )}
                    {catalog?.publications.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.label || `Publicação ${item.id}`}
                      </option>
                    ))}
                  </select>
                </label>
                {publication && (
                  <div className="ig-publication">
                    <Instagram size={24} />
                    <div>
                      <strong>{publication.label}</strong>
                      <p>
                        {publication.source === 'received'
                          ? 'Identificada em um comentário recebido'
                          : 'Publicação da conta conectada'}
                      </p>
                    </div>
                  </div>
                )}
                <details>
                  <summary>
                    <Settings2 size={15} /> Configuração por ID
                  </summary>
                  <p>
                    Use quando o anúncio ainda não aparece na lista. Não use o link da publicação
                    como ID.
                  </p>
                  <label>
                    ID da publicação
                    <input
                      value={data.scope.media || ''}
                      onChange={e => change('scope', { media: e.target.value.trim() })}
                    />
                  </label>
                  <label>
                    ID do anúncio (opcional)
                    <input
                      value={data.scope.ad || ''}
                      onChange={e => change('scope', { ad: e.target.value.trim() })}
                    />
                  </label>
                </details>
              </fieldset>
            </>
          )}
          {step === 1 && (
            <>
              <span className="ig-eyebrow">02 / A CONDIÇÃO</span>
              <h2>O que a pessoa precisa comentar?</h2>
              <p>
                Qualquer uma das palavras abaixo aciona a mensagem. Cada comentário recebe no máximo
                uma resposta privada.
              </p>
              <fieldset disabled={!editable}>
                <label htmlFor="ig-word">Palavras-chave</label>
                <div className="ig-keywords">
                  {words.map(keyword => (
                    <span key={keyword}>
                      {keyword}
                      <button
                        aria-label={`Remover ${keyword}`}
                        onClick={() =>
                          change('keyword', { keywords: words.filter(w => w !== keyword) })
                        }
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="ig-add">
                  <input
                    id="ig-word"
                    value={word}
                    maxLength={60}
                    placeholder="Ex.: AMH ou material"
                    onChange={e => setWord(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addWord();
                      }
                    }}
                  />
                  <button disabled={!word.trim() || words.length >= 10} onClick={addWord}>
                    <Plus size={16} /> Adicionar
                  </button>
                </div>
                <small>
                  Digite uma palavra ou frase e clique em Adicionar. Até 10 alternativas.
                </small>
                <label>
                  Como encontrar a palavra
                  <select
                    value={data.keyword.mode}
                    onChange={e =>
                      change('keyword', { mode: e.target.value as 'word' | 'contains' })
                    }
                  >
                    <option value="word">Palavra ou frase inteira (recomendado)</option>
                    <option value="contains">Qualquer trecho do comentário</option>
                  </select>
                </label>
                <p className="ig-hint">
                  {data.keyword.mode === 'word'
                    ? 'AMH reconhece “Quero AMH!” e não reconhece “XAMH”.'
                    : 'AMH também reconhece “XAMH”. Use para reconhecer trechos de palavras.'}
                </p>
                <label className="ig-checkbox">
                  <input
                    type="checkbox"
                    checked={data.keyword.ignoreCase}
                    onChange={e => change('keyword', { ignoreCase: e.target.checked })}
                  />{' '}
                  Aceitar maiúsculas e minúsculas
                </label>
                <label className="ig-checkbox">
                  <input
                    type="checkbox"
                    checked={data.keyword.ignoreAccents}
                    onChange={e => change('keyword', { ignoreAccents: e.target.checked })}
                  />{' '}
                  Aceitar variações com e sem acento
                </label>
              </fieldset>
              <div className="ig-try">
                <label>
                  Experimente um comentário
                  <input value={sample} maxLength={200} onChange={e => setSample(e.target.value)} />
                </label>
                <p role="status" className={matching ? 'ig-match' : 'ig-no-match'}>
                  {matching
                    ? '✓ Este comentário aciona o convite'
                    : 'Este comentário não aciona o convite'}
                </p>
                <small>
                  Esta prévia verifica as palavras. O teste completo também valida conta, publicação
                  e janela de envio.
                </small>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <span className="ig-eyebrow">03 / A ENTREGA</span>
              <h2>Primeiro o convite. Depois o material.</h2>
              <p>
                O comentário envia apenas o convite. O clique em Pode enviar libera a mensagem com o
                botão de acesso. Nenhum link é enviado antes da confirmação.
              </p>
              <fieldset disabled={!editable}>
                <label>
                  Material
                  <select
                    value={data.material.material}
                    onChange={e => change('material', { material: e.target.value })}
                  >
                    <option value="amh">AMH — Highlights</option>
                    <option value="amh-consultorio">AMH — No consultório</option>
                  </select>
                </label>
                {legacy && (
                  <div className="ig-alert">
                    <p>
                      Esta configuração antiga enviava o material diretamente. Publique uma nova
                      versão com confirmação para voltar a ativar.
                    </p>
                    <button
                      onClick={() =>
                        change('reply', initialGraph().nodes.find(n => n.id === 'reply')!.data)
                      }
                    >
                      Usar convite com confirmação
                    </button>
                  </div>
                )}
                <label>
                  Convite antes da confirmação
                  <textarea
                    aria-label="Convite antes da confirmação"
                    rows={3}
                    maxLength={600}
                    value={data.reply.openingText || ''}
                    onChange={e => change('reply', { openingText: e.target.value })}
                  />
                </label>
                <p className="ig-hint">
                  Botão do convite: <strong>Pode enviar</strong>. O clique autoriza somente a
                  entrega deste material.
                </p>
                <label>
                  Mensagem após o clique
                  <textarea
                    aria-label="Mensagem após o clique"
                    rows={4}
                    maxLength={600}
                    value={data.reply.text || ''}
                    onChange={e => change('reply', { text: e.target.value })}
                  />
                </label>
                <label>
                  Texto do botão de acesso
                  <input
                    maxLength={20}
                    value={data.reply.buttonLabel || ''}
                    onChange={e => change('reply', { buttonLabel: e.target.value })}
                  />
                </label>
                <p className="ig-hint">
                  O link individual fica apenas no botão. Não cole URLs nas mensagens.
                </p>
                {!valid[2] && (
                  <p role="alert">
                    Preencha o convite, a mensagem e o botão, sem incluir URLs no texto.
                  </p>
                )}
              </fieldset>
            </>
          )}
          {step === 3 && (
            <>
              <span className="ig-eyebrow">04 / REVISÃO E PUBLICAÇÃO</span>
              <h2>Confira antes de ligar.</h2>
              <p>
                Salve e publique a configuração. Primeiro teste com o perfil autorizado; depois
                confirme o clique e a entrega antes de ativar para novos comentários.
              </p>
              <ol className="ig-review">
                <li>
                  <strong>Publicação</strong>
                  <span>
                    {publication?.label ||
                      data.scope.media ||
                      data.scope.ad ||
                      'Selecione uma publicação'}
                  </span>
                </li>
                <li>
                  <strong>Palavras</strong>
                  <span>{words.join(' · ') || 'Adicione uma palavra'}</span>
                </li>
                <li>
                  <strong>Material</strong>
                  <span>
                    {data.material.material === 'amh' ? 'AMH — Highlights' : 'AMH — No consultório'}
                  </span>
                </li>
              </ol>
              <div className="ig-actions">
                <button
                  disabled={!ready || busy || !permissions.edit}
                  onClick={() =>
                    void perform(async () => {
                      if (!proof || !version) return;
                      const result = await api.simulate(
                        proof.id,
                        version.id,
                        'eligible',
                        sample || undefined,
                      );
                      setProof(result.proof);
                      setMessage(
                        result.run.outcome === 'simulated_accepted'
                          ? 'Validação aprovada: a versão publicada reconhece o comentário. O material continua bloqueado até o clique em Pode enviar. Nenhuma mensagem foi enviada.'
                          : 'O comentário não passou na validação da versão publicada. Confira as palavras-chave. Nenhuma mensagem foi enviada.',
                      );
                    })
                  }
                >
                  Validar sem enviar
                </button>
              </div>
              <div className="ig-actions">
                <button
                  disabled={!proof || dirty || busy || !permissions.publish}
                  onClick={() =>
                    void perform(async () => {
                      if (!proof) return;
                      hydrate(await api.publish(proof));
                      setMessage('Versão publicada. Prepare o teste para conferir um envio real.');
                    })
                  }
                >
                  Publicar configuração
                </button>
                <button
                  disabled={
                    !ready ||
                    busy ||
                    !permissions.publish ||
                    !catalog?.test_available ||
                    !catalog.execution_available
                  }
                  onClick={() =>
                    void perform(async () => {
                      if (!proof || !version) return;
                      hydrate(await api.activate(proof, version.id, 'test'));
                      const list = await api.testEvents();
                      setEvents(list);
                      setEventId(list.find(e => !e.delivered)?.id || '');
                      setMessage(
                        'Modo de teste ligado: somente o perfil autorizado pode receber mensagens.',
                      );
                    })
                  }
                >
                  Preparar teste real
                </button>
              </div>
              {!catalog?.execution_available && (
                <p className="ig-alert">
                  Envio ainda indisponível nesta instalação. A configuração pode ser salva; a
                  ativação depende da implantação e liberação do executor.
                </p>
              )}
              {proof?.state === 'test' && (
                <div className="ig-try">
                  <h3>Envio real para o perfil de teste</h3>
                  <p>
                    Este botão envia apenas o convite ao perfil de teste. O material depende do
                    clique real em Pode enviar no Instagram.
                  </p>
                  <button
                    disabled={busy}
                    onClick={() =>
                      void perform(async () => {
                        setEvents(await api.testEvents());
                      })
                    }
                  >
                    Atualizar comentários de teste
                  </button>
                  <label>
                    Comentário de teste
                    <select value={eventId} onChange={e => setEventId(e.target.value)}>
                      <option value="">Selecione um comentário</option>
                      {events.map(event => (
                        <option key={event.id} value={event.id} disabled={event.delivered}>
                          {event.text} · {new Date(event.at).toLocaleString('pt-BR')}
                          {event.delivered ? ' · já processado' : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="ig-primary"
                    disabled={
                      !eventId || busy || dirty || !isCurrentVersion || !permissions.publish
                    }
                    onClick={() =>
                      void perform(async () => {
                        if (!proof) return;
                        const result = await api.testReply(proof.id, eventId);
                        setDeliveries(await api.deliveries(proof.id));
                        setEvents(await api.testEvents());
                        setEventId('');
                        setMessage(
                          result.state === 'awaiting_confirmation'
                            ? 'Convite enviado. Agora clique em Pode enviar no Instagram; o material só será liberado depois desse clique.'
                            : states[result.state] || result.state,
                        );
                      })
                    }
                  >
                    <Send size={16} /> Enviar convite de teste
                  </button>
                </div>
              )}
              <div className="ig-actions">
                <button
                  className="ig-primary"
                  disabled={!ready || busy || !permissions.publish || !catalog?.execution_available}
                  onClick={() =>
                    void perform(async () => {
                      if (!proof || !version) return;
                      hydrate(await api.activate(proof, version.id, 'active'));
                      setMessage(
                        'Automação ativa para novos comentários. Comentários antigos não serão disparados.',
                      );
                    })
                  }
                >
                  Ativar automação
                </button>
                <button
                  disabled={!proof || busy || !permissions.publish || proof.state === 'paused'}
                  onClick={() =>
                    void perform(async () => {
                      if (proof) hydrate(await api.activate(proof, '', 'paused'));
                      setMessage('Automação pausada.');
                    })
                  }
                >
                  Pausar
                </button>
              </div>
              <p className="ig-hint">
                A ativação exige um convite, o clique real e a entrega aceita pelo Instagram nesta
                versão. “Aceita” não significa lida. Respostas com resultado incerto precisam de
                revisão.
              </p>
              {proof && (
                <>
                  <h3>Últimos envios</h3>
                  <button
                    disabled={busy}
                    onClick={() =>
                      void perform(async () => {
                        setDeliveries(await api.deliveries(proof.id));
                      })
                    }
                  >
                    Atualizar acompanhamento
                  </button>
                  {deliveries.length ? (
                    <ul className="ig-deliveries">
                      {deliveries.map(item => (
                        <li key={item.id}>
                          <div>
                            <span>{states[item.state] || item.state}</span>
                            {item.like_state && (
                              <p>
                                {likeStates[item.like_state] || 'Curtida em revisão'}
                                {item.like_state === 'blocked' && item.like_reason
                                  ? ` · ${likeReasons[item.like_reason] || 'verifique a conexão'}`
                                  : ''}
                              </p>
                            )}
                          </div>
                          <time>{new Date(item.updated_at).toLocaleString('pt-BR')}</time>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>Carregue o acompanhamento para consultar os recibos desta automação.</p>
                  )}
                </>
              )}
            </>
          )}
          <footer className="ig-footer">
            <span>Etapa {step + 1} de 4</span>
            <div>
              {step > 0 && <button onClick={() => setStep(step - 1)}>Voltar</button>}
              {step < 3 && (
                <button
                  className="ig-primary"
                  disabled={!valid[step]}
                  onClick={() => setStep(step + 1)}
                >
                  Continuar <ChevronRight size={16} />
                </button>
              )}
            </div>
          </footer>
        </main>
        <aside className="ig-preview">
          <span className="ig-eyebrow">COMO A PESSOA RECEBE</span>
          <div className="ig-phone">
            <div className="ig-phone-head">
              <Instagram size={20} />
              <div>
                <strong>{catalog?.account.label || 'Instagram'}</strong>
                <small>Mensagem privada</small>
              </div>
            </div>
            <div className="ig-phone-body">
              <span className="ig-comment">
                <MessageCircle size={15} /> {sample || 'Quero o AMH!'}
              </span>
              <small>Após um comentário correspondente</small>
              {legacy ? (
                <div className="ig-alert">
                  Configuração antiga sem confirmação. Atualize antes de ativar.
                </div>
              ) : (
                <>
                  <div className="ig-bubble">{data.reply.openingText}</div>
                  <button
                    className="ig-preview-confirm"
                    disabled={previewConfirmed}
                    onClick={() => setPreviewConfirmed(true)}
                  >
                    Pode enviar
                  </button>
                  {previewConfirmed ? (
                    <>
                      <small>Depois do clique</small>
                      <div className="ig-bubble">
                        {preview}
                        <button className="ig-preview-access" disabled>
                          {data.reply.buttonLabel || 'Acessar material'}
                        </button>
                      </div>
                      <button onClick={() => setPreviewConfirmed(false)}>Reiniciar prévia</button>
                    </>
                  ) : (
                    <small>O material fica bloqueado até o clique.</small>
                  )}
                </>
              )}
              <small>Prévia interativa · nenhum envio real</small>
            </div>
          </div>
          <div className="ig-explainer">
            <strong>O caminho da entrega</strong>
            <p>
              Comentário com palavra-chave → convite → clique em Pode enviar → botão de acesso →
              cadastro → material + e-mail.
            </p>
            <p>Comentários fora da publicação escolhida não acionam esta regra.</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
