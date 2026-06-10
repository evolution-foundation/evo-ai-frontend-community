import { MessageSquare, Settings, Paperclip } from 'lucide-react';
import { BaseFlowNode } from '@/components/base';
import { useLanguage } from '@/hooks/useLanguage';

export interface SendMessageNodeData {
  label?: string;
  description?: string;
  message?: string;
  inboxId?: string;
  inboxName?: string;

  // Template mode (EVO-1255): 'text' keeps the free-form message; 'template'
  // sends a CRM message template (mandatory for WhatsApp Cloud channels).
  messageMode?: 'text' | 'template';
  templateId?: string;
  templateName?: string;
  templateLanguage?: string;
  templateParams?: Record<string, string>;

  // Opção para usar canal do evento gerado
  useEventChannel?: boolean;

  // Anexos opcionais
  hasAttachment?: boolean;
  attachment_ids?: string[] | number[];
  attachment_names?: string[];
  attachment_count?: number;

  // Dados para traduzir IDs para nomes
  formDataOptions?: {
    inboxes?: any[];
    [key: string]: any[] | undefined;
  };
}

export interface SendMessageNodeType {
  id: string;
  type: 'send-message-node';
  position: { x: number; y: number };
  data: SendMessageNodeData;
}

interface SendMessageNodeProps {
  selected: boolean;
  data: SendMessageNodeData;
  id: string;
}

export function SendMessageNode({ selected, data, id }: SendMessageNodeProps) {
  const { t } = useLanguage('journey');

  const isTemplateMode = data.messageMode === 'template';

  const getDisplayText = () => {
    if (isTemplateMode) {
      return data.templateName
        ? `${t('flowEditor.nodes.sendMessage.templateLabel')} ${data.templateName}`
        : t('flowEditor.nodes.sendMessage.templateNotSelected');
    }

    if (!data.message || data.message.trim() === '') {
      return t('flowEditor.nodes.sendMessage.description');
    }

    // Truncar mensagem longa para display
    const maxLength = 50;
    const message = data.message.trim();

    if (message.length <= maxLength) {
      return `"${message}"`;
    }

    return `"${message.substring(0, maxLength)}..."`;
  };

  const getInboxName = () => {
    // Se está usando o canal do evento gerado
    if (data.useEventChannel) {
      return t('flowEditor.nodes.sendMessage.eventChannel');
    }

    // Primeiro tenta usar o nome salvo diretamente
    if (data.inboxName) {
      return data.inboxName;
    }

    // Fallback para buscar nas opções
    if (!data.inboxId || !data.formDataOptions?.inboxes) {
      return null;
    }
    const inbox = data.formDataOptions.inboxes.find((i: any) => i.id === data.inboxId);
    return inbox?.name || null;
  };

  const getAttachmentText = () => {
    const attachmentCount = data.attachment_count || 0;

    if (attachmentCount === 0) {
      return null;
    }

    if (attachmentCount === 1) {
      return t('flowEditor.nodes.sendMessage.oneAttachment');
    }

    return t('flowEditor.nodes.sendMessage.multipleAttachments', { count: attachmentCount });
  };

  const hasInboxConfigured = !!(data.useEventChannel || (data.inboxId && getInboxName()));
  const hasAttachmentsConfigured = (data.attachment_count || 0) > 0;

  return (
    <BaseFlowNode
      selected={selected}
      hasTarget={true}
      borderColor="blue"
      isExecuting={false}
      hasSource={true}
      nodeId={id}
      sourceHandleId="send-message-output"
      targetHandleId="send-message-input"
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-foreground truncate">
              Enviar Mensagem
            </h3>
          </div>
          <div className="flex-shrink-0">
            <Settings className="w-3 h-3 text-muted-foreground" />
          </div>
        </div>

        {/* Informações da mensagem */}
        <div className="space-y-2">
          {/* Canal/Inbox */}
          {hasInboxConfigured && (
            <div className="p-2 rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/30">
              <p className="text-xs text-green-800 dark:text-green-200 leading-relaxed">
                <span className="font-medium">
                  {t('flowEditor.nodes.sendMessage.channelLabel')}
                </span>{' '}
                {getInboxName()}
              </p>
            </div>
          )}

          {/* Mensagem */}
          <div className="p-2 rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30">
            <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
              {getDisplayText()}
              {hasAttachmentsConfigured && (
                <span className="ml-2 inline-flex items-center gap-1 text-cyan-600 dark:text-cyan-400">
                  <Paperclip className="w-3 h-3" />
                  {getAttachmentText()}
                </span>
              )}
            </p>

            {/* Lista de anexos se disponível */}
            {hasAttachmentsConfigured &&
              data.attachment_names &&
              data.attachment_names.length > 0 && (
                <div className="mt-2 pt-2 border-t border-blue-200/50 dark:border-blue-700/50">
                  <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                    {data.attachment_names.slice(0, 2).map((name, index) => (
                      <div key={index} className="flex items-center gap-1 truncate">
                        <Paperclip className="w-3 h-3 text-cyan-500" />
                        <span>{name}</span>
                      </div>
                    ))}
                    {data.attachment_names.length > 2 && (
                      <div className="text-blue-600 dark:text-blue-400 text-xs">
                        +{data.attachment_names.length - 2} mais anexos...
                      </div>
                    )}
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>
    </BaseFlowNode>
  );
}
