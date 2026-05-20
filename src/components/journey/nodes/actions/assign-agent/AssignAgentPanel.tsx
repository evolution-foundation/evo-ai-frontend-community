import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
  Label,
} from '@evoapi/design-system';
import { User } from 'lucide-react';
import { AssignAgentNodeData } from './AssignAgentNode';
import { automationService } from '@/services/automation/automationService';
import { BaseFlowPanel } from '@/components/base';
import { useLanguage } from '@/hooks/useLanguage';

interface AssignAgentPanelProps {
  nodeId: string;
  data: AssignAgentNodeData;
  onUpdate: (nodeId: string, newData: AssignAgentNodeData) => void;
  onClose: () => void;
}

export function AssignAgentPanel({ nodeId, data, onUpdate, onClose }: AssignAgentPanelProps) {
  const { t } = useLanguage('journey');
  const [agentId, setAgentId] = useState<string>(data.agent_id?.toString() || '');
  const [formDataOptions, setFormDataOptions] = useState<{
    agents: any[];
  }>({
    agents: [],
  });
  const [loading, setLoading] = useState(true);

  // Load form data options on mount
  useEffect(() => {
    const loadFormData = async () => {
      try {
        setLoading(true);
        const formData = await automationService.getFormData();
        setFormDataOptions({
          agents: formData.agents || [],
        });
      } catch (error) {
        console.error(t('panels.assignAgent.loadDataError'), error);
      } finally {
        setLoading(false);
      }
    };

    loadFormData();
  }, []);

  const handleSave = () => {
    const selectedAgent = formDataOptions.agents.find(agent => agent.id.toString() === agentId);

    const updatedData: AssignAgentNodeData = {
      ...data,
      agent_id: agentId || '',
      agent_name: selectedAgent?.name || '',
      formDataOptions,
    };

    onUpdate(nodeId, updatedData);
    onClose();
  };

  // Update node with form data when available
  useEffect(() => {
    if (formDataOptions.agents.length > 0) {
      const updatedData: AssignAgentNodeData = {
        ...data,
        formDataOptions,
      };
      onUpdate(nodeId, updatedData);
    }
  }, [formDataOptions, data, nodeId, onUpdate]);

  return (
    <BaseFlowPanel
      title={t('panels.assignAgent.title')}
      icon={<User className="w-5 h-5 text-blue-500" />}
      onClose={onClose}
      width="w-[420px]"
    >
      {/* Seleção de Agente */}
      <div className="space-y-2">
        <Label className="text-sidebar-foreground font-medium">
          {t('panels.assignAgent.user')}
        </Label>
        <Select value={agentId} onValueChange={setAgentId} disabled={loading}>
          <SelectTrigger className="w-full bg-sidebar border-sidebar-border text-sidebar-foreground">
            <SelectValue
              placeholder={
                loading ? t('panels.assignAgent.loadingUsers') : t('panels.assignAgent.selectUser')
              }
            />
          </SelectTrigger>
          <SelectContent className="bg-sidebar border-sidebar-border">
            {formDataOptions.agents.map(agent => (
              <SelectItem
                key={agent.id}
                value={agent.id.toString()}
                className="text-sidebar-foreground"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium">
                    {agent.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium">{agent.name}</div>
                    <div className="text-xs text-sidebar-foreground/60">{agent.email}</div>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {!loading && formDataOptions.agents.length === 0 && (
          <p className="text-sm text-sidebar-foreground/60">
            {t('panels.assignAgent.noUsersFound')}
          </p>
        )}
      </div>

      {/* Preview da ação */}
      {agentId && (
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30">
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-blue-600" />
            <span className="text-blue-800 dark:text-blue-200">
              {t('panels.assignAgent.conversationWillBeAssigned')}{' '}
              <strong>
                {formDataOptions.agents.find(a => a.id.toString() === agentId)?.name ||
                  `${t('panels.assignAgent.agent')} #${agentId}`}
              </strong>
            </span>
          </div>
        </div>
      )}

      {/* Botões de Ação */}
      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={onClose} className="flex-1 h-10">
          {t('panels.actions.cancel')}
        </Button>
        <Button onClick={handleSave} className="flex-1 h-10" disabled={!agentId || loading}>
          {t('panels.actions.save')}
        </Button>
      </div>
    </BaseFlowPanel>
  );
}
