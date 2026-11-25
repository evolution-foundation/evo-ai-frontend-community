import React from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { groupReactions } from '@/components/chat/messages/utils/reactions';
import type { MessageReaction } from '@/types/chat/api';

interface MessageReactionsProps {
  reactions?: MessageReaction[];
  alignEnd: boolean;
  /** Sem handler, os chips são só leitura. */
  onRemoveMine?: () => void;
}

/** Chips de reação sob a bolha; clicar na minha reação a remove. */
const MessageReactions: React.FC<MessageReactionsProps> = ({ reactions, alignEnd, onRemoveMine }) => {
  const { t } = useLanguage('chat');
  const groups = groupReactions(reactions);
  if (!groups.length) return null;

  return (
    <div className={`mt-1 flex flex-wrap gap-1 ${alignEnd ? 'justify-end' : 'justify-start'}`}>
      {groups.map(({ emoji, count, mine }) => {
        const className = `inline-flex h-6 items-center gap-1 rounded-full border px-2 text-sm text-foreground ${
          mine ? 'border-primary bg-primary/10' : 'border-border bg-background'
        }`;
        const content = (
          <>
            <span>{emoji}</span>
            {count > 1 && <span className="text-xs">{count}</span>}
          </>
        );
        if (!mine || !onRemoveMine) {
          return <span key={emoji} className={className}>{content}</span>;
        }
        const label = `${t('messages.messageBubble.reactions.remove')} ${emoji}`;
        return (
          <button key={emoji} type="button" className={`${className} hover:bg-primary/20`} aria-label={label} title={label} onClick={onRemoveMine}>
            {content}
          </button>
        );
      })}
    </div>
  );
};

export default MessageReactions;
