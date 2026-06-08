import { useEffect, useMemo, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
} from '@evoapi/design-system';
import { User } from 'lucide-react';
import { AssignAgentNodeData } from './AssignAgentNode';
import { automationService } from '@/services/automation/automationService';
import { NodeConfigModal } from '@/components/journey/shared/NodeConfigModal';
import { FlowFeedbackBanner } from '@/components/journey/_ui';
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
  const [originalAgentId] = useState<string>(() => data.agent_id?.toString() || '');
  const [formDataOptions, setFormDataOptions] = useState<{
    agents: any[];
  }>({
    agents: [],
  });
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    if (formDataOptions.agents.length > 0) {
      const updatedData: AssignAgentNodeData = {
        ...data,
        formDataOptions,
      };
      onUpdate(nodeId, updatedData);
    }
  }, [formDataOptions, data, nodeId, onUpdate]);

  const dirty = useMemo(() => agentId !== originalAgentId, [agentId, originalAgentId]);
  const isValid = Boolean(agentId);

  return (
    <NodeConfigModal
      open
      variant="simple"
      title={t('panels.assignAgent.title')}
      icon={<User className="h-5 w-5 text-flow-node-action-pipeline-fg" />}
      onCancel={onClose}
      onSave={handleSave}
      dirty={dirty && isValid}
      loading={loading}
      saveLabel={t('panels.actions.save')}
      cancelLabel={t('panels.actions.cancel')}
    >
      <div className="space-y-4">
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
                    <div className="w-8 h-8 rounded-full bg-flow-node-action-pipeline-bg text-flow-node-action-pipeline-fg flex items-center justify-center text-xs font-medium">
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

        {agentId && (
          <FlowFeedbackBanner variant="info">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>
                {t('panels.assignAgent.conversationWillBeAssigned')}{' '}
                <strong>
                  {formDataOptions.agents.find(a => a.id.toString() === agentId)?.name ||
                    `${t('panels.assignAgent.agent')} #${agentId}`}
                </strong>
              </span>
            </div>
          </FlowFeedbackBanner>
        )}
      </div>
    </NodeConfigModal>
  );
}
