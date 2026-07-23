import { useState } from 'react';
import { Textarea } from '@evoapi/design-system';
import { useLanguage } from '@/hooks/useLanguage';

/**
 * EVO-1738/EVO-1739: full-config raw-JSON escape hatch for the Custom Tools / Custom
 * MCP wizards (n8n-style "advanced mode"). Renders the whole config object as editable
 * JSON, parses on every keystroke, and reports validity so the wizard can block submit
 * on malformed JSON. Shared primitive — the parent owns the object and the mode toggle.
 */
export interface AdvancedJsonEditorProps {
  /** Current config object (rendered as pretty JSON on mount). */
  value: Record<string, unknown>;
  /** Called with the parsed object on every valid edit. */
  onChange: (parsed: Record<string, unknown>) => void;
  /** Called whenever the parse validity changes (false → wizard must block submit). */
  onValidityChange?: (valid: boolean) => void;
  rows?: number;
  label?: string;
  hint?: string;
}

export default function AdvancedJsonEditor({
  value,
  onChange,
  onValidityChange,
  rows = 18,
  label,
  hint,
}: AdvancedJsonEditorProps) {
  const { t } = useLanguage('customTools');
  // Initialize once from the incoming object; the parent remounts this editor each time
  // advanced mode is (re)entered, so we never clobber in-progress typing with prop syncs.
  const [text, setText] = useState(() => JSON.stringify(value ?? {}, null, 2));
  const [error, setError] = useState('');

  const handleChange = (next: string) => {
    setText(next);
    try {
      const parsed = JSON.parse(next);
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setError(t('advancedJson.mustBeObject'));
        onValidityChange?.(false);
        return;
      }
      setError('');
      onValidityChange?.(true);
      onChange(parsed as Record<string, unknown>);
    } catch {
      setError(t('advancedJson.invalid'));
      onValidityChange?.(false);
    }
  };

  return (
    <div className="space-y-1.5">
      {label && <span className="text-sm font-semibold block">{label}</span>}
      <Textarea
        value={text}
        onChange={e => handleChange(e.target.value)}
        rows={rows}
        spellCheck={false}
        className={`font-mono text-xs ${error ? 'border-red-500' : ''}`}
        aria-label={label || t('advancedJson.title')}
      />
      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
