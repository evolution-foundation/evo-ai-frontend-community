import { useState } from 'react';
import { Button, Input } from '@evoapi/design-system';
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { EditorNode, emptyEditorNode } from '@/utils/editorMenus';
import { IconPicker } from './IconPicker';
import { ContentTypeFields } from './ContentTypeFields';

/**
 * Editor de um nó de conteúdo: título, ícone, tipo de conteúdo (link/HTML/
 * arquivo) e submenus em camadas ilimitadas (o "+" transforma o item numa
 * pasta e permite aninhar quantos níveis quiser). Compartilhado entre o
 * Editor genérico e outros menus com a mesma capacidade (ex.: Sites).
 *
 * Cada item pode ser recolhido (mostra só o título) — itens que já têm
 * título começam recolhidos para não lotar a tela quando há vários no mesmo
 * nível; um item novo (vazio) começa aberto, pronto para preencher.
 */
export function NodeEditor({
  node,
  depth,
  onChange,
  onDelete,
}: {
  node: EditorNode;
  depth: number;
  onChange: (n: EditorNode) => void;
  onDelete: () => void;
}) {
  const [collapsed, setCollapsed] = useState(() => !!node.title.trim());
  const update = (partial: Partial<EditorNode>) => onChange({ ...node, ...partial });
  const isFolder = !!node.children && node.children.length > 0;

  return (
    <div
      className="rounded-md border border-border p-3 space-y-3"
      style={{ marginLeft: depth > 0 ? `${depth * 16}px` : undefined }}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? 'Expandir item' : 'Recolher item'}
          className="flex-shrink-0 h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <Input
          value={node.title}
          onChange={(e) => update({ title: e.target.value })}
          placeholder={depth === 0 ? 'Título do conteúdo' : `Título do submenu (camada ${depth + 1})`}
          className="flex-1"
        />
        {collapsed && isFolder && (
          <span className="flex-shrink-0 whitespace-nowrap text-xs text-muted-foreground">
            {node.children!.length} {node.children!.length === 1 ? 'item' : 'itens'}
          </span>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="Adicionar submenu dentro deste item (+ quantas camadas quiser)"
          onClick={() => {
            update({ children: [...(node.children ?? []), emptyEditorNode()] });
            setCollapsed(false);
          }}
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="Excluir este item"
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {!collapsed && (
        <>
          <IconPicker
            label="Ícone"
            value={{ icon: node.icon, iconUrl: node.iconUrl }}
            onChange={(v) => update({ icon: v.icon, iconUrl: v.iconUrl })}
          />

          {!isFolder && (
            <ContentTypeFields
              value={{
                contentType: node.contentType,
                url: node.url,
                html: node.html,
                fileName: node.fileName,
                fileData: node.fileData,
              }}
              onChange={(v) => update(v)}
            />
          )}

          {isFolder && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Pasta com {node.children!.length}{' '}
                {node.children!.length === 1 ? 'item' : 'itens'} — os itens abaixo aparecem como
                submenu na barra lateral:
              </p>
              {node.children!.map((child) => (
                <NodeEditor
                  key={child.id}
                  node={child}
                  depth={depth + 1}
                  onChange={(updated) =>
                    update({ children: node.children!.map((c) => (c.id === updated.id ? updated : c)) })
                  }
                  onDelete={() =>
                    update({ children: node.children!.filter((c) => c.id !== child.id) })
                  }
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
