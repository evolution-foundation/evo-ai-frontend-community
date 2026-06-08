import { useEffect, useState } from 'react';
import { VolumeX } from 'lucide-react';
import { MuteConversationNodeData } from './MuteConversationNode';
import { automationService } from '@/services/automation/automationService';
import { NodeConfigModal } from '@/components/journey/shared/NodeConfigModal';
import { FlowFeedbackBanner } from '@/components/journey/_ui';
import { useLanguage } from '@/hooks/useLanguage';

interface MuteConversationPanelProps {
  nodeId: string;
  data: MuteConversationNodeData;
  onUpdate: (nodeId: string, newData: MuteConversationNodeData) => void;
  onClose: () => void;
}

export function MuteConversationPanel({
  nodeId,
  data,
  onUpdate,
  onClose,
}: MuteConversationPanelProps) {
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
        console.error(t('panels.muteConversation.loadDataError'), error);
      } finally {
        setLoading(false);
      }
    };

    loadFormData();
  }, []);

  const handleSave = () => {
    const updatedData: MuteConversationNodeData = {
      ...data,
      formDataOptions,
      action_params: [],
    };

    onUpdate(nodeId, updatedData);
    onClose();
  };

  useEffect(() => {
    if (formDataOptions.agents.length > 0 || formDataOptions.teams.length > 0) {
      const updatedData: MuteConversationNodeData = {
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
      title={t('panels.muteConversation.title')}
      icon={<VolumeX className="h-5 w-5 text-flow-node-control-fg" />}
      onCancel={onClose}
      onSave={handleSave}
      dirty={!loading}
      loading={loading}
      saveLabel={t('panels.actions.save')}
      cancelLabel={t('panels.actions.cancel')}
    >
      <div className="space-y-4">
        <FlowFeedbackBanner variant="warn">
          <div className="font-medium mb-2">🔇 {t('panels.muteConversation.whatHappens')}</div>
          <div className="space-y-1 text-xs">
            <div>• {t('panels.muteConversation.noNotifications')}</div>
            <div>• {t('panels.muteConversation.messagesKeepComing')}</div>
            <div>• {t('panels.muteConversation.mutedStatus')}</div>
            <div>• {t('panels.muteConversation.agentsCanUnmute')}</div>
          </div>
        </FlowFeedbackBanner>

        <FlowFeedbackBanner variant="info">
          <div className="font-medium mb-1">💡 {t('panels.muteConversation.whenToUse')}</div>
          <div className="space-y-1 text-xs">
            <div>• {t('panels.muteConversation.automatedConversations')}</div>
            <div>• {t('panels.muteConversation.reduceNoise')}</div>
            <div>• {t('panels.muteConversation.fullAutomation')}</div>
            <div>• {t('panels.muteConversation.testing')}</div>
          </div>
        </FlowFeedbackBanner>

        <FlowFeedbackBanner variant="warn">
          <div className="font-medium mb-1">⚠️ {t('panels.muteConversation.important')}</div>
          <div className="space-y-1 text-xs">
            <div>• {t('panels.muteConversation.cannotUndo')}</div>
            <div>• {t('panels.muteConversation.agentsNeedManualUnmute')}</div>
            <div>• {t('panels.muteConversation.useWithCare')}</div>
          </div>
        </FlowFeedbackBanner>
      </div>
    </NodeConfigModal>
  );
}
