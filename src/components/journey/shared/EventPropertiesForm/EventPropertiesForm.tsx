import { useId, useMemo, useState, useEffect } from 'react';
import { Plus, X, AlertTriangle, ChevronsUpDown } from 'lucide-react';
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
} from '@evoapi/design-system';
import { cn } from '@/lib/utils';
import { getEvent, isCustomEvent, type FieldSpec } from '@/lib/events-manifest';
import { useLanguage } from '@/hooks/useLanguage';

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
    <SchemaDrivenFields
      requiredFields={entry.schema.required}
      optionalFields={entry.schema.optional}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={className}
      t={t}
    />
  );
}

function SchemaDrivenFields({
  requiredFields,
  optionalFields,
  value,
  onChange,
  disabled,
  className,
  t,
}: {
  requiredFields: Record<string, FieldSpec>;
  optionalFields: Record<string, FieldSpec>;
  value: EventPropertiesValue;
  onChange: (next: EventPropertiesValue) => void;
  disabled?: boolean;
  className?: string;
  t: (key: string) => string;
}) {
  // EVO-1275: seed from any optional fields that already carry a value, so a
  // reopened node (or values preserved across an event switch) renders them
  // instead of hiding persisted data behind the "+ Add field" picker.
  const [shownOptional, setShownOptional] = useState<string[]>(
    () => Object.keys(value).filter((field) => field in optionalFields),
  );

  // F1 fix: when eventName changes upstream, optionalFields changes synchronously
  // but shownOptional state lingers. Compute the filtered set at render time
  // so a stale entry never reaches SchemaField as spec=undefined. The useEffect
  // below prunes the stored state on next tick for tidiness.
  const visibleOptional = useMemo(
    () => shownOptional.filter((field) => field in optionalFields),
    [shownOptional, optionalFields],
  );

  // Prune entries that no longer belong to the current schema AND surface any
  // optional field that has a value (e.g. preserved across an event switch).
  // Returns the previous array unchanged when nothing differs, so a fresh
  // `value` object reference with identical content can't cause a render loop.
  useEffect(() => {
    setShownOptional((prev) => {
      const pruned = prev.filter((field) => field in optionalFields);
      const withValues = Object.keys(value).filter(
        (field) => field in optionalFields && !pruned.includes(field),
      );
      if (withValues.length === 0 && pruned.length === prev.length) return prev;
      return [...pruned, ...withValues];
    });
  }, [optionalFields, value]);

  const optionalKeysAvailable = useMemo(
    () => Object.keys(optionalFields).filter((k) => !visibleOptional.includes(k)),
    [optionalFields, visibleOptional],
  );

  const handleFieldChange = (field: string, raw: unknown) => {
    const next = { ...value };
    if (raw === undefined || raw === '') {
      delete next[field];
    } else {
      next[field] = raw;
    }
    onChange(next);
  };

  const handleAddOptional = (field: string) => {
    setShownOptional((prev) => [...prev, field]);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {Object.keys(requiredFields).length > 0 && (
        <FieldSection title={t('propertiesForm.requiredSectionLabel')}>
          {Object.entries(requiredFields).map(([field, spec]) => (
            <SchemaField
              key={field}
              field={field}
              spec={spec}
              required
              value={value[field]}
              onChange={(raw) => handleFieldChange(field, raw)}
              disabled={disabled}
              t={t}
            />
          ))}
        </FieldSection>
      )}

      {(visibleOptional.length > 0 || optionalKeysAvailable.length > 0) && (
        <FieldSection title={t('propertiesForm.optionalSectionLabel')}>
          {visibleOptional.map((field) => (
            <SchemaField
              key={field}
              field={field}
              spec={optionalFields[field]}
              required={false}
              value={value[field]}
              onChange={(raw) => handleFieldChange(field, raw)}
              disabled={disabled}
              t={t}
            />
          ))}

          {optionalKeysAvailable.length > 0 && (
            <OptionalFieldPicker
              fields={optionalKeysAvailable}
              onAdd={handleAddOptional}
              disabled={disabled}
              label={t('propertiesForm.addFieldLabel')}
              searchPlaceholder={t('propertiesForm.addFieldSearchPlaceholder')}
              noResultsLabel={t('propertiesForm.noResultsLabel')}
            />
          )}
        </FieldSection>
      )}
    </div>
  );
}

function FieldSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </Label>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function SchemaField({
  field,
  spec,
  required,
  value,
  onChange,
  disabled,
  t,
}: {
  field: string;
  spec: FieldSpec;
  required: boolean;
  value: unknown;
  onChange: (raw: unknown) => void;
  disabled?: boolean;
  t: (key: string) => string;
}) {
  const id = useId();
  const missing = required && (value === undefined || value === '' || value === null);

  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-sm">
        {field}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      <FieldInput
        id={id}
        spec={spec}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
      {spec.description && (
        <p className="text-xs text-muted-foreground">{spec.description}</p>
      )}
      {missing && (
        <p className="text-xs text-destructive">{t('propertiesForm.requiredFieldMissing')}</p>
      )}
    </div>
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

// Per card: "Campos opcionais como 'Add field' expandível com autocomplete
// da lista" — searchable typeahead picker built on cmdk Command, mirroring
// the EventSelector pattern.
function OptionalFieldPicker({
  fields,
  onAdd,
  disabled,
  label,
  searchPlaceholder,
  noResultsLabel,
}: {
  fields: string[];
  onAdd: (field: string) => void;
  disabled?: boolean;
  label: string;
  searchPlaceholder: string;
  noResultsLabel: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
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
                  value={field}
                  onSelect={() => {
                    onAdd(field);
                    setOpen(false);
                  }}
                >
                  {field}
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
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{t('propertiesForm.customWarning')}</span>
      </div>
      <Label className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        {t('propertiesForm.customSectionLabel')}
      </Label>
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
  );
}
