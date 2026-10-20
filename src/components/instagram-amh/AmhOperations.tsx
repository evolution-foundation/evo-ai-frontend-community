import { useAuthStore } from '@/store/authStore';
import { useEffect, useState } from 'react';
import { operationsApi, type Operations } from './api';
import './amh-visual.css';

const eventStates: Record<string, string> = {
  pending: 'Pendente',
  synced: 'Sincronizado',
  failed: 'Falha',
  processing: 'Em processamento',
};
const outcomes: Record<string, string> = {
  simulated_accepted: 'Aceite simulado',
  rejected: 'Recusado',
  uncertain: 'Incerto',
  conflict: 'Conflito',
  blocked: 'Bloqueado',
  failed: 'Falha',
  skipped: 'Repetido',
};
const date = (value: string) => new Date(value).toLocaleString('pt-BR');
export function AmhOperations({ api = operationsApi }: { api?: typeof operationsApi }) {
  const token = useAuthStore(state => state.accessToken);
  const userId = useAuthStore(state => state.currentUser?.id);
  // Remount synchronously on identity changes: no previous identity snapshot or
  // in-flight completion may become visible in the new session.
  return <OperationsPanel key={JSON.stringify([userId, token])} api={api} />;
}
function OperationsPanel({ api }: { api: typeof operationsApi }) {
  const [data, setData] = useState<Operations | null>(null);
  const [busy, setBusy] = useState(true);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [material, setMaterial] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let live = true;
    setBusy(true);
    setFailed(false);
    api
      .get()
      .then(result => {
        if (live) setData(result);
      })
      .catch(() => {
        if (live) setFailed(true);
      })
      .finally(() => {
        if (live) setBusy(false);
      });
    return () => {
      live = false;
    };
  }, [api, refresh]);
  const rules =
    data?.rules.filter(
      rule =>
        (!material || rule.material === material) &&
        [rule.name, rule.scope.ad, rule.scope.media, rule.scope.account, ...rule.keywords]
          .join(' ')
          .toLocaleLowerCase('pt-BR')
          .includes(query.trim().toLocaleLowerCase('pt-BR')),
    ) || [];
  return (
    <section className="amh-proof amh-operations" aria-label="Operação Instagram AMH">
      <header className="amh-header">
        <div>
          <h2>Regras e acompanhamento</h2>
          <p>Comentários recebidos e testes de cada regra.</p>
        </div>
        <button disabled={busy} onClick={() => setRefresh(value => value + 1)}>
          Atualizar acompanhamento
        </button>
      </header>
      <p className="amh-paused">Todas as regras pausadas · saídas automáticas bloqueadas</p>
      <p>
        O botão na primeira mensagem aguarda homologação controlada. A alternativa é o link no
        texto, na mesma mensagem.
      </p>
      <button disabled aria-describedby="amh-activation-reason">
        Ligar automação
      </button>
      <p id="amh-activation-reason">
        Ativação indisponível até homologação e liberação específica. Salvar ou publicar no editor
        mantém a regra pausada.
      </p>
      {busy ? <p role="status">Consultando acompanhamento…</p> : null}
      {failed ? (
        <p role="alert">
          Não foi possível atualizar. Tente novamente.
          {data ? ' Os dados abaixo são da última consulta.' : ''}
        </p>
      ) : null}
      {data ? (
        <>
          <p>
            Consulta: {date(data.at)}. Recepção:{' '}
            {data.inbound.available
              ? data.reception_enabled
                ? 'habilitada'
                : 'pausada'
              : 'configuração indisponível'}
            .
          </p>
          <div className="amh-toolbar">
            <label>
              Buscar regra, conta, anúncio ou publicação
              <input value={query} onChange={event => setQuery(event.target.value)} />
            </label>
            <label>
              Filtrar material
              <select value={material} onChange={event => setMaterial(event.target.value)}>
                <option value="">Todos</option>
                <option value="amh">AMH</option>
                <option value="amh-consultorio">AMH no consultório</option>
              </select>
            </label>
          </div>
          <p>
            Até {data.limit} regras recentes. O escopo e a prévia abaixo pertencem à última versão
            publicada para simulação; regras sem versão mostram o rascunho.
          </p>
          <div className="amh-rule-grid">
            {rules.map(rule => (
              <article className="amh-rule-card" key={rule.id}>
                <h3>{rule.name}</h3>
                <strong>
                  Pausada · {rule.version ? `versão ${rule.version}` : 'rascunho sem versão'}
                </strong>
                {rule.draft_changed ? (
                  <p>Há alterações de rascunho ainda não publicadas para simulação.</p>
                ) : null}
                <dl>
                  <dt>Material</dt>
                  <dd>{rule.material}</dd>
                  <dt>Conta</dt>
                  <dd>{rule.scope.account || 'Não definida'}</dd>
                  <dt>Anúncio</dt>
                  <dd>{rule.scope.ad || 'Não definido'}</dd>
                  <dt>Publicação</dt>
                  <dd>{rule.scope.media || 'Não definida'}</dd>
                  <dt>Palavras-chave</dt>
                  <dd>{rule.keywords.join(' / ')}</dd>
                </dl>
                <h4>Prévia da mensagem · não enviada</h4>
                <blockquote>{rule.preview}</blockquote>
                <p>
                  O marcador {'{{link}}'} será substituído pelo link individual. Esta consulta não
                  emite links.
                </p>
                <p>
                  {rule.simulations} simulações.
                  {rule.last_simulation
                    ? ` Última: ${outcomes[rule.last_simulation.outcome] || rule.last_simulation.outcome}, ${date(rule.last_simulation.at)}. Chamadas externas: ${rule.last_simulation.outbound_calls}.`
                    : ''}
                </p>
              </article>
            ))}
          </div>
          {!rules.length ? <p>Nenhuma regra encontrada nesta consulta.</p> : null}
          <h3>Recepção real · ledger de entrada</h3>
          <p>
            Contagens referentes aos últimos {data.limit} recibos exibidos, sem representar o
            histórico completo.
          </p>
          {!data.inbound.available ? (
            <p>
              Eventos indisponíveis: confira a configuração da conta/inbox. Isso não significa fila
              vazia.
            </p>
          ) : (
            <>
              <div className="amh-event-counts">
                {Object.entries(data.inbound.counts).map(([state, count]) => (
                  <span key={state}>
                    {eventStates[state] || state}: <strong>{count}</strong>
                  </span>
                ))}
              </div>
              {!data.inbound.recent.length ? (
                <p>
                  Nenhum evento na inbox configurada. Isso não comprova ausência de interações na
                  Meta.
                </p>
              ) : (
                <ul className="amh-event-list">
                  {data.inbound.recent.map(event => (
                    <li key={event.id}>
                      <strong>{eventStates[event.state] || event.state}</strong> · recebido{' '}
                      {date(event.created_at)} · atualizado {date(event.updated_at)}
                      <br />
                      <small>Recibo: {event.id}</small>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          <p>
            Contatos canônicos, conflitos de identidade, supressões e elegibilidade de convite devem
            ser conferidos no Mautic. Esta consulta não verifica o Mautic nem confirma entrega de
            e-mail ou leitura de DM.
          </p>
        </>
      ) : null}
    </section>
  );
}
