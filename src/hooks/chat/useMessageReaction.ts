import { useCallback, useRef } from 'react';
import { toast } from 'sonner';
import chatService from '@/services/chat/chatService';
import { useLanguage } from '@/hooks/useLanguage';
import { myReaction } from '@/components/chat/messages/utils/reactions';
import type { Message, MessageReaction } from '@/types/chat/api';

type ApplyMyReaction = (conversationId: string, messageId: string, mine: MessageReaction | null) => void;

/**
 * Reagir (emoji vazio remove): mostra na hora, confirma com o que o servidor gravou e,
 * se falhar, avisa e devolve a reação anterior. Usado no chat completo e no painel do funil.
 */
export function useMessageReaction(apply: ApplyMyReaction) {
  const { t } = useLanguage('chat');
  const pendingRef = useRef(new Set<string>());

  return useCallback(
    async (conversationId: string, message: Message, emoji: string) => {
      const id = String(message.id);
      // Um envio por vez por mensagem: assim o desfazer nunca atropela outro clique.
      if (pendingRef.current.has(id)) return;
      pendingRef.current.add(id);
      const previous = myReaction(message.content_attributes?.reactions);
      apply(conversationId, message.id, emoji ? { emoji, from: 'me', user_id: null, at: Math.floor(Date.now() / 1000) } : null);
      try {
        const saved = await chatService.reactToMessage(conversationId, message.id, emoji);
        apply(conversationId, message.id, myReaction(saved.content_attributes?.reactions));
      } catch {
        apply(conversationId, message.id, previous);
        toast.error(t('messages.messageBubble.reactions.error'));
      } finally {
        pendingRef.current.delete(id);
      }
    },
    [apply, t],
  );
}
