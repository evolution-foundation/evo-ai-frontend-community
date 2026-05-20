import { useState, useEffect } from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import {
  Button,
  Label,
  Separator,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@evoapi/design-system';
import { BaseFlowPanel } from '@/components/base';
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

// Map backend channel types to simple identifiers
const CHANNEL_TYPE_MAP: Record<string, string> = {
  'Channel::WhatsappCloud': 'whatsapp',
  'Channel::Sms': 'sms',
  'Channel::Email': 'email',
  'Channel::Telegram': 'telegram',
};

// Helper function to get channel display name
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

/**
 * Configuration panel for Scheduled Action node in journey builder.
 *
 * Action types supported (from EVO-195 - See docs/scheduled-actions-types.md):
 * - send_message: Send a message with channel selector (WhatsApp, SMS, Email)
 * - execute_webhook: Call an external webhook
 * - trigger_journey: Start another journey
 * - create_task: Create a task/reminder
 */
export function ScheduledActionPanel({
  nodeId,
  data,
  onUpdate,
  onClose,
}: ScheduledActionPanelProps) {
  const { t } = useLanguage('journey');
  const [formData, setFormData] = useState<ScheduledActionNodeData>({
    label: data.label || 'Schedule Action',
    delayDuration: data.delayDuration || 1,
    delayUnit: data.delayUnit || 'hours',
    actionType: data.actionType || '',
    actionConfig: data.actionConfig || {},
    retryPolicy: data.retryPolicy || { maxRetries: 0, backoffMultiplier: 1 },
    createScheduledAction: data.createScheduledAction || true,
    notifyUserId: data.notifyUserId,
  });
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

  // Fetch journeys when component mounts
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

  // Fetch available inboxes when component mounts
  useEffect(() => {
    const fetchInboxes = async () => {
      setLoadingInboxes(true);
      try {
        const response = await InboxesService.list();
        const inboxes = response.data || [];

        // Filter inboxes that support sending messages
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

  const handleUpdate = () => {
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

  // Check if configuration is complete
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

  const isConfigured = isDelayConfigured && isActionConfigured();

  return (
    <BaseFlowPanel
      title={t('panels.scheduledAction.title')}
      onClose={onClose}
      icon={<Clock className="w-5 h-5 text-orange-500" />}
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Delay Duration */}
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
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-sm"
            >
              <option value="minutes">{t('panels.scheduledAction.units.minutes')}</option>
              <option value="hours">{t('panels.scheduledAction.units.hours')}</option>
              <option value="days">{t('panels.scheduledAction.units.days')}</option>
              <option value="weeks">{t('panels.scheduledAction.units.weeks')}</option>
            </select>
          </div>
        </div>

        <Separator />

        {/* Action Type */}
        <div className="space-y-2">
          <Label>{t('panels.scheduledAction.actionType')}</Label>
          <select
            value={formData.actionType || ''}
            onChange={handleActionTypeChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-sm"
          >
            <option value="">Select an action</option>
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

        {/* CONDITIONAL: Send Message */}
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
                        loadingInboxes ? 'Loading channels...' : 'Select a channel'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {availableInboxes.length === 0 && !loadingInboxes && (
                      <div className="px-2 py-1.5 text-sm text-gray-500">
                        No channels configured
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
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    {t('panels.scheduledAction.messages.noChannelsConfigured')}
                  </p>
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-sm font-mono"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formData.actionConfig?.message?.length || 0} characters
                </p>
              </div>
            </div>
          </>
        )}

        {/* CONDITIONAL: Execute Webhook */}
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-sm"
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

        {/* CONDITIONAL: Trigger Journey */}
        {formData.actionType === 'trigger_journey' && (
          <>
            <Separator />
            <div className="space-y-2">
              <Label>{t('panels.scheduledAction.labels.journeyId')}</Label>
              <select
                value={formData.actionConfig?.journey_id || ''}
                onChange={e => handleTriggerJourneyChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-sm"
                disabled={loadingJourneys}
              >
                <option value="">
                  {loadingJourneys ? 'Loading journeys...' : 'Select a journey'}
                </option>
                {journeys.map(journey => (
                  <option key={journey.id} value={journey.id}>
                    {journey.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('panels.scheduledAction.hints.journeyId')}
              </p>
            </div>
          </>
        )}

        {/* CONDITIONAL: Create Task */}
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-sm"
                />
              </div>
            </div>
          </>
        )}

        {/* Configuration Status */}
        {!isConfigured && formData.actionType && (
          <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/30 rounded-md p-3 flex gap-2">
            <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-orange-800 dark:text-orange-200">
              {t('panels.scheduledAction.configure')}
            </p>
          </div>
        )}

        <Separator />

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button onClick={handleUpdate} disabled={!isConfigured} className="flex-1">
            Save
          </Button>
          <Button onClick={onClose} variant="outline" className="flex-1">
            Close
          </Button>
        </div>
      </div>
    </BaseFlowPanel>
  );
}
