import React, { useMemo } from 'react';
import { Reply } from 'lucide-react';
import { Message } from '@/types/chat/api';
import { useLanguage } from '@/hooks/useLanguage';
import { stripHtml } from '@/utils/stripHtml';
import {
  attachmentI18nKey,
  mediaTypeFromAttributes,
  senderNameFromAttributes,
} from '@/utils/chat/mediaLabels';

interface ReplyPreviewProps {
  message?: Message | null;
  isOwn: boolean;
}

const ReplyPreview: React.FC<ReplyPreviewProps> = ({ message, isOwn }) => {
  const { t } = useLanguage('chat');

  const previewContent = useMemo(() => {
    if (!message) {
      return t('messages.replyPreview.previousMessage');
    }

    if (message.content) {
      const plainText = stripHtml(message.content);
      if (plainText) {
        const maxLength = 100;
        return plainText.length > maxLength
          ? `${plainText.substring(0, maxLength)}...`
          : plainText;
      }
    }

    if (message.attachments && message.attachments.length > 0) {
      const fileType = message.attachments[0].file_type || 'file';
      return t(`messages.replyPreview.${attachmentI18nKey(fileType)}`);
    }

    // Fallback: media message whose attachment didn't materialize (inline base64).
    const mediaType = mediaTypeFromAttributes(message.content_attributes);
    if (mediaType) {
      return t(`messages.replyPreview.${attachmentI18nKey(mediaType)}`);
    }

    return t('messages.replyPreview.noContent');
  }, [message, t]);

  const senderName = message
    ? senderNameFromAttributes(message.content_attributes) ||
      message.sender?.name ||
      t('messages.replyPreview.userFallback')
    : t('messages.replyPreview.userFallback');
  const isResolved = !!message;

  const handleClick = () => {
    if (!message) return;
    const messageElement = document.querySelector(
      `[data-message-id="${CSS.escape(String(message.id))}"]`,
    );
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div
      className={`px-2 py-1.5 rounded-sm mb-2 transition-colors ${
        isResolved ? 'cursor-pointer hover:opacity-80' : 'opacity-75'
      } ${
        isOwn
          ? 'bg-primary/20 dark:bg-primary/15 text-white dark:text-white/90 border-l-2 border-primary/40 dark:border-primary/50'
          : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 border-l-2 border-slate-300 dark:border-slate-600'
      }`}
      onClick={handleClick}
    >
      <div className="flex items-start gap-1.5">
        <Reply className={`h-3 w-3 flex-shrink-0 mt-0.5 ${
          isOwn
            ? 'text-white/80 dark:text-white/70'
            : 'text-slate-500 dark:text-slate-400'
        }`} />
        <div className="flex-1 min-w-0">
          {isResolved && (
            <div className={`text-xs font-medium mb-0.5 ${
              isOwn
                ? 'text-white/90 dark:text-white/90'
                : 'text-slate-700 dark:text-slate-200'
            }`}>
              {senderName}
            </div>
          )}
          <div className={`text-xs line-clamp-2 ${
            isResolved ? '' : 'italic'
          } ${
            isOwn
              ? 'text-white/80 dark:text-white/80'
              : 'text-slate-600 dark:text-slate-300'
          }`}>
            {previewContent}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReplyPreview;
