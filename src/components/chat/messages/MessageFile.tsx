import React from 'react';
import { Button } from '@evoapi/design-system/button';
import { Download, FileText, File, Image, Music, Video } from 'lucide-react';
import { toast } from 'sonner';
import { Attachment } from '@/types/chat/api';
import { useLanguage } from '@/hooks/useLanguage';
import { openAttachmentInNewTab } from '@/components/chat/messages/utils/openAttachmentInNewTab';

interface MessageFileProps {
  attachments: Attachment[];
}

const MessageFile: React.FC<MessageFileProps> = ({ attachments }) => {
  const { t } = useLanguage('chat');

  const downloadFile = async (attachment: Attachment) => {
    const url = attachment.data_url?.trim();
    if (!url) return;

    const filename = attachment.fallback_title || t('messages.messageFile.fileFallback');

    try {
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) {
        console.warn('[MessageFile] non-ok response:', response.status, url);
        toast.warning(t('messages.messageFile.downloadFallbackOpenedInNewTab'), {
          description: t('messages.messageFile.downloadFallbackReason.serverError', { status: response.status }),
        });
        openAttachmentInNewTab({ url, filename });
        return;
      }
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      link.click();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
    } catch (err) {
      console.warn('[MessageFile] download fallback after fetch error:', err);
      toast.warning(t('messages.messageFile.downloadFallbackOpenedInNewTab'), {
        description: t('messages.messageFile.downloadFallbackReason.network'),
      });
      openAttachmentInNewTab({ url, filename });
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return t('messages.messageFile.unknownSize');

    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (extension?: string) => {
    if (!extension)
      return (
        <File className="h-6 w-6 text-primary-foreground/80 dark:text-primary-foreground/70" />
      );

    const ext = extension.toLowerCase();

    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
      return (
        <Image className="h-6 w-6 text-primary-foreground/80 dark:text-primary-foreground/70" />
      );
    }
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) {
      return (
        <Music className="h-6 w-6 text-primary-foreground/80 dark:text-primary-foreground/70" />
      );
    }
    if (['mp4', 'avi', 'mov', 'wmv'].includes(ext)) {
      return (
        <Video className="h-6 w-6 text-primary-foreground/80 dark:text-primary-foreground/70" />
      );
    }
    if (['pdf', 'doc', 'docx', 'txt'].includes(ext)) {
      return (
        <FileText className="h-6 w-6 text-primary-foreground/80 dark:text-primary-foreground/70" />
      );
    }

    return <File className="h-6 w-6 text-primary-foreground/80 dark:text-primary-foreground/70" />;
  };

  return (
    <div className="space-y-2">
      {attachments
        .filter(attachment => {
          // 🔒 FILTRAR: Apenas attachments com data_url válido e não vazio
          return attachment && attachment.data_url && attachment.data_url.trim() !== '';
        })
        .map((attachment, index) => (
        <div
          key={attachment.id || index}
          className="flex items-center gap-3 py-2 transition-colors w-full"
          style={{
            minWidth: '200px',
            maxWidth: 'min(280px, calc(100vw - 120px))',
          }}
        >
          {getFileIcon(attachment.extension!)}

          <div className="flex-1 min-w-0">
            <div className="font-medium truncate text-sm">
              {attachment.fallback_title || t('messages.messageFile.fileFallbackTitle')}
            </div>
            <div className="text-xs text-primary-foreground/80 dark:text-primary-foreground/70">
              {formatFileSize(attachment.file_size)}
              {attachment.extension && ` • ${attachment.extension.toUpperCase()}`}
            </div>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => downloadFile(attachment)}
            className="h-8 w-8 rounded-full hover:bg-primary-foreground/20 text-primary-foreground/80 dark:text-primary-foreground/70 flex-shrink-0 p-0"
          >
            <Download className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );
};

export default MessageFile;
