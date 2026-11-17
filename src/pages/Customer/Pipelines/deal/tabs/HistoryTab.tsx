import { useMemo, useState } from 'react';
import { ArrowRightLeft, FileText, History, MessageSquare, Search, UserRound } from 'lucide-react';
import type { DealTabProps } from '../dealContext';
import { actionLabel, dayKey, formatDateTime, historyGroup, HISTORY_GROUP_LABELS, relativeTime, type HistoryGroup } from '../dealFormat';

const ICONS: Record<HistoryGroup, typeof History> = { deal: History, stage: ArrowRightLeft, contact: UserRound, conversation: MessageSquare, file: FileText };

function describe(changes: Record<string, unknown>) {
  return Object.entries(changes || {}).map(([key, value]) => {
    if (value && typeof value === 'object' && 'to' in (value as Record<string, unknown>)) {
      const { from, to } = value as { from?: unknown; to?: unknown };
      return `${key.replace(/_/g, ' ')}: ${from == null || from === '' ? '—' : String(from)} → ${to == null || to === '' ? '—' : String(to)}`;
    }
    return `${key.replace(/_/g, ' ')}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`;
  });
}

export default function HistoryTab({ deal }: DealTabProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | HistoryGroup>('all');
  const events = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return [...(deal.history || [])]
      .filter(event => filter === 'all' || historyGroup(event) === filter)
      .filter(event => !normalized || `${actionLabel(event.action)} ${event.action} ${event.source} ${event.actor?.name || ''} ${JSON.stringify(event.changes || {})}`.toLocaleLowerCase().includes(normalized))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [deal.history, query, filter]);
  const days = useMemo(() => {
    const map = new Map<string, typeof events>();
    events.forEach(event => map.set(dayKey(event.created_at), [...(map.get(dayKey(event.created_at)) || []), event]));
    return [...map.entries()];
  }, [events]);
  const today = dayKey(new Date().toISOString());
  return (
    <section className="deal-panel" aria-label="Histórico do negócio">
      <div className="deal-history-filters">
        <label className="deal-fields-search"><Search className="h-4 w-4" aria-hidden="true" /><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar no histórico…" aria-label="Buscar no histórico" /></label>
        <select aria-label="Filtrar histórico" value={filter} onChange={event => setFilter(event.target.value as typeof filter)}>
          <option value="all">Todos</option>
          {(Object.keys(HISTORY_GROUP_LABELS) as HistoryGroup[]).map(group => <option key={group} value={group}>{HISTORY_GROUP_LABELS[group]}</option>)}
        </select>
      </div>
      {days.length ? days.map(([key, items]) => (
        <div key={key} className="deal-history-day">
          <h3>{key === today ? 'Hoje' : new Date(`${key}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' })}</h3>
          <ol>
            {items.map(event => {
              const Icon = ICONS[historyGroup(event)];
              const changes = describe(event.changes);
              return (
                <li key={`${event.action}-${event.id}`} className="deal-history-item">
                  <span className="deal-history-icon" aria-hidden="true"><Icon className="h-4 w-4" /></span>
                  <div>
                    <p><strong>{actionLabel(event.action)}</strong><span className="deal-history-source">{event.source}</span></p>
                    {changes.length > 0 && <p className="deal-history-changes">{changes.join(' · ')}</p>}
                    <p className="deal-history-meta"><time dateTime={event.created_at} title={formatDateTime(event.created_at)}>{relativeTime(event.created_at)}</time> · {event.actor?.name || 'Sistema'}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )) : <p className="deal-empty-note">{query || filter !== 'all' ? 'Nada encontrado com esses filtros.' : 'Nenhum evento registrado.'}</p>}
    </section>
  );
}
