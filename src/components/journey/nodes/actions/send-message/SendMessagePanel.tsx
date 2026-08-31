import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@evoapi/design-system';
import { MessageSquare, Paperclip } from 'lucide-react';
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
import { SendMessageChannelConfig } from './components/SendMessageChannelConfig';
import { SendMessageContent } from './components/SendMessageContent';
import {
  SendMessageAttachments,
  type AttachmentFile,
} from './components/SendMessageAttachments';

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

export function SendMessagePanel({
  nodeId,
  data,
  onUpdate,
  onClose,
  journeyId,
}: SendMessagePanelProps) {
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

  const handleUseEventChannelChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      useEventChannel: checked,
      inboxId: checked ? '' : prev.inboxId,
      inboxName: checked ? '' : prev.inboxName,
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
    // Seeded inside the functional update so rapid switches never read a
    // stale templateParams snapshot from the render closure.
    setFormData(prev => {
      const mappings = prev.templateVariables ?? [];
      const current = mappings.find(mapping => mapping.variable === name) ?? {
        variable: name,
        source: 'fixed' as TemplateVariableSource,
      };
      const next: TemplateVariableMapping = {
        ...current,
        source,
        path: undefined,
        value: source === 'fixed' ? (prev.templateParams?.[name] ?? '') : undefined,
        expression: undefined,
      };
      return {
        ...prev,
        templateVariables: [
          ...mappings.filter(mapping => mapping.variable !== name),
          next,
        ],
      };
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

        <SendMessageChannelConfig
          isTemplateMode={isTemplateMode}
          isCloudInbox={isCloudInbox}
          onModeChange={handleModeChange}
          useEventChannel={formData.useEventChannel}
          onUseEventChannelChange={handleUseEventChannelChange}
          loading={loading}
          filteredInboxes={filteredInboxes}
          inboxId={formData.inboxId}
          onInboxChange={handleInboxChange}
        />

        <SendMessageContent
          isTemplateMode={isTemplateMode}
          journeyId={journeyId}
          loading={loading}
          inboxId={formData.inboxId}
          templates={templates}
          loadingTemplates={loadingTemplates}
          templateId={formData.templateId}
          selectedTemplate={selectedTemplate}
          onTemplateChange={handleTemplateChange}
          getVariableMapping={getVariableMapping}
          onVariableMappingChange={handleVariableMappingChange}
          onVariableSourceChange={handleVariableSourceChange}
          message={formData.message}
          onMessageChange={value => setFormData(prev => ({ ...prev, message: value }))}
          characterCount={getCharacterCount()}
          characterCountColor={getCharacterCountColor()}
        />

        {!isTemplateMode && (
          <SendMessageAttachments
            attachments={attachments}
            isDragOver={isDragOver}
            loading={loading}
            fileInputRef={fileInputRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onFileInputChange={handleFileInputChange}
            onRemoveAttachment={removeAttachment}
          />
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
