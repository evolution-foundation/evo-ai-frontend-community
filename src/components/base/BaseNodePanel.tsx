import React, { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@evoapi/design-system';
import {
  Search,
  X,
  Plus,
  MoveRight,
  Layers,
  Grid3X3,
  type LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDnD } from '@/contexts/DnDContext';

// Tipos para configuração de nodes
export interface NodeType {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
  category?: string;
  // English synonyms / aliases checked in addition to the locale-resolved
  // name + description by the palette search. Lets users find a node by
  // technical or alternative terms (e.g. "tag" for add-label).
  searchKeywords?: string[];
}

export interface NodeCategory {
  value: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

export interface BaseNodePanelProps {
  // Configuração dos nodes
  nodeTypes: Record<string, NodeType[]>;
  categories: NodeCategory[];

  // Callbacks
  onClose?: () => void;
  onNodeAdd?: (nodeId: string) => void;

  // Configurações visuais
  title?: string;
  subtitle?: string;
  width?: string;
  maxHeight?: string;

  // Configurações de funcionalidade
  enableSearch?: boolean;
  enableCategories?: boolean;
  showAllCategory?: boolean;
  defaultCategory?: string;

  // Classes CSS customizadas
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  nodeClassName?: string;
}

export function BaseNodePanel({
  nodeTypes,
  categories,
  onClose,
  onNodeAdd,
  title,
  subtitle,
  width = 'w-[420px]',
  maxHeight = 'max-h-96',
  enableSearch = true,
  enableCategories = true,
  showAllCategory = true,
  defaultCategory = 'todos',
  className,
  headerClassName,
  contentClassName,
  nodeClassName,
}: BaseNodePanelProps) {
  const { t } = useLanguage('common');
  const { setType } = useDnD();
  const finalTitle = title || t('base.flow.panel.title');
  const finalSubtitle = subtitle || t('base.flow.panel.subtitle');

  // Estados
  const [activeTab, setActiveTab] = useState(defaultCategory);
  const [searchQuery, setSearchQuery] = useState('');

  // Preparar categorias com "Todos" se habilitado
  const allCategories = showAllCategory
    ? [
      { value: 'todos', label: t('base.flow.panel.allComponents'), icon: Grid3X3, description: t('base.flow.panel.allDescription') },
      ...categories
    ]
    : categories;

  // Funções utilitárias
  const getAllNodes = () => {
    return Object.values(nodeTypes).flat();
  };

  const getFilteredNodes = (nodes: NodeType[]) => {
    if (!searchQuery) return nodes;

    if (!Array.isArray(nodes)) return [];

    const q = searchQuery.toLowerCase();
    return nodes.filter(node =>
      node.name.toLowerCase().includes(q) ||
      node.description.toLowerCase().includes(q) ||
      (node.searchKeywords ?? []).some(kw => kw.toLowerCase().includes(q))
    );
  };

  // Handlers
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    setType(nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleNodeAdd = (nodeId: string) => {
    if (onNodeAdd) {
      onNodeAdd(nodeId);
    }
  };

  // Determinar nodes a mostrar
  const getNodesToShow = () => {
    let nodesToShow: NodeType[];

    if (searchQuery) {
      nodesToShow = getFilteredNodes(getAllNodes());
    } else {
      if (activeTab === 'todos') {
        nodesToShow = getAllNodes();
      } else {
        nodesToShow = nodeTypes[activeTab as keyof typeof nodeTypes] || [];
      }
    }

    return nodesToShow;
  };

  const nodesToShow = getNodesToShow();

  return (
    <div className={cn(
      'bg-sidebar border border-sidebar-border rounded-lg shadow-lg transition-all duration-300 ease-in-out overflow-hidden',
      width,
      className
    )}>
      {/* Header */}
      <div className={cn(
        'px-4 pt-4 pb-3 border-b border-sidebar-border',
        headerClassName
      )}>
        <div className="flex items-center justify-between text-sidebar-foreground">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-lg">{finalTitle}</h3>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-md flex items-center justify-center text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="text-sm text-sidebar-foreground/70 mt-1">{finalSubtitle}</p>
      </div>

      {/* Controles de busca e categoria */}
      <div className="px-4 pt-3 pb-3 border-b border-sidebar-border space-y-3">
        {/* Busca */}
        {enableSearch && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-sidebar-foreground/50" />
            <Input
              type="text"
              placeholder={t('base.flow.panel.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9 bg-sidebar-accent/30 border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/50"
            />
          </div>
        )}

        {/* Seletor de categoria */}
        {enableCategories && !searchQuery && (
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full h-10 bg-sidebar-accent/30 border-sidebar-border text-sidebar-foreground">
              <div className="flex items-center gap-2">
                {(() => {
                  const currentCategory = allCategories.find(cat => cat.value === activeTab);
                  const IconComponent = currentCategory?.icon || Grid3X3;
                  return (
                    <>
                      <IconComponent className="h-4 w-4" />
                      <div className="flex flex-col items-start">
                        <span className="text-sm font-medium">{currentCategory?.label}</span>
                        <span className="text-xs text-sidebar-foreground/60">{currentCategory?.description}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </SelectTrigger>
            <SelectContent className="bg-sidebar border-sidebar-border">
              {allCategories.map(category => {
                const IconComponent = category.icon;
                return (
                  <SelectItem key={category.value} value={category.value} className="text-sidebar-foreground">
                    <div className="flex items-center gap-3 py-1">
                      <IconComponent className="h-4 w-4" />
                      <div className="flex flex-col">
                        <span className="font-medium">{category.label}</span>
                        <span className="text-xs text-sidebar-foreground/60">{category.description}</span>
                      </div>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        )}

        {/* Indicador de busca */}
        {searchQuery && (
          <div className="flex items-center gap-2 text-sm text-sidebar-foreground/70">
            <Grid3X3 className="h-4 w-4" />
            <span>{t('base.flow.panel.searchAll')}</span>
          </div>
        )}
      </div>

      {/* Lista de nodes */}
      <div className={cn(
        'px-4 pb-4 space-y-3 overflow-y-auto',
        maxHeight,
        contentClassName
      )}>
        {nodesToShow.length === 0 && searchQuery ? (
          <div className="text-center py-8">
            <p className="text-sidebar-foreground/60 text-sm">
              {t('base.flow.panel.noResults', { query: searchQuery })}
            </p>
          </div>
        ) : (
          nodesToShow.map(node => (
            <TooltipProvider key={node.id} delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    draggable
                    onDragStart={event => onDragStart(event, node.id)}
                    className={cn(
                      'group flex items-center gap-3 p-3 border rounded-lg cursor-grab transition-all duration-200',
                      'bg-sidebar border-sidebar-border hover:bg-sidebar-accent/50 hover:border-sidebar-border',
                      'hover:shadow-md',
                      nodeClassName
                    )}
                  >
                    <div
                      className={cn(
                        'flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200',
                        'bg-sidebar-accent/30 border border-sidebar-border group-hover:scale-105',
                      )}
                    >
                      <node.icon className={cn('h-5 w-5', node.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium block text-sm text-sidebar-foreground">
                        {node.name}
                      </span>
                      <span className="text-xs text-sidebar-foreground/60 truncate block">
                        {node.description}
                      </span>
                    </div>
                    <div
                      onClick={() => handleNodeAdd(node.id)}
                      className={cn(
                        'flex items-center justify-center h-8 w-8 rounded-md',
                        'bg-sidebar-accent/50 border border-sidebar-border text-sidebar-foreground/60',
                        'hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all',
                      )}
                    >
                      <Plus size={16} />
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="bg-sidebar border-sidebar-border text-sidebar-foreground shadow-lg"
                >
                  <div className="p-2 max-w-[200px]">
                    <p className="font-medium text-sm">
                      {node.name}
                    </p>
                    <p className="text-xs text-sidebar-foreground/70 mt-1">{node.description}</p>
                    <div className="flex items-center mt-2 pt-2 border-t border-sidebar-border text-xs text-sidebar-foreground/60">
                      <MoveRight className="h-3 w-3 mr-1.5" />
                      <span>{t('base.flow.panel.dragToAdd')}</span>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))
        )}
      </div>
    </div>
  );
}
