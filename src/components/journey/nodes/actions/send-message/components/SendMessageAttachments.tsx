import type { RefObject } from 'react';
import { Button, Label } from '@evoapi/design-system';
import { AlertCircle, CheckCircle, File, Paperclip, Upload, X } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

export interface AttachmentFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'uploading' | 'uploaded' | 'error';
  uploadProgress?: number;
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

interface SendMessageAttachmentsProps {
  attachments: AttachmentFile[];
  isDragOver: boolean;
  loading: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAttachment: (id: string) => void;
}

// Drag-and-drop dropzone + the list of files already attached to the send.
// Attachments only apply to free-text mode (a template send can't carry
// them) — the caller decides whether to render this at all.
export function SendMessageAttachments({
  attachments,
  isDragOver,
  loading,
  fileInputRef,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileInputChange,
  onRemoveAttachment,
}: SendMessageAttachmentsProps) {
  const { t } = useLanguage('journey');

  return (
    <>
      <div className="space-y-2">
        <Label id="send-message-attachments-label" className="text-sm font-medium">
          {t('panels.sendMessage.attachments')}
        </Label>

        {/* The file input is display:none, so it is out of the a11y tree and
            cannot carry the label. The dropzone holds the visible control. */}
        <div
          className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
            isDragOver
              ? 'border-flow-node-action-message-fg bg-flow-node-action-message-bg'
              : 'border-border hover:border-flow-node-action-message-border'
          }`}
          role="group"
          aria-labelledby="send-message-attachments-label"
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-foreground mb-1">{t('panels.sendMessage.dragFiles')}</p>
          <p className="text-xs text-muted-foreground mb-3">
            {t('panels.sendMessage.maxFileSize')}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
          >
            <Paperclip className="w-3 h-3 mr-1" />
            {t('panels.sendMessage.chooseFiles')}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={onFileInputChange}
            accept="*/*"
          />
        </div>
      </div>

      {attachments.length > 0 && (
        <div className="space-y-2">
          <Label id="send-message-attachments-list-label" className="text-sm font-medium">
            {t('panels.sendMessage.attachmentsList', { count: attachments.length })}
          </Label>
          <div
            className="space-y-2 max-h-32 overflow-y-auto"
            role="group"
            aria-labelledby="send-message-attachments-list-label"
          >
            {attachments.map(attachment => (
              <div
                key={attachment.id}
                className="flex items-center gap-3 p-2 rounded-md bg-muted/30 border border-border"
              >
                <div className="flex-shrink-0">
                  {attachment.status === 'uploading' && (
                    <div className="w-4 h-4 border-2 border-flow-node-action-message-fg border-t-transparent rounded-full animate-spin" />
                  )}
                  {attachment.status === 'uploaded' && (
                    <CheckCircle className="w-4 h-4 text-flow-feedback-success-fg" />
                  )}
                  {attachment.status === 'error' && (
                    <AlertCircle className="w-4 h-4 text-flow-feedback-error-fg" />
                  )}
                </div>

                <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{attachment.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {attachment.size > 0 && formatFileSize(attachment.size)}
                    {attachment.status === 'uploading' &&
                      ` - ${t('panels.sendMessage.uploading', {
                        progress: attachment.uploadProgress,
                      })}`}
                    {attachment.status === 'error' && ` - ${t('panels.sendMessage.uploadError')}`}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveAttachment(attachment.id)}
                  className="flex-shrink-0 h-7 w-7 text-flow-feedback-error-fg hover:text-flow-feedback-error-fg"
                  aria-label={t('panels.sendMessage.removeAttachmentLabel') || 'Remove attachment'}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
