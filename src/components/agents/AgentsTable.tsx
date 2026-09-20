import { Badge, Button, Checkbox } from '@evoapi/design-system';
import {
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  Bot,
  ExternalLink,
  GitBranch,
  MoreHorizontal,
  RefreshCw,
} from 'lucide-react';
import { Agent } from '@/types/agents';
import { cn } from '@/utils/cn';
import AgentActionsDropdown from './AgentActionsDropdown';
import { useLanguage } from '@/hooks/useLanguage';

interface AgentsTableProps {
  agents: Agent[];
  selectedAgents: Agent[];
  loading?: boolean;
  onSelectionChange: (agents: Agent[]) => void;
  onEditAgent: (agent: Agent) => void;
  onDeleteAgent: (agent: Agent) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: string) => void;
  /** Shown in place of the rows when the list is empty. Defaults to "no agent yet". */
  emptyMessage?: string;
}

/**
 * Not `BaseTable`: that one is a generic `<table>` shared by ~30 screens and hides itself
 * on an empty list, while this header must stay visible with zero agents.
 */
const COL = {
  checkbox: 'flex-[0_0_18px]',
  name: 'flex-1 min-w-0',
  description: 'flex-[1.6] min-w-0',
  type: 'flex-[0_0_110px]',
  model: 'flex-[0_0_170px]',
  createdAt: 'flex-[0_0_140px]',
  actions: 'flex-[0_0_70px]',
};

const HEAD_ROW_CLASS =
  'flex items-center gap-4 border-b border-border bg-muted-foreground/[0.06] px-5 py-[14px] text-[12.5px] font-bold text-muted-foreground';

const ROW_CLASS =
  'flex items-center gap-4 border-b border-border/70 px-5 py-4 transition-colors duration-150 last:border-b-0 hover:bg-accent/40';

export default function AgentsTable({
  agents,
  selectedAgents,
  loading,
  onSelectionChange,
  onEditAgent,
  onDeleteAgent,
  sortBy,
  sortOrder,
  onSort,
  emptyMessage,
}: AgentsTableProps) {
  const { t } = useLanguage('agents');

  const selectedIds = new Set(selectedAgents.map(agent => agent.id));
  const allSelected = agents.length > 0 && selectedIds.size === agents.length;

  const toggleAll = () => onSelectionChange(allSelected ? [] : agents);

  const toggleOne = (agent: Agent) =>
    onSelectionChange(
      selectedIds.has(agent.id)
        ? selectedAgents.filter(selected => selected.id !== agent.id)
        : [...selectedAgents, agent],
    );

  const CHIP_CLASS =
    'rounded-[7px] border-transparent px-2 py-0.5 text-[11.5px] font-bold leading-4';

  // Colours only: the label comes from `table.types.*`, so the chip follows the UI language
  // instead of staying in pt-BR next to a translated filter (EVO-2231 review).
  const TYPE_COLORS: Record<string, string> = {
    llm: 'bg-primary/10 text-primary',
    external: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
    a2a: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
    sequential: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    parallel: 'bg-violet-500/10 text-violet-700 dark:text-violet-400',
    loop: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
  };

  const getAgentTypeInfo = (type: string) => {
    const color = TYPE_COLORS[type];
    if (!color) {
      // Unknown type: show the raw value rather than a missing-key string.
      return { label: type, color: 'bg-muted-foreground/10 text-muted-foreground' };
    }
    return { label: t(`table.types.${type}`), color };
  };

  const getAgentTypeIcon = (type: string) => {
    switch (type) {
      case 'a2a':
        return <ExternalLink className="size-[18px]" />;
      case 'sequential':
        return <ArrowRight className="size-[18px]" />;
      case 'parallel':
        return <GitBranch className="size-[18px]" />;
      case 'loop':
        return <RefreshCw className="size-[18px]" />;
      default:
        return <Bot className="size-[18px]" />;
    }
  };

  const ariaSort = (column: string): 'ascending' | 'descending' | 'none' =>
    sortBy !== column ? 'none' : sortOrder === 'desc' ? 'descending' : 'ascending';

  const SortHeader = ({ column, label }: { column: string; label: string }) => {
    const active = sortBy === column;
    return (
      <button
        type="button"
        onClick={() => onSort?.(column)}
        className="flex items-center gap-1.5 font-bold hover:text-foreground"
      >
        {label}
        {active ? (
          <ArrowUp
            className={cn(
              'size-[13px] text-primary transition-transform',
              sortOrder === 'desc' && 'rotate-180',
            )}
          />
        ) : (
          <ArrowUpDown className="size-[13px] text-muted-foreground/60" />
        )}
      </button>
    );
  };

  return (
    <div
      role="table"
      className="overflow-visible rounded-[14px] border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,.04)]"
    >
      <div role="row" className={HEAD_ROW_CLASS}>
        <div role="columnheader" className={COL.checkbox}>
          <Checkbox
            checked={allSelected}
            onCheckedChange={toggleAll}
            aria-label={t('table.selectAll')}
            className="data-[state=checked]:border-primary data-[state=checked]:bg-primary"
          />
        </div>
        <div role="columnheader" aria-sort={ariaSort('name')} className={COL.name}>
          <SortHeader column="name" label={t('fields.name')} />
        </div>
        <div role="columnheader" className={COL.description}>
          {t('fields.description')}
        </div>
        <div role="columnheader" aria-sort={ariaSort('type')} className={COL.type}>
          <SortHeader column="type" label={t('fields.type')} />
        </div>
        <div role="columnheader" className={COL.model}>
          {t('fields.model')}
        </div>
        <div role="columnheader" aria-sort={ariaSort('created_at')} className={COL.createdAt}>
          <SortHeader column="created_at" label={t('fields.createdAt')} />
        </div>
        <div role="columnheader" className={cn(COL.actions, 'text-right')}>
          {t('table.actions')}
        </div>
      </div>

      {loading ? (
        <div role="row">
          <div
            role="cell"
            className="flex items-center justify-center py-12 text-sm text-muted-foreground"
          >
            {t('loading.agent')}
          </div>
        </div>
      ) : agents.length === 0 ? (
        // Header-only was the outcome before: an empty bordered box with no explanation,
        // which reads as "loaded and broken" rather than "nothing here" (EVO-2231 review).
        <div role="row">
          <div
            role="cell"
            className="flex items-center justify-center py-12 text-sm text-muted-foreground"
          >
            {emptyMessage ?? t('table.emptyMessage')}
          </div>
        </div>
      ) : (
        agents.map(agent => {
          const typeInfo = getAgentTypeInfo(agent.type);
          return (
            <div role="row" key={agent.id} className={ROW_CLASS}>
              <div role="cell" className={COL.checkbox}>
                <Checkbox
                  checked={selectedIds.has(agent.id)}
                  onCheckedChange={() => toggleOne(agent)}
                  aria-label={agent.name}
                  className="data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                />
              </div>

              <div role="cell" className={cn(COL.name, 'min-w-0')}>
              <button
                type="button"
                onClick={() => onEditAgent(agent)}
                className="flex w-full items-center gap-[11px] text-left"
              >
                <span className="flex size-[34px] flex-none items-center justify-center rounded-[9px] border border-primary/30 bg-primary/10 text-primary">
                  {getAgentTypeIcon(agent.type)}
                </span>
                <span className="truncate text-sm font-semibold text-foreground">
                  {agent.name}
                </span>
              </button>
              </div>

              <div role="cell" className={cn(COL.description, 'truncate text-[13.5px] text-muted-foreground')}>
                {agent.description || t('fields.noDescription')}
              </div>

              <div role="cell" className={COL.type}>
                <Badge className={cn(CHIP_CLASS, typeInfo.color)}>{typeInfo.label}</Badge>
              </div>

              <div role="cell" className={cn(COL.model, 'truncate font-mono text-[13px] text-muted-foreground')}>
                {agent.model || t('fields.notAvailable')}
              </div>

              <div role="cell" className={cn(COL.createdAt, 'text-[13px] text-muted-foreground')}>
                {agent.created_at && new Date(agent.created_at).toLocaleDateString('pt-BR')}
              </div>

              <div role="cell" className={cn(COL.actions, 'flex justify-end')}>
                <AgentActionsDropdown
                  agent={agent}
                  trigger={
                    <Button variant="ghost" size="sm" className="size-8 p-0">
                      <MoreHorizontal className="size-[18px]" />
                    </Button>
                  }
                  onEdit={onEditAgent}
                  onDelete={onDeleteAgent}
                />
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
