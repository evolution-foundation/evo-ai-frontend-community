import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label as UILabel,
  Textarea,
} from '@evoapi/design-system';
import {
  CannedResponse,
  CannedResponseFormData,
  CannedResponseAttachment
} from '@/types/knowledge';
import { cannedResponsesService } from '@/services/cannedResponses/cannedResponsesService';
import { Paperclip, X, FileText, Image as ImageIcon, Film, Music } from 'lucide-react';
import { toast } from 'sonner';

interface CannedResponseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cannedResponse?: CannedResponse;
  isNew: boolean;
  loading: boolean;
  onSubmit: (data: CannedResponseFormData) => void;
}

type VariableItem = {
  key: 'contactName' | 'agentName' | 'conversationId' | 'accountName';
  placeholder: string;
};

const VARIABLE_ITEMS: VariableItem[] = [
  { key: 'contactName', placeholder: '{{contact.name}}' },
  { key: 'agentName', placeholder: '{{agent.name}}' },
  { key: 'conversationId', placeholder: '{{conversation.id}}' },
  { key: 'accountName', placeholder: '{{account.name}}' },
];

export default function CannedResponseModal({
  open,
  onOpenChange,
  cannedResponse,
  isNew,
  loading,
  onSubmit,
}: CannedResponseModalProps) {
  const { t } = useLanguage('cannedResponses');
  const [formData, setFormData] = useState<CannedResponseFormData>({
    short_code: '',
    content: '',
    attachments: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [existingAttachments, setExistingAttachments] = useState<CannedResponseAttachment[]>([]);
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<string[]>([]);
  const contentRef = useRef<HTMLTextAreaElement | null>(null);
  const contentSelectionRef = useRef({ start: 0, end: 0 });

  useEffect(() => {
    if (open) {
      if (cannedResponse && !isNew) {
        setFormData({
          short_code: cannedResponse.short_code,
          content: cannedResponse.content,
          attachments: [],
        });
        setExistingAttachments(cannedResponse.attachments || []);
      } else {
        setFormData({
          short_code: '',
          content: '',
          attachments: [],
        });
        setExistingAttachments([]);
      }
      setErrors({});
      setRemovedAttachmentIds([]);
    }
  }, [open, cannedResponse, isNew]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.short_code.trim()) {
      newErrors.short_code = t('modal.validation.shortCodeRequired');
    } else if (formData.short_code.length < 2) {
      newErrors.short_code = t('modal.validation.shortCodeMinLength');
    } else if (!cannedResponsesService.isValidShortCode(formData.short_code)) {
      newErrors.short_code = t('modal.validation.shortCodeInvalid');
    }

    if (!formData.content.trim()) {
      newErrors.content = t('modal.validation.contentRequired');
    } else if (formData.content.length < 10) {
      newErrors.content = t('modal.validation.contentMinLength');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    onSubmit({ ...formData, removeAttachmentIds: removedAttachmentIds });
  };

  const handleInputChange = (field: keyof CannedResponseFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Auto-generate short code suggestion when content changes
  const handleContentChange = (value: string) => {
    handleInputChange('content', value);

    // Only suggest if creating new and short_code is empty
    if (isNew && !formData.short_code.trim() && value.trim()) {
      const suggestion = cannedResponsesService.generateShortCode(value);
      if (suggestion) {
        setFormData(prev => ({ ...prev, short_code: suggestion }));
      }
    }
  };

  // 🎯 FILE UPLOAD: Gerenciar arquivos
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (files.length === 0) return;

    // Validar tamanho e tipo
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'audio/mpeg', 'audio/wav', 'audio/ogg',
      'video/mp4', 'video/webm',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    const validFiles: File[] = [];

    files.forEach(file => {
      if (file.size > maxSize) {
        toast.error(`Arquivo ${file.name} é muito grande (máximo 10MB)`);
        return;
      }

      if (!allowedTypes.includes(file.type)) {
        toast.error(`Tipo de arquivo ${file.name} não permitido`);
        return;
      }

      validFiles.push(file);
    });

    if (validFiles.length > 0) {
      setFormData(prev => ({
        ...prev,
        attachments: [...(prev.attachments || []), ...validFiles]
      }));
    }

    // Limpar input
    e.target.value = '';
  };

  const handleRemoveFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments?.filter((_, i) => i !== index)
    }));
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <ImageIcon className="h-4 w-4" />;
    if (fileType.startsWith('audio/')) return <Music className="h-4 w-4" />;
    if (fileType.startsWith('video/')) return <Film className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const updateSelection = (element: HTMLTextAreaElement) => {
    contentSelectionRef.current = {
      start: element.selectionStart ?? 0,
      end: element.selectionEnd ?? 0,
    };
  };

  const insertVariableAtCursor = (placeholder: string) => {
    const textarea = contentRef.current;
    const currentContent = formData.content || '';

    const selectionStart = textarea
      ? (textarea.selectionStart ?? currentContent.length)
      : Math.min(contentSelectionRef.current.start, currentContent.length);
    const selectionEnd = textarea
      ? (textarea.selectionEnd ?? currentContent.length)
      : Math.min(contentSelectionRef.current.end, currentContent.length);

    const nextContent = `${currentContent.slice(0, selectionStart)}${placeholder}${currentContent.slice(selectionEnd)}`;

    handleContentChange(nextContent);

    requestAnimationFrame(() => {
      if (!textarea) {
        return;
      }
      const newCursorPosition = selectionStart + placeholder.length;
      textarea.focus();
      textarea.setSelectionRange(newCursorPosition, newCursorPosition);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isNew ? t('modal.new.title') : t('modal.edit.title')}
          </DialogTitle>
          <DialogDescription>
            {isNew
              ? t('modal.new.description')
              : t('modal.edit.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Short Code */}
          <div className="space-y-2">
            <UILabel htmlFor="short_code">
              {t('modal.fields.shortCode.label')} <span className="text-destructive">*</span>
            </UILabel>
            <Input
              id="short_code"
              value={formData.short_code}
              onChange={(e) => handleInputChange('short_code', e.target.value)}
              placeholder={t('modal.fields.shortCode.placeholder')}
              className={`font-mono ${errors.short_code ? 'border-destructive' : ''}`}
              disabled={!isNew} // Can't change code when editing
            />
            {errors.short_code && (
              <p className="text-sm text-destructive">{errors.short_code}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {t('modal.fields.shortCode.hint')}
            </p>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <UILabel htmlFor="content">
              {t('modal.fields.content.label')} <span className="text-destructive">*</span>
            </UILabel>
            <Textarea
              id="content"
              ref={contentRef}
              value={formData.content}
              onChange={(e) => handleContentChange(e.target.value)}
              onSelect={(e) => updateSelection(e.currentTarget)}
              onClick={(e) => updateSelection(e.currentTarget)}
              onKeyUp={(e) => updateSelection(e.currentTarget)}
              placeholder={t('modal.fields.content.placeholder')}
              className={`resize-none min-h-[120px] ${errors.content ? 'border-destructive' : ''}`}
              rows={6}
            />
            {errors.content && (
              <p className="text-sm text-destructive">{errors.content}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {t('modal.fields.content.hint')}
            </p>
          </div>

          {/* 🎯 ATTACHMENTS: Upload de arquivos */}
          <div className="space-y-2">
            <UILabel>{t('modal.fields.attachments.label')}</UILabel>

            {/* Botão de upload */}
            <div className="flex items-center gap-2">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                multiple
                accept="image/*,audio/*,video/*,.pdf,.doc,.docx"
                onChange={handleFileSelect}
                disabled={loading}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('file-upload')?.click()}
                disabled={loading}
              >
                <Paperclip className="h-4 w-4 mr-2" />
                {t('modal.fields.attachments.addButton')}
              </Button>
              <p className="text-xs text-muted-foreground">
                {t('modal.fields.attachments.hint')}
              </p>
            </div>

            {/* Preview de anexos existentes (ao editar) */}
            {existingAttachments.some(a => !removedAttachmentIds.includes(a.id)) && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {t('modal.fields.attachments.existing')}
                </p>
                {existingAttachments
                  .filter(a => !removedAttachmentIds.includes(a.id))
                  .map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-2 bg-muted/30 rounded-md"
                  >
                    <div className="flex items-center gap-2">
                      {attachment.file_type === 'image' && <ImageIcon className="h-4 w-4 text-blue-500" />}
                      {attachment.file_type === 'audio' && <Music className="h-4 w-4 text-purple-500" />}
                      {attachment.file_type === 'video' && <Film className="h-4 w-4 text-red-500" />}
                      {attachment.file_type === 'file' && <FileText className="h-4 w-4 text-gray-500" />}
                      <div className="flex-1 min-w-0">
                        {/* não temos file_name; usa fallback_title ou o final da URL */}
                        <p className="text-sm font-medium truncate">
                          {attachment.fallback_title ||
                            decodeURIComponent(
                              (attachment.data_url ?? '').split('/').pop() || 'attachment'
                            )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(attachment.file_size ?? 0)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <a
                        href={attachment.data_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs underline text-primary"
                      >
                        Abrir
                      </a>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setRemovedAttachmentIds(prev => [...prev, attachment.id])}
                        disabled={loading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  ))}
              </div>
            )}


            {/* Preview de novos anexos */}
            {formData.attachments && formData.attachments.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {t('modal.fields.attachments.new')}
                </p>
                {formData.attachments.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-950 rounded-md"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {getFileIcon(file.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 flex-shrink-0"
                      onClick={() => handleRemoveFile(index)}
                      disabled={loading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Variables Help */}
          <div className="rounded-md bg-blue-50 dark:bg-blue-950 p-4">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
              {t('modal.variables.title')}
            </h4>
            <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
              {t('modal.variables.clickToInsert')}
            </p>
            <div className="space-y-2">
              {VARIABLE_ITEMS.map((variable) => (
                <button
                  key={variable.placeholder}
                  type="button"
                  className="w-full rounded-md border border-blue-200 dark:border-blue-800 bg-white/70 dark:bg-blue-900/40 px-3 py-2 text-left transition-colors hover:bg-blue-100 dark:hover:bg-blue-900"
                  onClick={() => insertVariableAtCursor(variable.placeholder)}
                  disabled={loading}
                  aria-label={`${t('modal.variables.insertAction')} ${variable.placeholder}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-blue-700 dark:text-blue-300">
                      <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{variable.placeholder}</code>
                      <span className="ml-2">- {t(`modal.variables.${variable.key}`)}</span>
                    </div>
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                      {t('modal.variables.insertAction')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {t('actions.cancel')}
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? t('modal.saving') : isNew ? t('actions.create') : t('actions.update')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
