import i18n from '@/i18n/config';
import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Badge,
  Checkbox,
  ScrollArea,
} from '@evoapi/design-system';
import {
  Search,
  Users,
  Loader2,
  Bot,
  ExternalLink,
  ArrowRight,
  GitBranch,
  RefreshCw,
  Workflow,
  CheckSquare,
} from 'lucide-react';
import { listAgents } from '@/services/agents';
import { cn } from '@/utils/cn';
import { useLanguage } from '@/hooks/useLanguage';
import { Agent } from '@/types';

interface AgentToolsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAgentsSelect: (agents: Agent[]) => void;
  selectedAgentIds: string[];
  folderId?: string;
  editingAgentId?: string; // Para evitar auto-referência
}

const getAgentTypeIcon = (type: string) => {
  switch (type) {
    case 'llm':
      return <Bot className="h-5 w-5" />;
    case 'a2a':
      return <ExternalLink className="h-5 w-5" />;
    case 'sequential':
      return <ArrowRight className="h-5 w-5" />;
    case 'parallel':
      return <GitBranch className="h-5 w-5" />;
    case 'loop':
      return <RefreshCw className="h-5 w-5" />;
    case 'workflow':
      return <Workflow className="h-5 w-5" />;
    case 'task':
      return <CheckSquare className="h-5 w-5" />;
    default:
      return <Bot className="h-5 w-5" />;
  }
};

const getAgentTypeInfo = (type: string, t: (key: string) => string) => {
  const types: Record<string, { label: string; color: string }> = {
    llm: {
      label: t('basicInfo.types.llm'),
      color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-500 dark:border-green-900',
    },
    a2a: {
      label: t('basicInfo.types.a2a'),
      color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700',
    },
    sequential: {
      label: i18n.t("aiAgents:planner.types.sequential"),
      color: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900 dark:text-amber-200 dark:border-amber-700',
    },
    parallel: {
      label: i18n.t("aiAgents:planner.types.parallel"),
      color: 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900 dark:text-violet-200 dark:border-violet-700',
    },
    loop: {
      label: i18n.t("interface:agenttoolsdialog.loop"),
      color: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900 dark:text-indigo-200 dark:border-indigo-700',
    },
    task: {
      label: t('basicInfo.types.task'),
      color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-700',
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

export default function AgentToolsDialog({
  open,
  onOpenChange,
  onAgentsSelect,
  selectedAgentIds,
  folderId,
  editingAgentId,
}: AgentToolsDialogProps) {
  const { t } = useLanguage('aiAgents');
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempSelectedIds, setTempSelectedIds] = useState<string[]>(selectedAgentIds);

  const loadAvailableAgents = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await listAgents(0, 100, folderId);

      // Filtrar para excluir o agente sendo editado (evitar auto-referência)
      const filteredAgents = response.data.filter((agent: Agent) => agent.id !== editingAgentId);

      setAvailableAgents(filteredAgents);
      setFilteredAgents(filteredAgents);
    } catch (err) {
      console.error('Error loading agents:', err);
      setError(t('subAgents.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [folderId, editingAgentId, t]);

  useEffect(() => {
    if (open) {
      loadAvailableAgents();
      setTempSelectedIds(selectedAgentIds);
      setSearchTerm('');
    }
  }, [open, folderId, editingAgentId, selectedAgentIds, loadAvailableAgents]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredAgents(availableAgents);
    } else {
      const filtered = availableAgents.filter(
        agent =>
          agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          agent.description?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
      setFilteredAgents(filtered);
    }
  }, [searchTerm, availableAgents]);

  const handleAgentToggle = (agentId: string) => {
    setTempSelectedIds(prev =>
      prev.includes(agentId) ? prev.filter(id => id !== agentId) : [...prev, agentId],
    );
  };

  const handleConfirm = () => {
    const selectedAgents = availableAgents.filter(agent => tempSelectedIds.includes(agent.id));
    onAgentsSelect(selectedAgents);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setTempSelectedIds(selectedAgentIds);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            {t('dialogs.agentTools.title')}
          </DialogTitle>
          <DialogDescription>{t('tools.agentTools.description')}</DialogDescription>
        </DialogHeader>

        {/* Barra de pesquisa */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('dialogs.agentTools.search')}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Lista de agentes */}
        <div className="flex-1 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">{t('messages.loadingAgents')}</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-40 text-red-500">
              <p>{error}</p>
            </div>
          ) : filteredAgents.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground">
              <p>{searchTerm ? t('messages.noResults') : t('tools.agentTools.noAgents')}</p>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="space-y-2 pr-4">
                {filteredAgents.map(agent => {
                  const typeInfo = getAgentTypeInfo(agent.type, t);
                  const isSelected = tempSelectedIds.includes(agent.id);

                  return (
                    <div
                      key={agent.id}
                      className={cn(
                        'flex items-center space-x-3 p-3 rounded-lg border transition-all duration-200 cursor-pointer',
                        isSelected
                          ? 'ring-2 ring-primary/20 border-primary bg-primary/5 shadow-sm hover:bg-primary/10 hover:shadow-md'
                          : 'bg-background hover:bg-muted/30 hover:shadow-md hover:border-border/60',
                      )}
                      onClick={() => handleAgentToggle(agent.id)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onChange={() => {}} // Controlado pelo onClick do div
                      />

                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0">{getAgentTypeIcon(agent.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium truncate">{agent.name}</span>
                            <Badge className={cn('text-xs border', typeInfo.color)}>
                              {typeInfo.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {agent.description || t('basicInfo.description')}
                          </p>
                          {agent.model && (
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-xs text-muted-foreground">
                                {t('llmConfig.model')}:
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {agent.model}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <div className="flex items-center gap-2 w-full">
            <div className="flex-1 text-sm text-muted-foreground">
              {t('dialogs.agentTools.selected', { count: tempSelectedIds.length })}
            </div>
            <Button variant="outline" onClick={handleCancel}>
              {t('actions.cancel')}
            </Button>
            <Button onClick={handleConfirm} disabled={isLoading}>
              {t('dialogs.agentTools.confirm')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
