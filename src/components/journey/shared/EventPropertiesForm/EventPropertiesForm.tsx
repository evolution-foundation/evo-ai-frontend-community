import { useId, useMemo, useState, useEffect } from 'react';
import { Plus, X, ChevronsUpDown } from 'lucide-react';
import {
  Button,
  Checkbox,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@evoapi/design-system';
import { cn } from '@/lib/utils';
import { getEvent, isCustomEvent, type FieldSpec } from '@/lib/events-manifest';
import { useLanguage } from '@/hooks/useLanguage';
import { pipelinesService } from '@/services/pipelines/pipelinesService';
import InboxesService from '@/services/channels/inboxesService';
import { labelsService } from '@/services/contacts/labelsService';
import UsersService from '@/services/users/usersService';
import { campaignsService } from '@/services/campaigns/campaignsService';
import GlobalMessageTemplateService from '@/services/messageTemplates/globalMessageTemplatesService';
import {
  LOOKUP_FIELDS,
  PAIRED_TYPE_FIELDS,
  filterableFields,
  optionLabelKey,
  schemaFields,
  type LookupKind,
} from './filterFields';

export type EventPropertiesValue = Record<string, unknown>;

export interface EventPropertiesFormProps {
  eventName: string;
  value: EventPropertiesValue;
  onChange: (next: EventPropertiesValue) => void;
  disabled?: boolean;
  className?: string;
}

export function EventPropertiesForm({
  eventName,
  value,
  onChange,
  disabled,
  className,
}: EventPropertiesFormProps) {
  const { t } = useLanguage('events');
  const entry = getEvent(eventName);
  // Per-field copy lives in events.json `fields.<key>`; a key without a
  // translation shows its raw name.
  const fieldLabel = (field: string) => t(`fields.${field}.label`, { defaultValue: field });
  // No English fallback to the catalog description: a missing help line is a
  // gap the filterFields contract spec reports, not something to paper over.
  const fieldHelp = (field: string) => t(`fields.${field}.help`, { defaultValue: '' });
  const isCustom = isCustomEvent(eventName);

  if (!entry) {
    return null;
  }

  if (isCustom) {
    return (
      <CustomKeyValueEditor
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={className}
        t={t}
      />
    );
  }

  return (
    <FilterFields
      allFields={schemaFields(entry)}
      offeredFields={filterableFields(entry)}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={className}
      t={t}
      fieldLabel={fieldLabel}
      fieldHelp={fieldHelp}
    />
  );
}

// CRM-519: every schema key is an optional equality filter — there is no
// "required" section. `offeredFields` is what the picker lists; `allFields`
// also covers identity keys so a persisted legacy row still renders (and can
// be removed) even though it is no longer offered.
function FilterFields({
  allFields,
  offeredFields,
  value,
  onChange,
  disabled,
  className,
  t,
  fieldLabel,
  fieldHelp,
}: {
  allFields: Record<string, FieldSpec>;
  offeredFields: Record<string, FieldSpec>;
  value: EventPropertiesValue;
  onChange: (next: EventPropertiesValue) => void;
  disabled?: boolean;
  className?: string;
  t: (key: string, opts?: Record<string, unknown>) => string;
  fieldLabel: (field: string) => string;
  fieldHelp: (field: string) => string;
}) {
  // EVO-1275: seed from any field that already carries a value, so a
  // reopened node (or values preserved across an event switch) renders them
  // instead of hiding persisted data behind the "+ Add filter" picker.
  const [shown, setShown] = useState<string[]>(() =>
    Object.keys(value).filter((field) => field in allFields),
  );

  // F1 fix: when eventName changes upstream, allFields changes synchronously
  // but `shown` lingers. Filter at render time so a stale entry never reaches
  // FilterRow with spec=undefined; the effect below prunes the state.
  const visible = useMemo(
    () => shown.filter((field) => field in allFields),
    [shown, allFields],
  );

  useEffect(() => {
    setShown((prev) => {
      const pruned = prev.filter((field) => field in allFields);
      const withValues = Object.keys(value).filter(
        (field) => field in allFields && !pruned.includes(field),
      );
      if (withValues.length === 0 && pruned.length === prev.length) return prev;
      return [...pruned, ...withValues];
    });
  }, [allFields, value]);

  const impliedTypeFields = useMemo(
    () =>
      Object.entries(PAIRED_TYPE_FIELDS)
        .filter(([idField]) => value[idField] !== undefined && value[idField] !== '')
        .map(([, typeField]) => typeField),
    [value],
  );

  const available = useMemo(
    () =>
      Object.keys(offeredFields).filter(
        (k) => !visible.includes(k) && !impliedTypeFields.includes(k),
      ),
    [offeredFields, visible, impliedTypeFields],
  );

  // Types of the loaded lookup options (inbox id -> channel type), so a type
  // filter that contradicts the chosen id can be flagged.
  const [optionTypes, setOptionTypes] = useState<Record<string, string>>({});
  const conflictFor = (field: string): string | undefined => {
    const idField = Object.entries(PAIRED_TYPE_FIELDS).find(([, typeField]) => typeField === field)?.[0];
    if (!idField) return undefined;
    const id = value[idField];
    const own = value[field];
    if (typeof id !== 'string' || !id || typeof own !== 'string' || !own) return undefined;
    const actual = optionTypes[id];
    return actual && actual !== own ? actual : undefined;
  };

  const handleFieldChange = (field: string, raw: unknown) => {
    const next = { ...value };
    if (raw === undefined || raw === '') {
      delete next[field];
    } else {
      next[field] = raw;
    }
    onChange(next);
  };

  const handleRemove = (field: string) => {
    setShown((prev) => prev.filter((f) => f !== field));
    if (field in value) {
      const next = { ...value };
      delete next[field];
      onChange(next);
    }
  };

  const labelId = useId();

  return (
    <div className={cn('space-y-3', className)}>
      <Label id={labelId} className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        {t('propertiesForm.optionalSectionLabel')}
      </Label>
      <p className="text-xs text-muted-foreground">{t('propertiesForm.filtersHint')}</p>
      <div className="space-y-2" role="group" aria-labelledby={labelId}>
        {visible.map((field) => (
          <FilterRow
            key={field}
            field={field}
            spec={allFields[field]}
            value={value[field]}
            pipelineId={typeof value.pipeline_id === 'string' ? value.pipeline_id : undefined}
            filterType={
              PAIRED_TYPE_FIELDS[field] && typeof value[PAIRED_TYPE_FIELDS[field]] === 'string'
                ? (value[PAIRED_TYPE_FIELDS[field]] as string)
                : undefined
            }
            conflictType={conflictFor(field)}
            onOptionsLoaded={(loaded) =>
              setOptionTypes((prev) => {
                const next = { ...prev };
                for (const o of loaded) if (o.type) next[o.id] = o.type;
                return next;
              })
            }
            onChange={(raw) => handleFieldChange(field, raw)}
            onRemove={() => handleRemove(field)}
            disabled={disabled}
            t={t}
            label={fieldLabel(field)}
            help={fieldHelp(field)}
          />
        ))}

        {available.length > 0 && (
          <FilterPicker
            fields={available}
            fieldLabel={fieldLabel}
            onAdd={(field) => setShown((prev) => [...prev, field])}
            disabled={disabled}
            label={t('propertiesForm.addFieldLabel')}
            searchPlaceholder={t('propertiesForm.addFieldSearchPlaceholder')}
            noResultsLabel={t('propertiesForm.noResultsLabel')}
          />
        )}
      </div>
    </div>
  );
}

function FilterRow({
  field,
  spec,
  value,
  pipelineId,
  filterType,
  conflictType,
  onOptionsLoaded,
  onChange,
  onRemove,
  disabled,
  t,
  label,
  help,
}: {
  field: string;
  spec: FieldSpec;
  value: unknown;
  pipelineId?: string;
  filterType?: string;
  conflictType?: string;
  onOptionsLoaded?: (options: LookupOption[]) => void;
  onChange: (raw: unknown) => void;
  onRemove: () => void;
  disabled?: boolean;
  t: (key: string, opts?: Record<string, unknown>) => string;
  label: string;
  help: string;
}) {
  const id = useId();
  const lookup = LOOKUP_FIELDS[field];

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="text-sm">
          {label}
          {label !== field && (
            <span className="ml-1.5 font-mono text-xs font-normal text-muted-foreground">{field}</span>
          )}
        </Label>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onRemove}
          disabled={disabled}
          aria-label={`${t('propertiesForm.removeFilterAriaLabel')} ${field}`}
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>
      {lookup ? (
        <LookupSelect
          id={id}
          kind={lookup}
          value={typeof value === 'string' ? value : ''}
          pipelineId={pipelineId}
          filterType={filterType}
          onOptionsLoaded={onOptionsLoaded}
          onChange={onChange}
          disabled={disabled}
          t={t}
        />
      ) : spec.options ? (
        <EnumSelect
          id={id}
          field={field}
          options={spec.options}
          value={typeof value === 'string' ? value : ''}
          onChange={onChange}
          disabled={disabled}
          t={t}
        />
      ) : (
        <FieldInput id={id} spec={spec} value={value} onChange={onChange} disabled={disabled} />
      )}
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
      {conflictType && (
        <p role="alert" className="text-xs text-destructive">
          {t('propertiesForm.pairConflict', {
            actual: t(optionLabelKey(field, conflictType), { defaultValue: conflictType }),
          })}
        </p>
      )}
    </div>
  );
}

interface LookupOption {
  id: string;
  name: string;
  type?: string;
}

// The list endpoints page at 20 by default; ask for the same page sizes the
// contact/chat filters use so an account with dozens of labels or agents
// still sees all of them (pipelines and stages do not paginate).
async function loadLookup(kind: LookupKind, pipelineId?: string): Promise<LookupOption[]> {
  switch (kind) {
    case 'pipeline': {
      const response = await pipelinesService.getPipelines();
      return (response?.data || []).map((p) => ({ id: String(p.id), name: p.name }));
    }
    case 'pipeline_stage': {
      if (!pipelineId) return [];
      const response = await pipelinesService.getPipelineStages(pipelineId);
      return (response?.data || []).map((s) => ({ id: String(s.id), name: s.name }));
    }
    case 'inbox': {
      const response = await InboxesService.list({ per_page: 200 });
      return (response?.data || []).map((i) => ({ id: String(i.id), name: i.name, type: i.channel_type }));
    }
    case 'label': {
      const response = await labelsService.getLabels({ per_page: 200 });
      return (response?.data || []).map((l) => ({ id: String(l.id), name: l.title }));
    }
    case 'agent': {
      const response = await UsersService.getUsers({ per_page: 100 });
      return (response?.data || []).map((u) => ({ id: String(u.id), name: u.name }));
    }
    case 'campaign': {
      const response = await campaignsService.getCampaigns();
      return (response?.data || []).map((c) => ({ id: String(c.id), name: c.title || c.name }));
    }
    case 'template': {
      const response = await GlobalMessageTemplateService.getTemplates({ per_page: -1 });
      return (response?.data || []).map((m) => ({ id: String(m.id), name: m.name }));
    }
  }
}

// The stage list depends on the pipeline filter in the same form: without a
// pipeline the select stays disabled and says so, instead of listing every
// stage of every pipeline.
function LookupSelect({
  id,
  kind,
  value,
  pipelineId,
  filterType,
  onOptionsLoaded,
  onChange,
  disabled,
  t,
}: {
  id: string;
  kind: LookupKind;
  value: string;
  pipelineId?: string;
  filterType?: string;
  onOptionsLoaded?: (options: LookupOption[]) => void;
  onChange: (raw: unknown) => void;
  disabled?: boolean;
  t: (key: string) => string;
}) {
  const [options, setOptions] = useState<LookupOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const needsPipeline = kind === 'pipeline_stage' && !pipelineId;

  useEffect(() => {
    if (needsPipeline) {
      setOptions([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    loadLookup(kind, pipelineId)
      .then((list) => {
        if (cancelled) return;
        setOptions(list);
        onOptionsLoaded?.(list);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onOptionsLoaded is an inline arrow; depending on it would refetch on every parent render
  }, [kind, pipelineId, needsPipeline]);

  const shown = filterType ? options.filter((o) => !o.type || o.type === filterType) : options;

  const placeholder = needsPipeline
    ? t('propertiesForm.lookupNeedsPipeline')
    : loading
      ? t('propertiesForm.lookupLoading')
      : failed
        ? t('propertiesForm.lookupError')
        : t('propertiesForm.lookupPlaceholder');

  return (
    <div className="space-y-1">
      <Select
        value={value}
        onValueChange={(next) => onChange(next)}
        disabled={disabled || needsPipeline || loading || failed}
      >
        <SelectTrigger id={id} className="w-full" data-testid={`lookup-${kind}`}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent onWheel={(e) => e.stopPropagation()}>
          {shown.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!loading && !failed && !needsPipeline && shown.length === 0 && (
        <p className="text-xs text-muted-foreground">{t('propertiesForm.lookupEmpty')}</p>
      )}
    </div>
  );
}

function EnumSelect({
  id,
  field,
  options,
  value,
  onChange,
  disabled,
  t,
}: {
  id: string;
  field: string;
  options: readonly string[];
  value: string;
  onChange: (raw: unknown) => void;
  disabled?: boolean;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next)} disabled={disabled}>
      <SelectTrigger id={id} className="w-full" data-testid={`enum-${field}`}>
        <SelectValue placeholder={t('propertiesForm.lookupPlaceholder')} />
      </SelectTrigger>
      <SelectContent onWheel={(e) => e.stopPropagation()}>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {t(optionLabelKey(field, option), { defaultValue: option })}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function FieldInput({
  id,
  spec,
  value,
  onChange,
  disabled,
}: {
  id: string;
  spec: FieldSpec;
  value: unknown;
  onChange: (raw: unknown) => void;
  disabled?: boolean;
}) {
  switch (spec.type) {
    case 'boolean':
      return (
        <Checkbox
          id={id}
          checked={Boolean(value)}
          onCheckedChange={(checked) => onChange(Boolean(checked))}
          disabled={disabled}
        />
      );
    case 'number':
      return (
        <Input
          id={id}
          type="number"
          value={typeof value === 'number' ? value : ''}
          onChange={(e) => {
            const raw = e.target.value;
            onChange(raw === '' ? undefined : Number(raw));
          }}
          disabled={disabled}
        />
      );
    case 'date':
      return (
        <Input
          id={id}
          type="datetime-local"
          value={dateInputValue(value)}
          onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : undefined)}
          disabled={disabled}
        />
      );
    default:
      return (
        <Input
          id={id}
          type="text"
          value={typeof value === 'string' || typeof value === 'number' ? String(value) : ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      );
  }
}

function dateInputValue(raw: unknown): string {
  if (typeof raw !== 'string' || raw === '') return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 16);
}

// Searchable typeahead picker built on cmdk Command, mirroring the
// EventSelector pattern.
function FilterPicker({
  fields,
  fieldLabel,
  onAdd,
  disabled,
  label,
  searchPlaceholder,
  noResultsLabel,
}: {
  fields: string[];
  fieldLabel: (field: string) => string;
  onAdd: (field: string) => void;
  disabled?: boolean;
  label: string;
  searchPlaceholder: string;
  noResultsLabel: string;
}) {
  const [open, setOpen] = useState(false);
  // `modal`: inside the node Dialog the wheel dies on the dialog's scroll lock
  // otherwise (Radix Popover-in-Dialog).
  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          disabled={disabled}
          className="w-full justify-between font-normal text-muted-foreground"
        >
          <span>{label}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        {/* F6 fix: key={open} remounts the Command on each open, clearing any
            leftover CommandInput query from the previous open. */}
        <Command key={String(open)}>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{noResultsLabel}</CommandEmpty>
            <CommandGroup>
              {fields.map((field) => (
                <CommandItem
                  key={field}
                  value={`${field} ${fieldLabel(field)}`}
                  onSelect={() => {
                    onAdd(field);
                    setOpen(false);
                  }}
                >
                  <span>{fieldLabel(field)}</span>
                  {fieldLabel(field) !== field && (
                    <span className="ml-auto pl-3 font-mono text-xs text-muted-foreground">{field}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

type Pair = { key: string; value: string };

function pairsFromValue(value: EventPropertiesValue): Pair[] {
  const seeded = Object.entries(value).map<Pair>(([k, v]) => ({
    key: k,
    value: typeof v === 'object' && v !== null ? JSON.stringify(v) : v == null ? '' : String(v),
  }));
  return seeded.length > 0 ? seeded : [{ key: '', value: '' }];
}

function CustomKeyValueEditor({
  value,
  onChange,
  disabled,
  className,
  t,
}: {
  value: EventPropertiesValue;
  onChange: (next: EventPropertiesValue) => void;
  disabled?: boolean;
  className?: string;
  t: (key: string) => string;
}) {
  const labelId = useId();
  const [pairs, setPairs] = useState<Pair[]>(() => pairsFromValue(value));

  // F5 fix: resync pairs when the value's KEY SET changes upstream (e.g.,
  // parent resets value to {} or hydrates with a new payload). Tracking only
  // the key set, not the full value, means in-flight edits to a value field
  // don't get clobbered by our own emit() roundtrip.
  const valueKeySet = Object.keys(value).sort().join('|');
  useEffect(() => {
    setPairs(pairsFromValue(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueKeySet]);

  const emit = (next: Pair[]) => {
    const flat: EventPropertiesValue = {};
    for (const p of next) {
      const key = p.key.trim();
      if (key) flat[key] = p.value;
    }
    onChange(flat);
  };

  const update = (index: number, patch: Partial<Pair>) => {
    const next = pairs.map((p, i) => (i === index ? { ...p, ...patch } : p));
    setPairs(next);
    emit(next);
  };

  const add = () => {
    const next = [...pairs, { key: '', value: '' }];
    setPairs(next);
  };

  const remove = (index: number) => {
    const next = pairs.filter((_, i) => i !== index);
    setPairs(next.length > 0 ? next : [{ key: '', value: '' }]);
    emit(next);
  };

  return (
    <div className={cn('space-y-3', className)}>
      <Label
        id={labelId}
        className="text-sm font-medium uppercase tracking-wide text-muted-foreground"
      >
        {t('propertiesForm.customSectionLabel')}
      </Label>
      <div className="space-y-3" role="group" aria-labelledby={labelId}>
        {pairs.map((pair, index) => (
          <div key={index} className="flex gap-2">
            <Input
              placeholder={t('propertiesForm.customKeyPlaceholder')}
              aria-label={t('propertiesForm.customKeyPlaceholder')}
              value={pair.key}
              onChange={(e) => update(index, { key: e.target.value })}
              disabled={disabled}
            />
            <Input
              placeholder={t('propertiesForm.customValuePlaceholder')}
              aria-label={t('propertiesForm.customValuePlaceholder')}
              value={pair.value}
              onChange={(e) => update(index, { value: e.target.value })}
              disabled={disabled}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(index)}
              disabled={disabled}
              aria-label={t('propertiesForm.customRemoveAriaLabel')}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={add} disabled={disabled}>
          <Plus className="mr-1 h-3 w-3" aria-hidden="true" />
          {t('propertiesForm.customAddLabel')}
        </Button>
      </div>
    </div>
  );
}
