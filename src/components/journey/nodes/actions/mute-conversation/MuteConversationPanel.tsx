import { useState, useEffect } from 'react';
import { Button } from '@evoapi/design-system';
import { VolumeX } from 'lucide-react';
import { MuteConversationNodeData } from './MuteConversationNode';
import { automationService } from '@/services/automation/automationService';
import { BaseFlowPanel } from '@/components/base';
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
      // Backend compatibility - mute needs no parameters
      action_params: [],
    };

    onUpdate(nodeId, updatedData);
    onClose();
  };

  // Update node with form data when available
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
    <BaseFlowPanel
      title={t('panels.muteConversation.title')}
      icon={<VolumeX className="w-5 h-5 text-orange-500" />}
      onClose={onClose}
      width="w-[400px]"
    >
      {/* Explicação da ação */}
      <div className="space-y-4">
        <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/30">
          <div className="text-sm text-orange-800 dark:text-orange-200">
            <div className="font-medium mb-2">🔇 {t('panels.muteConversation.whatHappens')}</div>
            <div className="space-y-2 text-xs">
              <div>• {t('panels.muteConversation.noNotifications')}</div>
              <div>• {t('panels.muteConversation.messagesKeepComing')}</div>
              <div>• {t('panels.muteConversation.mutedStatus')}</div>
              <div>• {t('panels.muteConversation.agentsCanUnmute')}</div>
            </div>
          </div>
        </div>

        {/* Informações técnicas */}
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30">
          <div className="text-xs text-blue-800 dark:text-blue-200">
            <div className="font-medium mb-1">💡 {t('panels.muteConversation.whenToUse')}</div>
            <div className="space-y-1">
              <div>• {t('panels.muteConversation.automatedConversations')}</div>
              <div>• {t('panels.muteConversation.reduceNoise')}</div>
              <div>• {t('panels.muteConversation.fullAutomation')}</div>
              <div>• {t('panels.muteConversation.testing')}</div>
            </div>
          </div>
        </div>

        {/* Aviso importante */}
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30">
          <div className="text-xs text-amber-800 dark:text-amber-200">
            <div className="font-medium mb-1">⚠️ {t('panels.muteConversation.important')}</div>
            <div className="space-y-1">
              <div>• {t('panels.muteConversation.cannotUndo')}</div>
              <div>• {t('panels.muteConversation.agentsNeedManualUnmute')}</div>
              <div>• {t('panels.muteConversation.useWithCare')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={onClose} className="flex-1 h-10">
          {t('panels.actions.cancel')}
        </Button>
        <Button onClick={handleSave} className="flex-1 h-10" disabled={loading}>
          {t('panels.actions.save')}
        </Button>
      </div>
    </BaseFlowPanel>
  );
}
