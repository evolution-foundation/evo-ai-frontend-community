import { useEffect, useMemo, useState } from 'react';
import { Clock } from 'lucide-react';
import {
  Label,
  Separator,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@evoapi/design-system';
import { NodeConfigModal } from '@/components/journey/shared/NodeConfigModal';
import { FlowFeedbackBanner } from '@/components/journey/_ui';
import { useLanguage } from '@/hooks/useLanguage';
import { journeyService } from '@/services/journeys';
import InboxesService from '@/services/channels/inboxesService';
import type { Journey } from '@/types/automation';
import type { Inbox } from '@/types/channels/inbox';
import { ScheduledActionNodeData } from './ScheduledActionNode';

interface ScheduledActionPanelProps {
  nodeId: string;
  data: ScheduledActionNodeData;
  onUpdate: (nodeId: string, newData: ScheduledActionNodeData) => void;
  onClose: () => void;
}

const CHANNEL_TYPE_MAP: Record<string, string> = {
  'Channel::WhatsappCloud': 'whatsapp',
  'Channel::Sms': 'sms',
  'Channel::Email': 'email',
  'Channel::Telegram': 'telegram',
};

const getChannelDisplayName = (channelType: string): string => {
  const simpleType = CHANNEL_TYPE_MAP[channelType];
  switch (simpleType) {
    case 'whatsapp':
      return 'WhatsApp';
    case 'sms':
      return 'SMS';
    case 'email':
      return 'Email';
    case 'telegram':
      return 'Telegram';
    default:
      return channelType;
  }
};

export function ScheduledActionPanel({
  nodeId,
  data,
  onUpdate,
  onClose,
}: ScheduledActionPanelProps) {
  const { t } = useLanguage('journey');
  const initialFormData: ScheduledActionNodeData = {
    label: data.label || 'Schedule Action',
    delayDuration: data.delayDuration || 1,
    delayUnit: data.delayUnit || 'hours',
    actionType: data.actionType || '',
    actionConfig: data.actionConfig || {},
    retryPolicy: data.retryPolicy || { maxRetries: 0, backoffMultiplier: 1 },
    createScheduledAction: data.createScheduledAction || true,
    notifyUserId: data.notifyUserId,
  };
  const [originalData] = useState<ScheduledActionNodeData>(() => initialFormData);
  const [formData, setFormData] = useState<ScheduledActionNodeData>(initialFormData);
  const [error] = useState<string | null>(null);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loadingJourneys, setLoadingJourneys] = useState(false);
  const [availableInboxes, setAvailableInboxes] = useState<Inbox[]>([]);
  const [loadingInboxes, setLoadingInboxes] = useState(false);

  useEffect(() => {
    setFormData({
      label: data.label || 'Schedule Action',
      delayDuration: data.delayDuration || 1,
      delayUnit: data.delayUnit || 'hours',
      actionType: data.actionType || '',
      actionConfig: data.actionConfig || {},
      retryPolicy: data.retryPolicy || { maxRetries: 0, backoffMultiplier: 1 },
      createScheduledAction: data.createScheduledAction || true,
      notifyUserId: data.notifyUserId,
    });
  }, [data]);

  useEffect(() => {
    const loadJourneys = async () => {
      try {
        setLoadingJourneys(true);
        const response = await journeyService.getJourneys();
        setJourneys(response.data || []);
      } catch (err) {
        console.error('Error loading journeys:', err);
      } finally {
        setLoadingJourneys(false);
      }
    };

    loadJourneys();
  }, []);

  useEffect(() => {
    const fetchInboxes = async () => {
      setLoadingInboxes(true);
      try {
        const response = await InboxesService.list();
        const inboxes = response.data || [];

        const messagingInboxes = inboxes.filter(inbox => {
          const channelType = inbox.channel_type;
          return Object.keys(CHANNEL_TYPE_MAP).includes(channelType);
        });

        setAvailableInboxes(messagingInboxes);
      } catch (error) {
        console.error('Error fetching inboxes:', error);
      } finally {
        setLoadingInboxes(false);
      }
    };

    fetchInboxes();
  }, []);

  const handleSave = () => {
    onUpdate(nodeId, formData);
    onClose();
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      delayDuration: parseInt(e.target.value) || 0,
    });
  };

  const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData({
      ...formData,
      delayUnit: e.target.value as 'minutes' | 'hours' | 'days' | 'weeks',
    });
  };

  const handleActionTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData({
      ...formData,
      actionType: e.target.value,
      actionConfig: {},
    });
  };

  const handleSendMessageChange = (channel: string, message: string) => {
    setFormData({
      ...formData,
      actionConfig: {
        ...formData.actionConfig,
        channel,
        message,
      },
    });
  };

  const handleWebhookChange = (webhook_url: string, method?: string, data?: object) => {
    setFormData({
      ...formData,
      actionConfig: {
        ...formData.actionConfig,
        webhook_url,
        method: method || 'POST',
        data: data || {},
      },
    });
  };

  const handleTriggerJourneyChange = (journey_id: string) => {
    setFormData({
      ...formData,
      actionConfig: {
        ...formData.actionConfig,
        journey_id,
      },
    });
  };

  const handleCreateTaskChange = (task_title: string, task_description?: string) => {
    setFormData({
      ...formData,
      actionConfig: {
        ...formData.actionConfig,
        task_title,
        task_description: task_description || undefined,
      },
    });
  };

  const isDelayConfigured = formData.delayDuration && formData.delayUnit;
  const isActionConfigured = () => {
    if (!formData.actionType) return false;

    switch (formData.actionType) {
      case 'send_message':
        return (
          formData.actionConfig?.channel &&
          formData.actionConfig?.message &&
          formData.actionConfig.message.trim().length > 0
        );
      case 'execute_webhook':
        return (
          formData.actionConfig?.webhook_url && formData.actionConfig?.webhook_url.trim().length > 0
        );
      case 'trigger_journey':
        return (
          formData.actionConfig?.journey_id && formData.actionConfig.journey_id.trim().length > 0
        );
      case 'create_task':
        return (
          formData.actionConfig?.task_title && formData.actionConfig.task_title.trim().length > 0
        );
      default:
        return false;
    }
  };

  const isConfigured = Boolean(isDelayConfigured && isActionConfigured());
  const dirty = useMemo(
    () => JSON.stringify(formData) !== JSON.stringify(originalData),
    [formData, originalData],
  );

  return (
    <NodeConfigModal
      open
      variant="simple"
      title={t('panels.scheduledAction.title')}
      icon={<Clock className="h-5 w-5 text-flow-node-action-webhook-fg" />}
      onCancel={onClose}
      onSave={handleSave}
      dirty={dirty && isConfigured}
      saveLabel={t('panels.actions.save')}
      cancelLabel={t('panels.actions.cancel')}
      savingAriaLabel={t('modal.actions.saving')}
    >
      <div className="space-y-4">
        {error && (
          <FlowFeedbackBanner variant="error">
            <p>{error}</p>
          </FlowFeedbackBanner>
        )}

        <div className="space-y-2">
          <Label>{t('panels.scheduledAction.delayDuration')}</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              min="1"
              max="999"
              value={formData.delayDuration || ''}
              onChange={handleDurationChange}
              placeholder="1"
              className="flex-1"
            />
            <select
              value={formData.delayUnit || 'hours'}
              onChange={handleUnitChange}
              className="flex-1 px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm"
            >
              <option value="minutes">{t('panels.scheduledAction.units.minutes')}</option>
              <option value="hours">{t('panels.scheduledAction.units.hours')}</option>
              <option value="days">{t('panels.scheduledAction.units.days')}</option>
              <option value="weeks">{t('panels.scheduledAction.units.weeks')}</option>
            </select>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label>{t('panels.scheduledAction.actionType')}</Label>
          <select
            value={formData.actionType || ''}
            onChange={handleActionTypeChange}
            className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm"
          >
            <option value="">{t('panels.scheduledAction.placeholders.selectAction')}</option>
            <option value="send_message">{t('panels.scheduledAction.actions.send_message')}</option>
            <option value="execute_webhook">
              {t('panels.scheduledAction.actions.execute_webhook')}
            </option>
            <option value="trigger_journey">
              {t('panels.scheduledAction.actions.trigger_journey')}
            </option>
            <option value="create_task">{t('panels.scheduledAction.actions.create_task')}</option>
          </select>
        </div>

        {formData.actionType === 'send_message' && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>{t('panels.scheduledAction.labels.channel')}</Label>
                <Select
                  value={formData.actionConfig?.channel || ''}
                  onValueChange={value =>
                    handleSendMessageChange(value, formData.actionConfig?.message || '')
                  }
                  disabled={loadingInboxes || availableInboxes.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        loadingInboxes
                          ? t('panels.scheduledAction.placeholders.loadingChannels')
                          : t('panels.scheduledAction.placeholders.selectChannel')
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {availableInboxes.length === 0 && !loadingInboxes && (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        {t('panels.scheduledAction.messages.noChannelsConfiguredInline')}
                      </div>
                    )}
                    {availableInboxes.map(inbox => {
                      const channelValue = CHANNEL_TYPE_MAP[inbox.channel_type];
                      if (!channelValue) return null;

                      return (
                        <SelectItem key={inbox.id} value={channelValue}>
                          {inbox.name} ({getChannelDisplayName(inbox.channel_type)})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {availableInboxes.length === 0 && !loadingInboxes && (
                  <FlowFeedbackBanner variant="warn">
                    <p className="text-sm">
                      {t('panels.scheduledAction.messages.noChannelsConfigured')}
                    </p>
                  </FlowFeedbackBanner>
                )}
              </div>
              <div className="space-y-2">
                <Label>{t('panels.scheduledAction.labels.message')}</Label>
                <textarea
                  value={formData.actionConfig?.message || ''}
                  onChange={e =>
                    handleSendMessageChange(formData.actionConfig?.channel || '', e.target.value)
                  }
                  placeholder={t('panels.scheduledAction.placeholders.message')}
                  rows={3}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  {t('panels.scheduledAction.hints.characterCount', {
                    count: formData.actionConfig?.message?.length || 0,
                  })}
                </p>
              </div>
            </div>
          </>
        )}

        {formData.actionType === 'execute_webhook' && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>{t('panels.scheduledAction.labels.webhookUrl')}</Label>
                <Input
                  type="url"
                  value={formData.actionConfig?.webhook_url || ''}
                  onChange={e =>
                    handleWebhookChange(
                      e.target.value,
                      formData.actionConfig?.webhook_method || 'POST',
                    )
                  }
                  placeholder={t('panels.scheduledAction.placeholders.webhookUrl')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('panels.scheduledAction.labels.webhookMethod')}</Label>
                <select
                  value={formData.actionConfig?.webhook_method || 'POST'}
                  onChange={e =>
                    handleWebhookChange(formData.actionConfig?.webhook_url || '', e.target.value)
                  }
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>
            </div>
          </>
        )}

        {formData.actionType === 'trigger_journey' && (
          <>
            <Separator />
            <div className="space-y-2">
              <Label>{t('panels.scheduledAction.labels.journeyId')}</Label>
              <select
                value={formData.actionConfig?.journey_id || ''}
                onChange={e => handleTriggerJourneyChange(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm"
                disabled={loadingJourneys}
              >
                <option value="">
                  {loadingJourneys
                    ? t('panels.scheduledAction.placeholders.loadingJourneys')
                    : t('panels.scheduledAction.placeholders.journeyId')}
                </option>
                {journeys.map(journey => (
                  <option key={journey.id} value={journey.id}>
                    {journey.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {t('panels.scheduledAction.hints.journeyId')}
              </p>
            </div>
          </>
        )}

        {formData.actionType === 'create_task' && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>{t('panels.scheduledAction.labels.taskTitle')}</Label>
                <Input
                  type="text"
                  value={formData.actionConfig?.task_title || ''}
                  onChange={e =>
                    handleCreateTaskChange(
                      e.target.value,
                      formData.actionConfig?.task_description || '',
                    )
                  }
                  placeholder={t('panels.scheduledAction.placeholders.taskTitle')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('panels.scheduledAction.labels.taskDescription')}</Label>
                <textarea
                  value={formData.actionConfig?.task_description || ''}
                  onChange={e =>
                    handleCreateTaskChange(formData.actionConfig?.task_title || '', e.target.value)
                  }
                  placeholder={t('panels.scheduledAction.placeholders.taskDescription')}
                  rows={3}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm"
                />
              </div>
            </div>
          </>
        )}

        {!isConfigured && formData.actionType && (
          <FlowFeedbackBanner variant="warn">
            <p className="text-xs">{t('panels.scheduledAction.configure')}</p>
          </FlowFeedbackBanner>
        )}
      </div>
    </NodeConfigModal>
  );
}
