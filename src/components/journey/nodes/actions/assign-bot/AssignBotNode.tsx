import { Bot, Settings } from 'lucide-react';
import { BaseFlowNode } from '@/components/base';
import { useLanguage } from '@/hooks/useLanguage';

export interface AssignBotNodeData {
  label: string;
  description?: string;
  bot_id?: string;
  bot_name?: string;
  inbox_id?: string;
  inbox_name?: string;
  // Dados para traduzir IDs para nomes
  formDataOptions?: {
    bots: any[];
    inboxes: any[];
  };
}

export interface AssignBotNodeType {
  id: string;
  type: 'assign-bot-node';
  position: { x: number; y: number };
  data: AssignBotNodeData;
}

interface AssignBotNodeProps {
  selected: boolean;
  data: AssignBotNodeData;
  id: string;
}

export function AssignBotNode({ selected, data, id }: AssignBotNodeProps) {
  const { t } = useLanguage('journey');
  // Encontrar o bot selecionado
  const getBotName = () => {
    if (data.bot_name) return data.bot_name;

    if (data.bot_id && data.formDataOptions?.bots) {
      const bot = data.formDataOptions.bots.find((b: any) =>
        b.id.toString() === data.bot_id?.toString()
      );
      return bot?.name || `Bot #${data.bot_id}`;
    }

    return t('panels.assignBot.selectBotNode');
  };

  // Encontrar o inbox selecionado
  const getInboxName = () => {
    if (data.inbox_name) return data.inbox_name;

    if (data.inbox_id && data.formDataOptions?.inboxes) {
      const inbox = data.formDataOptions.inboxes.find((i: any) =>
        i.id.toString() === data.inbox_id?.toString()
      );
      return inbox?.name || `Inbox #${data.inbox_id}`;
    }

    return t('panels.assignBot.selectInboxNode');
  };

  const botName = getBotName();
  const inboxName = getInboxName();
  const hasBotSelected = !!data.bot_id;
  const hasInboxSelected = !!data.inbox_id;
  const isFullyConfigured = hasBotSelected && hasInboxSelected;

  return (
    <BaseFlowNode
      selected={selected}
      hasTarget={true}
      borderColor="purple"
      isExecuting={false}
      hasSource={true}
      nodeId={id}
      sourceHandleId="assign-bot-output"
      targetHandleId="assign-bot-input"
    >
      <div className="space-y-3">
        {/* Header com ação */}
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {t('panels.assignBot.assignBotAction')}
            </h3>
          </div>
          <div className="flex-shrink-0">
            <Settings className="w-3 h-3 text-gray-400" />
          </div>
        </div>

        {/* Informações do bot e inbox selecionados */}
        <div className="space-y-2">
          {/* Bot selecionado */}
          <div className="p-2 rounded-md bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/30">
            <p className="text-xs text-purple-800 dark:text-purple-200 leading-relaxed">
              <span className="font-medium">{t('panels.assignBot.botLabel')}</span>{' '}
              {hasBotSelected ? (
                <strong>{botName}</strong>
              ) : (
                <span className="text-purple-600 dark:text-purple-400">{t('panels.assignBot.notSelected')}</span>
              )}
            </p>
          </div>

          {/* Inbox selecionado */}
          <div className="p-2 rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30">
            <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
              <span className="font-medium">{t('panels.assignBot.inboxLabel')}</span>{' '}
              {hasInboxSelected ? (
                <strong>{inboxName}</strong>
              ) : (
                <span className="text-blue-600 dark:text-blue-400">{t('panels.assignBot.notSelected')}</span>
              )}
            </p>
          </div>

          {/* Status da configuração */}
          {isFullyConfigured ? (
            <div className="p-2 rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/30">
              <p className="text-xs text-green-800 dark:text-green-200 leading-relaxed">
                ✓ {t('panels.assignBot.assignTo', { botName, inboxName })}
              </p>
            </div>
          ) : (
            <div className="p-2 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30">
              <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                ⚠ {t('panels.assignBot.configureToActivate')}
              </p>
            </div>
          )}
        </div>
      </div>
    </BaseFlowNode>
  );
}