import React from 'react';
import { Button } from '@evoapi/design-system/button';
import { Check, CheckCheck, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Message } from '@/types/chat/api';
import { formatMessageTime } from '@/utils/time/timeHelpers';
import { useLanguage } from '@/hooks/useLanguage';
import { getFriendlyDeliveryError } from './utils/deliveryErrorMessages';

interface MessageStatusProps {
  message: Message;
  isOwn: boolean;
  onRetry?: () => void;
  // 'tuck': float:right dentro do fluxo do texto (bolha curta, estilo WhatsApp).
  // 'default': bloco separado abaixo do conteúdo (mídia/cards/preview, mais alto).
  // Nunca 'absolute' — o protótipo reserva espaço em fluxo nos dois casos, sem overlap.
  variant?: 'default' | 'tuck';
}

const MessageStatus: React.FC<MessageStatusProps> = ({ message, isOwn, onRetry, variant = 'default' }) => {
  const { t } = useLanguage('chat');

  // MessageBubble só colore a bolha (bg-primary/bg-purple-600) quando isOwn — isFromAgent/
  // isFromBot ali só ficam true junto de isOwn (ver MessageList.tsx). Notas privadas mantêm
  // fundo claro mesmo com isOwn, então ficam com o texto neutro.
  const isOnColoredBubble = isOwn && !message.private;
  const timeTextClass = isOnColoredBubble ? 'text-white/70' : 'text-muted-foreground';

  const getStatusIcon = () => {
    if (!isOwn) return null;

    // CORREÇÃO: Tratar mensagens privadas sempre como enviadas com sucesso
    if (message.private) {
      // Mensagens privadas são sempre "bem-sucedidas" (salvas no banco)
      return <Check className="h-3 w-3 text-muted-foreground" />;
    }

    switch (message.status) {
      case 'sent':
        // Para mensagens privadas, 'sent' é o status final correto
        // Para mensagens públicas, 'sent' indica que foi enviada para o canal
        return <Check className="h-3 w-3 text-muted-foreground" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-primary" />;
      case 'progress':
        return <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />;
      case 'failed': {
        // The backend already captures the real provider error (e.g. "131026: Message
        // undeliverable") in content_attributes.external_error. A raw error code means
        // nothing to a non-technical agent, so translate the ones we recognize into
        // plain language and show THAT as the label — the raw code stays available in
        // the tooltip for anyone who wants the technical detail.
        const externalError = message.content_attributes?.external_error;
        const friendlyError = getFriendlyDeliveryError(externalError);
        const displayText = friendlyError || externalError || t('messages.messageStatus.tryAgain');
        const titleText = externalError
          ? friendlyError
            ? `${friendlyError} (${externalError})`
            : `${t('messages.messageStatus.sendFailed')}: ${externalError}`
          : t('messages.messageStatus.sendFailed');

        return (
          <Button
            size="sm"
            variant="ghost"
            className="h-auto p-0 max-w-[240px] text-destructive hover:text-destructive/80"
            onClick={() => {
              if (onRetry) {
                onRetry();
              } else {
                toast.error(t('messages.messageStatus.retryInDevelopment'));
              }
            }}
            title={titleText}
          >
            <AlertCircle className="h-3 w-3 flex-shrink-0" />
            <span className="ml-1 text-xs truncate">{displayText}</span>
          </Button>
        );
      }
      default:
        return <Clock className="h-3 w-3 text-muted-foreground animate-pulse" />;
    }
  };

  // 'tuck' fica em fluxo normal (float, sem position:absolute) — precisa ser renderizado
  // como o último nó dentro do MESMO bloco de texto para "grudar" na última linha, à
  // la WhatsApp. Ver uso em MessageBubble (wrapper com overflow:hidden faz o clearfix).
  if (variant === 'tuck') {
    return (
      <span
        className={`float-right inline-flex items-center gap-1 mt-1.5 ml-3.5 text-[11px] leading-none ${timeTextClass}`}
      >
        <span>{formatMessageTime(message.created_at)}</span>
        {getStatusIcon()}
      </span>
    );
  }

  return (
    <div
      className={`flex items-center gap-1 mt-1.5 text-xs ${isOwn ? 'justify-end' : 'justify-start'}`}
    >
      <span className="text-muted-foreground">{formatMessageTime(message.created_at)}</span>
      {getStatusIcon()}
    </div>
  );
};

export default MessageStatus;
