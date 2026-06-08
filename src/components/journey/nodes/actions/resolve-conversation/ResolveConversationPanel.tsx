import { useEffect, useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { ResolveConversationNodeData } from './ResolveConversationNode';
import { automationService } from '@/services/automation/automationService';
import { NodeConfigModal } from '@/components/journey/shared/NodeConfigModal';
import { FlowFeedbackBanner } from '@/components/journey/_ui';
import { useLanguage } from '@/hooks/useLanguage';

interface ResolveConversationPanelProps {
  nodeId: string;
  data: ResolveConversationNodeData;
  onUpdate: (nodeId: string, newData: ResolveConversationNodeData) => void;
  onClose: () => void;
}

export function ResolveConversationPanel({
  nodeId,
  data,
  onUpdate,
  onClose,
}: ResolveConversationPanelProps) {
  const { t } = useLanguage('journey');
  const [formDataOptions, setFormDataOptions] = useState<{
    agents: any[];
    teams: any[];
  }>({
    agents: [],
    teams: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFormData = async () => {
      try {
        setLoading(true);
        const formData = await automationService.getFormData();
        setFormDataOptions({
          agents: formData.agents || [],
          teams: formData.teams || [],
        });
      } catch (error) {
        console.error(t('panels.resolveConversation.loadDataError'), error);
      } finally {
        setLoading(false);
      }
    };

    loadFormData();
  }, []);

  const handleSave = () => {
    const updatedData: ResolveConversationNodeData = {
      ...data,
      formDataOptions,
      action_params: [],
    };

    onUpdate(nodeId, updatedData);
    onClose();
  };

  useEffect(() => {
    if (formDataOptions.agents.length > 0 || formDataOptions.teams.length > 0) {
      const updatedData: ResolveConversationNodeData = {
        ...data,
        formDataOptions,
      };
      onUpdate(nodeId, updatedData);
    }
  }, [formDataOptions, data, nodeId, onUpdate]);

  return (
    <NodeConfigModal
      open
      variant="simple"
      title={t('panels.resolveConversation.title')}
      icon={<CheckCircle className="h-5 w-5 text-flow-node-control-fg" />}
      onCancel={onClose}
      onSave={handleSave}
      dirty={!loading}
      loading={loading}
      saveLabel={t('actions.save')}
      cancelLabel={t('actions.cancel')}
    >
      <div className="space-y-4">
        <FlowFeedbackBanner variant="success">
          <div className="font-medium mb-2">✅ {t('panels.resolveConversation.whatHappens')}</div>
          <div className="space-y-1 text-xs">
            <div>• {t('panels.resolveConversation.conversationMarked')}</div>
            <div>• {t('panels.resolveConversation.automaticallyArchived')}</div>
            <div>• {t('panels.resolveConversation.stopsNotifications')}</div>
            <div>• {t('panels.resolveConversation.availableInHistory')}</div>
            <div>• {t('panels.resolveConversation.newMessagesReopen')}</div>
          </div>
        </FlowFeedbackBanner>

        <FlowFeedbackBanner variant="info">
          <div className="font-medium mb-1">💡 {t('panels.resolveConversation.whenToUse')}</div>
          <div className="space-y-1 text-xs">
            <div>• {t('panels.resolveConversation.endOfSuccessfulFlows')}</div>
            <div>• {t('panels.resolveConversation.problemSolved')}</div>
            <div>• {t('panels.resolveConversation.noFollowUpNeeded')}</div>
            <div>• {t('panels.resolveConversation.organizationProcesses')}</div>
          </div>
        </FlowFeedbackBanner>

        <FlowFeedbackBanner variant="warn">
          <div className="font-medium mb-1">⚠️ {t('panels.resolveConversation.important')}</div>
          <div className="space-y-1 text-xs">
            <div>• {t('panels.resolveConversation.actionPermanent')}</div>
            <div>• {t('panels.resolveConversation.useWhenSure')}</div>
            <div>• {t('panels.resolveConversation.clientCanMessage')}</div>
          </div>
        </FlowFeedbackBanner>
      </div>
    </NodeConfigModal>
  );
}
