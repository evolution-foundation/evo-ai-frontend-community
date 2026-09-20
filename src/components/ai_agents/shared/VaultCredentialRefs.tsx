import { useEffect, useRef, useState } from 'react';
import {
  Button,
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
import { useVaultCredentials } from './useVaultCredentials';
import type { IntegrationCredential } from '@/types/agents';

// EVO-2250 story 2.4: pickers for vault-backed secrets. The credential list
// comes from useVaultCredentials, which already filters to static + active.

const NONE_VALUE = '__none__';

interface VaultCredentialSelectProps {
  id?: string;
  value?: string;
  onChange: (credentialId: string | undefined) => void;
  disabled?: boolean;
  credentials: IntegrationCredential[];
}

export function VaultCredentialSelect({
  id,
  value,
  onChange,
  disabled,
  credentials,
}: VaultCredentialSelectProps) {
  const { t } = useLanguage('integrationCredentials');

  return (
    <Select
      value={value ?? NONE_VALUE}
      onValueChange={selected => onChange(selected === NONE_VALUE ? undefined : selected)}
      disabled={disabled}
    >
      <SelectTrigger id={id}>
        <SelectValue placeholder={t('refsEditor.selectPlaceholder')} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE_VALUE}>{t('refsEditor.none')}</SelectItem>
        {credentials.map(credential => (
          <SelectItem key={credential.id} value={credential.id}>
            {credential.name} ({credential.provider})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface CredentialRefsEditorProps {
  id: string;
  /** Map of header/env-var name -> vault credential id. Always a MAP: one
   * credential per secret, so two auth headers mean two entries. Optional: a
   * host that has not adopted the field yet renders an empty editor instead of
   * crashing. */
  value?: Record<string, string>;
  onChange: (refs: Record<string, string>) => void;
  disabled?: boolean;
  keyPlaceholder?: string;
}

interface RefRow {
  key: string;
  credentialId: string;
}

function toRows(value?: Record<string, string>): RefRow[] {
  return Object.entries(value ?? {}).map(([key, credentialId]) => ({ key, credentialId }));
}

export function CredentialRefsEditor({
  id,
  value,
  onChange,
  disabled,
  keyPlaceholder,
}: CredentialRefsEditorProps) {
  const { t } = useLanguage('integrationCredentials');
  const credentials = useVaultCredentials();

  // Rows are LOCAL state seeded from `value`, not derived from it. Renaming a
  // header passes through an empty name, which `emit` legitimately drops from
  // the map; if the rows were derived, the row would vanish from the DOM
  // mid-keystroke and take the credential selection with it.
  // `value ?? {}` on every read: a host that has not adopted credential_refs yet
  // (or an older stored record) passes undefined, and Object.entries would throw
  // and take the whole step down with it.
  const [rows, setRows] = useState<RefRow[]>(() => toRows(value));

  // Re-seed only when the incoming map genuinely differs from what the rows
  // already express, so a parent re-render never clobbers a half-typed name.
  const emittedRef = useRef<string>(JSON.stringify(value ?? {}));
  useEffect(() => {
    const incoming = JSON.stringify(value ?? {});
    if (incoming === emittedRef.current) return;

    emittedRef.current = incoming;
    setRows(toRows(value));
  }, [value]);
  // Rows being typed that don't have both halves yet live locally: an entry
  // only reaches the map (and the payload) once name AND credential exist.
  const [draftRow, setDraftRow] = useState<RefRow | null>(null);

  const emit = (nextRows: RefRow[]) => {
    const refs: Record<string, string> = {};
    nextRows.forEach(row => {
      if (row.key.trim() && row.credentialId) {
        refs[row.key.trim()] = row.credentialId;
      }
    });
    emittedRef.current = JSON.stringify(refs);
    onChange(refs);
  };

  const updateRow = (index: number, patch: Partial<RefRow>) => {
    const next = rows.map((row, i) => (i === index ? { ...row, ...patch } : row));
    setRows(next);
    emit(next);
  };

  const removeRow = (index: number) => {
    const next = rows.filter((_, i) => i !== index);
    setRows(next);
    emit(next);
  };

  const commitDraft = (patch: Partial<RefRow>) => {
    const next = { ...(draftRow ?? { key: '', credentialId: '' }), ...patch };
    if (next.key.trim() && next.credentialId) {
      const merged = [...rows, next];
      setRows(merged);
      emit(merged);
      setDraftRow(null);
    } else {
      setDraftRow(next);
    }
  };

  const renderRow = (
    row: RefRow,
    onKey: (key: string) => void,
    onCredential: (credentialId: string | undefined) => void,
    onRemove: () => void,
    rowId: string,
  ) => (
    <div key={rowId} className="flex items-center gap-2">
      <Input
        aria-label={t('refsEditor.keyLabel')}
        value={row.key}
        placeholder={keyPlaceholder ?? t('refsEditor.keyPlaceholder')}
        disabled={disabled}
        onChange={event => onKey(event.target.value)}
        className="flex-1"
      />
      <div className="flex-1">
        <VaultCredentialSelect
          value={row.credentialId || undefined}
          onChange={credentialId => onCredential(credentialId)}
          disabled={disabled}
          credentials={credentials}
        />
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label={t('refsEditor.remove')}
        disabled={disabled}
        onClick={onRemove}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <div id={id} className="space-y-2">
      <Label>{t('refsEditor.label')}</Label>
      <p className="text-xs text-muted-foreground">{t('refsEditor.hint')}</p>

      {rows.map((row, index) =>
        renderRow(
          row,
          key => updateRow(index, { key }),
          credentialId => {
            if (credentialId) {
              updateRow(index, { credentialId });
            } else {
              removeRow(index);
            }
          },
          () => removeRow(index),
          `${id}-row-${index}`,
        ),
      )}

      {draftRow &&
        renderRow(
          draftRow,
          key => commitDraft({ key }),
          credentialId => commitDraft({ credentialId: credentialId ?? '' }),
          () => setDraftRow(null),
          `${id}-draft`,
        )}

      {!draftRow && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => setDraftRow({ key: '', credentialId: '' })}
        >
          <Plus className="mr-2 h-4 w-4" />
          {t('refsEditor.add')}
        </Button>
      )}
    </div>
  );
}
