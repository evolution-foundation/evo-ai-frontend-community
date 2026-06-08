import { Copy, Trash2, Settings, type LucideIcon } from "lucide-react";
import { useCallback } from "react";
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from "@/lib/utils";

// Tipos para ações do menu
export interface ContextMenuAction {
  id: string;
  label: string;
  icon: LucideIcon;
  color?: string;
  onClick: (nodeId: string) => void;
  disabled?: boolean;
}

export interface BaseFlowContextMenuProps {
  x: number;
  y: number;
  nodeId?: string;
  onClose: () => void;
  onDeleteNode: (nodeId: string) => void;
  onDuplicateNode?: (nodeId: string) => void;

  // Configurações customizadas
  title?: string;
  actions?: ContextMenuAction[];
  showDefaultActions?: boolean;
  enableDuplicate?: boolean;
  enableDelete?: boolean;
  enableEdit?: boolean;

  // Classes CSS
  className?: string;
  itemClassName?: string;
}

export function BaseFlowContextMenu({
  x,
  y,
  nodeId,
  onClose,
  onDeleteNode,
  onDuplicateNode,
  title,
  actions = [],
  showDefaultActions = true,
  enableDuplicate = true,
  enableDelete = true,
  enableEdit = false,
  className,
  itemClassName,
}: BaseFlowContextMenuProps) {
  const { t } = useLanguage('common');
  const finalTitle = title || t('base.flow.node.options');

  // Delegate mutations to the parent so they flow through the editor store
  // (EVO-1643). Doing setNodes/addNodes here via useReactFlow bypassed
  // onFlowDataChange, so duplicates/deletes were lost on the next save.
  const duplicateNode = useCallback(() => {
    if (!nodeId) return;
    onDuplicateNode?.(nodeId);
    onClose();
  }, [nodeId, onDuplicateNode, onClose]);

  const deleteNode = useCallback(() => {
    if (!nodeId) return;
    onDeleteNode(nodeId);
    onClose();
  }, [nodeId, onDeleteNode, onClose]);

  const editNode = useCallback(() => {
    if (!nodeId) return;
    // Implementação específica pode ser passada via props
    onClose();
  }, [nodeId, onClose]);

  // Construir lista de ações
  const allActions: ContextMenuAction[] = [];

  // Ações padrão
  if (showDefaultActions) {
    if (enableDuplicate) {
      allActions.push({
        id: 'duplicate',
        label: t('base.flow.node.duplicate'),
        icon: Copy,
        color: 'text-blue-400',
        onClick: duplicateNode,
      });
    }

    if (enableEdit) {
      allActions.push({
        id: 'edit',
        label: t('base.flow.node.edit'),
        icon: Settings,
        color: 'text-gray-400',
        onClick: editNode,
      });
    }

    if (enableDelete) {
      allActions.push({
        id: 'delete',
        label: t('base.flow.node.delete'),
        icon: Trash2,
        color: 'text-red-400',
        onClick: deleteNode,
      });
    }
  }

  // Adicionar ações customizadas
  allActions.push(...actions);

  // Não renderizar se não há nodeId ou ações
  if (!nodeId || allActions.length === 0) {
    return null;
  }

  return (
    <>
      {/* Overlay para fechar o menu */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Menu */}
      <div
        style={{
          position: "fixed",
          top: `${y}px`,
          left: `${x}px`,
          zIndex: 50,
        }}
        className={cn(
          "context-menu rounded-md border p-3 shadow-lg border-sidebar-border bg-sidebar min-w-[160px]",
          className
        )}
      >
        <p className="mb-2 text-sm font-semibold text-sidebar-foreground">
          {finalTitle}
        </p>

        {allActions.map((action, index) => {
          const IconComponent = action.icon;

          return (
            <button
              key={action.id}
              onClick={() => action.onClick(nodeId)}
              disabled={action.disabled}
              className={cn(
                "flex w-full flex-row items-center rounded-md px-2 py-1 text-sm transition-colors",
                "hover:bg-sidebar-accent disabled:opacity-50 disabled:cursor-not-allowed",
                index < allActions.length - 1 && "mb-1",
                itemClassName
              )}
            >
              <IconComponent
                size={16}
                className={cn(
                  "mr-2 flex-shrink-0",
                  action.color || "text-sidebar-foreground"
                )}
              />
              <span className="text-sidebar-foreground">{action.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
