import React, { useState } from 'react';
import { Button } from '@evoapi/design-system/button';
import { Download, FileVideo } from 'lucide-react';
import { Attachment } from '@/types/chat/api';
import { useLanguage } from '@/hooks/useLanguage';
import { openAttachmentInNewTab } from '@/components/chat/messages/utils/openAttachmentInNewTab';

interface MessageVideoProps {
  attachments: Attachment[];
}

// Render incoming/outgoing video attachments inline with native controls.
// Falls back to a download tile when the attachment URL is missing or the
// browser can't decode the source — keeps parity with MessageImage and
// MessageFile, including the open-in-new-tab affordance.
const MessageVideo: React.FC<MessageVideoProps> = ({ attachments }) => {
  const { t } = useLanguage('chat');
  const [failedSources, setFailedSources] = useState<Set<string>>(new Set());

  const resolveVideoSrc = (attachment: Attachment): string | null => {
    const src = attachment.data_url;
    return src && src.trim() !== '' ? src : null;
  };

  const onError = (src: string) => {
    setFailedSources(prev => {
      if (prev.has(src)) return prev;
      const next = new Set(prev);
      next.add(src);
      return next;
    });
  };

  return (
    <div className="space-y-2">
      {attachments.map(attachment => {
        const src = resolveVideoSrc(attachment);
        const filename = attachment.fallback_title || `video-${attachment.id}`;

        if (!src || failedSources.has(src)) {
          return (
            <div
              key={attachment.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3"
            >
              <FileVideo className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{filename}</div>
                {attachment.file_size ? (
                  <div className="text-xs text-muted-foreground">
                    {Math.round(attachment.file_size / 1024)} KB
                  </div>
                ) : null}
              </div>
              {src ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => openAttachmentInNewTab({ url: src, filename })}
                  title={t('messageBubble.openInNewTab')}
                >
                  <Download className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          );
        }

        return (
          <div key={attachment.id} className="overflow-hidden rounded-lg bg-black/40 max-w-md">
            <video
              src={src}
              controls
              preload="metadata"
              playsInline
              className="block w-full h-auto"
              onError={() => onError(src)}
            >
              {/* Browsers that can't render the codec hit onError above and
                  fall through to the download tile on the next render. */}
              <a href={src} target="_blank" rel="noopener noreferrer">
                {filename}
              </a>
            </video>
          </div>
        );
      })}
    </div>
  );
};

export default MessageVideo;
