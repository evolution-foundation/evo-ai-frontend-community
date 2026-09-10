import React, { useState } from 'react';
import { Button, Label } from '@evoapi/design-system';
import { toast } from 'sonner';
import { ChevronUp, ImageIcon, Pencil } from 'lucide-react';
import { EDITOR_ICON_OPTIONS, EDITOR_ICON_REGISTRY } from '@/utils/editorMenus';
import { cn } from '@/utils/cn';

export interface IconValue {
  icon?: string;
  iconUrl?: string;
}

const MAX_ICON_BYTES = 64 * 1024;

/**
 * Seletor de ícone: grade com ícones prontos (lucide) + upload de imagem
 * própria (dataURL, máx. 64KB para caber no localStorage).
 * Compartilhado entre o Editor e outros menus que permitem escolher ícone
 * (ex.: itens personalizados do Dashboard).
 *
 * Fica recolhido por padrão (só mostra o ícone atual) para não ocupar tanto
 * espaço no formulário — "Editar ícone" expande a grade completa.
 */
export function IconPicker({
  value,
  onChange,
  label,
}: {
  value: IconValue;
  onChange: (v: IconValue) => void;
  label: string;
}) {
  const inputId = React.useId();
  const [expanded, setExpanded] = useState(false);

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_ICON_BYTES) {
      toast.error('Imagem muito grande (máx. 64KB). Use um PNG/SVG menor.');
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    onChange({ icon: undefined, iconUrl: dataUrl });
  };

  const SelectedIcon = value.icon ? EDITOR_ICON_REGISTRY[value.icon] : undefined;

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="w-full flex items-center gap-2.5 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border border-border bg-card">
            {value.iconUrl ? (
              <img src={value.iconUrl} alt="" className="h-5 w-5 object-contain" />
            ) : SelectedIcon ? (
              <SelectedIcon className="h-4 w-4" />
            ) : (
              <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
            )}
          </span>
          <span className="flex-1 text-left truncate">
            {value.iconUrl ? 'Imagem enviada' : value.icon ?? 'Nenhum (padrão)'}
          </span>
          <Pencil className="h-3.5 w-3.5 flex-shrink-0" />
        </button>
      ) : (
        <div className="space-y-2 rounded-md border border-border p-3">
          <div className="flex flex-wrap gap-1.5">
            {EDITOR_ICON_OPTIONS.map(({ name, icon: Icon }) => (
              <button
                key={name}
                type="button"
                title={name}
                aria-label={`Ícone ${name}`}
                onClick={() => {
                  onChange({ icon: name, iconUrl: undefined });
                  setExpanded(false);
                }}
                className={cn(
                  'h-8 w-8 rounded-md border flex items-center justify-center transition-colors',
                  !value.iconUrl && value.icon === name
                    ? 'bg-primary/10 border-primary/40 text-primary'
                    : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent',
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              id={inputId}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              className="hidden"
              onChange={(e) => {
                void handleUpload(e.target.files?.[0]);
                setExpanded(false);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById(inputId)?.click()}
            >
              <ImageIcon className="h-3.5 w-3.5 mr-1.5" /> Enviar ícone
            </Button>
            {value.iconUrl && (
              <>
                <img
                  src={value.iconUrl}
                  alt="Ícone enviado"
                  className="h-6 w-6 object-contain rounded border border-border p-0.5"
                />
                <button
                  type="button"
                  title="Remover imagem enviada"
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                  onClick={() => onChange({ icon: undefined, iconUrl: undefined })}
                >
                  remover
                </button>
              </>
            )}
            {!value.iconUrl && !value.icon && (
              <span className="text-xs text-muted-foreground">Nenhum (padrão)</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronUp className="h-3.5 w-3.5" /> Recolher
          </button>
        </div>
      )}
    </div>
  );
}
