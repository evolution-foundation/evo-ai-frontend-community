import { useState, useCallback } from 'react';
import { Button, Badge } from '@evoapi/design-system';
import { Users, Plus, X } from 'lucide-react';
import AgentToolsDialog from './Dialogs/AgentToolsDialog';
import { useLanguage } from '@/hooks/useLanguage';
import { Agent } from '@/types';

interface AgentToolsSectionProps {
  agentTools: string[];
  agentToolsData?: Agent[];
  onAgentToolsChange: (agentTools: string[], agentToolsData?: Agent[]) => void;
  clientId: string;
  folderId?: string;
  editingAgentId?: string;
  isReadOnly?: boolean;
}

const AgentToolsSection = ({
  agentTools,
  agentToolsData,
  onAgentToolsChange,
  folderId,
  editingAgentId,
  isReadOnly = false,
}: AgentToolsSectionProps) => {
  const { t } = useLanguage('aiAgents');
  const [showAgentToolsDialog, setShowAgentToolsDialog] = useState(false);

  const handleAddAgentTools = useCallback(
    (selectedAgents: Agent[]) => {
      const existingIds = agentTools;
      const newAgentIds = selectedAgents
        .map(agent => agent.id)
        .filter(id => !existingIds.includes(id));

      const updatedAgentTools = [...agentTools, ...newAgentIds];
      const updatedAgentToolsData = [
        ...(agentToolsData || []),
        ...selectedAgents.filter(agent => !existingIds.includes(agent.id)),
      ];

      onAgentToolsChange(updatedAgentTools, updatedAgentToolsData);
      setShowAgentToolsDialog(false);
    },
    [agentTools, agentToolsData, onAgentToolsChange],
  );

  const handleRemoveAgentTool = useCallback(
    (agentId: string) => {
      const updatedAgentTools = agentTools.filter(id => id !== agentId);
      const updatedAgentToolsData = agentToolsData?.filter(agent => agent.id !== agentId);

      onAgentToolsChange(updatedAgentTools, updatedAgentToolsData);
    },
    [agentTools, agentToolsData, onAgentToolsChange],
  );

  return (
    <div className="space-y-4">
      {agentTools.length > 0 ? (
        <div className="space-y-3">
          {agentToolsData?.map(agent => (
            <div
              key={agent.id}
              className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border"
            >
              <div className="flex items-center gap-3 flex-1">
                <Users className="h-4 w-4 text-blue-500" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium truncate">{agent.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {agent.type.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {agent.description || t('tools.agentTools.noAgents')}
                  </p>
                  {agent.model && (
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs text-muted-foreground">{t('llmConfig.model')}:</span>
                      <Badge variant="outline" className="text-xs">
                        {agent.model}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
              {!isReadOnly && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveAgentTool(agent.id)}
                  className="text-destructive hover:text-destructive/80"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          )) ||
            // Fallback para quando não há agent_tools_data (compatibilidade)
            agentTools.map(agentId => (
              <div
                key={agentId}
                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-blue-500" />
                  <div>
                    <span className="font-medium">{agentId}</span>
                    <p className="text-sm text-muted-foreground">
                      {t('tools.agentTools.noAgents')}
                    </p>
                  </div>
                </div>
                {!isReadOnly && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveAgentTool(agentId)}
                    className="text-destructive hover:text-destructive/80"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          {!isReadOnly && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowAgentToolsDialog(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('tools.agentTools.addAgent')}
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-start justify-between gap-3 rounded-[10px] border border-border bg-card p-4 sm:flex-row sm:items-center sm:gap-4">
          {/* Stacks below `sm`: side by side the button does not shrink and squeezes
              the text to one word per line. */}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{t('tools.agentTools.noAgents')}</p>
            <p className="mt-[3px] text-[13px] text-muted-foreground">
              {t('tools.agentTools.subtitle')}
            </p>
          </div>
          {!isReadOnly && (
            <Button
              variant="outline"
              size="sm"
              className="flex-shrink-0"
              onClick={() => setShowAgentToolsDialog(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('actions.add')}
            </Button>
          )}
        </div>
      )}

      <AgentToolsDialog
        open={showAgentToolsDialog}
        onOpenChange={setShowAgentToolsDialog}
        onAgentsSelect={handleAddAgentTools}
        selectedAgentIds={agentTools}
        folderId={folderId}
        editingAgentId={editingAgentId}
      />
    </div>
  );
};

export default AgentToolsSection;
