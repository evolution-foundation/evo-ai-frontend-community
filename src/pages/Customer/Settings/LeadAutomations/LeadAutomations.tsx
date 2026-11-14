import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@evoapi/design-system';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import {
  leadAutomations as service,
  type Rule,
  type RuleInput,
  type Run,
  type TestEvent,
  type TestResult,
} from '@/services/leadAutomations/service';
import { pipelinesService } from '@/services/pipelines/pipelinesService';
import usersService from '@/services/users/usersService';
import { labelsService } from '@/services/contacts/labelsService';
import inboxesService from '@/services/channels/inboxesService';
import { isAxiosError } from 'axios';
import './leadAutomations.css';
interface Option {
  id: string;
  name: string;
  stages?: Option[];
}
interface InboxOption extends Option {
  instance: string;
}
const empty = (): RuleInput => ({
  name: '',
  active: false,
  pipeline_id: '',
  pipeline_stage_id: '',
  owner_id: null,
  label_ids: [],
  title_template: 'Novo lead · {{contact_name}}',
  conditions: {
    version: 1,
    operator: 'any',
    ctwa: { enabled: false, inbox_id: '', instance_name: '' },
    domain: { enabled: false, host: '' },
  },
});
export default function LeadAutomations() {
  const { user, isLoading } = useAuth();
  const { can, isReady, loading } = usePermissions();
  const { t } = useTranslation('leadAutomations');
  if (isLoading || loading || !isReady) return <p role="status">{t('loading')}</p>;
  if (
    !['super_admin', 'account_owner', 'administrator', 'admin'].includes(user?.role?.key || '') ||
    !can('automation_rules', 'read')
  )
    return <p role="alert">{t('adminOnly')}</p>;
  return (
    <LeadAutomationsScreen
      can={action => can('automation_rules', action)}
      canView={resource => can(resource, 'read')}
    />
  );
}
export function LeadAutomationsScreen({
  can = () => true,
  canView = () => true,
}: {
  can?: (action: string) => boolean;
  canView?: (resource: string) => boolean;
}) {
  const { t } = useTranslation('leadAutomations');
  const [rules, setRules] = useState<Rule[]>([]);
  const [latest, setLatest] = useState<Record<string, Run | undefined>>({});
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [editor, setEditor] = useState<RuleInput | null>(null);
  const [selected, setSelected] = useState<Rule | undefined>();
  const [pipelines, setPipelines] = useState<Option[]>([]);
  const [stages, setStages] = useState<Option[]>([]);
  const [stageLoading, setStageLoading] = useState(false);
  const [users, setUsers] = useState<Option[]>([]);
  const [labels, setLabels] = useState<Option[]>([]);
  const [inboxes, setInboxes] = useState<InboxOption[]>([]);
  const [panel, setPanel] = useState<'test' | 'runs' | 'site' | null>(null);
  const [event, setEvent] = useState<TestEvent | null>(null);
  const [result, setResult] = useState<TestResult | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [runPage, setRunPage] = useState(1);
  const [runPages, setRunPages] = useState(1);
  const [filter, setFilter] = useState('');
  const [token, setToken] = useState('');
  const fail = useCallback(
    (e: unknown) => {
      setError(
        isAxiosError(e) && e.response?.status === 409
          ? t('conflict')
          : isAxiosError(e) && e.response?.status === 422
            ? t('invalid')
            : t('error'),
      );
    },
    [t],
  );
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [list, ps, us, ls, ins] = await Promise.all([
        service.list(page),
        pipelinesService.getPipelines({ per_page: 100 }),
        usersService.getUsers({ per_page: 100 }),
        labelsService.getLabels({ per_page: 100 }),
        inboxesService.list(),
      ]);
      setRules(list.data);
      const recent = await Promise.all(
        list.data.map(async rule => [rule.id, (await service.runs(rule.id)).data[0]] as const),
      );
      setLatest(Object.fromEntries(recent));
      setPages(list.meta.pagination.total_pages || 1);
      setPipelines(ps.data.map(p => ({ ...p, stages: p.stages })));
      setUsers(us.data.map(u => ({ id: u.id, name: u.name })));
      setLabels(ls.data.map(l => ({ id: l.id, name: l.title })));
      setInboxes(
        ins.data
          .filter(
            i => i.provider === 'evolution' && typeof i.provider_config?.instance_name === 'string',
          )
          .map(i => ({
            id: i.id,
            name: i.name,
            instance: String(i.provider_config?.instance_name),
          })),
      );
    } catch (e) {
      fail(e);
    } finally {
      setLoading(false);
    }
  }, [page, fail]);
  useEffect(() => {
    void load();
  }, [load]);
  const pipelineId = editor?.pipeline_id;
  useEffect(() => {
    let live = true;
    setStages([]);
    if (!pipelineId) return;
    setStageLoading(true);
    pipelinesService
      .getPipelineStages(pipelineId)
      .then(res => {
        if (live) setStages(res.data);
      })
      .catch(e => {
        if (live) fail(e);
      })
      .finally(() => {
        if (live) setStageLoading(false);
      });
    return () => {
      live = false;
    };
  }, [pipelineId, fail]);
  const runRuleId = panel === 'runs' ? selected?.id : undefined;
  useEffect(() => {
    let live = true;
    if (!runRuleId) return;
    setBusy(true);
    setRuns([]);
    service
      .runs(runRuleId, runPage, filter)
      .then(res => {
        if (live) {
          setRuns(res.data);
          setRunPages(res.meta.pagination.total_pages || 1);
        }
      })
      .catch(e => {
        if (live) fail(e);
      })
      .finally(() => {
        if (live) setBusy(false);
      });
    return () => {
      live = false;
    };
  }, [runRuleId, runPage, filter, fail]);
  const close = () => {
    setEditor(null);
    setPanel(null);
    setToken('');
    setError('');
    setResult(null);
  };
  const open = (rule?: Rule) => {
    close();
    setSelected(rule);
    setEditor(rule ? structuredClone(rule) : empty());
    setNotice('');
  };
  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await fn();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };
  const save = () =>
    act(async () => {
      if (!editor) return;
      if (!editor.conditions.ctwa.enabled && !editor.conditions.domain.enabled) {
        setError(t('sourceRequired'));
        return;
      }
      if (!stages.some(s => s.id === editor.pipeline_stage_id)) {
        setError(t('stageRequired'));
        return;
      }
      const saved = await service.save(editor, selected);
      setSelected(saved);
      setEditor(null);
      setNotice(t('saved'));
      await load();
    });
  const showPanel = (rule: Rule, target: 'test' | 'runs' | 'site') => {
    close();
    setSelected(rule);
    setPanel(target);
    setRunPage(1);
    setFilter('');
    const now = new Date().toISOString();
    setEvent({
      source: rule.conditions.ctwa.enabled ? 'ctwa' : 'domain',
      inbox_id: rule.conditions.ctwa.inbox_id,
      instance_name: rule.conditions.ctwa.instance_name,
      page_url: `https://${rule.conditions.domain.host}/`,
      ctwa_clid: 'clique-sintetico',
      occurred_at: now,
      contact_created_at: now,
      conversation_created_at: now,
    });
  };
  const patch = (value: Partial<RuleInput>) => setEditor(e => (e ? { ...e, ...value } : e));
  const reason = (code: string) => t(`reasons.${code}`, { defaultValue: t('reasonOther') });
  return (
    <main className="la-page">
      <header className="la-header">
        <div>
          <h1>{t('title')}</h1>
          <p>{t('subtitle')}</p>
        </div>
        {!editor && !panel && can('create') && <Button onClick={() => open()}>{t('new')}</Button>}
      </header>
      {error && (
        <div className="la-error" role="alert">
          {error}{' '}
          <Button variant="outline" onClick={() => void load()}>
            {t('retry')}
          </Button>
        </div>
      )}
      {notice && (
        <p className="la-notice" role="status">
          {notice}
        </p>
      )}
      {!editor && !panel && (
        <section className="la-panel" aria-label={t('rules')}>
          {loading ? (
            <p role="status">{t('loading')}</p>
          ) : !rules.length ? (
            <p>{t('empty')}</p>
          ) : (
            rules.map(rule => (
              <article className="la-rule" key={rule.id}>
                <div className="la-header">
                  <h2>{rule.name}</h2>
                  <span className={`la-badge ${rule.active ? 'la-active' : ''}`}>
                    {t(rule.active ? 'active' : 'inactive')}
                  </span>
                </div>
                <p>
                  {[
                    rule.conditions.ctwa.enabled && t('ctwa'),
                    rule.conditions.domain.enabled && rule.conditions.domain.host,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                <small>
                  {t('pipeline')}:{' '}
                  {pipelines.find(p => p.id === rule.pipeline_id)?.name || t('unavailable')} ·{' '}
                  {pipelines
                    .find(p => p.id === rule.pipeline_id)
                    ?.stages?.find(s => s.id === rule.pipeline_stage_id)?.name || t('unavailable')}
                </small>
                <small>
                  {t('lastRun')}:{' '}
                  {latest[rule.id]
                    ? `${t(`status.${latest[rule.id]?.status}`)} · ${new Date(latest[rule.id]!.executed_at).toLocaleString('pt-BR')}`
                    : t('noRuns')}
                </small>
                <div className="la-actions">
                  {can('update') && (
                    <>
                      <Button variant="outline" onClick={() => open(rule)}>
                        {t('edit')}
                      </Button>
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          void act(async () => {
                            await service.activation(rule);
                            await load();
                            setNotice(t('saved'));
                          })
                        }
                      >
                        {t(rule.active ? 'deactivate' : 'activate')}
                      </Button>
                    </>
                  )}
                  <Button variant="outline" onClick={() => showPanel(rule, 'test')}>
                    {t('test')}
                  </Button>
                  <Button variant="outline" onClick={() => showPanel(rule, 'runs')}>
                    {t('runs')}
                  </Button>
                  {rule.conditions.domain.enabled && (
                    <Button variant="outline" onClick={() => showPanel(rule, 'site')}>
                      {t('site')}
                    </Button>
                  )}
                </div>
              </article>
            ))
          )}
          <div className="la-actions">
            <Button
              variant="outline"
              disabled={page <= 1 || loading}
              onClick={() => setPage(p => p - 1)}
            >
              {t('previous')}
            </Button>
            <span>
              {page} / {pages}
            </span>
            <Button
              variant="outline"
              disabled={page >= pages || loading}
              onClick={() => setPage(p => p + 1)}
            >
              {t('next')}
            </Button>
          </div>
        </section>
      )}
      {editor && (
        <form
          className="la-panel"
          onSubmit={e => {
            e.preventDefault();
            void save();
          }}
        >
          <h2>{t(selected ? 'edit' : 'new')}</h2>
          <p className="la-notice">{t('newOnly')}</p>
          <label>
            {t('name')}
            <input
              required
              maxLength={120}
              value={editor.name}
              onChange={e => patch({ name: e.target.value })}
            />
          </label>
          {selected ? (
            <label className="la-check">
              <input
                type="checkbox"
                checked={editor.active}
                onChange={e => patch({ active: e.target.checked })}
              />
              {t('active')}
            </label>
          ) : (
            <p>{t('createInactive')}</p>
          )}
          <fieldset className="la-panel">
            <legend>{t('conditions')}</legend>
            <p>{t('any')}</p>
            <label className="la-check">
              <input
                type="checkbox"
                checked={editor.conditions.ctwa.enabled}
                onChange={e =>
                  patch({
                    conditions: {
                      ...editor.conditions,
                      ctwa: { ...editor.conditions.ctwa, enabled: e.target.checked },
                    },
                  })
                }
              />
              {t('ctwa')}
            </label>
            {editor.conditions.ctwa.enabled && (
              <div className="la-grid">
                <label>
                  {t('inbox')}
                  <select
                    required
                    value={editor.conditions.ctwa.inbox_id}
                    onChange={e => {
                      const inbox = inboxes.find(i => i.id === e.target.value);
                      patch({
                        conditions: {
                          ...editor.conditions,
                          ctwa: {
                            enabled: true,
                            inbox_id: inbox?.id || '',
                            instance_name: inbox?.instance || '',
                          },
                        },
                      });
                    }}
                  >
                    <option value="">{t('choose')}</option>
                    {inboxes.map(i => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t('instance')}
                  <input readOnly value={editor.conditions.ctwa.instance_name} />
                </label>
              </div>
            )}
            <label className="la-check">
              <input
                type="checkbox"
                checked={editor.conditions.domain.enabled}
                onChange={e =>
                  patch({
                    conditions: {
                      ...editor.conditions,
                      domain: { ...editor.conditions.domain, enabled: e.target.checked },
                    },
                  })
                }
              />
              {t('domain')}
            </label>
            {editor.conditions.domain.enabled && (
              <label>
                {t('host')}
                <input
                  required
                  value={editor.conditions.domain.host}
                  placeholder="co.exemplo.com"
                  onChange={e =>
                    patch({
                      conditions: {
                        ...editor.conditions,
                        domain: { enabled: true, host: e.target.value.trim().toLowerCase() },
                      },
                    })
                  }
                />
              </label>
            )}
          </fieldset>
          <div className="la-grid">
            <label>
              {t('pipeline')}
              <select
                aria-label={t('pipeline')}
                required
                value={editor.pipeline_id}
                onChange={e => patch({ pipeline_id: e.target.value, pipeline_stage_id: '' })}
              >
                <option value="">{t('choose')}</option>
                {pipelines.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('stage')}
              <select
                required
                disabled={!pipelineId || stageLoading}
                value={editor.pipeline_stage_id}
                onChange={e => patch({ pipeline_stage_id: e.target.value })}
              >
                <option value="">{t(stageLoading ? 'loading' : 'choose')}</option>
                {stages.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('owner')}
              <select
                value={editor.owner_id || ''}
                onChange={e => patch({ owner_id: e.target.value || null })}
              >
                <option value="">{t('none')}</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('labels')}
              <select
                multiple
                value={editor.label_ids}
                onChange={e =>
                  patch({ label_ids: Array.from(e.target.selectedOptions, o => o.value) })
                }
              >
                {labels.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
              <small>{t('labelsHelp')}</small>
            </label>
          </div>
          <label>
            {t('dealTitle')}
            <input
              required
              maxLength={160}
              value={editor.title_template}
              onChange={e => patch({ title_template: e.target.value })}
            />
            <small>{t('titleHelp')}</small>
          </label>
          <div className="la-actions">
            <Button type="submit" disabled={busy || stageLoading}>
              {t(busy ? 'saving' : 'save')}
            </Button>
            <Button type="button" variant="outline" onClick={close}>
              {t('cancel')}
            </Button>
            {selected && can('delete') && (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  if (window.confirm(t('deleteConfirm')))
                    void act(async () => {
                      await service.remove(selected);
                      close();
                      await load();
                      setNotice(t('deleted'));
                    });
                }}
              >
                {t('delete')}
              </Button>
            )}
          </div>
        </form>
      )}
      {panel && selected && (
        <section className="la-panel">
          <div className="la-header">
            <h2>
              {t(panel === 'test' ? 'test' : panel === 'runs' ? 'runs' : 'site')} · {selected.name}
            </h2>
            <Button
              variant="outline"
              onClick={() => {
                close();
                void load();
              }}
            >
              {t('back')}
            </Button>
          </div>
          {panel === 'test' && event && (
            <>
              <p>{t('testHelp')}</p>
              <form
                onSubmit={e => {
                  e.preventDefault();
                  void act(async () => {
                    setResult(null);
                    setResult(await service.test(selected.id, event));
                  });
                }}
              >
                <div className="la-grid">
                  <label>
                    {t('source')}
                    <select
                      value={event.source}
                      onChange={e => {
                        setResult(null);
                        setEvent({ ...event, source: e.target.value });
                      }}
                    >
                      <option value="ctwa">CTWA</option>
                      <option value="domain">{t('domain')}</option>
                      <option value="none">{t('noSource')}</option>
                    </select>
                  </label>
                  {(event.source === 'ctwa'
                    ? ['inbox_id', 'instance_name', 'ctwa_clid']
                    : event.source === 'domain'
                      ? ['page_url']
                      : []
                  )
                    .concat(['occurred_at', 'contact_created_at', 'conversation_created_at'])
                    .map(key => (
                      <label key={key}>
                        {t(`event.${key}`)}
                        <input
                          required={key !== 'conversation_created_at'}
                          value={event[key as keyof TestEvent] || ''}
                          onChange={e => {
                            setResult(null);
                            setEvent({ ...event, [key]: e.target.value });
                          }}
                        />
                      </label>
                    ))}
                </div>
                <Button type="submit" disabled={busy}>
                  {t('test')}
                </Button>
              </form>
              {result && (
                <div className="la-notice" role="status">
                  <h2>{t(result.matched ? 'wouldCreate' : 'noMatch')}</h2>
                  <p>{t('noWrites')}</p>
                  {result.reasons.map(code => (
                    <p key={code}>{reason(code)}</p>
                  ))}
                  {result.action && (
                    <p>
                      {t('pipeline')}:{' '}
                      {pipelines.find(p => p.id === result.action?.pipeline_id)?.name ||
                        t('unavailable')}{' '}
                      · {result.action.title}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
          {panel === 'runs' && (
            <>
              <label>
                {t('filter')}
                <select
                  value={filter}
                  onChange={e => {
                    setFilter(e.target.value);
                    setRunPage(1);
                  }}
                >
                  <option value="">{t('all')}</option>
                  {['created', 'existing', 'skipped', 'error'].map(s => (
                    <option key={s} value={s}>
                      {t(`status.${s}`)}
                    </option>
                  ))}
                </select>
              </label>
              {busy ? (
                <p role="status">{t('loading')}</p>
              ) : !runs.length ? (
                <p>{t('noRuns')}</p>
              ) : (
                runs.map(run => (
                  <article className="la-log" key={run.id}>
                    <div className="la-header">
                      <strong>{t(`status.${run.status}`)}</strong>
                      <time>{new Date(run.executed_at).toLocaleString('pt-BR')}</time>
                    </div>
                    <p>
                      {t('source')}:{' '}
                      {run.source === 'ctwa'
                        ? 'CTWA'
                        : run.source === 'domain'
                          ? t('domain')
                          : t('noSource')}{' '}
                      · {reason(run.reason_code || run.status)}
                    </p>
                    <div className="la-actions">
                      {canView('contacts') && (
                        <Link to={`/contacts/${run.contact_id}`}>{t('contact')}</Link>
                      )}
                      {run.deal_id && canView('pipelines') && (
                        <Link to={`/pipelines/${selected.pipeline_id}/deals/${run.deal_id}`}>
                          {t('deal')}
                        </Link>
                      )}
                    </div>
                  </article>
                ))
              )}
              <div className="la-actions">
                <Button
                  variant="outline"
                  disabled={busy || runPage <= 1}
                  onClick={() => setRunPage(p => p - 1)}
                >
                  {t('previous')}
                </Button>
                <span>
                  {runPage} / {runPages}
                </span>
                <Button
                  variant="outline"
                  disabled={busy || runPage >= runPages}
                  onClick={() => setRunPage(p => p + 1)}
                >
                  {t('next')}
                </Button>
              </div>
            </>
          )}
          {panel === 'site' && (
            <>
              <p>{t('siteHelp')}</p>
              <code>{`${(import.meta.env.VITE_API_URL || window.location.origin).replace(/\/$/, '')}/public/lead_automation_rules/${selected.id}/leads`}</code>
              <p>{t('siteHeaders')}</p>
              {can('update') && !token && (
                <Button
                  disabled={busy}
                  onClick={() => {
                    if (!selected.has_intake_token || window.confirm(t('rotateConfirm')))
                      void act(async () => {
                        const res = await service.token(selected);
                        const { token: freshToken, ...updated } = res;
                        setSelected(updated);
                        setRules(current =>
                          current.map(rule => (rule.id === updated.id ? updated : rule)),
                        );
                        setToken(freshToken);
                      });
                  }}
                >
                  {t(selected.has_intake_token ? 'rotateToken' : 'generateToken')}
                </Button>
              )}
              {token && (
                <>
                  <p>{t('tokenOnce')}</p>
                  <code>{token}</code>
                  <Button
                    onClick={() =>
                      void act(async () => {
                        await navigator.clipboard.writeText(token);
                        setNotice(t('copied'));
                      })
                    }
                  >
                    {t('copy')}
                  </Button>
                  <Button variant="outline" onClick={() => setToken('')}>
                    {t('hideToken')}
                  </Button>
                </>
              )}
            </>
          )}
        </section>
      )}
    </main>
  );
}
