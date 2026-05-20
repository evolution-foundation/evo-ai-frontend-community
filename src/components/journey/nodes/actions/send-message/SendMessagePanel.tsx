import { useState, useEffect, useRef } from 'react';
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Badge,
  Card,
  Label,
  Checkbox,
} from '@evoapi/design-system';
import { VariableTextarea } from '@/components/journey/environment-manager';
import {
  MessageSquare,
  Paperclip,
  Upload,
  X,
  File,
  CheckCircle,
  AlertCircle,
  Mail,
  Phone,
  Send,
} from 'lucide-react';
import { SendMessageNodeData } from './SendMessageNode';
import { BaseFlowPanel } from '@/components/base';
import { automationService } from '@/services/automation/automationService';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';

interface SendMessagePanelProps {
  nodeId: string;
  data: SendMessageNodeData;
  onUpdate: (nodeId: string, newData: SendMessageNodeData) => void;
  onClose: () => void;
  journeyId?: string;
}

interface AttachmentFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'uploading' | 'uploaded' | 'error';
  uploadProgress?: number;
}

// Tipos de inbox permitidos
const ALLOWED_INBOX_TYPES = [
  'Channel::Email',
  'Channel::Whatsapp',
  'Channel::Sms',
  'Channel::TwilioSms',
  'Channel::Telegram',
  'Channel::FacebookPage',
  'Channel::Instagram',
  'Channel::Api',
  'Channel::WebWidget',
  'Channel::Line',
  'Channel::Twilio',
];

// Ícones para cada tipo de inbox
const getInboxIcon = (channelType: string) => {
  switch (channelType) {
    case 'Channel::Email':
      return <Mail className="w-4 h-4" />;
    case 'Channel::Whatsapp':
      return <MessageSquare className="w-4 h-4" />;
    case 'Channel::Sms':
    case 'Channel::TwilioSms':
    case 'Channel::Twilio':
      return <Phone className="w-4 h-4" />;
    case 'Channel::Telegram':
      return <Send className="w-4 h-4" />;
    case 'Channel::FacebookPage':
      return <MessageSquare className="w-4 h-4" />;
    case 'Channel::Instagram':
      return <MessageSquare className="w-4 h-4" />;
    case 'Channel::Api':
      return <Send className="w-4 h-4" />;
    case 'Channel::WebWidget':
      return <MessageSquare className="w-4 h-4" />;
    case 'Channel::Line':
      return <MessageSquare className="w-4 h-4" />;
    default:
      return <MessageSquare className="w-4 h-4" />;
  }
};

const getChannelTypeName = (channelType: string) => {
  switch (channelType) {
    case 'Channel::Email':
      return 'Email';
    case 'Channel::Whatsapp':
      return 'WhatsApp';
    case 'Channel::Sms':
      return 'SMS';
    case 'Channel::TwilioSms':
      return 'SMS (Twilio)';
    case 'Channel::Twilio':
      return 'Twilio';
    case 'Channel::Telegram':
      return 'Telegram';
    case 'Channel::FacebookPage':
      return 'Messenger';
    case 'Channel::Instagram':
      return 'Instagram';
    case 'Channel::Api':
      return 'API';
    case 'Channel::WebWidget':
      return 'Chat Widget';
    case 'Channel::Line':
      return 'LINE';
    default:
      return channelType.replace('Channel::', '');
  }
};

export function SendMessagePanel({ nodeId, data, onUpdate, onClose }: SendMessagePanelProps) {
  const { t } = useLanguage('journey');

  const [formData, setFormData] = useState<SendMessageNodeData>({
    ...data,
    message: data.message || '',
    inboxId: data.inboxId || '',
    inboxName: data.inboxName || '',
    useEventChannel: data.useEventChannel || false,
    hasAttachment: data.hasAttachment || false,
    attachment_ids: data.attachment_ids || [],
    attachment_names: data.attachment_names || [],
    attachment_count: data.attachment_count || 0,
  });

  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [formDataOptions, setFormDataOptions] = useState<{
    [key: string]: any[];
  }>({});
  const [loading, setLoading] = useState(true);
  const [filteredInboxes, setFilteredInboxes] = useState<any[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load form data options on mount
  useEffect(() => {
    const loadFormData = async () => {
      try {
        setLoading(true);
        const formDataResponse = await automationService.getFormData();
        setFormDataOptions(formDataResponse);

        // Filtrar apenas inboxes dos tipos permitidos
        if (formDataResponse.inboxes) {
          const filtered = formDataResponse.inboxes.filter((inbox: any) =>
            ALLOWED_INBOX_TYPES.includes(inbox.channel_type),
          );
          setFilteredInboxes(filtered);
        }

        // Load existing attachments if any
        if (data.attachment_ids && data.attachment_names) {
          const existingAttachments = data.attachment_ids.map((id, index) => ({
            id: id.toString(),
            name: data.attachment_names![index] || `Arquivo ${index + 1}`,
            size: 0,
            type: '',
            status: 'uploaded' as const,
          }));
          setAttachments(existingAttachments);
        }
      } catch (error) {
        console.error(t('panels.sendMessage.loadDataError'), error);
        toast.error(t('panels.sendMessage.loadDataError'));
      } finally {
        setLoading(false);
      }
    };

    loadFormData();
  }, [data.attachment_ids, data.attachment_names]);

  const handleFileSelect = (files: FileList) => {
    Array.from(files).forEach(file => {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(t('panels.sendMessage.fileTooLarge', { fileName: file.name }));
        return;
      }

      const tempId = `temp-${Date.now()}-${Math.random()}`;
      const newAttachment: AttachmentFile = {
        id: tempId,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'uploading',
        uploadProgress: 0,
      };

      setAttachments(prev => [...prev, newAttachment]);
      uploadFile(file, tempId);
    });
  };

  const uploadFile = async (_file: File, tempId: string) => {
    try {
      // Simulate upload progress
      for (let progress = 0; progress <= 100; progress += 10) {
        setAttachments(prev =>
          prev.map(att => (att.id === tempId ? { ...att, uploadProgress: progress } : att)),
        );
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Simulate successful upload
      const uploadedId = `uploaded-${Date.now()}`;
      setAttachments(prev =>
        prev.map(att => (att.id === tempId ? { ...att, id: uploadedId, status: 'uploaded' } : att)),
      );
    } catch {
      setAttachments(prev =>
        prev.map(att => (att.id === tempId ? { ...att, status: 'error' } : att)),
      );
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (e.dataTransfer.files) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileSelect(e.target.files);
    }
  };

  const handleInboxChange = (inboxId: string) => {
    const selectedInbox = filteredInboxes.find((inbox: any) => inbox.id === inboxId);
    setFormData(prev => ({
      ...prev,
      inboxId,
      inboxName: selectedInbox?.name || '',
    }));
  };

  const handleSave = () => {
    if (!formData.message?.trim()) {
      toast.error(t('panels.sendMessage.enterMessage'));
      return;
    }

    if (!formData.useEventChannel && !formData.inboxId) {
      toast.error(t('panels.sendMessage.selectChannelOrEvent'));
      return;
    }

    if (formData.message.length > 1000) {
      toast.error(t('panels.sendMessage.messageTooLong'));
      return;
    }

    const uploadedAttachments = attachments.filter(att => att.status === 'uploaded');
    const hasAttachments = uploadedAttachments.length > 0;

    const updatedData: SendMessageNodeData = {
      ...formData,
      message: formData.message.trim(),
      hasAttachment: hasAttachments,
      attachment_ids: hasAttachments ? uploadedAttachments.map(att => att.id) : [],
      attachment_names: hasAttachments ? uploadedAttachments.map(att => att.name) : [],
      attachment_count: uploadedAttachments.length,
      formDataOptions,
    };

    onUpdate(nodeId, updatedData);
    toast.success(t('panels.sendMessage.successMessage'));
    onClose();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getCharacterCount = () => formData.message?.length || 0;
  const getCharacterCountColor = () => {
    const count = getCharacterCount();
    if (count > 1000) return 'text-red-600';
    if (count > 800) return 'text-orange-600';
    return 'text-muted-foreground';
  };

  const uploadedCount = attachments.filter(att => att.status === 'uploaded').length;
  const hasUploading = attachments.some(att => att.status === 'uploading');
  const isValid = !!(
    formData.message?.trim() &&
    (formData.useEventChannel || formData.inboxId) &&
    getCharacterCount() <= 1000 &&
    !hasUploading
  );

  return (
    <BaseFlowPanel
      title={t('panels.sendMessage.title')}
      icon={<MessageSquare className="w-5 h-5 text-blue-500" />}
      onClose={onClose}
      width="w-[500px]"
    >
      <Separator />

      <div className="space-y-4">
        {/* Status de validação */}
        {!isValid && (
          <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800/30">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              {t('panels.sendMessage.incompleteConfig')}:
            </p>
            <ul className="text-xs text-yellow-700 dark:text-yellow-300 mt-1 list-disc list-inside">
              {!formData.message?.trim() && <li>{t('panels.sendMessage.enterMessage')}</li>}
              {!formData.useEventChannel && !formData.inboxId && (
                <li>{t('panels.sendMessage.selectChannelOrEvent')}</li>
              )}
              {getCharacterCount() > 1000 && <li>{t('panels.sendMessage.messageTooLong')}</li>}
              {hasUploading && <li>{t('panels.sendMessage.waitingUpload')}</li>}
            </ul>
          </div>
        )}

        {/* Opção de usar canal do evento */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="useEventChannel"
              checked={formData.useEventChannel}
              onCheckedChange={checked => {
                setFormData(prev => ({
                  ...prev,
                  useEventChannel: !!checked,
                  // Limpar seleção manual quando marcar para usar evento
                  inboxId: checked ? '' : prev.inboxId,
                  inboxName: checked ? '' : prev.inboxName,
                }));
              }}
            />
            <Label htmlFor="useEventChannel" className="text-sm font-medium cursor-pointer">
              {t('panels.sendMessage.useEventChannel')}
            </Label>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('panels.sendMessage.useEventChannelDescription')}
          </p>
        </div>

        {/* Seleção do Canal */}
        {!formData.useEventChannel && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('panels.sendMessage.sendChannel')}</Label>

            {loading ? (
              <div className="flex items-center justify-center p-8 border-2 border-dashed rounded-lg">
                <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mr-2" />
                <span className="text-sm text-muted-foreground">
                  {t('panels.sendMessage.loadingChannels')}
                </span>
              </div>
            ) : filteredInboxes.length === 0 ? (
              <Card className="p-6 text-center">
                <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium mb-1">
                  {t('panels.sendMessage.noChannelsAvailable')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('panels.sendMessage.configureChannels')}
                </p>
              </Card>
            ) : (
              <>
                <Select value={formData.inboxId} onValueChange={handleInboxChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('panels.sendMessage.chooseChannel')} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredInboxes.map((inbox: any) => (
                      <SelectItem key={inbox.id} value={String(inbox.id)}>
                        <div className="flex items-center gap-2">
                          {getInboxIcon(inbox.channel_type)}
                          <span>{inbox.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({getChannelTypeName(inbox.channel_type)})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t('panels.sendMessage.channelsDescription')}
                </p>
              </>
            )}
          </div>
        )}

        {/* Campo da Mensagem */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t('panels.sendMessage.message')}</Label>
          <VariableTextarea
            value={formData.message || ''}
            onChange={e => setFormData(prev => ({ ...prev, message: e.target.value }))}
            placeholder={t('panels.sendMessage.messagePlaceholder')}
            className="min-h-[120px] resize-none"
            disabled={loading}
            onVariableInsert={variable => {
              // A variável já foi inserida pelo componente, apenas logamos para debug se necessário
              console.log('Variable inserted:', variable);
            }}
          />

          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">{t('panels.sendMessage.useVariables')}</span>
            <span className={getCharacterCountColor()}>{getCharacterCount()}/1000</span>
          </div>
        </div>

        {/* Seção de Anexos */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t('panels.sendMessage.attachments')}</Label>

          <div
            className={`
              border-2 border-dashed rounded-lg p-4 text-center transition-colors
              ${
                isDragOver
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                  : 'border-border hover:border-blue-400'
              }
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
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
              onChange={handleFileInputChange}
              accept="*/*"
            />
          </div>
        </div>

        {/* Lista de Anexos */}
        {attachments.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {t('panels.sendMessage.attachmentsList', { count: attachments.length })}
            </Label>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {attachments.map(attachment => (
                <div
                  key={attachment.id}
                  className="flex items-center gap-3 p-2 rounded-md bg-muted/30 border"
                >
                  <div className="flex-shrink-0">
                    {attachment.status === 'uploading' && (
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    )}
                    {attachment.status === 'uploaded' && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                    {attachment.status === 'error' && (
                      <AlertCircle className="w-4 h-4 text-red-500" />
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

                  <button
                    onClick={() => removeAttachment(attachment.id)}
                    className="flex-shrink-0 p-1 rounded-md hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preview da Configuração */}
        {formData.message?.trim() && (
          <>
            <Separator />
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-500" />
                <h4 className="text-sm font-medium">{t('panels.sendMessage.previewTitle')}</h4>
              </div>

              <Card className="p-4 bg-blue-50 dark:bg-blue-950/10 border-blue-200 dark:border-blue-800">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        {t('panels.sendMessage.messageConfigured')}
                      </p>
                      <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                        "{formData.message.trim()}"
                      </p>

                      {(formData.useEventChannel || formData.inboxName) && (
                        <Badge variant="outline" className="mt-2">
                          {t('panels.sendMessage.channel')}:{' '}
                          {formData.useEventChannel
                            ? t('panels.sendMessage.eventChannel')
                            : formData.inboxName}
                        </Badge>
                      )}

                      {uploadedCount > 0 && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-blue-700 dark:text-blue-300">
                          <Paperclip className="w-3 h-3" />
                          {uploadedCount === 1
                            ? t('panels.sendMessage.oneAttachment')
                            : t('panels.sendMessage.multipleAttachments', { count: uploadedCount })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </>
        )}
      </div>

      {/* Botões de ação */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onClose} className="flex-1 h-10">
          {t('panels.actions.cancel')}
        </Button>
        <Button onClick={handleSave} className="flex-1 h-10" disabled={!isValid}>
          {isValid ? t('panels.actions.save') : t('panels.sendMessage.completeConfig')}
        </Button>
      </div>
    </BaseFlowPanel>
  );
}
