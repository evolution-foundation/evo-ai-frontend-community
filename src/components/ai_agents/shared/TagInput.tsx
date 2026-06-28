import { useState, useRef, KeyboardEvent } from 'react';
import { Input, Label, Badge } from '@evoapi/design-system';
import { X } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

/** Shared between Custom Tools (EVO-1790) and Custom MCP (EVO-1791) UIs. */
export interface TagInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  label?: string;
  placeholder?: string;
  hint?: string;
  suggestions?: string[];
  disabled?: boolean;
  id?: string;
}

export default function TagInput({
  value,
  onChange,
  label,
  placeholder,
  hint,
  suggestions,
  disabled = false,
  id,
}: TagInputProps) {
  const { t } = useLanguage('customTools');
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  const commitTag = (raw: string) => {
    const trimmed = raw.trim().replace(/,$/, '').trim();
    if (!trimmed) return;
    if (value.includes(trimmed)) {
      setDraft('');
      return;
    }
    onChange([...value, trimmed]);
    setDraft('');
  };

  const removeTag = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitTag(draft);
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      e.preventDefault();
      removeTag(value.length - 1);
    }
  };

  const handleBlur = () => {
    if (draft.trim()) commitTag(draft);
  };

  const visibleSuggestions = suggestions?.filter(
    s => !value.includes(s) && s.toLowerCase().includes(draft.toLowerCase().trim()),
  );

  return (
    <div className="space-y-1.5" data-testid={id ? `${id}-tag-input` : 'tag-input'}>
      {label && <Label className="text-sm font-semibold">{label}</Label>}
      <div
        className={`flex flex-wrap gap-1.5 p-2 min-h-[40px] rounded-md border bg-background ${
          disabled ? 'opacity-60' : 'cursor-text'
        }`}
        onClick={() => !disabled && inputRef.current?.focus()}
      >
        {value.map((tag, idx) => (
          <Badge
            key={`${tag}-${idx}`}
            variant="secondary"
            className="gap-1 pl-2 pr-1 py-0.5 text-sm font-normal"
          >
            <span>{tag}</span>
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                removeTag(idx);
              }}
              disabled={disabled}
              aria-label={t('tagInput.removeTag', { tag })}
              className="hover:bg-muted/50 rounded-sm p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <Input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={value.length === 0 ? placeholder || t('tagInput.placeholder') : ''}
          disabled={disabled}
          className="flex-1 min-w-[120px] border-0 shadow-none p-0 h-7 text-sm focus-visible:ring-0"
          aria-label={label || t('tagInput.placeholder')}
        />
      </div>
      {visibleSuggestions && visibleSuggestions.length > 0 && draft.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          <span className="text-xs text-muted-foreground self-center pr-1">
            {t('tagInput.suggestions')}:
          </span>
          {visibleSuggestions.slice(0, 6).map(sug => (
            <button
              key={sug}
              type="button"
              onClick={() => commitTag(sug)}
              className="text-xs px-2 py-0.5 rounded bg-muted hover:bg-muted/70 transition-colors"
            >
              + {sug}
            </button>
          ))}
        </div>
      )}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
