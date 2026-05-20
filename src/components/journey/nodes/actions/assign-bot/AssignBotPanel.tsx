import { useState, useEffect } from 'react';
import { Bot, Inbox } from 'lucide-react';
import { BaseFlowPanel } from '@/components/base';
import { Button, Separator } from '@evoapi/design-system';
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

  // Opções disponíveis
  const availableBots = data.formDataOptions?.bots || [];
  const availableInboxes = data.formDataOptions?.inboxes || [];

  // Encontrar nomes pelos IDs
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

  const canSave = selectedBotId && selectedInboxId;

  return (
    <BaseFlowPanel
      title={t('panels.assignBot.title')}
      icon={<Bot className="w-5 h-5 text-purple-500" />}
      onClose={onClose}
      width="w-[500px]"
    >
      <Separator />

      <div className="space-y-6">
        {/* Descrição */}
        <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800/30">
          <p className="text-sm text-purple-800 dark:text-purple-200">
            <strong>{t('panels.assignBot.title')}:</strong> {t('panels.assignBot.description')}
          </p>
        </div>

        {/* Seleção do Bot */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-purple-500" />
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('panels.assignBot.selectBot')}
            </label>
          </div>

          <select
            value={selectedBotId}
            onChange={e => setSelectedBotId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                     focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="">{t('panels.assignBot.selectBotPlaceholder')}</option>
            {availableBots.map(bot => (
              <option key={bot.id} value={bot.id.toString()}>
                {bot.name} {bot.bot_type && `(${bot.bot_type})`}
              </option>
            ))}
          </select>

          {selectedBot && (
            <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded border">
              <p className="text-xs text-gray-600 dark:text-gray-400">
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
            <div className="p-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 rounded">
              ⚠ {t('panels.assignBot.noBotsAvailable')}
            </div>
          )}
        </div>

        {/* Seleção do Inbox */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Inbox className="w-4 h-4 text-blue-500" />
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('panels.assignBot.selectInbox')}
            </label>
          </div>

          <select
            value={selectedInboxId}
            onChange={e => setSelectedInboxId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">{t('panels.assignBot.selectInboxPlaceholder')}</option>
            {availableInboxes.map(inbox => (
              <option key={inbox.id} value={inbox.id.toString()}>
                {inbox.name} {inbox.channel_type && `(${inbox.channel_type})`}
              </option>
            ))}
          </select>

          {selectedInbox && (
            <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded border">
              <p className="text-xs text-gray-600 dark:text-gray-400">
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
            <div className="p-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 rounded">
              ⚠ {t('panels.assignBot.noInboxesAvailable')}
            </div>
          )}
        </div>

        {/* Preview da atribuição */}
        {selectedBot && selectedInbox && (
          <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800/30">
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-xs text-white font-bold">✓</span>
              </div>
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  {t('panels.assignBot.assignmentConfigured')}
                </p>
                <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                  {t('panels.assignBot.assignmentPreview', {
                    botName: selectedBot.name,
                    inboxName: selectedInbox.name,
                  })}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Notas importantes */}
        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800/30">
          <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
            ℹ️ {t('panels.assignBot.importantNotes')}
          </h4>
          <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
            <li>• {t('panels.assignBot.note1')}</li>
            <li>• {t('panels.assignBot.note2')}</li>
            <li>• {t('panels.assignBot.note3')}</li>
            <li>• {t('panels.assignBot.note4')}</li>
          </ul>
        </div>
      </div>

      {/* Botões de ação */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={handleCancel} className="flex-1 h-10">
          {t('panels.actions.cancel')}
        </Button>
        <Button onClick={handleSave} className="flex-1 h-10" disabled={!canSave}>
          {t('panels.actions.save')}
        </Button>
      </div>
    </BaseFlowPanel>
  );
}
