import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ListChecks, Search } from 'lucide-react';

export type FieldType = 'text' | 'number' | 'textarea' | 'select' | 'email' | 'phone';

export interface FieldDef {
  key: string;
  label: string;
  type?: FieldType;
  value: string;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  /** Texto exibido no lugar do valor cru (ex.: moeda formatada, nome da etapa). */
  display?: string;
  prefix?: string;
  readOnly?: boolean;
  allowClear?: boolean;
  onCommit?: (value: string) => unknown;
}

export interface FieldGroup {
  id: string;
  label: string;
  fields: FieldDef[];
}

const PLACEHOLDER = 'Clique aqui para adicionar';

export function InlineField({ field }: { field: FieldDef }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(field.value);
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement & HTMLSelectElement>(null);
  const id = useId();
  const type = field.type || 'text';

  useEffect(() => {
    if (!editing) setDraft(field.value);
  }, [field.value, editing]);
  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  const commit = (value = draft) => {
    setEditing(false);
    if (value !== field.value) void field.onCommit?.(value);
  };

  const cancel = () => {
    setDraft(field.value);
    setEditing(false);
  };

  const common = {
    id,
    ref,
    'aria-label': field.label,
    className: 'deal-inline-input',
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        cancel();
      } else if (event.key === 'Enter' && (type !== 'textarea' || (event as React.KeyboardEvent).metaKey || (event as React.KeyboardEvent).ctrlKey)) {
        event.preventDefault();
        commit();
      }
    },
  };

  if (field.readOnly || !field.onCommit) {
    return (
      <div className="deal-inline-cell is-readonly" data-testid={`field-${field.key}`}>
        {field.display || field.value || <span className="deal-inline-empty">—</span>}
      </div>
    );
  }

  if (type === 'select') {
    return (
      <div className="deal-inline-cell is-select" data-testid={`field-${field.key}`}>
        <select
          aria-label={field.label}
          value={field.value}
          className="deal-inline-input"
          onChange={event => commit(event.target.value)}
        >
          {(field.allowClear || !field.value) && <option value="">{field.placeholder || 'Sem valor'}</option>}
          {field.options?.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="deal-inline-cell is-editing" data-testid={`field-${field.key}`}>
        {type === 'textarea' ? (
          <textarea {...common} rows={4} value={draft} onChange={event => setDraft(event.target.value)} onBlur={() => commit()} />
        ) : (
          <input
            {...common}
            type={type === 'number' ? 'number' : type === 'email' ? 'email' : type === 'phone' ? 'tel' : 'text'}
            step={type === 'number' ? '0.01' : undefined}
            min={type === 'number' ? '0' : undefined}
            value={draft}
            onChange={event => setDraft(event.target.value)}
            onBlur={() => commit()}
          />
        )}
      </div>
    );
  }

  const shown = field.display || field.value;
  return (
    <button
      type="button"
      className="deal-inline-cell is-button"
      data-testid={`field-${field.key}`}
      aria-label={field.label}
      onClick={() => setEditing(true)}
    >
      {field.prefix ? <span className="deal-inline-prefix" aria-hidden="true">{field.prefix}</span> : null}
      {shown ? <span className="deal-inline-value">{shown}</span> : <span className="deal-inline-empty">{field.placeholder || PLACEHOLDER}</span>}
    </button>
  );
}

export default function FieldList({ title, icon, groups, emptyText = 'Nenhum campo disponível.' }: { title: string; icon?: React.ReactNode; groups: FieldGroup[]; emptyText?: string }) {
  const [active, setActive] = useState<string>(groups[0]?.id || 'filled');
  const [query, setQuery] = useState('');
  const filled = useMemo(() => groups.flatMap(group => group.fields.filter(field => field.value.trim() !== '')), [groups]);
  const normalized = query.trim().toLocaleLowerCase();
  const visible = useMemo(() => {
    const source = active === 'filled' ? filled : groups.find(group => group.id === active)?.fields ?? [];
    if (!normalized) return source;
    const all = groups.flatMap(group => group.fields);
    return all.filter(field => `${field.label} ${field.value}`.toLocaleLowerCase().includes(normalized));
  }, [active, filled, groups, normalized]);

  return (
    <section className="deal-fields" aria-label={title}>
      <header className="deal-fields-title">{icon}<h2>{title}</h2></header>
      <div className="deal-fields-body">
        <nav className="deal-fields-groups" aria-label={`Grupos de ${title.toLocaleLowerCase()}`}>
          <button type="button" className={active === 'filled' ? 'is-active' : ''} aria-current={active === 'filled' || undefined} onClick={() => setActive('filled')}>
            <ListChecks className="h-4 w-4" aria-hidden="true" /><span>Campos preenchidos</span><b>{filled.length}</b>
          </button>
          {groups.map(group => (
            <button key={group.id} type="button" className={active === group.id ? 'is-active' : ''} aria-current={active === group.id || undefined} onClick={() => setActive(group.id)}>
              <span>{group.label}</span>
            </button>
          ))}
        </nav>
        <div className="deal-fields-panel">
          <label className="deal-fields-search">
            <Search className="h-4 w-4" aria-hidden="true" />
            <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Pesquisar campos…" aria-label="Pesquisar campos" />
          </label>
          {visible.length ? (
            <div className="deal-fields-rows">
              {visible.map(field => (
                <div className="deal-fields-row" key={field.key}>
                  <span className="deal-fields-label">{field.label}</span>
                  <InlineField field={field} />
                </div>
              ))}
            </div>
          ) : (
            <p className="deal-empty-note">{normalized ? 'Nenhum campo encontrado.' : active === 'filled' ? 'Nenhum campo preenchido ainda.' : emptyText}</p>
          )}
        </div>
      </div>
    </section>
  );
}
