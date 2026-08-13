import React, { useCallback, useState, useEffect } from 'react';
import { Button } from '@evoapi/design-system/button';
import { Paperclip, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';

export type FileUploadCategory = 'document' | 'media' | 'all';

const CATEGORY_ALLOWED_TYPES: Record<FileUploadCategory, string[]> = {
  document: [
    'application/pdf',
    'text/*',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  media: ['image/*', 'video/*'],
  all: [
    'image/*',
    'application/pdf',
    'text/*',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'audio/*',
    'video/*',
  ],
};

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  maxFileSize?: number; // em MB
  allowedTypes?: string[];
  /**
   * Restricts the picker/drop target to a category. Ignored when `allowedTypes`
   * is explicitly passed. Defaults to 'all' for backward compatibility.
   */
  category?: FileUploadCategory;
  multiple?: boolean;
  disabled?: boolean;
  /**
   * Unique id for the hidden <input>. Required when more than one FileUpload
   * instance is mounted at once (e.g. Documentos + Fotos e Vídeos in the same
   * composer) — the trigger click resolves the input by this id.
   */
  inputId?: string;
  /**
   * Registers the document-level drag&drop listeners + full-screen drop overlay.
   * When multiple FileUpload instances share a screen, only one should own this
   * (default true) to avoid duplicate global listeners / double-added files.
   */
  enableGlobalDropZone?: boolean;
  /** Custom trigger content; defaults to the standalone Paperclip icon button. */
  children?: React.ReactNode;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFilesSelected,
  maxFileSize = 10,
  allowedTypes,
  category = 'all',
  multiple = true,
  disabled = false,
  inputId = 'file-input',
  enableGlobalDropZone = true,
  children,
}) => {
  const { t } = useLanguage('chat');
  const [isDragOver, setIsDragOver] = useState(false);
  const resolvedAllowedTypes = allowedTypes ?? CATEGORY_ALLOWED_TYPES[category];

  const validateFile = useCallback(
    (file: File): boolean => {
      // Validar tamanho
      if (file.size > maxFileSize * 1024 * 1024) {
        toast.error(t('messageInput.fileUpload.errors.fileTooLarge'), {
          description: t('messageInput.fileUpload.errors.fileTooLargeDescription', {
            fileName: file.name,
            maxSize: maxFileSize,
          }),
        });
        return false;
      }

      // Validar tipo
      const isValidType = resolvedAllowedTypes.some(type => {
        if (type.endsWith('/*')) {
          const baseType = type.split('/')[0];
          return file.type.startsWith(baseType + '/');
        }
        return file.type === type;
      });

      if (!isValidType) {
        toast.error(t('messageInput.fileUpload.errors.fileTypeNotAllowed'), {
          description: t('messageInput.fileUpload.errors.fileTypeNotAllowedDescription', {
            fileName: file.name,
          }),
        });
        return false;
      }

      return true;
    },
    [maxFileSize, resolvedAllowedTypes, t],
  );

  const handleFiles = useCallback(
    (files: FileList) => {
      const fileArray = Array.from(files);
      const validFiles = fileArray.filter(validateFile);

      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
    },
    [validateFile, onFilesSelected],
  );

  // Event listeners globais para drag & drop
  useEffect(() => {
    if (!enableGlobalDropZone) return;

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (!disabled && e.dataTransfer?.types.includes('Files')) {
        setIsDragOver(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      // Só remove o overlay se sair completamente da janela
      if (!e.relatedTarget) {
        setIsDragOver(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      if (disabled) return;

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        handleFiles(files);
      }
    };

    // Adicionar listeners globais
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('drop', handleDrop);

    return () => {
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('drop', handleDrop);
    };
  }, [disabled, enableGlobalDropZone, handleFiles]);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFiles(files);
      }
      // Reset input para permitir selecionar o mesmo arquivo novamente
      e.target.value = '';
    },
    [handleFiles],
  );

  const formatFileTypes = () => {
    return resolvedAllowedTypes
      .map(type => {
        if (type === 'image/*') return t('messageInput.fileUpload.fileTypes.images');
        if (type === 'application/pdf') return t('messageInput.fileUpload.fileTypes.pdf');
        if (type === 'text/*') return t('messageInput.fileUpload.fileTypes.text');
        if (type === 'audio/*') return t('messageInput.fileUpload.fileTypes.audio');
        if (type === 'video/*') return t('messageInput.fileUpload.fileTypes.video');
        if (type.includes('word')) return t('messageInput.fileUpload.fileTypes.word');
        return type;
      })
      .join(', ');
  };

  return (
    <>
      {/* File Input (hidden) */}
      <input
        id={inputId}
        type="file"
        multiple={multiple}
        accept={resolvedAllowedTypes.join(',')}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Upload Trigger — `contents` keeps this wrapper out of the parent flex
          row's box model. Without it, every hidden-trigger instance (children=
          <></>, used by the composer's three hidden pickers) still counts as a
          zero-width flex item that claims its own `gap` slot, stealing width
          from siblings sized via `flex-1` (see the message composer pill). */}
      <span
        className="contents"
        onClick={() => {
          if (!disabled) {
            document.getElementById(inputId)?.click();
          }
        }}
      >
        {children ?? (
          <Button
            variant="outline"
            size="icon"
            disabled={disabled}
            className="flex-shrink-0"
            title={t('messageInput.fileUpload.attachFiles')}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
        )}
      </span>

      {/* Drag overlay when dragging over the entire chat */}
      {enableGlobalDropZone && isDragOver && (
        <div className="fixed inset-0 bg-primary/10 backdrop-blur-sm z-40 flex items-center justify-center">
          <div className="bg-background border-2 border-dashed border-primary rounded-lg p-8 text-center shadow-lg">
            <Upload className="h-16 w-16 mx-auto mb-4 text-primary" />
            <h3 className="text-xl font-semibold mb-2 text-primary">{t('messageInput.fileUpload.dropFiles')}</h3>
            <p className="text-sm text-muted-foreground">
              {formatFileTypes()} • {t('messageInput.fileUpload.maxSize', { maxSize: maxFileSize })}
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default FileUpload;
