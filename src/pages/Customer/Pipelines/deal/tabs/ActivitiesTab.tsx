import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, CheckCircle2, ChevronLeft, ChevronRight, Clock, Loader2, MessageSquare, Plus } from 'lucide-react';
import { Button, Input } from '@evoapi/design-system';
import { toast } from 'sonner';
import { pipelineTasksService } from '@/services/pipelines/pipelineTasksService';
import type { PipelineTask } from '@/types/analytics';
import { getContactAvatarStyle, getContactInitials } from '@/utils/chat/avatarHelpers';
import type { DealTabProps } from '../dealContext';
import { dayKey, formatDateTime, formatDay } from '../dealFormat';
import { HeaderAvatar } from '../HeaderAvatar';

const TASK_TYPES: Array<{ value: PipelineTask['task_type']; label: string }> = [
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'call', label: 'Ligação' },
  { value: 'email', label: 'E-mail' },
  { value: 'meeting', label: 'Reunião' },
  { value: 'note', label: 'Nota' },
  { value: 'other', label: 'Outra' },
];

const STATUS_LABEL: Record<PipelineTask['status'], string> = {
  pending: 'Aguardando',
  completed: 'Concluída',
  cancelled: 'Cancelada',
  overdue: 'Com atraso',
};

function Stepper({ stages, current, ownerName, ownerAvatar }: { stages: Array<{ id: string; name: string }>; current: number; ownerName?: string; ownerAvatar?: string }) {
  const ref = useRef<HTMLOListElement>(null);
  useEffect(() => {
    // Centraliza a etapa atual rolando só a lista (scrollIntoView também rolaria o quadro sob o modal).
    const list = ref.current;
    const node = list?.querySelector<HTMLElement>('[aria-current="step"]');
    if (list && node) {
      const listBox = list.getBoundingClientRect();
      const nodeBox = node.getBoundingClientRect();
      list.scrollLeft = Math.max(0, list.scrollLeft + (nodeBox.left + nodeBox.width / 2) - (listBox.left + listBox.width / 2));
    }
  }, [current]);
  const scroll = (delta: number) => ref.current?.scrollBy?.({ left: delta, behavior: 'smooth' });
  return (
    <div className="deal-stepper-wrap">
      <ol ref={ref} className="deal-stepper" aria-label="Etapas do pipeline">
        {stages.map((stage, index) => {
          const state = index < current ? 'done' : index === current ? 'current' : 'todo';
          return (
            <li key={stage.id} className={`deal-step is-${state}`} aria-current={state === 'current' ? 'step' : undefined}>
              <span className="deal-step-dot" aria-hidden="true">{state === 'done' ? <Check className="h-4 w-4" /> : index + 1}</span>
              <span className="deal-step-name" title={stage.name}>{stage.name}</span>
              {state === 'current' && (
                ownerAvatar ? <img className="deal-step-owner" src={ownerAvatar} alt="" /> : <span className="deal-step-owner" style={getContactAvatarStyle(ownerName)} aria-hidden="true">{getContactInitials(ownerName) || '·'}</span>
              )}
            </li>
          );
        })}
      </ol>
      {stages.length > 5 && (
        <div className="deal-stepper-nav">
          <button type="button" aria-label="Etapas anteriores" onClick={() => scroll(-260)}><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" aria-label="Próximas etapas" onClick={() => scroll(260)}><ChevronRight className="h-4 w-4" /></button>
        </div>
      )}
    </div>
  );
}

export default function ActivitiesTab({ deal, pipeline, pipelineId, setTab, primary }: DealTabProps) {
  const [tasks, setTasks] = useState<PipelineTask[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<PipelineTask['task_type']>('follow_up');
  const [due, setDue] = useState('');

  const fetchTasks = useCallback(async () => {
    try {
      const result = await pipelineTasksService.getTasksForItem(pipelineId, deal.id);
      setTasks(result.data || []);
      setFailed(false);
    } catch {
      setTasks((deal.tasks as unknown as PipelineTask[]) || []);
      setFailed(true);
    }
  }, [pipelineId, deal.id, deal.tasks]);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  const stages = pipeline?.stages || [];
  const stageId = deal.pipeline_stage_id || deal.stage_id;
  const currentIndex = Math.max(0, stages.findIndex(stage => stage.id === stageId));
  const owner = deal.owner as { name?: string; avatar_url?: string } | null | undefined;

  const groups = useMemo(() => {
    const map = new Map<string, PipelineTask[]>();
    [...(tasks || [])]
      .sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999'))
      .forEach(task => {
        const key = task.due_date ? dayKey(task.due_date) : 'sem-data';
        map.set(key, [...(map.get(key) || []), task]);
      });
    return [...map.entries()];
  }, [tasks]);

  const selected = tasks?.find(task => task.id === selectedId) ?? null;

  const create = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const task = await pipelineTasksService.createTask(pipelineId, deal.id, {
        title: title.trim(),
        task_type: type,
        due_date: due ? new Date(due).toISOString() : undefined,
      });
      setTasks(current => [...(current || []), task]);
      setSelectedId(task.id);
      setTitle('');
      setDue('');
      setCreating(false);
      toast.success('Atividade criada.');
    } catch {
      toast.error('Não foi possível criar a atividade.');
    } finally {
      setSaving(false);
    }
  };

  const complete = async (task: PipelineTask) => {
    const previous = tasks;
    setTasks(current => (current || []).map(item => (item.id === task.id ? { ...item, status: 'completed' } : item)));
    try {
      const updated = await pipelineTasksService.completeTask(pipelineId, task.id);
      setTasks(current => (current || []).map(item => (item.id === task.id ? updated : item)));
    } catch {
      setTasks(previous);
      toast.error('Não foi possível concluir a atividade.');
    }
  };

  return (
    <div className="deal-activities">
      {stages.length > 0 && <Stepper stages={stages} current={currentIndex} ownerName={owner?.name} ownerAvatar={owner?.avatar_url} />}
      <div className="deal-activities-split">
        <section className="deal-activities-list" aria-label="Próximas atividades">
          <header>
            <h2>Próximas atividades</h2>
            <Button size="sm" variant="ghost" onClick={() => setCreating(open => !open)} aria-expanded={creating}>
              <Plus className="mr-1 h-4 w-4" />Nova atividade
            </Button>
          </header>
          {creating && (
            <form className="deal-activity-form" onSubmit={event => { event.preventDefault(); void create(); }}>
              <Input aria-label="Título da atividade" placeholder="O que precisa ser feito?" value={title} onChange={event => setTitle(event.target.value)} autoFocus />
              <div>
                <select aria-label="Tipo da atividade" value={type} onChange={event => setType(event.target.value as PipelineTask['task_type'])}>
                  {TASK_TYPES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <input aria-label="Data e hora" type="datetime-local" value={due} onChange={event => setDue(event.target.value)} />
              </div>
              <div className="deal-activity-form-actions">
                <Button type="button" variant="ghost" size="sm" onClick={() => setCreating(false)}>Cancelar</Button>
                <Button type="submit" size="sm" disabled={!title.trim() || saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar'}</Button>
              </div>
            </form>
          )}
          {tasks === null ? (
            <div className="deal-tab-skeleton" role="status" aria-label="Carregando atividades"><span /><span /></div>
          ) : groups.length ? (
            groups.map(([key, items]) => (
              <div key={key} className="deal-activity-day">
                <h3>{key === 'sem-data' ? 'Sem data' : formatDay(new Date(`${key}T12:00:00`))}<span>{items.length} {items.length === 1 ? 'atividade' : 'atividades'}</span></h3>
                <ul>
                  {items.map(task => {
                    const done = task.status === 'completed';
                    return (
                      <li key={task.id}>
                        <button type="button" className={`deal-activity-item${selectedId === task.id ? ' is-selected' : ''}`} aria-pressed={selectedId === task.id} onClick={() => setSelectedId(task.id)}>
                          <span className={`deal-activity-title${done ? ' is-done' : ''}`}>{task.title}</span>
                          <span className="deal-activity-meta">
                            <Clock className="h-3 w-3" aria-hidden="true" />{task.due_date ? new Date(task.due_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'}
                            <em className={`deal-chip is-${task.overdue && !done ? 'danger' : done ? 'ok' : 'wait'}`}>{task.overdue && !done ? 'Com atraso' : STATUS_LABEL[task.status] || task.status}</em>
                          </span>
                        </button>
                        {!done && <button type="button" className="deal-activity-check" aria-label={`Concluir ${task.title}`} onClick={() => void complete(task)}><Check className="h-4 w-4" /></button>}
                        {done && <CheckCircle2 className="deal-activity-done h-4 w-4" aria-label="Concluída" />}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          ) : (
            <p className="deal-empty-note">{failed ? 'Não foi possível carregar as atividades.' : 'Nenhuma atividade cadastrada.'}</p>
          )}
          {deal.scheduled_actions?.length > 0 && (
            <div className="deal-activity-day">
              <h3>Ações agendadas<span>{deal.scheduled_actions.length}</span></h3>
              <ul>
                {deal.scheduled_actions.map((action, index) => (
                  <li key={String(action.id || index)}>
                    <div className="deal-activity-item is-static">
                      <span className="deal-activity-title">{String(action.action_type || 'Ação')}</span>
                      <span className="deal-activity-meta"><Clock className="h-3 w-3" aria-hidden="true" />{formatDateTime(action.scheduled_for as string)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
        <section className="deal-activities-detail" aria-label="Detalhe da atividade">
          {selected ? (
            <>
              <header><h2>{selected.title}</h2><em className={`deal-chip is-${selected.status === 'completed' ? 'ok' : selected.overdue ? 'danger' : 'wait'}`}>{selected.overdue && selected.status !== 'completed' ? 'Com atraso' : STATUS_LABEL[selected.status] || selected.status}</em></header>
              <dl>
                <div><dt>Tipo</dt><dd>{TASK_TYPES.find(option => option.value === selected.task_type)?.label || selected.task_type}</dd></div>
                <div><dt>Agendada</dt><dd>{formatDateTime(selected.due_date)}</dd></div>
                <div><dt>Responsável</dt><dd>{selected.assigned_to?.name || owner?.name || 'Sem responsável'}</dd></div>
                {selected.completed_at && <div><dt>Concluída em</dt><dd>{formatDateTime(selected.completed_at)}</dd></div>}
              </dl>
              {selected.description && <p className="deal-activity-description">{selected.description}</p>}
              {selected.status !== 'completed' && <Button variant="outline" size="sm" onClick={() => void complete(selected)}><Check className="mr-1 h-4 w-4" />Marcar como concluída</Button>}
            </>
          ) : (
            <div className="deal-detail-empty">
              <HeaderAvatar contact={primary} name={primary?.name || deal.title} />
              <p><strong>Selecione uma atividade</strong><br />Escolha uma atividade na lista para ver os detalhes.</p>
            </div>
          )}
          <footer>
            <Button onClick={() => setTab('conversations')}><MessageSquare className="mr-2 h-4 w-4" />Enviar mensagem</Button>
          </footer>
        </section>
      </div>
    </div>
  );
}
