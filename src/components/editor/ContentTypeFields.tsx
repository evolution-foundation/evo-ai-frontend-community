import React, { useState } from 'react';
import { Input, Textarea } from '@evoapi/design-system';
import { ChevronDown, ChevronUp, FileText, Code, Link2 } from 'lucide-react';
import { EditorContentType } from '@/utils/editorMenus';
import { cn } from '@/utils/cn';

export const CONTENT_TYPES: Array<{ value: EditorContentType; label: string; icon: React.ElementType }> = [
  { value: 'link', label: 'Link', icon: Link2 },
  { value: 'html', label: 'HTML', icon: Code },
  { value: 'file', label: 'Arquivo', icon: FileText },
];

export interface ContentTypeValue {
  contentType: EditorContentType;
  url?: string;
  html?: string;
  fileName?: string;
  fileData?: string;
}

/**
 * Seletor de tipo de conteúdo (link / HTML / arquivo) + campo específico do
 * tipo escolhido. Compartilhado entre o Editor e outros menus com conteúdo
 * customizável (ex.: itens personalizados do Dashboard).
 */
export function ContentTypeFields({
  value,
  onChange,
}: {
  value: ContentTypeValue;
  onChange: (v: ContentTypeValue) => void;
}) {
  const [htmlExpanded, setHtmlExpanded] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    onChange({ ...value, fileName: file.name, fileData: text });
  };

  const htmlFirstLine = (value.html ?? '').split('\n')[0];

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        {CONTENT_TYPES.map(({ value: v, label, icon: Icon }) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange({ ...value, contentType: v })}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors',
              value.contentType === v
                ? 'bg-primary/10 border-primary/40 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {value.contentType === 'link' && (
        <Input
          value={value.url ?? ''}
          onChange={(e) => onChange({ ...value, url: e.target.value })}
          placeholder="https://exemplo.com.br"
        />
      )}
      {value.contentType === 'html' && (
        htmlExpanded ? (
          <div className="space-y-1.5">
            <Textarea
              rows={10}
              value={value.html ?? ''}
              onChange={(e) => onChange({ ...value, html: e.target.value })}
              placeholder="<div>cole aqui o seu código HTML</div>"
              className="font-mono text-xs"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setHtmlExpanded(false)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronUp className="h-3.5 w-3.5" /> Recolher
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setHtmlExpanded(true)}
            className="w-full flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <span className="flex-1 truncate text-left font-mono">
              {htmlFirstLine || 'Nenhum código — clique para escrever'}
            </span>
            <span className="flex items-center gap-1 flex-shrink-0 font-medium">
              <ChevronDown className="h-3.5 w-3.5" /> Expandir
            </span>
          </button>
        )
      )}
      {value.contentType === 'file' && (
        <div className="space-y-1.5">
          <input
            type="file"
            accept=".html,.htm,.txt,.md,.json,.svg"
            onChange={(e) => handleFile(e.target.files?.[0])}
            className="text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-primary/10 file:text-primary file:text-xs file:font-medium"
          />
          {value.fileName && (
            <p className="text-xs text-muted-foreground truncate">
              Arquivo carregado: {value.fileName}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
