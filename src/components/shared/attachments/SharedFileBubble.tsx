import React from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Download, FileText, Image, Video, Music, Archive } from 'lucide-react';
import type { SharedAttachment } from './SharedImageBubble';

interface SharedFileBubbleProps {
  attachments: SharedAttachment[];
  messageType?: 'in' | 'out';
  onToast?: (message: string, type?: 'success' | 'error') => void;
}

const SharedFileBubble: React.FC<SharedFileBubbleProps> = ({
  attachments,
  messageType = 'in',
  onToast
}) => {
  const { t } = useLanguage('attachments');

  const getFileIcon = (fileType: string) => {
    const type = fileType.toLowerCase();

    if (type.includes('image')) return <Image className="w-6 h-6" />;
    if (type.includes('video')) return <Video className="w-6 h-6" />;
    if (type.includes('audio')) return <Music className="w-6 h-6" />;
    if (type.includes('pdf') || type.includes('document') || type.includes('text')) return <FileText className="w-6 h-6" />;
    if (type.includes('zip') || type.includes('rar') || type.includes('archive')) return <Archive className="w-6 h-6" />;

    return <FileText className="w-6 h-6" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return `0 ${t('file.size.bytes')}`;

    const k = 1024;
    const sizes = [
      t('file.size.bytes'),
      t('file.size.kilobytes'),
      t('file.size.megabytes'),
      t('file.size.gigabytes')
    ];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const downloadFile = (attachment: SharedAttachment) => {
    const url = attachment.data_url || attachment.file_url;
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.fallback_title || 'file';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onToast?.(t('file.downloadStarted', { filename: attachment.fallback_title || t('file.title') }), 'success');
    }
  };

  return (
    <div className="space-y-2">
      {attachments.map((attachment, index) => (
        <div
          key={attachment.id || index}
          className={`
            border-2 border-dashed rounded-lg p-4 max-w-sm transition-all duration-200
            ${messageType === 'out'
              ? 'border-white/30 bg-white/5 hover:bg-white/10'
              : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
            }
          `}
        >
          <div className="flex items-center gap-3">
            {/* File Icon */}
            <div className={`
              flex-shrink-0 p-2 rounded-lg
              ${messageType === 'out'
                ? 'bg-white/20 text-white/80'
                : 'bg-slate-200 text-slate-600'
              }
            `}>
              {getFileIcon(attachment.file_type)}
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h4 className={`
                    text-sm font-medium truncate
                    ${messageType === 'out' ? 'text-white/90' : 'text-slate-700'}
                  `}>
                    {attachment.fallback_title || t('file.title')}
                  </h4>
                  <p className={`
                    text-xs mt-1
                    ${messageType === 'out' ? 'text-white/60' : 'text-slate-500'}
                  `}>
                    {formatFileSize(attachment.file_size)}
                  </p>
                </div>

                {/* Download Button */}
                <button
                  onClick={() => downloadFile(attachment)}
                  className={`
                    flex-shrink-0 p-2 rounded-lg transition-all duration-200 hover:scale-105
                    ${messageType === 'out'
                      ? 'bg-white/20 text-white/80 hover:bg-white/30'
                      : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                    }
                  `}
                  title={t('file.download')}
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>

              {/* File Type Badge */}
              <div className="mt-2">
                <span className={`
                  inline-block px-2 py-1 rounded-full text-xs font-medium
                  ${messageType === 'out'
                    ? 'bg-white/20 text-white/80'
                    : 'bg-slate-200 text-slate-600'
                  }
                `}>
                  {attachment.file_type.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SharedFileBubble;
