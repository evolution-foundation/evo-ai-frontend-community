import i18n from '@/i18n/config';
import { useTranslation as useUiTranslation } from 'react-i18next';
import { useState, useRef } from 'react';
import { Button, Textarea } from '@evoapi/design-system';
import { Send, Paperclip, X, Image, FileText, File, Loader2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { formatFileSize, isImageFile, type FileData } from '@/utils/fileUtils';
import { toast } from 'sonner';

interface AgentMessageInputProps {
  onSendMessage: (content: string, files?: FileData[]) => Promise<void>;
  isDisabled?: boolean;
  placeholder?: string;
}

export function AgentMessageInput({
  onSendMessage,
  isDisabled = false,
  placeholder,
}: AgentMessageInputProps) {
  const { t: tUi } = useUiTranslation();
  const { t } = useLanguage('aiAgents');
  const [messageInput, setMessageInput] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<FileData[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!messageInput.trim() && selectedFiles.length === 0) || isDisabled) return;

    await onSendMessage(messageInput, selectedFiles.length > 0 ? selectedFiles : undefined);
    setMessageInput('');
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e as unknown as React.FormEvent);
    }
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const newFiles = Array.from(e.target.files);
    const maxFileSize = 10 * 1024 * 1024; // 10MB

    if (selectedFiles.length + newFiles.length > 5) {
      toast.error(tUi("interface:agentmessageinput.youCanAttachUpTo5Files"));
      return;
    }

    const validFiles: FileData[] = [];

    for (const file of newFiles) {
      if (file.size > maxFileSize) {
        toast.error(i18n.t("interface:messages.fileTooLarge", { name: file.name, size: formatFileSize(maxFileSize) }));
        continue;
      }

      try {
        const reader = new FileReader();
        const readFile = new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const base64 = reader.result as string;
            const base64Data = base64.split(',')[1];
            resolve(base64Data);
          };
          reader.onerror = reject;
        });

        reader.readAsDataURL(file);
        const base64Data = await readFile;
        const previewUrl = URL.createObjectURL(file);

        validFiles.push({
          filename: file.name,
          content_type: file.type,
          data: base64Data,
          size: file.size,
          preview_url: previewUrl,
        });
      } catch (error) {
        console.error('Error processing file:', error);
        toast.error(i18n.t("interface:messages.fileProcessingError", { name: file.name }));
      }
    }

    if (validFiles.length > 0) {
      setSelectedFiles([...selectedFiles, ...validFiles]);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col w-full">
      {selectedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-1.5 bg-muted rounded-lg p-2 text-xs border"
            >
              {isImageFile(file.content_type) ? (
                <Image className="h-4 w-4 text-primary" />
              ) : file.content_type === 'application/pdf' ? (
                <FileText className="h-4 w-4 text-primary" />
              ) : (
                <File className="h-4 w-4 text-primary" />
              )}
              <span className="max-w-[120px] truncate">{file.filename}</span>
              <span className="text-muted-foreground">({formatFileSize(file.size)})</span>
              <button
                onClick={() => {
                  const updatedFiles = selectedFiles.filter((_, i) => i !== index);
                  setSelectedFiles(updatedFiles);
                }}
                className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex w-full items-center gap-2">
        {selectedFiles.length < 5 && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-muted transition-colors border"
          >
            <Paperclip className="h-4 w-4" />
          </button>
        )}

        <Textarea
          value={messageInput}
          onChange={e => setMessageInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || t('chat.typeMessage') || tUi("aiAgents:chat.typeMessage")}
          className="flex-1 min-h-[40px] max-h-[240px] resize-none"
          disabled={isDisabled}
          rows={1}
        />

        <Button
          type="submit"
          disabled={isDisabled || (!messageInput.trim() && selectedFiles.length === 0)}
          size="icon"
        >
          {isDisabled ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFilesSelected}
          className="hidden"
          multiple
        />
      </form>
    </div>
  );
}

