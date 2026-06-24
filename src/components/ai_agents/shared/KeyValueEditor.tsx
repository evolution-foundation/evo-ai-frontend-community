import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Input, Label } from '@evoapi/design-system';
import { Plus, X } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

/** Shared between Custom Tools (EVO-1790) and Custom MCP (EVO-1791) UIs. */
export interface KeyValueEditorProps {
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  label: string;
  hint?: string;
  addRowLabel?: string;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  disabled?: boolean;
  id?: string;
}

interface Row {
  id: number;
  key: string;
  value: unknown;
  isComplex: boolean;
}

let rowCounter = 0;
const nextRowId = () => ++rowCounter;

const isComplexValue = (v: unknown): boolean =>
  typeof v === 'object' && v !== null;

const stringifyComplex = (v: unknown): string => {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
};

const valueToString = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return stringifyComplex(v);
};

const objectToRows = (obj: Record<string, unknown>): Row[] => {
  const entries = Object.entries(obj || {});
  if (entries.length === 0) return [];
  return entries.map(([k, v]) => ({
    id: nextRowId(),
    key: k,
    value: v,
    isComplex: isComplexValue(v),
  }));
};

const rowsToObject = (rows: Row[]): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const row of rows) {
    if (!row.key.trim()) continue;
    out[row.key] = row.value;
  }
  return out;
};

export default function KeyValueEditor({
  value,
  onChange,
  label,
  hint,
  addRowLabel,
  keyPlaceholder,
  valuePlaceholder,
  disabled = false,
  id,
}: KeyValueEditorProps) {
  const { t } = useLanguage('customTools');
  const [rows, setRows] = useState<Row[]>(() => objectToRows(value || {}));
  const lastEmittedRef = useRef<string>('');

  useEffect(() => {
    const currentSerialized = JSON.stringify(rowsToObject(rows));
    const incomingSerialized = JSON.stringify(value || {});
    if (currentSerialized !== incomingSerialized && incomingSerialized !== lastEmittedRef.current) {
      setRows(objectToRows(value || {}));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const emit = (next: Row[]) => {
    const obj = rowsToObject(next);
    lastEmittedRef.current = JSON.stringify(obj);
    onChange(obj);
  };

  const errors = useMemo(() => {
    const errs: Record<number, string> = {};
    const keys = new Map<string, number>();
    rows.forEach(row => {
      const trimmed = row.key.trim();
      const valStr = typeof row.value === 'string' ? row.value : valueToString(row.value);
      if (!trimmed && valStr.length > 0) {
        errs[row.id] = t('keyValueEditor.errors.emptyKey');
        return;
      }
      if (trimmed) {
        if (keys.has(trimmed)) {
          errs[row.id] = t('keyValueEditor.errors.duplicateKey');
        } else {
          keys.set(trimmed, row.id);
        }
        if (!row.isComplex && valStr.length === 0) {
          if (!errs[row.id]) errs[row.id] = t('keyValueEditor.errors.emptyValue');
        }
      }
    });
    return errs;
  }, [rows, t]);

  const updateRow = (rowId: number, patch: Partial<Row>) => {
    const next = rows.map(r => (r.id === rowId ? { ...r, ...patch } : r));
    setRows(next);
    emit(next);
  };

  const handleAddRow = () => {
    const next = [...rows, { id: nextRowId(), key: '', value: '', isComplex: false }];
    setRows(next);
    emit(next);
  };

  const handleRemoveRow = (rowId: number) => {
    const next = rows.filter(r => r.id !== rowId);
    setRows(next);
    emit(next);
  };

  return (
    <div className="space-y-2" data-testid={id ? `${id}-kv-editor` : 'kv-editor'}>
      <Label>{label}</Label>
      {rows.length > 0 && (
        <div className="space-y-2">
          {rows.map(row => {
            const err = errors[row.id];
            const complexStr = row.isComplex ? stringifyComplex(row.value) : '';
            return (
              <div key={row.id} className="space-y-1">
                <div className="flex gap-2 items-start">
                  <Input
                    value={row.key}
                    onChange={e => updateRow(row.id, { key: e.target.value })}
                    placeholder={keyPlaceholder || t('keyValueEditor.keyPlaceholder')}
                    disabled={disabled}
                    aria-label={`${label} key`}
                    aria-invalid={!!err}
                    aria-describedby={err ? `${row.id}-err` : undefined}
                    className={err ? 'border-destructive' : ''}
                  />
                  {row.isComplex ? (
                    <div className="flex-1 flex items-center gap-2 px-3 py-2 text-sm font-mono bg-muted/30 rounded border border-input min-h-[40px]">
                      <span className="truncate flex-1">{complexStr}</span>
                      <span
                        className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground whitespace-nowrap"
                        title={t('keyValueEditor.complexValueBadge')}
                      >
                        {t('keyValueEditor.complexValueBadge')}
                      </span>
                    </div>
                  ) : (
                    <Input
                      value={valueToString(row.value)}
                      onChange={e => updateRow(row.id, { value: e.target.value })}
                      placeholder={valuePlaceholder || t('keyValueEditor.valuePlaceholder')}
                      disabled={disabled}
                      aria-label={`${label} value`}
                      aria-invalid={!!err}
                      aria-describedby={err ? `${row.id}-err` : undefined}
                      className={err ? 'border-destructive' : ''}
                    />
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveRow(row.id)}
                    disabled={disabled}
                    aria-label={t('keyValueEditor.removeRow')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {err && (
                  <p id={`${row.id}-err`} className="text-sm text-destructive">
                    {err}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAddRow}
        disabled={disabled}
      >
        <Plus className="h-4 w-4 mr-1" />
        {addRowLabel || t('keyValueEditor.addRow')}
      </Button>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}
