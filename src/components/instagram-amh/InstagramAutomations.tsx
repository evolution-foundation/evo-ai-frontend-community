import { useEffect, useState } from 'react';
import { Instagram, Plus, ArrowRight, RefreshCw } from 'lucide-react';
import { automationApi, type Catalog } from './automationApi';
import type { AutomationSummary } from './api';
import { AmhAutomation } from './AmhAutomation';
import type { ProofPermissions } from './AmhVisualProof';
import { extractError } from '@/utils/apiHelpers';
import './automation.css';

const status: Record<string, string> = { active: 'Ativa', test: 'Em teste restrito', paused: 'Pausada' };
export function InstagramAutomations({ permissions, api = automationApi }: { permissions: ProofPermissions; api?: typeof automationApi }) {
  const [items, setItems] = useState<AutomationSummary[]>([]);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError('');
    void Promise.allSettled([api.list(), api.catalog()]).then(([rules, connection]) => {
      if (!live) return;
      if (rules.status === 'fulfilled') setItems(rules.value);
      else setError(extractError(rules.reason).message || 'Não foi possível carregar as automações.');
      if (connection.status === 'fulfilled') setCatalog(connection.value);
      else setCatalog(null);
      setLoading(false);
    });
    return () => { live = false; };
  }, [refresh, api]);
  if (selected !== null) return <AmhAutomation api={api} permissions={permissions} initialId={selected || undefined}
    onBack={() => { setSelected(null); setRefresh(n => n + 1); }} />;
  const visible = items.filter(item => (filter === 'all' || item.state === filter) && item.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const active = items.filter(item => item.state === 'active').length;
  return <section className="ig-automation">
    <header className="ig-title">
      <div><span className="ig-eyebrow">RELACIONAMENTO / INSTAGRAM</span><h1>Automações do Instagram</h1>
        <p>Transforme comentários em conversas e entregue o material certo para cada conteúdo.</p></div>
      {permissions.create && <button className="ig-primary" disabled={loading || !catalog} onClick={() => setSelected('')}><Plus size={16} /> Nova automação</button>}
    </header>
    <div className="ig-connection"><Instagram size={26} /><div><strong>{catalog?.account.label || (loading ? 'Carregando conta…' : 'Conta indisponível')}</strong>
      <p>{catalog ? 'Conta conectada · comentários de publicações e anúncios' : 'Confira a conexão do Instagram em Canais.'}</p></div>
      <span className={`ig-status ig-status-${active ? 'active' : 'paused'}`}>{active ? `${active} ativa${active > 1 ? 's' : ''}` : 'Nenhuma automação comercial ativa'}</span>
    </div>
    <div className="ig-metrics">
      <div><strong>{items.length}</strong><span>Automações salvas</span></div>
      <div><strong>{active}</strong><span>Ativas para novos comentários</span></div>
      <div><strong>{items.filter(item => item.state === 'test').length}</strong><span>Em teste restrito</span></div>
    </div>
    <div className="ig-toolbar"><label>Buscar automação<input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nome da automação" /></label>
      <label>Status<select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">Todos os status</option><option value="active">Ativas</option><option value="test">Em teste</option><option value="paused">Pausadas</option></select></label>
      <button disabled={loading} onClick={() => setRefresh(n => n + 1)}><RefreshCw size={15} /> Atualizar</button></div>
    {error && <p role="alert" className="ig-alert">{error}</p>}
    {loading ? <p role="status">Carregando automações…</p> : <div className="ig-automation-list">
      {visible.map(item => {
        const publication = catalog?.publications.find(p => p.id === item.scope?.media);
        return <article className="ig-rule-card" key={item.id}>
          <header><Instagram size={20} /><span className={`ig-status ig-status-${item.state || 'paused'}`}>{status[item.state || 'paused']}</span></header>
          <h2>{item.name}</h2><p>{publication?.label || (item.scope?.media ? `Publicação ${item.scope.media}` : 'Conteúdo ainda não configurado')}</p>
          <dl><div><dt>Palavras-chave</dt><dd>{item.keywords?.join(' · ') || 'Não configuradas'}</dd></div>
            <div><dt>Material</dt><dd>{item.material === 'amh' ? 'AMH · Highlights' : item.material === 'amh-consultorio' ? 'AMH · No consultório' : 'Não configurado'}</dd></div>
            <div><dt>Versão</dt><dd>{item.version ? `${item.version}${item.draft_changed ? ' · alterações em rascunho' : ''}` : 'Rascunho'}</dd></div></dl>
          <button onClick={() => setSelected(item.id)}>Abrir configuração <ArrowRight size={15} /></button>
        </article>;
      })}
      {!visible.length && !error && <div className="ig-card"><h2>{items.length ? 'Nenhum resultado' : 'Comece pelo conteúdo'}</h2><p>{items.length ? 'Ajuste a busca ou o filtro.' : 'Crie uma automação, escolha a publicação ou anúncio, configure as respostas e teste antes de ativar.'}</p></div>}
    </div>}
    <p className="ig-footnote">Cada automação reúne conteúdo, palavras-chave, resposta pública e Direct. Em teste, somente o perfil autorizado recebe mensagens. Ativações processam comentários novos.</p>
  </section>;
}
