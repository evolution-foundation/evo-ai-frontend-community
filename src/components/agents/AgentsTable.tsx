import { Badge, Button } from '@evoapi/design-system';
import { Bot, ExternalLink, ArrowRight, GitBranch, RefreshCw, MoreHorizontal } from 'lucide-react';
import { Agent } from '@/types/agents';
import { BaseTable, TableColumn } from '@/components/base';
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
}

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
}: AgentsTableProps) {
  const { t } = useLanguage('agents');

  const getAgentTypeInfo = (type: string) => {
    const types: Record<string, { label: string; color: string }> = {
      llm: {
        label: 'Nativo',
        color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-500 dark:border-green-900',
      },
      external: {
        label: 'Externo',
        color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700',
      },
      a2a: {
        label: 'A2A',
        color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700',
      },
      sequential: {
        label: 'Agente Sequencial',
        color: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900 dark:text-amber-200 dark:border-amber-700',
      },
      parallel: {
        label: 'Agente Paralelo',
        color: 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900 dark:text-violet-200 dark:border-violet-700',
      },
      loop: {
        label: 'Agente Loop',
        color: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900 dark:text-indigo-200 dark:border-indigo-700',
      },
    };

    const typeInfo = types[type] || {
      label: type,
      color: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600',
    };

    return {
      label: typeInfo.label,
      color: typeInfo.color,
    };
  };

  const getAgentTypeIcon = (type: string) => {
    switch (type) {
      case 'llm':
        return <Bot className="h-4 w-4" />;
      case 'a2a':
        return <ExternalLink className="h-4 w-4" />;
      case 'sequential':
        return <ArrowRight className="h-4 w-4" />;
      case 'parallel':
        return <GitBranch className="h-4 w-4" />;
      case 'loop':
        return <RefreshCw className="h-4 w-4" />;
      default:
        return <Bot className="h-4 w-4" />;
    }
  };

  const columns: TableColumn<Agent>[] = [
    {
      key: 'name',
      label: t('fields.name'),
      sortable: true,
      render: agent => (
        <div
          className="flex items-center gap-3 cursor-pointer hover:opacity-80 py-2"
          onClick={() => onEditAgent(agent)}
        >
          <div className="flex-shrink-0">{getAgentTypeIcon(agent.type)}</div>
          <span className="font-medium">{agent.name}</span>
        </div>
      ),
    },
    {
      key: 'description',
      label: t('fields.description'),
      render: agent => (
        <div className="max-w-[200px] truncate">
          {agent.description || t('fields.noDescription')}
        </div>
      ),
    },
    {
      key: 'type',
      label: t('fields.type'),
      sortable: true,
      render: agent => {
        const typeInfo = getAgentTypeInfo(agent.type);
        return <Badge className={cn(typeInfo.color, 'border')}>{typeInfo.label}</Badge>;
      },
    },
    {
      key: 'model',
      label: t('fields.model'),
      render: agent =>
        agent.model ? (
          <Badge variant="outline" className="text-xs">
            {agent.model}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">{t('fields.notAvailable')}</span>
        ),
    },
    {
      key: 'created_at',
      label: t('fields.createdAt'),
      sortable: true,
      render: agent => (
        <span className="text-muted-foreground">
          {agent.created_at && new Date(agent.created_at).toLocaleDateString('pt-BR')}
        </span>
      ),
    },
    {
      key: 'actions',
      label: t('table.actions'),
      render: agent => (
        <AgentActionsDropdown
          agent={agent}
          trigger={
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          }
          onEdit={onEditAgent}
          onExportAsJSON={() => {
            // TODO: Implement export as JSON functionality
          }}
          onShare={() => {
            // TODO: Implement share agent functionality
          }}
          onDelete={onDeleteAgent}
        />
      ),
    },
  ];

  return (
    <BaseTable<Agent>
      data={agents}
      columns={columns}
      selectable={true}
      selectedItems={selectedAgents}
      onSelectionChange={onSelectionChange}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={onSort}
      loading={loading}
      emptyMessage={t('table.emptyMessage')}
      getRowKey={agent => agent.id}
      className="border rounded-lg"
    />
  );
}
