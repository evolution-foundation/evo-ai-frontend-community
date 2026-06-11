import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
import {
  SendMessageNodeData,
  TemplateVariableMapping,
  TemplateVariableSource,
} from './SendMessageNode';
import { isBalancedExpression } from '@/utils/templateVariables';
import { NodeConfigModal } from '@/components/journey/shared/NodeConfigModal';
import { FlowFeedbackBanner } from '@/components/journey/_ui';
import { automationService } from '@/services/automation/automationService';
import MessageTemplateService from '@/services/channels/messageTemplatesService';
import type { MessageTemplate } from '@/types/channels/inbox';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';

// WhatsApp Cloud requires a Meta-approved template for bot-initiated messages
// outside the 24h window — both STI spellings exist across the codebase.
const isWhatsappCloudInbox = (inbox: { channel_type?: string; provider?: string } | undefined) =>
  !!inbox &&
  (inbox.channel_type === 'Channel::WhatsappCloud' ||
    (inbox.channel_type === 'Channel::Whatsapp' && inbox.provider === 'whatsapp_cloud'));

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

// EVO-1267: curated field paths per root source — every entry must be
// resolvable by the CRM's TemplateVariableResolver (attribute or arity-0
// reader on the root record).
const SOURCE_FIELD_PATHS: Record<'contact' | 'conversation' | 'pipeline', string[]> = {
  contact: ['name', 'email', 'phone_number', 'identifier'],
  conversation: ['display_id', 'status'],
  pipeline: ['pipeline_stage.name', 'pipeline.name', 'entered_at'],
};

const VARIABLE_SOURCES: TemplateVariableSource[] = [
  'fixed',
  'contact',
  'conversation',
  'pipeline',
  'expression',
];

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

  const initialFormData: SendMessageNodeData = {
    ...data,
    message: data.message || '',
    inboxId: data.inboxId || '',
    inboxName: data.inboxName || '',
    messageMode: data.messageMode || 'text',
    templateId: data.templateId || '',
    templateName: data.templateName || '',
    templateLanguage: data.templateLanguage || '',
    templateParams: data.templateParams || {},
    templateVariables: data.templateVariables || [],
    useEventChannel: data.useEventChannel || false,
    hasAttachment: data.hasAttachment || false,
    attachment_ids: data.attachment_ids || [],
    attachment_names: data.attachment_names || [],
    attachment_count: data.attachment_count || 0,
  };
  const [originalData] = useState<SendMessageNodeData>(() => initialFormData);
  const [formData, setFormData] = useState<SendMessageNodeData>(initialFormData);

  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [formDataOptions, setFormDataOptions] = useState<{
    [key: string]: any[];
  }>({});
  const [loading, setLoading] = useState(true);
  const [filteredInboxes, setFilteredInboxes] = useState<any[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isTemplateMode = formData.messageMode === 'template';
  const selectedInbox = filteredInboxes.find(
    (inbox: { id: string | number }) => String(inbox.id) === String(formData.inboxId),
  );
  const isCloudInbox = isWhatsappCloudInbox(selectedInbox);
  const selectedTemplate = templates.find(
    template => String(template.id) === String(formData.templateId),
  );

  // WhatsApp Cloud forces template mode (Meta-approved templates only).
  useEffect(() => {
    if (isCloudInbox && formData.messageMode !== 'template') {
      setFormData(prev => ({ ...prev, messageMode: 'template' }));
    }
  }, [isCloudInbox, formData.messageMode]);

  useEffect(() => {
    if (!isTemplateMode || !formData.inboxId) {
      setTemplates([]);
      return;
    }

    let cancelled = false;
    setLoadingTemplates(true);
    MessageTemplateService.getTemplates(formData.inboxId, { active: true, per_page: -1 })
      .then(response => {
        if (!cancelled) setTemplates(Array.isArray(response.data) ? response.data : []);
      })
      .catch(() => {
        if (!cancelled) {
          setTemplates([]);
          toast.error(t('panels.sendMessage.templatesLoadError'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingTemplates(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTemplateMode, formData.inboxId]);

  useEffect(() => {
    const loadFormData = async () => {
      try {
        setLoading(true);
        const formDataResponse = await automationService.getFormData();
        setFormDataOptions(formDataResponse);

        if (formDataResponse.inboxes) {
          const filtered = formDataResponse.inboxes.filter((inbox: any) =>
            ALLOWED_INBOX_TYPES.includes(inbox.channel_type),
          );
          setFilteredInboxes(filtered);
        }

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
      for (let progress = 0; progress <= 100; progress += 10) {
        setAttachments(prev =>
          prev.map(att => (att.id === tempId ? { ...att, uploadProgress: progress } : att)),
        );
        await new Promise(resolve => setTimeout(resolve, 100));
      }

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
    const inbox = filteredInboxes.find(
      (item: { id: string | number }) => String(item.id) === inboxId,
    );
    // Templates are channel-scoped: switching inbox invalidates the selection.
    setFormData(prev => ({
      ...prev,
      inboxId,
      inboxName: inbox?.name || '',
      templateId: '',
      templateName: '',
      templateLanguage: '',
      templateParams: {},
      messageMode: isWhatsappCloudInbox(inbox) ? 'template' : prev.messageMode,
    }));
  };

  const handleModeChange = (mode: 'text' | 'template') => {
    if (isCloudInbox && mode === 'text') return;
    setFormData(prev => ({
      ...prev,
      messageMode: mode,
      // Template mode needs an explicit inbox: the event channel is unknown
      // at config time, so there is no template list to pick from.
      useEventChannel: mode === 'template' ? false : prev.useEventChannel,
    }));
  };

  const handleTemplateChange = (templateId: string) => {
    const template = templates.find(item => String(item.id) === templateId);
    const defaults: Record<string, string> = {};
    (template?.variables ?? []).forEach(variable => {
      if (variable.name) defaults[variable.name] = variable.default_value || '';
    });
    setFormData(prev => ({
      ...prev,
      templateId,
      templateName: template?.name || '',
      templateLanguage: template?.language || '',
      templateParams: defaults,
      templateVariables: [],
    }));
  };

  // EVO-1267: a variable without an explicit mapping defaults to 'fixed' with
  // the template's default value — the exact pre-10.19 behavior. The plain
  // templateParams dict stays as the default/legacy layer; mappings win at
  // runtime (send-message node merges with mapping precedence).
  const getVariableMapping = (name: string): TemplateVariableMapping =>
    formData.templateVariables?.find(mapping => mapping.variable === name) ?? {
      variable: name,
      source: 'fixed',
      value: formData.templateParams?.[name] ?? '',
    };

  const handleVariableMappingChange = (
    name: string,
    patch: Partial<TemplateVariableMapping>,
  ) => {
    setFormData(prev => {
      const mappings = prev.templateVariables ?? [];
      const current = mappings.find(mapping => mapping.variable === name) ?? {
        variable: name,
        source: 'fixed' as TemplateVariableSource,
        value: prev.templateParams?.[name] ?? '',
      };
      const next = { ...current, ...patch };
      return {
        ...prev,
        templateVariables: [
          ...mappings.filter(mapping => mapping.variable !== name),
          next,
        ],
      };
    });
  };

  const handleVariableSourceChange = (name: string, source: TemplateVariableSource) => {
    // Switching source resets the source-specific inputs; fallback survives.
    handleVariableMappingChange(name, {
      source,
      path: undefined,
      value: source === 'fixed' ? (formData.templateParams?.[name] ?? '') : undefined,
      expression: undefined,
    });
  };

  const handleSave = () => {
    // Attachments belong to free-text mode only; a mode switch must not leak
    // previously uploaded files into a template send.
    const uploadedAttachments = isTemplateMode
      ? []
      : attachments.filter(att => att.status === 'uploaded');
    const hasAttachments = uploadedAttachments.length > 0;

    const updatedData: SendMessageNodeData = {
      ...formData,
      message: formData.message!.trim(),
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
    if (count > 1000) return 'text-flow-feedback-error-fg';
    if (count > 800) return 'text-flow-feedback-warn-fg';
    return 'text-muted-foreground';
  };

  const uploadedCount = attachments.filter(att => att.status === 'uploaded').length;
  const hasUploading = attachments.some(att => att.status === 'uploading');

  const isMappingFilled = (mapping: TemplateVariableMapping): boolean => {
    switch (mapping.source) {
      case 'fixed':
        return !!(mapping.value ?? '').trim();
      case 'expression':
        return !!(mapping.expression ?? '').trim() && isBalancedExpression(mapping.expression!);
      default:
        return !!mapping.path;
    }
  };

  const templateVariableNames = isTemplateMode
    ? (selectedTemplate?.variables ?? []).map(variable => variable.name).filter(Boolean)
    : [];
  // AC3: an unbalanced custom expression blocks Save even on optional vars.
  const invalidExpressionVariables = templateVariableNames
    .map(name => getVariableMapping(name!))
    .filter(
      mapping =>
        mapping.source === 'expression' &&
        !!(mapping.expression ?? '').trim() &&
        !isBalancedExpression(mapping.expression!),
    );
  const missingRequiredVariables = isTemplateMode
    ? (selectedTemplate?.variables ?? []).filter(
        variable =>
          variable.required &&
          variable.name &&
          !isMappingFilled(getVariableMapping(variable.name)),
      )
    : [];
  const isValid = isTemplateMode
    ? !!(
        formData.inboxId &&
        formData.templateId &&
        !loadingTemplates &&
        selectedTemplate &&
        missingRequiredVariables.length === 0 &&
        invalidExpressionVariables.length === 0 &&
        !hasUploading
      )
    : !!(
        formData.message?.trim() &&
        (formData.useEventChannel || formData.inboxId) &&
        getCharacterCount() <= 1000 &&
        !hasUploading
      );
  const dirty = useMemo(
    () =>
      JSON.stringify(formData) !== JSON.stringify(originalData) ||
      attachments.some(att => att.id.startsWith('uploaded-') || att.id.startsWith('temp-')),
    [formData, originalData, attachments],
  );

  return (
    <NodeConfigModal
      open
      variant="simple"
      title={t('panels.sendMessage.title')}
      icon={<MessageSquare className="h-5 w-5 text-flow-node-action-message-fg" />}
      onCancel={onClose}
      onSave={handleSave}
      dirty={dirty && isValid}
      saveLabel={t('panels.actions.save')}
      cancelLabel={t('panels.actions.cancel')}
      contentClassName="max-w-3xl"
    >
      <div className="space-y-4">
        {!isValid && (
          <FlowFeedbackBanner variant="warn">
            <p className="font-medium">{t('panels.sendMessage.incompleteConfig')}:</p>
            <ul className="text-xs mt-1 list-disc list-inside">
              {!isTemplateMode && !formData.message?.trim() && (
                <li>{t('panels.sendMessage.enterMessage')}</li>
              )}
              {!isTemplateMode && !formData.useEventChannel && !formData.inboxId && (
                <li>{t('panels.sendMessage.selectChannelOrEvent')}</li>
              )}
              {!isTemplateMode && getCharacterCount() > 1000 && (
                <li>{t('panels.sendMessage.messageTooLong')}</li>
              )}
              {isTemplateMode && !formData.inboxId && (
                <li>{t('panels.sendMessage.selectChannelForTemplate')}</li>
              )}
              {isTemplateMode && formData.inboxId && !formData.templateId && !loadingTemplates && (
                <li>{t('panels.sendMessage.selectTemplateValidation')}</li>
              )}
              {isTemplateMode &&
                !!formData.templateId &&
                !selectedTemplate &&
                !loadingTemplates && <li>{t('panels.sendMessage.templateUnavailable')}</li>}
              {isTemplateMode && missingRequiredVariables.length > 0 && (
                <li>{t('panels.sendMessage.fillRequiredVariables')}</li>
              )}
              {isTemplateMode && invalidExpressionVariables.length > 0 && (
                <li>{t('panels.sendMessage.invalidExpression')}</li>
              )}
              {hasUploading && <li>{t('panels.sendMessage.waitingUpload')}</li>}
            </ul>
          </FlowFeedbackBanner>
        )}

        <div className="space-y-2">
          <Label className="text-sm font-medium">{t('panels.sendMessage.mode')}</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={isTemplateMode ? 'outline' : 'default'}
              disabled={isCloudInbox}
              onClick={() => handleModeChange('text')}
            >
              {t('panels.sendMessage.modeText')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={isTemplateMode ? 'default' : 'outline'}
              onClick={() => handleModeChange('template')}
            >
              {t('panels.sendMessage.modeTemplate')}
            </Button>
          </div>
          {isCloudInbox && (
            <p className="text-xs text-muted-foreground">
              {t('panels.sendMessage.templateRequiredForCloud')}
            </p>
          )}
        </div>

        {!isTemplateMode && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="useEventChannel"
                checked={formData.useEventChannel}
                onCheckedChange={checked => {
                  setFormData(prev => ({
                    ...prev,
                    useEventChannel: !!checked,
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
        )}

        {!formData.useEventChannel && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('panels.sendMessage.sendChannel')}</Label>

            {loading ? (
              <div className="flex items-center justify-center p-8 border-2 border-dashed border-border rounded-lg">
                <div className="animate-spin w-6 h-6 border-2 border-flow-node-action-message-fg border-t-transparent rounded-full mr-2" />
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

        {isTemplateMode ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('panels.sendMessage.template')}</Label>
              {!formData.inboxId ? (
                <p className="text-xs text-muted-foreground">
                  {t('panels.sendMessage.selectChannelForTemplate')}
                </p>
              ) : loadingTemplates ? (
                <div className="flex items-center gap-2 p-3 border border-dashed border-border rounded-lg">
                  <div className="animate-spin w-4 h-4 border-2 border-flow-node-action-message-fg border-t-transparent rounded-full" />
                  <span className="text-sm text-muted-foreground">
                    {t('panels.sendMessage.loadingTemplates')}
                  </span>
                </div>
              ) : templates.length === 0 ? (
                <Card className="p-4 text-center">
                  <AlertCircle className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">
                    {t('panels.sendMessage.noTemplates')}
                  </p>
                </Card>
              ) : (
                <Select value={formData.templateId} onValueChange={handleTemplateChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('panels.sendMessage.chooseTemplate')} />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(template => (
                      <SelectItem key={template.id} value={String(template.id)}>
                        <div className="flex items-center gap-2">
                          <span>{template.name}</span>
                          {template.language && (
                            <span className="text-xs text-muted-foreground">
                              ({template.language})
                            </span>
                          )}
                          {template.category && (
                            <Badge variant="outline" className="text-[10px]">
                              {template.category}
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {selectedTemplate && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {t('panels.sendMessage.templatePreview')}
                </Label>
                <Card className="p-3 space-y-2">
                  {Array.isArray(selectedTemplate.components) &&
                  selectedTemplate.components.length > 0 ? (
                    selectedTemplate.components.map((component, index) =>
                      component?.text ? (
                        <p
                          key={index}
                          className={
                            component.type === 'BODY'
                              ? 'text-sm whitespace-pre-wrap'
                              : 'text-xs text-muted-foreground whitespace-pre-wrap'
                          }
                        >
                          {component.text}
                        </p>
                      ) : null,
                    )
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{selectedTemplate.content}</p>
                  )}
                </Card>
              </div>
            )}

            {selectedTemplate && (selectedTemplate.variables?.length ?? 0) > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {t('panels.sendMessage.templateVariables')}
                </Label>
                <div className="space-y-3">
                  {selectedTemplate.variables!.map(variable => {
                    if (!variable.name) return null;
                    const mapping = getVariableMapping(variable.name);
                    const isRootSource =
                      mapping.source === 'contact' ||
                      mapping.source === 'conversation' ||
                      mapping.source === 'pipeline';
                    const expressionInvalid =
                      mapping.source === 'expression' &&
                      !!(mapping.expression ?? '').trim() &&
                      !isBalancedExpression(mapping.expression!);

                    return (
                      <div key={variable.name} className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          {variable.label || variable.name}
                          {variable.required && (
                            <span className="text-flow-feedback-error-fg"> *</span>
                          )}
                        </Label>
                        <div className="flex gap-2">
                          <Select
                            value={mapping.source}
                            onValueChange={source =>
                              handleVariableSourceChange(
                                variable.name!,
                                source as TemplateVariableSource,
                              )
                            }
                          >
                            <SelectTrigger className="w-44 shrink-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {VARIABLE_SOURCES.map(source => (
                                <SelectItem key={source} value={source}>
                                  {t(`panels.sendMessage.variableSources.${source}`)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {mapping.source === 'fixed' && (
                            <Input
                              value={mapping.value ?? ''}
                              onChange={e =>
                                handleVariableMappingChange(variable.name!, {
                                  value: e.target.value,
                                })
                              }
                              placeholder={variable.example || variable.name}
                            />
                          )}

                          {isRootSource && (
                            <Select
                              value={mapping.path ?? ''}
                              onValueChange={path =>
                                handleVariableMappingChange(variable.name!, { path })
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue
                                  placeholder={t('panels.sendMessage.chooseField')}
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {SOURCE_FIELD_PATHS[
                                  mapping.source as keyof typeof SOURCE_FIELD_PATHS
                                ].map(path => (
                                  <SelectItem key={path} value={path}>
                                    {t(
                                      `panels.sendMessage.variableFields.${mapping.source}.${path.replace(/\./g, '_')}`,
                                    )}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}

                          {mapping.source === 'expression' && (
                            <div className="w-full space-y-1">
                              <VariableTextarea
                                value={mapping.expression ?? ''}
                                onChange={e =>
                                  handleVariableMappingChange(variable.name!, {
                                    expression: e.target.value,
                                  })
                                }
                                placeholder={t('panels.sendMessage.expressionPlaceholder')}
                                className="min-h-[40px] resize-none"
                              />
                              {expressionInvalid && (
                                <p className="text-xs text-flow-feedback-error-fg">
                                  {t('panels.sendMessage.invalidExpression')}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        {mapping.source !== 'fixed' && (
                          <Input
                            value={mapping.fallback ?? ''}
                            onChange={e =>
                              handleVariableMappingChange(variable.name!, {
                                fallback: e.target.value,
                              })
                            }
                            placeholder={t('panels.sendMessage.fallbackPlaceholder')}
                            className="text-xs"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('panels.sendMessage.variableSourcesHint')}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('panels.sendMessage.message')}</Label>
            <VariableTextarea
              value={formData.message || ''}
              onChange={e => setFormData(prev => ({ ...prev, message: e.target.value }))}
              placeholder={t('panels.sendMessage.messagePlaceholder')}
              className="min-h-[120px] resize-none"
              disabled={loading}
              onVariableInsert={variable => {
                console.log('Variable inserted:', variable);
              }}
            />

            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">{t('panels.sendMessage.useVariables')}</span>
              <span className={getCharacterCountColor()}>{getCharacterCount()}/1000</span>
            </div>
          </div>
        )}

        {!isTemplateMode && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t('panels.sendMessage.attachments')}</Label>

          <div
            className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
              isDragOver
                ? 'border-flow-node-action-message-fg bg-flow-node-action-message-bg'
                : 'border-border hover:border-flow-node-action-message-border'
            }`}
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
        )}

        {!isTemplateMode && attachments.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {t('panels.sendMessage.attachmentsList', { count: attachments.length })}
            </Label>
            <div className="space-y-2 max-h-32 overflow-y-auto">
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
                    onClick={() => removeAttachment(attachment.id)}
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

        {(isTemplateMode ? !!selectedTemplate : !!formData.message?.trim()) && (
          <FlowFeedbackBanner variant="info">
            <div className="flex items-start gap-3">
              <MessageSquare className="w-4 h-4 mt-1 shrink-0" />
              <div className="flex-1">
                <p className="font-medium">
                  {isTemplateMode
                    ? t('panels.sendMessage.templateConfigured')
                    : t('panels.sendMessage.messageConfigured')}
                </p>
                <p className="text-sm mt-1">
                  {isTemplateMode
                    ? `${selectedTemplate?.name}${
                        selectedTemplate?.language ? ` (${selectedTemplate.language})` : ''
                      }`
                    : `"${formData.message?.trim()}"`}
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
                  <div className="mt-2 flex items-center gap-1 text-xs">
                    <Paperclip className="w-3 h-3" />
                    {uploadedCount === 1
                      ? t('panels.sendMessage.oneAttachment')
                      : t('panels.sendMessage.multipleAttachments', { count: uploadedCount })}
                  </div>
                )}
              </div>
            </div>
          </FlowFeedbackBanner>
        )}
      </div>
    </NodeConfigModal>
  );
}
