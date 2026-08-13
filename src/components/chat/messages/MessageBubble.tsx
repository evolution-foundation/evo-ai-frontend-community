import React, { useState, useMemo, useEffect } from 'react';
import { Badge } from '@evoapi/design-system/badge';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@evoapi/design-system/context-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@evoapi/design-system/alert-dialog';
import { LockIcon, Reply, Copy, Trash2, AlertTriangle, Shield, Ban } from 'lucide-react';
import { Message, MESSAGE_TYPE } from '@/types/chat/api';
import { useLanguage } from '@/hooks/useLanguage';
import MessageText from '@/components/chat/messages/MessageText';
import MessageImage from '@/components/chat/messages/MessageImage';
import MessageFile from '@/components/chat/messages/MessageFile';
import MessageAudio from '@/components/chat/messages/MessageAudio';
import MessageVideo from '@/components/chat/messages/MessageVideo';
import MessageInputSelect from '@/components/chat/messages/MessageInputSelect';
import MessageLocation from '@/components/chat/messages/MessageLocation';
import MessageContact from '@/components/chat/messages/MessageContact';
import MessageCarousel from '@/components/chat/messages/MessageCarousel';
import MessageStatus from '@/components/chat/messages/MessageStatus';
import SystemMessage from '@/components/chat/messages/SystemMessage';
import ReplyPreview from '@/components/chat/messages/ReplyPreview';
import { FacebookCommentModeration } from '@/types/channels/inbox';
import { getCachedReplyMessage, fetchReplyMessage } from '@/utils/chat/replyMessageCache';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  isFromBot?: boolean;
  isFromAgent?: boolean;
  showAvatar?: boolean;
  showTimestamp?: boolean;
  labels?: Array<{ id: string; title: string; color: string }>;
  allMessages?: Message[]; // Todas as mensagens para buscar reply
  conversationId?: string | null; // Necessário pra buscar a mensagem citada quando ela não está em allMessages
  onJumpToMessage?: (messageId: string) => void; // Rola até (carregando páginas antigas se precisar) a mensagem citada
  isPostConversation?: boolean;
  isThreadRoot?: boolean;
  isThreadReply?: boolean;
  isFacebookStyle?: boolean; // Estilo Facebook (tudo à esquerda, bubble simples)
  moderation?: FacebookCommentModeration; // Moderation data for this message
  onRetry?: () => void;
  onReply?: (message: Message) => void;
  onCopy?: (message: Message) => void;
  onDelete?: (message: Message) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  isFromBot = false,
  isFromAgent = false,
  showAvatar = true,
  showTimestamp = true,
  labels = [],
  allMessages = [],
  conversationId = null,
  onJumpToMessage,
  isPostConversation: _isPostConversation = false, // Prefixado com _ para evitar erro TS (pode ser usado no futuro)
  isThreadRoot: _isThreadRoot = false, // Prefixado com _ para evitar erro TS (pode ser usado no futuro)
  isThreadReply = false,
  isFacebookStyle = false,
  moderation,
  onRetry,
  onReply,
  onCopy,
  onDelete,
}) => {
  const { t } = useLanguage('chat');
  const isTemplate = message.message_type === MESSAGE_TYPE.TEMPLATE;
  const isActivity = message.message_type === MESSAGE_TYPE.ACTIVITY;
  const isPrivate = message.private;
  const isDeleted = message.content_attributes?.deleted === true;
  const isRevokedByContact = message.content_attributes?.revoked_by_contact === true;
  const isRevokeCrmOnly = message.content_attributes?.revoke_propagated === false;

  // Moderation indicators
  const hasPendingModeration = moderation?.status === 'pending';
  const isBlocked = moderation?.status === 'approved' &&
    (moderation.moderation_action === 'delete_comment' || moderation.moderation_action === 'block_user');
  const isPendingResponse = moderation?.moderation_action === 'response_approval' && hasPendingModeration;

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const replyToMessageId = message.content_attributes?.in_reply_to;
  const replyToExternalId = message.content_attributes?.in_reply_to_external_id;
  const hasReplyReference = Boolean(replyToMessageId || replyToExternalId);

  // Bumped after a background fetch resolves a reply target that wasn't in
  // allMessages, to force replyToMessage below to re-check the (module-level,
  // shared across bubbles) cache populated by that fetch.
  const [fetchedReplyTick, setFetchedReplyTick] = useState(0);

  // Whichever reference the message actually carries - an inbound WhatsApp
  // reply quotes the OTHER party's WhatsApp message id (in_reply_to_external_id,
  // never our internal id), while in_reply_to is our own id. The backend's
  // GET .../messages/:id resolves either (falls back to source_id when :id
  // isn't a UUID), so one lookup id covers both cases.
  const replyLookupId = replyToMessageId || replyToExternalId;

  const replyToMessage = useMemo(() => {
    if (!hasReplyReference) return null;
    if (replyToMessageId) {
      const local = allMessages.find(msg => String(msg.id) === String(replyToMessageId));
      if (local) return local;
    }
    if (replyToExternalId) {
      const local = allMessages.find(
        msg => msg.source_id && String(msg.source_id) === String(replyToExternalId),
      );
      if (local) return local;
    }
    return replyLookupId ? (getCachedReplyMessage(String(replyLookupId)) ?? null) : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchedReplyTick exists only to re-run this memo after a cache write
  }, [hasReplyReference, replyToMessageId, replyToExternalId, replyLookupId, allMessages, fetchedReplyTick]);

  // The quoted message wasn't in the currently loaded page - fetch it directly
  // so the preview shows real content instead of the generic "Mensagem
  // anterior" fallback (EVO reply-jump fix).
  useEffect(() => {
    if (!replyLookupId || replyToMessage || !conversationId) return;

    let cancelled = false;
    fetchReplyMessage(conversationId, String(replyLookupId)).then(fetched => {
      if (!cancelled && fetched) setFetchedReplyTick(tick => tick + 1);
    });

    return () => {
      cancelled = true;
    };
  }, [replyLookupId, replyToMessage, conversationId]);

  const handleCopyMessage = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
    }
    onCopy?.(message);
  };

  const handleReplyMessage = () => {
    onReply?.(message);
  };

  const handleDeleteMessage = () => {
    setShowDeleteDialog(true);
  };

  const confirmDeleteMessage = async () => {
    setShowDeleteDialog(false);
    await onDelete?.(message);
  };

  const renderContextMenu = (children: React.ReactNode) => {
    // Template, Activity messages e mensagens deletadas não têm context menu
    if (isTemplate || isActivity || isDeleted) {
      return children;
    }

    // REGRA EVOLUTION: Mensagens privadas não podem ser respondidas
    const canReply = !isPrivate;

    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          {canReply && (
            <ContextMenuItem onClick={handleReplyMessage} className="flex items-center gap-2">
              <Reply className="h-4 w-4" />
              {t('messages.messageBubble.contextMenu.reply')}
            </ContextMenuItem>
          )}
          <ContextMenuItem onClick={handleCopyMessage} className="flex items-center gap-2">
            <Copy className="h-4 w-4" />
            {t('messages.messageBubble.contextMenu.copy')}
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={handleDeleteMessage}
            className="flex items-center gap-2"
            variant="destructive"
          >
            <Trash2 className="h-4 w-4" />
            {t('messages.messageBubble.contextMenu.delete')}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  };

  // Decide o layout do timestamp: 'tuck' (float dentro do texto, estilo WhatsApp) só faz
  // sentido pra texto puro — mídia/cards/preview usam 'default' (bloco abaixo do conteúdo),
  // que é como o protótipo trata a bolha alta (LinkedIn preview).
  const hasAttachments = Boolean(message.attachments && message.attachments.length > 0);
  const isPlainTextContent =
    !hasAttachments &&
    (message.content_type === 'text' ||
      message.content_type === 'incoming_email' ||
      !message.content_type);
  // Áudio puro (sem legenda) também usa 'tuck': a bolha de áudio é compacta e sem altura
  // variável (mesmo player em toda mensagem), então o timestamp flutuante cai logo abaixo
  // do player sem sobrepor nada — evita a inconsistência de tamanho/cor/posição do 'default'
  // (ver MessageStatus.tsx) entre bolha de texto e bolha de áudio. Áudio com legenda mantém
  // 'default' (mesma lógica de imagem/vídeo com legenda: bolha mais alta, layout em bloco).
  const firstAttachmentFileType = hasAttachments
    ? String(message.attachments[0]?.file_type || message.attachments[0]?.data_url || '').toLowerCase()
    : '';
  const isAudioOnly =
    hasAttachments &&
    !message.content &&
    (firstAttachmentFileType === 'audio' || firstAttachmentFileType.includes('audio/'));
  const timestampVariant: 'default' | 'tuck' =
    isPlainTextContent || isAudioOnly ? 'tuck' : 'default';

  const renderMessageContent = () => {
    // 🎯 CORREÇÃO: Detectar attachments automaticamente

    if (hasAttachments) {
      const firstAttachment = message.attachments[0];
      // 🔒 PROTEÇÃO: Garantir que fileType seja sempre string válida
      const fileType = String(firstAttachment?.file_type || firstAttachment?.data_url || '').toLowerCase();

      // Detectar tipo de arquivo pelos attachments
      if (fileType === 'location') {
        return (
          <>
            {message.content && (
              <MessageText
                content={message.content}
                isPrivateNote={isPrivate}
                contentType={message.content_type}
                contentAttributes={message.content_attributes}
              />
            )}
            <MessageLocation attachments={message.attachments} />
          </>
        );
      } else if (fileType === 'contact') {
        return (
          <>
            {message.content && (
              <MessageText
                content={message.content}
                isPrivateNote={isPrivate}
                contentType={message.content_type}
                contentAttributes={message.content_attributes}
              />
            )}
            <MessageContact attachments={message.attachments} />
          </>
        );
      } else if (fileType === 'image' || fileType.includes('image/')) {
        return (
          <>
            {message.content && (
              <MessageText
                content={message.content}
                isPrivateNote={isPrivate}
                contentType={message.content_type}
                contentAttributes={message.content_attributes}
              />
            )}
            <MessageImage attachments={message.attachments} />
          </>
        );
      } else if (fileType === 'audio' || fileType.includes('audio/')) {
        return (
          <>
            {message.content && (
              <MessageText
                content={message.content}
                isPrivateNote={isPrivate}
                contentType={message.content_type}
                contentAttributes={message.content_attributes}
              />
            )}
            <MessageAudio attachments={message.attachments} />
          </>
        );
      } else if (fileType === 'video' || fileType.includes('video/')) {
        return (
          <>
            {message.content && (
              <MessageText
                content={message.content}
                isPrivateNote={isPrivate}
                contentType={message.content_type}
                contentAttributes={message.content_attributes}
              />
            )}
            <MessageVideo attachments={message.attachments} />
          </>
        );
      } else {
        return (
          <>
            {message.content && (
              <MessageText
                content={message.content}
                isPrivateNote={isPrivate}
                contentType={message.content_type}
                contentAttributes={message.content_attributes}
              />
            )}
            <MessageFile attachments={message.attachments} />
          </>
        );
      }
    }

    // Fallback para content_type tradicional
    switch (message.content_type) {
      case 'text':
      case 'incoming_email':
        return (
          <MessageText
            content={message.content}
            isPrivateNote={isPrivate}
            contentType={message.content_type}
            contentAttributes={message.content_attributes}
          />
        );
      case 'image':
        return <MessageImage attachments={message.attachments || []} />;
      case 'file':
        return <MessageFile attachments={message.attachments || []} />;
      case 'audio':
        return <MessageAudio attachments={message.attachments || []} />;
      case 'video':
        return <MessageVideo attachments={message.attachments || []} />;
      case 'cards':
        return (
          <MessageCarousel
            content={message.content}
            contentAttributes={message.content_attributes}
          />
        );
      case 'input_select':
        return (
          <MessageInputSelect
            content={message.content}
            contentAttributes={message.content_attributes}
          />
        );
      default:
        return (
          <MessageText
            content={message.content}
            isPrivateNote={isPrivate}
            contentType={message.content_type}
            contentAttributes={message.content_attributes}
          />
        );
    }
  };

  // Template messages - usar SystemMessage com identidade visual moderna
  if (isTemplate) {
    return <SystemMessage message={message} labels={labels} />;
  }

  // Activity messages - usar SystemMessage com identidade visual moderna
  if (isActivity) {
    return <SystemMessage message={message} labels={labels} />;
  }

  // Estilo Facebook: tudo à esquerda, bubble simples e limpo
  if (isFacebookStyle) {
    return (
      <>
        <div className="mb-1">
          {renderContextMenu(
            <div
              className={`rounded-lg px-3 py-1.5 ${isDeleted ? 'cursor-default' : 'cursor-pointer'} ${isPrivate
                ? 'bg-orange-50 border border-orange-200 dark:bg-orange-950/20 dark:border-orange-800/50'
                : 'bg-muted/50 hover:bg-muted/70 border border-border/50'
                }`}
            >
              {/* Indicador de mensagem privada */}
              {isPrivate && (
                <div className="flex items-center gap-1.5 mb-2 text-muted-foreground">
                  <LockIcon className="h-3 w-3" />
                  <Badge variant="outline" className="h-5 px-1.5 text-xs font-medium bg-orange-100 text-orange-800 border border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700">
                    {t('messages.messageBubble.privateNote.badge')}
                  </Badge>
                </div>
              )}

              {/* Moderation indicators */}
              {hasPendingModeration && !isPendingResponse && (
                <div className="flex items-center gap-1.5 mb-2">
                  <Shield className="h-3 w-3 text-warning" />
                  <Badge variant="outline" className="h-5 px-1.5 text-xs border-warning text-warning bg-warning/10">
                    {t('messages.messageBubble.moderation.pending')}
                  </Badge>
                </div>
              )}

              {isBlocked && (
                <div className="flex items-center gap-1.5 mb-2">
                  <Ban className="h-3 w-3 text-destructive" />
                  <Badge variant="outline" className="h-5 px-1.5 text-xs border-destructive text-destructive bg-destructive/10">
                    {t('messages.messageBubble.moderation.blocked')}
                  </Badge>
                </div>
              )}

              {hasReplyReference && !isPrivate && (
                <ReplyPreview
                  message={replyToMessage}
                  isOwn={false}
                  onJumpToMessage={onJumpToMessage}
                />
              )}

              <div className={timestampVariant === 'tuck' ? 'overflow-hidden' : undefined}>
                {renderMessageContent()}
                {(isDeleted || isRevokedByContact) && (
                  <div className="mt-1 text-xs italic text-muted-foreground opacity-80">
                    {isRevokedByContact
                      ? t('messages.messageBubble.revokedByContact', 'Deleted by the contact')
                      : t('messages.messageBubble.deletedPlaceholder', 'This message was deleted')}
                    {isDeleted && isRevokeCrmOnly && (
                      <span className="ml-1">· {t('messages.messageBubble.revokeCrmOnly', 'removed only in the CRM')}</span>
                    )}
                  </div>
                )}
                {showTimestamp && timestampVariant === 'tuck' && (
                  <MessageStatus message={message} isOwn={false} onRetry={onRetry} variant="tuck" />
                )}
              </div>

              {showTimestamp && timestampVariant === 'default' && (
                <MessageStatus message={message} isOwn={false} onRetry={onRetry} variant="default" />
              )}
            </div>,
          )}
        </div>

        {/* Alert Dialog para confirmação de exclusão */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader className="text-left space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
                <div className="flex-1 space-y-2">
                  <AlertDialogTitle className="text-lg font-semibold">
                    {t('messages.messageBubble.deleteDialog.title')}
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
                    {t('messages.messageBubble.deleteDialog.description')}
                  </AlertDialogDescription>
                </div>
              </div>
            </AlertDialogHeader>

            <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-3 sm:gap-3">
              <AlertDialogCancel className="w-full sm:w-auto">{t('messages.messageBubble.deleteDialog.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteMessage}
                className="w-full sm:w-auto bg-destructive text-white hover:bg-destructive/90 focus:ring-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('messages.messageBubble.deleteDialog.confirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // Regular messages (incoming/outgoing/bot) - estilo padrão
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${isThreadReply ? 'mb-1' : 'mb-4'}`}>
      {/* 👤 Avatar: REMOVIDO - não mostrar avatar nas mensagens */}
      {/* {!isOwn && showAvatar && !isThreadReply && (
        <Avatar className="w-8 h-8 mr-2 flex-shrink-0">
          <AvatarImage src={message.sender?.thumbnail} />
          <AvatarFallback className={isFromBot ? 'bg-purple-100 text-purple-700' : ''}>
            {isFromBot ? '🤖' : message.sender?.name?.[0]?.toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
      )} */}

      {/* Linha conectora para replies em thread (estilo Facebook) */}
      {isThreadReply && (
        <div className="w-6 flex-shrink-0 flex items-start justify-center mr-1 pt-1">
          <div className="relative w-full flex flex-col items-center">
            {/* Linha vertical */}
            <div className="w-0.5 h-full bg-primary/30 dark:bg-primary/20 min-h-[1rem]" />
            {/* Círculo conector */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary/40 dark:bg-primary/30 -mt-0.5" />
          </div>
        </div>
      )}

      <div className={`${isThreadReply ? 'max-w-[calc(70%-2rem)]' : 'max-w-[70%]'} ${isOwn ? 'ml-auto' : ''}`}>
        {/* Em conversa de grupo o backend anexa content_attributes.sender_name por mensagem;
            destaca o participante acima da bolha. Em 1:1, mantém o comportamento antigo. */}
        {!isOwn && (message.content_attributes?.sender_name || isThreadReply || !showAvatar) && (
          <div
            className={`text-xs mb-1 flex items-center gap-1.5 ${
              message.content_attributes?.sender_name
                ? 'font-medium text-primary'
                : 'text-muted-foreground'
            }`}
          >
            {message.content_attributes?.sender_name ||
              message.sender?.name ||
              t('messages.messageBubble.userFallback')}
          </div>
        )}

        {renderContextMenu(
          <div
            className={`rounded-lg px-3 py-2 ${isDeleted ? 'cursor-default' : 'cursor-pointer'} ${
              isOwn ? 'rounded-tr-[4px]' : isThreadReply ? 'rounded-tl-md' : ''
            } ${isPrivate
                ? 'bg-orange-50 border-2 border-orange-200 border-l-4 border-l-orange-400 dark:bg-orange-950/20 dark:border-orange-800/50 dark:border-l-orange-600'
                : isFromAgent
                  ? 'bg-primary text-primary-foreground hover:bg-primary/85'
                  : isFromBot
                    ? 'bg-purple-600 text-white dark:bg-purple-700'
                    : isOwn
                      ? 'bg-primary text-primary-foreground hover:bg-primary/85'
                      : isThreadReply
                        ? 'bg-muted/70 border border-l-2 border-l-primary/40 dark:bg-muted/50' // Estilo mais sutil para replies
                        : 'bg-muted border'
              }`}
          >
            {/* Nome do remetente DENTRO da bolha (não como badge externo) — estilo do
                protótipo: nome em destaque no topo, cor clara sobre o fundo colorido. */}
            {isOwn && (isFromAgent || isFromBot) && (
              <div className="text-xs font-bold mb-1 opacity-90">
                {message.sender?.name ||
                  (isFromBot ? t('messages.messageBubble.bot.fallback') : t('messages.messageBubble.agent.fallback'))}
              </div>
            )}

            {/* Indicador de mensagem privada */}
            {isPrivate && (
              <div className="flex items-center gap-1.5 mb-2 text-muted-foreground">
                <LockIcon className="h-3 w-3" />
                <Badge variant="outline" className="h-5 px-1.5 text-xs font-medium bg-orange-100 text-orange-800 border border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700">
                  {t('messages.messageBubble.privateNote.badge')}
                </Badge>
                <span className="text-xs">{t('messages.messageBubble.privateNote.description')}</span>
              </div>
            )}

            {/* Moderation indicators */}
            {hasPendingModeration && !isPendingResponse && (
              <div className="flex items-center gap-1.5 mb-2">
                <Shield className="h-3 w-3 text-warning" />
                <Badge variant="outline" className="h-5 px-1.5 text-xs border-warning text-warning bg-warning/10">
                  {t('messages.messageBubble.moderation.pending')}
                </Badge>
              </div>
            )}

            {isBlocked && (
              <div className="flex items-center gap-1.5 mb-2">
                <Ban className="h-3 w-3 text-destructive" />
                <Badge variant="outline" className="h-5 px-1.5 text-xs border-destructive text-destructive bg-destructive/10">
                  {t('messages.messageBubble.moderation.blocked')}
                </Badge>
              </div>
            )}

            {hasReplyReference && !isPrivate && (
              <ReplyPreview
                message={replyToMessage}
                isOwn={isOwn}
                onJumpToMessage={onJumpToMessage}
              />
            )}

            <div className={timestampVariant === 'tuck' ? 'overflow-hidden' : undefined}>
              {renderMessageContent()}
              {(isDeleted || isRevokedByContact) && (
                <div className="mt-1 text-xs italic text-muted-foreground opacity-80">
                  {isRevokedByContact
                    ? t('messages.messageBubble.revokedByContact', 'Deleted by the contact')
                    : t('messages.messageBubble.deletedPlaceholder', 'This message was deleted')}
                  {isDeleted && isRevokeCrmOnly && (
                    <span className="ml-1">· {t('messages.messageBubble.revokeCrmOnly', 'removed only in the CRM')}</span>
                  )}
                </div>
              )}
              {showTimestamp && timestampVariant === 'tuck' && (
                <MessageStatus message={message} isOwn={isOwn} onRetry={onRetry} variant="tuck" />
              )}
            </div>

            {showTimestamp && timestampVariant === 'default' && (
              <MessageStatus message={message} isOwn={isOwn} onRetry={onRetry} variant="default" />
            )}
          </div>,
        )}
      </div>

      {/* Alert Dialog para confirmação de exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader className="text-left space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <div className="flex-1 space-y-2">
                <AlertDialogTitle className="text-lg font-semibold">
                  {t('messages.messageBubble.deleteDialog.title')}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
                  {t('messages.messageBubble.deleteDialog.description')}
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-3 sm:gap-3">
            <AlertDialogCancel className="w-full sm:w-auto">{t('messages.messageBubble.deleteDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteMessage}
              className="w-full sm:w-auto bg-destructive text-white hover:bg-destructive/90 focus:ring-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('messages.messageBubble.deleteDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MessageBubble;
