import React from 'react';
import { Button } from '@evoapi/design-system/button';
import { Check, CheckCheck, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Message } from '@/types/chat/api';
import { formatMessageTime } from '@/utils/time/timeHelpers';
import { useLanguage } from '@/hooks/useLanguage';

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

  // Sobre a bolha colorida (primary ou roxa) nada pode usar a cor da bolha; "lido" tem cor própria.
  const iconClass = isOnColoredBubble ? 'h-3 w-3 text-white/70' : 'h-3 w-3 text-muted-foreground';
  const readIconClass = isOnColoredBubble ? 'h-3 w-3 text-sky-300' : 'h-3 w-3 text-sky-500';

  const getStatusIcon = () => {
    if (!isOwn) return null;

    // CORREÇÃO: Tratar mensagens privadas sempre como enviadas com sucesso
    if (message.private) {
      // Mensagens privadas são sempre "bem-sucedidas" (salvas no banco)
      return <Check className="h-3 w-3 text-muted-foreground" />;
    }

    // CORREÇÃO: Em ambiente de desenvolvimento, canais podem não estar configurados
    // Se for uma mensagem pública com status 'failed', pode ser problema de configuração
    if (message.status === 'failed' && !message.private) {
      return (
        <Button
          size="sm"
          variant="ghost"
          className="h-auto p-0 text-orange-500 hover:text-orange-600"
          onClick={e => {
            e.preventDefault();
            e.stopPropagation();

            // Mostrar toast explicativo sobre o problema do webhook
            toast.warning(t('messages.messageStatus.statusUnavailable'), {
              description: t('messages.messageStatus.statusUnavailableDescription'),
            });
            toast.info(t('messages.messageStatus.checkChannelConfig'), {
              description: t('messages.messageStatus.webhookIssue'),
            });

            // Se existe função onRetry, também executar (para tentar reenviar)
            if (onRetry) {
              setTimeout(() => {
                onRetry();
              }, 1000); // Delay para que o usuário veja o toast primeiro
            }
          }}
          title={t('messages.messageStatus.deliveryStatusUnavailable')}
        >
          <AlertCircle className="h-3 w-3" />
          <span className="ml-1 text-xs">{t('messages.messageStatus.statusUnavailableText')}</span>
        </Button>
      );
    }

    switch (message.status) {
      case 'sent':
        // Para mensagens privadas, 'sent' é o status final correto
        // Para mensagens públicas, 'sent' indica que foi enviada para o canal
        return <Check className={iconClass} />;
      case 'delivered':
        return <CheckCheck className={iconClass} />;
      case 'read':
        return <CheckCheck className={readIconClass} />;
      case 'progress':
        return <Loader2 className={`${iconClass} animate-spin`} />;
      case 'failed':
        return (
          <Button
            size="sm"
            variant="ghost"
            className="h-auto p-0 text-destructive hover:text-destructive/80"
            onClick={() => {
              if (onRetry) {
                onRetry();
              } else {
                toast.error(t('messages.messageStatus.retryInDevelopment'));
              }
            }}
            title={t('messages.messageStatus.sendFailed')}
          >
            <AlertCircle className="h-3 w-3" />
            <span className="ml-1 text-xs">{t('messages.messageStatus.tryAgain')}</span>
          </Button>
        );
      default:
        return <Clock className={`${iconClass} animate-pulse`} />;
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
      <span className={timeTextClass}>{formatMessageTime(message.created_at)}</span>
      {getStatusIcon()}
    </div>
  );
};

export default MessageStatus;
