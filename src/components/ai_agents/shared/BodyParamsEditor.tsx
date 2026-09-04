import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@evoapi/design-system';
import { Plus, X } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import type { BodyParamSchema, BodyParamType } from '@/types/ai';
import { BODY_PARAM_TYPES, coerceBodyParam, normalizeBodyParams } from './bodyParamSchema';

export interface BodyParamsEditorProps {
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  label: string;
  hint?: string;
  keyPlaceholder?: string;
  descriptionPlaceholder?: string;
  disabled?: boolean;
  id?: string;
}

interface Row {
  id: number;
  key: string;
  schema: BodyParamSchema;
}

let rowCounter = 0;
const nextRowId = () => ++rowCounter;

const objectToRows = (obj: Record<string, unknown>): Row[] =>
  Object.entries(obj || {}).map(([key, raw]) => ({
    id: nextRowId(),
    key,
    schema: coerceBodyParam(raw),
  }));

/** A row nobody filled in is just an empty slot; one carrying a type, a
 * description or an optional flag is a param the user meant to keep. Only the
 * second kind is worth an error when the name is missing. */
const rowHasContent = (row: Row): boolean =>
  row.schema.description.trim().length > 0 ||
  row.schema.type !== 'string' ||
  !row.schema.required;

const rowsToObject = (rows: Row[]): Record<string, BodyParamSchema> => {
  const out: Record<string, BodyParamSchema> = {};
  for (const row of rows) {
    const key = row.key.trim();
    if (!key) continue;
    out[key] = row.schema;
  }
  return out;
};

export default function BodyParamsEditor({
  value,
  onChange,
  label,
  hint,
  keyPlaceholder,
  descriptionPlaceholder,
  disabled = false,
  id,
}: BodyParamsEditorProps) {
  const { t } = useLanguage('customTools');
  const [rows, setRows] = useState<Row[]>(() => objectToRows(value || {}));
  const lastEmittedRef = useRef<string>('');

  useEffect(() => {
    const currentSerialized = JSON.stringify(rowsToObject(rows));
    const incomingSerialized = JSON.stringify(normalizeBodyParams(value));
    if (
      currentSerialized !== incomingSerialized &&
      incomingSerialized !== lastEmittedRef.current
    ) {
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
      if (!trimmed) {
        // rowsToObject drops a nameless row: without this the param the user
        // filled in vanishes on save with nothing on screen to explain it.
        if (rowHasContent(row)) errs[row.id] = t('keyValueEditor.errors.emptyKey');
        return;
      }
      if (keys.has(trimmed)) {
        errs[row.id] = t('keyValueEditor.errors.duplicateKey');
      } else {
        keys.set(trimmed, row.id);
      }
    });
    return errs;
  }, [rows, t]);

  const updateRow = (rowId: number, patch: Partial<Row>) => {
    const next = rows.map(r => (r.id === rowId ? { ...r, ...patch } : r));
    setRows(next);
    emit(next);
  };

  const updateSchema = (rowId: number, patch: Partial<BodyParamSchema>) => {
    const row = rows.find(r => r.id === rowId);
    if (!row) return;
    updateRow(rowId, { schema: { ...row.schema, ...patch } });
  };

  const handleAddRow = () => {
    const next = [
      ...rows,
      {
        id: nextRowId(),
        key: '',
        schema: { type: 'string' as BodyParamType, required: true, description: '' },
      },
    ];
    setRows(next);
    emit(next);
  };

  const handleRemoveRow = (rowId: number) => {
    const next = rows.filter(r => r.id !== rowId);
    setRows(next);
    emit(next);
  };

  return (
    <div className="space-y-2" data-testid={id ? `${id}-body-editor` : 'body-editor'}>
      <Label>{label}</Label>
      {rows.length > 0 && (
        <div className="space-y-3">
          {rows.map(row => {
            const err = errors[row.id];
            return (
              <div
                key={row.id}
                className="space-y-2 rounded-md border border-input p-3"
              >
                <div className="flex gap-2 items-start">
                  <Input
                    value={row.key}
                    onChange={e => updateRow(row.id, { key: e.target.value })}
                    placeholder={keyPlaceholder || t('keyValueEditor.keyPlaceholder')}
                    disabled={disabled}
                    aria-label={`${label} name`}
                    aria-invalid={!!err}
                    className={err ? 'border-destructive' : ''}
                  />
                  <Select
                    value={row.schema.type}
                    onValueChange={v =>
                      updateSchema(row.id, { type: v as BodyParamType })
                    }
                    disabled={disabled}
                  >
                    <SelectTrigger
                      className="w-36"
                      aria-label={`${label} type`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BODY_PARAM_TYPES.map(type => (
                        <SelectItem key={type} value={type}>
                          {t(`form.fields.bodyParams.types.${type}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                <Input
                  value={row.schema.description}
                  onChange={e =>
                    updateSchema(row.id, { description: e.target.value })
                  }
                  placeholder={
                    descriptionPlaceholder ||
                    t('form.fields.bodyParams.descriptionPlaceholder')
                  }
                  disabled={disabled}
                  aria-label={`${label} description`}
                />
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={row.schema.required}
                    onCheckedChange={checked =>
                      updateSchema(row.id, { required: checked === true })
                    }
                    disabled={disabled}
                    aria-label={`${label} required`}
                  />
                  {t('form.fields.bodyParams.required')}
                </label>
                {err && <p className="text-sm text-destructive">{err}</p>}
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
        {t('form.fields.bodyParams.addParam')}
      </Button>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}
