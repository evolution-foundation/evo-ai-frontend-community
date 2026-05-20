import { useState, useEffect } from 'react';
import { Button } from '@evoapi/design-system';
import { CheckCircle } from 'lucide-react';
import { ResolveConversationNodeData } from './ResolveConversationNode';
import { automationService } from '@/services/automation/automationService';
import { BaseFlowPanel } from '@/components/base';
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

  // Load form data options on mount
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
      // Backend compatibility - resolve needs no parameters
      action_params: [],
    };

    onUpdate(nodeId, updatedData);
    onClose();
  };

  // Update node with form data when available
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
    <BaseFlowPanel
      title={t('panels.resolveConversation.title')}
      icon={<CheckCircle className="w-5 h-5 text-green-500" />}
      onClose={onClose}
      width="w-[400px]"
    >
      {/* Explicação da ação */}
      <div className="space-y-4">
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/30">
          <div className="text-sm text-green-800 dark:text-green-200">
            <div className="font-medium mb-2">✅ {t('panels.resolveConversation.whatHappens')}</div>
            <div className="space-y-2 text-xs">
              <div>• {t('panels.resolveConversation.conversationMarked')}</div>
              <div>• {t('panels.resolveConversation.automaticallyArchived')}</div>
              <div>• {t('panels.resolveConversation.stopsNotifications')}</div>
              <div>• {t('panels.resolveConversation.availableInHistory')}</div>
              <div>• {t('panels.resolveConversation.newMessagesReopen')}</div>
            </div>
          </div>
        </div>

        {/* Informações técnicas */}
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30">
          <div className="text-xs text-blue-800 dark:text-blue-200">
            <div className="font-medium mb-1">💡 {t('panels.resolveConversation.whenToUse')}</div>
            <div className="space-y-1">
              <div>• {t('panels.resolveConversation.endOfSuccessfulFlows')}</div>
              <div>• {t('panels.resolveConversation.problemSolved')}</div>
              <div>• {t('panels.resolveConversation.noFollowUpNeeded')}</div>
              <div>• {t('panels.resolveConversation.organizationProcesses')}</div>
            </div>
          </div>
        </div>

        {/* Aviso importante */}
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30">
          <div className="text-xs text-amber-800 dark:text-amber-200">
            <div className="font-medium mb-1">⚠️ {t('panels.resolveConversation.important')}</div>
            <div className="space-y-1">
              <div>• {t('panels.resolveConversation.actionPermanent')}</div>
              <div>• {t('panels.resolveConversation.useWhenSure')}</div>
              <div>• {t('panels.resolveConversation.clientCanMessage')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={onClose} className="flex-1 h-10">
          {t('actions.cancel')}
        </Button>
        <Button onClick={handleSave} className="flex-1 h-10" disabled={loading}>
          {t('actions.save')}
        </Button>
      </div>
    </BaseFlowPanel>
  );
}
