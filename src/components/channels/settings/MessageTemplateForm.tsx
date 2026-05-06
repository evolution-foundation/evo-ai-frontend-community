import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
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
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Textarea,
  Skeleton,
  Switch,
} from '@evoapi/design-system';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  MessageSquare,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import MessageTemplateService, {
  supportsTemplateSync,
  usesStructuredComponents,
  getChannelTemplateConfig,
} from '@/services/channels/messageTemplatesService';
import { TemplatePreview } from './TemplatePreview';
import { MessageTemplate, TemplateFormData } from '@/types';
import { getStatusBadgeKey } from '@/components/chat/message-template/templateStatus';

interface MessageTemplateFormProps {
  inboxId: string;
  channelType: string;
  onUpdate?: () => void;
}

// Template Form Modal
const TemplateFormModal: React.FC<{
  isOpen: boolean;
  template?: MessageTemplate;
  onClose: () => void;
  onSave: (template: TemplateFormData) => void;
  mode: 'create' | 'edit';
  channelType: string;
  t: (key: string, params?: Record<string, unknown>) => string;
}> = ({ isOpen, template, onClose, onSave, mode, channelType, t }) => {
  const channelConfig = getChannelTemplateConfig(channelType);
  const isStructured = usesStructuredComponents(channelType);

  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    content: '',
    language: 'en_US',
    category: 'MARKETING',
    template_type: 'text',
    active: true,
    // Structured fields
    headerFormat: 'TEXT',
    headerText: '',
    bodyText: '',
    footerText: '',
    buttons: [],
  });

  useEffect(() => {
    if (template && mode === 'edit') {
      const convertedTemplate = MessageTemplateService.transformToFrontendFormat(
        template,
        channelType,
      );
      setFormData(convertedTemplate);
    } else {
      // Reset for create mode
      setFormData({
        name: '',
        content: '',
        language: 'en_US',
        category: (channelConfig.categories[0] as TemplateFormData['category']) || 'MARKETING',
        template_type:
          (channelConfig.templateTypes[0] as TemplateFormData['template_type']) || 'text',
        active: true,
        headerFormat: 'TEXT',
        headerText: '',
        bodyText: '',
        footerText: '',
        buttons: [],
      });
    }
  }, [template, mode, isOpen, channelType]);

  const handleSave = () => {
    // Validate based on channel type
    if (isStructured) {
      if (!formData.name.trim() || !formData.bodyText?.trim()) {
        toast.error(t('settings.messageTemplates.errors.requiredFields'));
        return;
      }
    } else {
      if (!formData.name.trim() || !formData.content.trim()) {
        toast.error(t('settings.messageTemplates.errors.requiredFields'));
        return;
      }
    }

    onSave(formData);
    onClose();
  };

  const addButton = () => {
    setFormData(prev => ({
      ...prev,
      buttons: [...(prev.buttons || []), { type: 'QUICK_REPLY', text: '' }],
    }));
  };

  const removeButton = (index: number) => {
    setFormData(prev => ({
      ...prev,
      buttons: prev.buttons?.filter((_, i) => i !== index) || [],
    }));
  };

  const updateButton = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      buttons:
        prev.buttons?.map((btn, i) => (i === index ? { ...btn, [field]: value } : btn)) || [],
    }));
  };

  const isFormValid = isStructured
    ? formData.name.trim() && formData.bodyText?.trim()
    : formData.name.trim() && formData.content.trim();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="!max-w-[95vw] !w-[95vw] max-h-[90vh] overflow-hidden"
        style={{ maxWidth: '95vw', width: '95vw' }}
      >
        <DialogHeader>
          <DialogTitle>
            {mode === 'create'
              ? t('settings.messageTemplates.form.createTitle')
              : t('settings.messageTemplates.form.editTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
          {/* Form */}
          <div className="space-y-4">
            {/* Basic Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('settings.messageTemplates.form.name')}
                </label>
                <Input
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={t('settings.messageTemplates.form.namePlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('settings.messageTemplates.form.category')}
                </label>
                <Select
                  value={formData.category}
                  onValueChange={(value: string) =>
                    setFormData(prev => ({
                      ...prev,
                      category: value as TemplateFormData['category'],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {channelConfig.categories.map((cat: string) => (
                      <SelectItem key={cat} value={cat}>
                        {t(`settings.messageTemplates.form.categories.${cat.toLowerCase()}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('settings.messageTemplates.form.language')}
                </label>
                <Select
                  value={formData.language}
                  onValueChange={value => setFormData(prev => ({ ...prev, language: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt_BR">Português (BR)</SelectItem>
                    <SelectItem value="en_US">English (US)</SelectItem>
                    <SelectItem value="es_ES">Español</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('settings.messageTemplates.form.templateType')}
                </label>
                <Select
                  value={formData.template_type}
                  onValueChange={(value: string) =>
                    setFormData(prev => ({
                      ...prev,
                      template_type: value as TemplateFormData['template_type'],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {channelConfig.templateTypes.map((type: string) => (
                      <SelectItem key={type} value={type}>
                        {t(`settings.messageTemplates.form.templateTypes.${type}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Structured Components (WhatsApp, Facebook, Instagram) */}
            {isStructured && channelConfig.supportsStructured && (
              <>
                {/* Header */}
                {channelConfig.supportsMedia && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1">
                      <label className="block text-sm font-medium mb-2">
                        {t('settings.messageTemplates.form.headerFormat')}
                      </label>
                      <Select
                        value={formData.headerFormat}
                        onValueChange={(value: string) =>
                          setFormData(prev => ({
                            ...prev,
                            headerFormat: value as TemplateFormData['headerFormat'],
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TEXT">
                            {t('settings.messageTemplates.form.headerFormats.text')}
                          </SelectItem>
                          <SelectItem value="IMAGE">
                            {t('settings.messageTemplates.form.headerFormats.image')}
                          </SelectItem>
                          <SelectItem value="VIDEO">
                            {t('settings.messageTemplates.form.headerFormats.video')}
                          </SelectItem>
                          <SelectItem value="DOCUMENT">
                            {t('settings.messageTemplates.form.headerFormats.document')}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {formData.headerFormat === 'TEXT' && (
                      <div className="col-span-2">
                        <label className="block text-sm font-medium mb-2">
                          {t('settings.messageTemplates.form.headerText')}
                        </label>
                        <Input
                          value={formData.headerText}
                          onChange={e =>
                            setFormData(prev => ({ ...prev, headerText: e.target.value }))
                          }
                          placeholder={t('settings.messageTemplates.form.headerTextPlaceholder')}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Body */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('settings.messageTemplates.form.bodyText')}
                  </label>
                  <Textarea
                    value={formData.bodyText}
                    onChange={e => setFormData(prev => ({ ...prev, bodyText: e.target.value }))}
                    placeholder={t('settings.messageTemplates.form.bodyTextPlaceholder')}
                    rows={4}
                  />
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {t('settings.messageTemplates.form.variablesHelp')}
                  </p>
                </div>

                {/* Footer */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('settings.messageTemplates.form.footerText')}
                  </label>
                  <Input
                    value={formData.footerText}
                    onChange={e => setFormData(prev => ({ ...prev, footerText: e.target.value }))}
                    placeholder={t('settings.messageTemplates.form.footerTextPlaceholder')}
                  />
                </div>

                {/* Buttons */}
                {channelConfig.supportsButtons && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium">
                        {t('settings.messageTemplates.form.buttons')}
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addButton}
                        disabled={(formData.buttons?.length || 0) >= 3}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        {t('settings.messageTemplates.form.addButton')}
                      </Button>
                    </div>

                    {formData.buttons?.map((button, index) => (
                      <Card key={index} className="p-3 mb-2">
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <Select
                            value={button.type}
                            onValueChange={(value: string) => updateButton(index, 'type', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="QUICK_REPLY">
                                {t('settings.messageTemplates.form.buttonTypes.quickReply')}
                              </SelectItem>
                              <SelectItem value="URL">
                                {t('settings.messageTemplates.form.buttonTypes.url')}
                              </SelectItem>
                              <SelectItem value="PHONE_NUMBER">
                                {t('settings.messageTemplates.form.buttonTypes.phone')}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeButton(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <Input
                          value={button.text}
                          onChange={e => updateButton(index, 'text', e.target.value)}
                          placeholder={t('settings.messageTemplates.form.buttonTextPlaceholder')}
                          className="mb-2"
                        />

                        {button.type === 'URL' && (
                          <Input
                            value={button.url || ''}
                            onChange={e => updateButton(index, 'url', e.target.value)}
                            placeholder={t('settings.messageTemplates.form.urlPlaceholder')}
                          />
                        )}

                        {button.type === 'PHONE_NUMBER' && (
                          <Input
                            value={button.phone_number || ''}
                            onChange={e => updateButton(index, 'phoneNumber', e.target.value)}
                            placeholder={t('settings.messageTemplates.form.phonePlaceholder')}
                          />
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Email-specific fields */}
            {channelType === 'Channel::Email' && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('settings.messageTemplates.form.subject')}
                </label>
                <Input
                  value={formData.subject || ''}
                  onChange={e => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder={t('settings.messageTemplates.form.subjectPlaceholder')}
                />
              </div>
            )}

            {/* Simple Text Content (SMS, API, Telegram, Line) */}
            {/* Note: Email templates are edited in a dedicated page, not in this modal */}
            {!isStructured && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('settings.messageTemplates.form.content')}
                </label>
                <Textarea
                  value={formData.content}
                  onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder={t('settings.messageTemplates.form.contentPlaceholder')}
                  rows={6}
                />
                {channelConfig.usesLiquid && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {t('settings.messageTemplates.form.liquidHelp')}
                  </p>
                )}
              </div>
            )}

            {/* Active toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
              <div>
                <label className="block text-sm font-medium">
                  {t('settings.messageTemplates.form.active')}
                </label>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {t('settings.messageTemplates.form.activeHelp')}
                </p>
              </div>
              <Switch
                checked={formData.active !== false}
                onCheckedChange={checked => setFormData(prev => ({ ...prev, active: checked }))}
              />
            </div>
          </div>

          {/* Preview - Sticky on larger screens */}
          <div className="lg:sticky lg:top-0 lg:self-start">
            <TemplatePreview template={formData} channelType={channelType} t={t} />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            {t('settings.messageTemplates.form.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={!isFormValid}>
            {mode === 'create'
              ? t('settings.messageTemplates.form.create')
              : t('settings.messageTemplates.form.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const MessageTemplateForm: React.FC<MessageTemplateFormProps> = ({
  inboxId,
  channelType,
  onUpdate,
}) => {
  const navigate = useNavigate();
  const { t } = useLanguage('channels');
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<'name' | 'category' | 'status' | 'created_at'>(
    'name',
  );
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<MessageTemplate | null>(null);

  const canSync = supportsTemplateSync(channelType);

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await MessageTemplateService.getTemplates(inboxId);
      setTemplates(response.data);
    } catch (error) {
      console.error(t('settings.messageTemplates.errors.loadError'), error);
      toast.error(t('settings.messageTemplates.errors.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [inboxId, t]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const filteredAndSortedTemplates = useMemo(() => {
    const filtered = templates.filter(
      template =>
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (template.category && template.category.toLowerCase().includes(searchQuery.toLowerCase())),
    );

    filtered.sort((a, b) => {
      let aValue: string | number = (a[sortColumn] as string | number) || '';
      let bValue: string | number = (b[sortColumn] as string | number) || '';

      if (sortColumn === 'created_at') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      }
      return aValue < bValue ? 1 : -1;
    });

    return filtered;
  }, [templates, searchQuery, sortColumn, sortDirection]);

  const handleSort = (column: typeof sortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleSyncTemplates = async () => {
    setIsSyncing(true);
    try {
      await MessageTemplateService.syncTemplates(inboxId);
      toast.success(t('settings.messageTemplates.success.syncSuccess'));
      await loadTemplates();
    } catch (error) {
      console.error(t('settings.messageTemplates.errors.syncError'), error);
      toast.error(t('settings.messageTemplates.errors.syncError'));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateTemplate = async (templateData: TemplateFormData) => {
    try {
      await MessageTemplateService.createTemplate(inboxId, templateData, channelType);
      toast.success(t('settings.messageTemplates.success.createSuccess'));
      await loadTemplates();
      onUpdate?.();
    } catch (error) {
      console.error(t('settings.messageTemplates.errors.createError'), error);
      toast.error(t('settings.messageTemplates.errors.createError'));
    }
  };

  const handleEditTemplate = async (templateData: TemplateFormData) => {
    if (!editingTemplate || !editingTemplate.id) return;

    try {
      await MessageTemplateService.updateTemplate(
        inboxId,
        editingTemplate.id,
        templateData,
        channelType,
      );
      toast.success(t('settings.messageTemplates.success.updateSuccess'));
      await loadTemplates();
      onUpdate?.();
    } catch (error) {
      console.error(t('settings.messageTemplates.errors.updateError'), error);
      toast.error(t('settings.messageTemplates.errors.updateError'));
    }
  };

  const handleDeleteTemplate = async () => {
    if (!templateToDelete || !templateToDelete.id) return;

    try {
      await MessageTemplateService.deleteTemplate(inboxId, templateToDelete.id);
      toast.success(t('settings.messageTemplates.success.deleteSuccess'));
      await loadTemplates();
      onUpdate?.();
    } catch (error) {
      console.error(t('settings.messageTemplates.errors.deleteError'), error);
      toast.error(t('settings.messageTemplates.errors.deleteError'));
    } finally {
      setShowDeleteConfirm(false);
      setTemplateToDelete(null);
    }
  };

  const openEditModal = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setShowFormModal(true);
  };

  const openDeleteConfirm = (template: MessageTemplate) => {
    setTemplateToDelete(template);
    setShowDeleteConfirm(true);
  };

  const getStatusBadge = (template: MessageTemplate) => {
    // Read from the canonical top-level `status` field, falling back to
    // `settings.status` (populated by Meta sync on WhatsApp Cloud). Missing
    // status means the template was created locally and never submitted
    // upstream — render as "Aguardando aprovação", never as "Ativo" (which
    // would reflect `active` — a different field).
    const key = getStatusBadgeKey(template);
    const styleByKey: Record<string, string> = {
      approved: 'bg-green-600 dark:bg-green-500 text-white',
      pending: 'bg-yellow-600 dark:bg-yellow-500 text-white',
      rejected: 'bg-red-600 dark:bg-red-500 text-white',
      paused: 'bg-gray-600 dark:bg-gray-500 text-white',
      inactive: 'bg-gray-600 dark:bg-gray-500 text-white',
      unknown: 'bg-gray-400 dark:bg-gray-600 text-white',
    };
    const text = t(`settings.messageTemplates.status.${key}`);
    const color = styleByKey[key] ?? styleByKey.unknown;
    return <Badge className={color}>{text}</Badge>;
  };

  const getCategoryBadge = (category?: string) => {
    if (!category) return null;

    const categoryConfig: Record<string, { color: string }> = {
      MARKETING: { color: 'bg-blue-600 dark:bg-blue-500 text-white' },
      UTILITY: { color: 'bg-green-600 dark:bg-green-500 text-white' },
      AUTHENTICATION: { color: 'bg-purple-600 dark:bg-purple-500 text-white' },
      TRANSACTIONAL: { color: 'bg-orange-600 dark:bg-orange-500 text-white' },
    };

    const config = categoryConfig[category] || { color: 'bg-gray-600 dark:bg-gray-500 text-white' };
    return (
      <Badge className={config.color}>
        {t(`settings.messageTemplates.categories.${category.toLowerCase()}`)}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {t('settings.messageTemplates.title')}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t('settings.messageTemplates.description')}
          </p>
        </div>
        <div className="flex gap-2">
          {canSync && (
            <Button variant="outline" onClick={handleSyncTemplates} loading={isSyncing}>
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('settings.messageTemplates.actions.sync')}
            </Button>
          )}
          <Button
            onClick={() => {
              if (channelType === 'Channel::Email') {
                // Redirect to dedicated email template editor page
                navigate(
                  `/settings/email-template-editor?inboxId=${inboxId}&channelType=${encodeURIComponent(
                    channelType,
                  )}`,
                );
              } else {
                // Use modal for other channel types
                setShowFormModal(true);
              }
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('settings.messageTemplates.newTemplate')}
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('settings.messageTemplates.searchPlaceholder')}
            className="pl-10"
          />
        </div>
      </div>

      {/* Templates Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    {t('settings.messageTemplates.table.name')}
                    {sortColumn === 'name' &&
                      (sortDirection === 'asc' ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      ))}
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort('category')}
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    {t('settings.messageTemplates.table.category')}
                    {sortColumn === 'category' &&
                      (sortDirection === 'asc' ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      ))}
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort('status')}
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    {t('settings.messageTemplates.table.status')}
                    {sortColumn === 'status' &&
                      (sortDirection === 'asc' ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      ))}
                  </button>
                </TableHead>
                <TableHead>{t('settings.messageTemplates.table.language')}</TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort('created_at')}
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    {t('settings.messageTemplates.table.createdAt')}
                    {sortColumn === 'created_at' &&
                      (sortDirection === 'asc' ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      ))}
                  </button>
                </TableHead>
                <TableHead className="w-32">
                  {t('settings.messageTemplates.table.actions')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedTemplates.map(template => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell>{getCategoryBadge(template.category)}</TableCell>
                  <TableCell>{getStatusBadge(template)}</TableCell>
                  <TableCell>{template.language}</TableCell>
                  <TableCell>
                    {template.created_at
                      ? new Date(template.created_at).toLocaleDateString('pt-BR')
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTemplate(template);
                          setShowPreview(true);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (channelType === 'Channel::Email') {
                            // Redirect to dedicated email template editor page
                            navigate(
                              `/settings/email-template-editor?inboxId=${inboxId}&templateId=${
                                template.id
                              }&channelType=${encodeURIComponent(channelType)}`,
                            );
                          } else {
                            // Use modal for other channel types
                            openEditModal(template);
                          }
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDeleteConfirm(template)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredAndSortedTemplates.length === 0 && (
            <div className="p-8 text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {t('settings.messageTemplates.emptyState.title')}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? t('settings.messageTemplates.emptyState.searchEmpty')
                  : t('settings.messageTemplates.emptyState.description')}
              </p>
              {!searchQuery && (
                <Button
                  onClick={() => {
                    if (channelType === 'Channel::Email') {
                      // Redirect to dedicated email template editor page
                      navigate(
                        `/settings/email-template-editor?inboxId=${inboxId}&channelType=${encodeURIComponent(
                          channelType,
                        )}`,
                      );
                    } else {
                      // Use modal for other channel types
                      setShowFormModal(true);
                    }
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('settings.messageTemplates.newTemplate')}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Template Form Modal */}
      <TemplateFormModal
        isOpen={showFormModal}
        template={editingTemplate || undefined}
        mode={editingTemplate ? 'edit' : 'create'}
        channelType={channelType}
        onClose={() => {
          setShowFormModal(false);
          setEditingTemplate(null);
        }}
        onSave={editingTemplate ? handleEditTemplate : handleCreateTemplate}
        t={t}
      />

      {/* Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('settings.messageTemplates.preview.modalTitle')}</DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <TemplatePreview
              template={MessageTemplateService.transformToFrontendFormat(
                selectedTemplate,
                channelType,
              )}
              channelType={channelType}
              t={t}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.messageTemplates.deleteDialog.title')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-600 dark:text-slate-400">
              {t('settings.messageTemplates.deleteDialog.message', {
                templateName: templateToDelete?.name,
              })}
            </p>
            <p className="text-sm text-red-700 dark:text-red-400 mt-2">
              {t('settings.messageTemplates.deleteDialog.warning')}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              {t('settings.messageTemplates.deleteDialog.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDeleteTemplate}>
              {t('settings.messageTemplates.deleteDialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MessageTemplateForm;
