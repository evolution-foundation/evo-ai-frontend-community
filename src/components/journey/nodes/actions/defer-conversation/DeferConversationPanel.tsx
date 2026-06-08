import { useEffect, useMemo, useState } from 'react';
import {
  Label,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@evoapi/design-system';
import { Clock } from 'lucide-react';
import { DeferConversationNodeData } from './DeferConversationNode';
import { automationService } from '@/services/automation/automationService';
import { NodeConfigModal } from '@/components/journey/shared/NodeConfigModal';
import { FlowFeedbackBanner } from '@/components/journey/_ui';
import { useLanguage } from '@/hooks/useLanguage';

interface DeferConversationPanelProps {
  nodeId: string;
  data: DeferConversationNodeData;
  onUpdate: (nodeId: string, newData: DeferConversationNodeData) => void;
  onClose: () => void;
}

export function DeferConversationPanel({
  nodeId,
  data,
  onUpdate,
  onClose,
}: DeferConversationPanelProps) {
  const { t } = useLanguage('journey');
  const [snoozeType, setSnoozeType] = useState<'duration' | 'until_date'>(
    data.snooze_type || 'duration',
  );
  const [snoozeDuration, setSnoozeDuration] = useState<number>(data.snooze_duration || 1);
  const [snoozeUntil, setSnoozeUntil] = useState<string>(() => {
    if (data.snooze_until) {
      return new Date(data.snooze_until).toISOString().slice(0, 16);
    }
    const defaultDate = new Date();
    defaultDate.setHours(defaultDate.getHours() + 1);
    return defaultDate.toISOString().slice(0, 16);
  });
  const [originalSnapshot] = useState(() => ({
    snoozeType: data.snooze_type || 'duration',
    snoozeDuration: data.snooze_duration || 1,
    snoozeUntil: data.snooze_until ? new Date(data.snooze_until).toISOString().slice(0, 16) : '',
  }));
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
        console.error(t('panels.deferConversation.loadDataError'), error);
      } finally {
        setLoading(false);
      }
    };

    loadFormData();
  }, []);

  const handleSave = () => {
    const updatedData: DeferConversationNodeData = {
      ...data,
      snooze_type: snoozeType,
      snooze_duration: snoozeType === 'duration' ? snoozeDuration : undefined,
      snooze_until: snoozeType === 'until_date' ? new Date(snoozeUntil).toISOString() : undefined,
      formDataOptions,
      action_params: [],
    };

    onUpdate(nodeId, updatedData);
    onClose();
  };

  useEffect(() => {
    if (formDataOptions.agents.length > 0 || formDataOptions.teams.length > 0) {
      const updatedData: DeferConversationNodeData = {
        ...data,
        formDataOptions,
      };
      onUpdate(nodeId, updatedData);
    }
  }, [formDataOptions, data, nodeId, onUpdate]);

  const isValidDateTime = (dateTimeStr: string) => {
    const date = new Date(dateTimeStr);
    return date > new Date();
  };

  const isValid =
    !(snoozeType === 'duration' && snoozeDuration < 1) &&
    !(snoozeType === 'until_date' && (!snoozeUntil || !isValidDateTime(snoozeUntil)));

  const dirty = useMemo(
    () =>
      snoozeType !== originalSnapshot.snoozeType ||
      snoozeDuration !== originalSnapshot.snoozeDuration ||
      snoozeUntil !== originalSnapshot.snoozeUntil,
    [snoozeType, snoozeDuration, snoozeUntil, originalSnapshot],
  );

  return (
    <NodeConfigModal
      open
      variant="simple"
      title={t('panels.deferConversation.title')}
      icon={<Clock className="h-5 w-5 text-flow-node-control-fg" />}
      onCancel={onClose}
      onSave={handleSave}
      dirty={dirty && isValid}
      loading={loading}
      saveLabel={t('actions.save')}
      cancelLabel={t('actions.cancel')}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sidebar-foreground font-medium">
            {t('panels.deferConversation.defermentType')}
          </Label>
          <Select
            value={snoozeType}
            onValueChange={(value: 'duration' | 'until_date') => setSnoozeType(value)}
            disabled={loading}
          >
            <SelectTrigger className="w-full bg-sidebar border-sidebar-border text-sidebar-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-sidebar border-sidebar-border">
              <SelectItem value="duration" className="text-sidebar-foreground">
                {t('panels.deferConversation.types.duration')}
              </SelectItem>
              <SelectItem value="until_date" className="text-sidebar-foreground">
                {t('panels.deferConversation.types.until_date')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {snoozeType === 'duration' && (
          <div className="space-y-2">
            <Label className="text-sidebar-foreground font-medium">
              {t('panels.deferConversation.duration.label')}
            </Label>
            <Input
              type="number"
              value={snoozeDuration}
              onChange={e => setSnoozeDuration(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
              max="8760"
              className="bg-sidebar border-sidebar-border text-sidebar-foreground"
              disabled={loading}
            />
            <p className="text-xs text-sidebar-foreground/60">
              {t('panels.deferConversation.duration.min')}
            </p>
          </div>
        )}

        {snoozeType === 'until_date' && (
          <div className="space-y-2">
            <Label className="text-sidebar-foreground font-medium">
              {t('panels.deferConversation.dateTime.label')}
            </Label>
            <Input
              type="datetime-local"
              value={snoozeUntil}
              onChange={e => setSnoozeUntil(e.target.value)}
              className="bg-sidebar border-sidebar-border text-sidebar-foreground"
              disabled={loading}
            />
            {snoozeUntil && !isValidDateTime(snoozeUntil) && (
              <FlowFeedbackBanner variant="error">
                <p className="text-xs">{t('panels.deferConversation.dateTime.futureError')}</p>
              </FlowFeedbackBanner>
            )}
            <p className="text-xs text-sidebar-foreground/60">
              {t('panels.deferConversation.dateTime.description')}
            </p>
          </div>
        )}

        {((snoozeType === 'duration' && snoozeDuration > 0) ||
          (snoozeType === 'until_date' && snoozeUntil && isValidDateTime(snoozeUntil))) && (
          <FlowFeedbackBanner variant="warn">
            <div className="font-medium mb-1">{t('panels.deferConversation.preview.title')}</div>
            <div className="text-xs">
              {snoozeType === 'duration' ? (
                <span
                  dangerouslySetInnerHTML={{
                    __html: t('panels.deferConversation.preview.durationText', {
                      duration: snoozeDuration,
                      durationPlural: snoozeDuration === 1 ? '' : 's',
                    }),
                  }}
                />
              ) : (
                <span
                  dangerouslySetInnerHTML={{
                    __html: t('panels.deferConversation.preview.dateText', {
                      date: new Date(snoozeUntil).toLocaleDateString('pt-BR'),
                      time: new Date(snoozeUntil).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      }),
                    }),
                  }}
                />
              )}
            </div>
          </FlowFeedbackBanner>
        )}

        <FlowFeedbackBanner variant="info">
          <div className="font-medium mb-1">{t('panels.deferConversation.info.title')}</div>
          <div className="space-y-1 text-xs">
            <div>{t('panels.deferConversation.info.point1')}</div>
            <div>{t('panels.deferConversation.info.point2')}</div>
            <div>{t('panels.deferConversation.info.point3')}</div>
            <div>{t('panels.deferConversation.info.point4')}</div>
          </div>
        </FlowFeedbackBanner>
      </div>
    </NodeConfigModal>
  );
}
