import { useEffect, useMemo, useState } from 'react';
import { Bot, Inbox } from 'lucide-react';
import { NodeConfigModal } from '@/components/journey/shared/NodeConfigModal';
import { FlowFeedbackBanner } from '@/components/journey/_ui';
import { useLanguage } from '@/hooks/useLanguage';

export interface AssignBotPanelProps {
  nodeId: string;
  data: {
    bot_id?: string;
    bot_name?: string;
    inbox_id?: string;
    inbox_name?: string;
    formDataOptions?: {
      bots?: any[];
      inboxes?: any[];
    };
  };
  onUpdate: (nodeId: string, data: any) => void;
  onClose: () => void;
}

export function AssignBotPanel({ nodeId, data, onUpdate, onClose }: AssignBotPanelProps) {
  const { t } = useLanguage('journey');
  const [selectedBotId, setSelectedBotId] = useState<string>(data.bot_id || '');
  const [selectedInboxId, setSelectedInboxId] = useState<string>(data.inbox_id || '');
  const [originalSnapshot] = useState(() => ({
    botId: data.bot_id || '',
    inboxId: data.inbox_id || '',
  }));

  const availableBots = data.formDataOptions?.bots || [];
  const availableInboxes = data.formDataOptions?.inboxes || [];

  const selectedBot = availableBots.find(bot => bot.id.toString() === selectedBotId);
  const selectedInbox = availableInboxes.find(inbox => inbox.id.toString() === selectedInboxId);

  useEffect(() => {
    setSelectedBotId(data.bot_id || '');
    setSelectedInboxId(data.inbox_id || '');
  }, [data.bot_id, data.inbox_id]);

  const handleSave = () => {
    onUpdate(nodeId, {
      ...data,
      bot_id: selectedBotId || undefined,
      bot_name: selectedBot?.name || undefined,
      inbox_id: selectedInboxId || undefined,
      inbox_name: selectedInbox?.name || undefined,
    });
    onClose();
  };

  const handleCancel = () => {
    setSelectedBotId(data.bot_id || '');
    setSelectedInboxId(data.inbox_id || '');
    onClose();
  };

  const dirty = useMemo(
    () => selectedBotId !== originalSnapshot.botId || selectedInboxId !== originalSnapshot.inboxId,
    [selectedBotId, selectedInboxId, originalSnapshot],
  );
  const canSave = Boolean(selectedBotId && selectedInboxId);

  return (
    <NodeConfigModal
      open
      variant="simple"
      title={t('panels.assignBot.title')}
      icon={<Bot className="h-5 w-5 text-flow-node-action-pipeline-fg" />}
      onCancel={handleCancel}
      onSave={handleSave}
      dirty={dirty && canSave}
      saveLabel={t('panels.actions.save')}
      cancelLabel={t('panels.actions.cancel')}
    >
      <div className="space-y-6">
        <FlowFeedbackBanner variant="info">
          <p>
            <strong>{t('panels.assignBot.title')}:</strong> {t('panels.assignBot.description')}
          </p>
        </FlowFeedbackBanner>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-flow-node-action-pipeline-fg" />
            <label className="text-sm font-medium text-foreground">
              {t('panels.assignBot.selectBot')}
            </label>
          </div>

          <select
            value={selectedBotId}
            onChange={e => setSelectedBotId(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-ring"
          >
            <option value="">{t('panels.assignBot.selectBotPlaceholder')}</option>
            {availableBots.map(bot => (
              <option key={bot.id} value={bot.id.toString()}>
                {bot.name} {bot.bot_type && `(${bot.bot_type})`}
              </option>
            ))}
          </select>

          {selectedBot && (
            <div className="p-2 bg-muted rounded border border-border">
              <p className="text-xs text-muted-foreground">
                <strong>{t('panels.assignBot.type')}:</strong> {selectedBot.bot_type || 'webhook'}
                {selectedBot.description && (
                  <>
                    <br />
                    <strong>{t('panels.assignBot.botDescription')}:</strong>{' '}
                    {selectedBot.description}
                  </>
                )}
              </p>
            </div>
          )}

          {availableBots.length === 0 && (
            <FlowFeedbackBanner variant="warn">
              <p className="text-xs">⚠ {t('panels.assignBot.noBotsAvailable')}</p>
            </FlowFeedbackBanner>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Inbox className="w-4 h-4 text-flow-node-action-message-fg" />
            <label className="text-sm font-medium text-foreground">
              {t('panels.assignBot.selectInbox')}
            </label>
          </div>

          <select
            value={selectedInboxId}
            onChange={e => setSelectedInboxId(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-ring"
          >
            <option value="">{t('panels.assignBot.selectInboxPlaceholder')}</option>
            {availableInboxes.map(inbox => (
              <option key={inbox.id} value={inbox.id.toString()}>
                {inbox.name} {inbox.channel_type && `(${inbox.channel_type})`}
              </option>
            ))}
          </select>

          {selectedInbox && (
            <div className="p-2 bg-muted rounded border border-border">
              <p className="text-xs text-muted-foreground">
                <strong>{t('panels.assignBot.channel')}:</strong>{' '}
                {selectedInbox.channel_type || t('panels.assignBot.unknown')}
                {selectedInbox.website_url && (
                  <>
                    <br />
                    <strong>{t('panels.assignBot.website')}:</strong> {selectedInbox.website_url}
                  </>
                )}
              </p>
            </div>
          )}

          {availableInboxes.length === 0 && (
            <FlowFeedbackBanner variant="warn">
              <p className="text-xs">⚠ {t('panels.assignBot.noInboxesAvailable')}</p>
            </FlowFeedbackBanner>
          )}
        </div>

        {selectedBot && selectedInbox && (
          <FlowFeedbackBanner variant="success">
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 bg-flow-feedback-success-fg text-flow-feedback-success-bg">
                <span className="text-xs font-bold">✓</span>
              </div>
              <div>
                <p className="font-medium">{t('panels.assignBot.assignmentConfigured')}</p>
                <p className="text-xs mt-1">
                  {t('panels.assignBot.assignmentPreview', {
                    botName: selectedBot.name,
                    inboxName: selectedInbox.name,
                  })}
                </p>
              </div>
            </div>
          </FlowFeedbackBanner>
        )}

        <FlowFeedbackBanner variant="info">
          <h4 className="text-sm font-medium mb-2">ℹ️ {t('panels.assignBot.importantNotes')}</h4>
          <ul className="text-xs space-y-1">
            <li>• {t('panels.assignBot.note1')}</li>
            <li>• {t('panels.assignBot.note2')}</li>
            <li>• {t('panels.assignBot.note3')}</li>
            <li>• {t('panels.assignBot.note4')}</li>
          </ul>
        </FlowFeedbackBanner>
      </div>
    </NodeConfigModal>
  );
}
