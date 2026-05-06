import React from 'react';
import { Reply } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { stripHtml } from '@/utils/stripHtml';

interface ReplyToMessageProps {
  replyTo: {
    id: string | number;
    text: string;
    sender?: string;
    type: 'in' | 'out';
    unresolved?: boolean;
  };
  messageType: 'in' | 'out';
}

export const ReplyToMessage: React.FC<ReplyToMessageProps> = ({ replyTo, messageType }) => {
  const { t } = useLanguage('widget');

  const truncateText = (text: string, maxLength: number = 40) => {
    const plain = stripHtml(text);
    if (plain.length <= maxLength) return plain;
    return plain.substring(0, maxLength) + '...';
  };

  const isUnresolved = replyTo.unresolved === true;
  const senderName = isUnresolved
    ? null
    : replyTo.sender || (replyTo.type === 'out' ? t('replyTo.you') : t('replyTo.agent'));

  return (
    <div
      className={`flex items-center gap-2 mb-1 text-xs opacity-70 ${
        messageType === 'out' ? 'justify-end' : 'justify-start'
      }`}
    >
      <Reply size={12} className="text-slate-400" />
      <div className="bg-slate-100 dark:bg-slate-800 rounded px-2 py-1 border-l-2 border-slate-300 dark:border-slate-600">
        {senderName && (
          <div className="text-slate-600 dark:text-slate-300 font-medium">{senderName}</div>
        )}
        <div
          className={`text-slate-500 dark:text-slate-400 ${isUnresolved ? 'italic' : ''}`}
        >
          {isUnresolved ? replyTo.text : truncateText(replyTo.text)}
        </div>
      </div>
    </div>
  );
};
