import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import EmojiPicker from '@/components/chat/message-input/EmojiPicker';
import { QUICK_REACTIONS } from '@/components/chat/messages/utils/reactions';

interface ReactionPickerProps {
  current?: string;
  /** Emoji vazio remove a reação. */
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

const buttonClass = 'flex h-9 w-9 items-center justify-center rounded-full text-xl hover:bg-muted';

const ReactionPicker: React.FC<ReactionPickerProps> = ({ current, onSelect, onClose }) => {
  const { t } = useLanguage('chat');
  const [showAll, setShowAll] = useState(false);
  const choose = (emoji: string) => onSelect(emoji === current ? '' : emoji);

  if (showAll) {
    return <EmojiPicker isOpen inline onClose={onClose} onEmojiSelect={choose} />;
  }

  return (
    <div className="flex items-center gap-0.5 rounded-full border bg-popover p-1 shadow-lg">
      {QUICK_REACTIONS.map(emoji => (
        <button
          key={emoji}
          type="button"
          aria-pressed={emoji === current}
          className={`${buttonClass} ${emoji === current ? 'bg-primary/20' : ''}`}
          onClick={() => choose(emoji)}
        >
          {emoji}
        </button>
      ))}
      <button
        type="button"
        aria-label={t('messages.messageBubble.reactions.more')}
        title={t('messages.messageBubble.reactions.more')}
        className={`${buttonClass} text-muted-foreground`}
        onClick={() => setShowAll(true)}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
};

export default ReactionPicker;
