import React from 'react';
import { User } from 'lucide-react';
import { Attachment } from '@/types/chat/api';
import { useLanguage } from '@/hooks/useLanguage';

interface MessageContactProps {
  attachments: Attachment[];
}

const MessageContact: React.FC<MessageContactProps> = ({ attachments }) => {
  const { t } = useLanguage('chat');

  return (
    <div className="space-y-2">
      {attachments
        .filter(attachment => attachment && attachment.file_type === 'contact')
        .map((attachment, index) => (
          <div
            key={attachment.id || index}
            className="flex items-start gap-2.5 p-2.5 rounded-lg"
            style={{
              minWidth: '240px',
              maxWidth: 'min(300px, calc(100vw - 120px))',
            }}
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-foreground leading-tight mb-0.5">
                {attachment.meta?.display_name || t('messages.messageContact.sharedContact')}
              </div>
              <div className="text-xs text-muted-foreground leading-tight">
                {attachment.fallback_title || t('messages.messageContact.unknownPhone')}
              </div>
            </div>
          </div>
        ))}
    </div>
  );
};

export default MessageContact;
