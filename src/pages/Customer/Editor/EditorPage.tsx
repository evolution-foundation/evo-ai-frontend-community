import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@evoapi/design-system';
import { toast } from 'sonner';
import { ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  EditorMenu,
  EditorNode,
  EDITOR_CONTENT_ROUTE,
  deleteEditorMenu,
  emptyEditorNode,
  generateEditorId,
  getCustomerAnchorNames,
  getEditorMenus,
  upsertEditorMenu,
} from '@/utils/editorMenus';
import { IconPicker } from '@/components/editor/IconPicker';
import { NodeEditor } from '@/components/editor/NodeEditor';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/utils/cn';

interface MenuFormState {
  id: string;
  name: string;
  placement: 'before' | 'after';
  anchorName: string;
  items: EditorNode[];
  icon?: string;
  iconUrl?: string;
}

const emptyForm = (): MenuFormState => ({
  id: '',
  name: '',
  placement: 'after',
  anchorName: '',
  items: [],
  icon: undefined,
  iconUrl: undefined,
});

/**
 * Combobox filtrável: ao clicar lista todas as opções e filtra conforme digita.
 */
function AnchorCombobox({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div ref={rootRef} className="relative flex-1 min-w-0">
      <Input
        role="combobox"
        aria-expanded={open}
        placeholder="Selecione um item da lista…"
        value={open ? query : value}
        onFocus={() => {
          setOpen(true);
          setQuery('');
        }}
        onChange={(e) => setQuery(e.target.value)}
      />
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-md border border-border bg-card shadow-lg py-1">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Nenhum item encontrado</p>
          ) : (
            filtered.map((opt) => (
              <button
                key={opt}
                type="button"
                className={cn(
                  'w-full text-left px-3 py-2 text-sm transition-colors cursor-pointer',
                  opt === value
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                )}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
              >
                {opt}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function EditorPage() {
  const { t } = useLanguage('layout');
  const [menus, setMenus] = useState<EditorMenu[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MenuFormState>(emptyForm());

  useEffect(() => {
    setMenus(getEditorMenus());
  }, []);

  const anchorOptions = useMemo(
    () => [...getCustomerAnchorNames(t), ...menus.map((m) => m.name)],
    [menus, t],
  );

  const openNewDialog = () => {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEditDialog = (menu: EditorMenu) => {
    setEditingId(menu.id);
    setForm({
      id: menu.id,
      name: menu.name,
      placement: menu.placement,
      anchorName: menu.anchorName,
      items: JSON.parse(JSON.stringify(menu.items)) as EditorNode[],
      icon: menu.icon,
      iconUrl: menu.iconUrl,
    });
    setDialogOpen(true);
  };

  const handleDeleteMenu = (menu: EditorMenu) => {
    if (!confirm(`Excluir o menu "${menu.name}" inteiro (incluindo submenus e conteúdos)?`)) return;
    deleteEditorMenu(menu.id);
    setMenus(getEditorMenus());
    toast.success('Menu excluído');
  };

  const handleSave = () => {
    const name = form.name.trim();
    if (!name) {
      toast.error('Informe o nome do menu');
      return;
    }
    if (!form.anchorName.trim()) {
      toast.error('Escolha a posição (antes/depois de qual item)');
      return;
    }
    if (form.items.length === 0) {
      toast.error('Adicione pelo menos um conteúdo ou submenu');
      return;
    }
    upsertEditorMenu({
      id: form.id || generateEditorId(),
      name,
      placement: form.placement,
      anchorName: form.anchorName.trim(),
      items: form.items,
      icon: form.icon,
      iconUrl: form.iconUrl,
    });
    setMenus(getEditorMenus());
    setDialogOpen(false);
    toast.success(editingId ? 'Menu atualizado' : 'Menu criado — veja na barra lateral');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Editor</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Crie menus personalizados com submenus em camadas e conteúdos (link, HTML ou arquivo).
            Os menus aparecem na barra lateral na posição escolhida.
          </p>
        </div>
        <Button onClick={openNewDialog}>
          <Plus className="h-4 w-4 mr-2" /> Adicionar menu
        </Button>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Menus personalizados
        </h2>
        {menus.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhum menu criado ainda. Clique em <strong>Adicionar menu</strong> para começar.
            </p>
          </div>
        ) : (
          menus.map((menu) => (
            <div
              key={menu.id}
              className="flex items-center gap-4 rounded-lg border border-border bg-card p-4"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{menu.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {menu.placement === 'before' ? 'Antes de' : 'Depois de'}{' '}
                  <strong>{menu.anchorName}</strong> · {menu.items.length}{' '}
                  {menu.items.length === 1 ? 'item' : 'itens'}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => openEditDialog(menu)}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" /> Editar
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title="Excluir menu todo"
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={() => handleDeleteMenu(menu)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>

      {/* Dialog criar/editar menu */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar menu' : 'Adicionar menu'}</DialogTitle>
            <DialogDescription>
              Defina nome, posição na barra lateral e monte os conteúdos com submenus ilimitados.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="editor-menu-name">Nome do menu</Label>
              <Input
                id="editor-menu-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Comercial"
              />
            </div>

            <IconPicker
              label="Ícone do menu"
              value={{ icon: form.icon, iconUrl: form.iconUrl }}
              onChange={(v) => setForm({ ...form, icon: v.icon, iconUrl: v.iconUrl })}
            />

            <div className="space-y-1.5">
              <Label>Posição</Label>
              <div className="flex items-center gap-3">
                <div className="flex rounded-md border border-border overflow-hidden flex-shrink-0">
                  {(['before', 'after'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setForm({ ...form, placement: p })}
                      className={cn(
                        'px-3 py-2 text-xs font-medium transition-colors',
                        form.placement === p
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                      )}
                    >
                      {p === 'before' ? 'Antes de' : 'Depois de'}
                    </button>
                  ))}
                </div>
                <AnchorCombobox
                  value={form.anchorName}
                  options={anchorOptions}
                  onChange={(v) => setForm({ ...form, anchorName: v })}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Clique no campo para listar todos os itens; digite para filtrar.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Conteúdos e submenus</Label>
              {form.items.map((item) => (
                <NodeEditor
                  key={item.id}
                  node={item}
                  depth={0}
                  onChange={(updated) =>
                    setForm({
                      ...form,
                      items: form.items.map((i) => (i.id === updated.id ? updated : i)),
                    })
                  }
                  onDelete={() =>
                    setForm({ ...form, items: form.items.filter((i) => i.id !== item.id) })
                  }
                />
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setForm({ ...form, items: [...form.items, emptyEditorNode()] })
                }
              >
                <Plus className="h-4 w-4 mr-1.5" /> Adicionar conteúdo / submenu
              </Button>
            </div>
          </div>

          <DialogFooter className="justify-between sm:justify-between gap-2">
            {editingId ? (
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => {
                  const menu = menus.find((m) => m.id === editingId);
                  if (menu) handleDeleteMenu(menu);
                }}
              >
                <Trash2 className="h-4 w-4 mr-1.5" /> Excluir menu
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>Salvar</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <p className="text-xs text-muted-foreground">
        Conteúdos do tipo link abrem em nova aba; HTML e arquivo são exibidos em{' '}
        <code>{EDITOR_CONTENT_ROUTE}/&lt;id&gt;</code>.
      </p>
    </div>
  );
}
