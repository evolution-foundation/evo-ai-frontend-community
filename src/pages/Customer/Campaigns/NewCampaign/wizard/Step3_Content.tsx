import { useState, useEffect } from 'react';
import { Button, Label, Checkbox, RadioGroup, RadioGroupItem } from '@evoapi/design-system';
import { ArrowRight, ArrowLeft, MessageSquare, FileText, Mail, MessageCircle, Smartphone, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { CampaignChannelType } from '@/types/campaigns';
import InboxesService from '@/services/channels/inboxesService';
import MessageTemplateService from '@/services/channels/messageTemplatesService';
import type { Inbox } from '@/types/channels/inbox';
import type { MessageTemplate } from '@/types/channels/inbox';

interface Step3Props {
  data: {
    channel_type: CampaignChannelType | '';
    inbox_id: string;
    template_ids: string[];
  };
  onChange: (data: Partial<Step3Props['data']>) => void;
  onNext: () => void;
  onBack: () => void;
}

const Step3_Content = ({ data, onChange, onNext, onBack }: Step3Props) => {
  const { t } = useLanguage('campaigns');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [inboxes, setInboxes] = useState<Inbox[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loadingInboxes, setLoadingInboxes] = useState(true);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Fetch inboxes on mount
  useEffect(() => {
    const fetchInboxes = async () => {
      try {
        const response = await InboxesService.list();
        setInboxes(response.data || []);
      } catch (error) {
        console.error('Error fetching inboxes:', error);
        setInboxes([]);
      } finally {
        setLoadingInboxes(false);
      }
    };

    fetchInboxes();
  }, []);

  // Fetch templates when an inbox is selected
  useEffect(() => {
    if (!data.inbox_id) {
      setTemplates([]);
      return;
    }

    const fetchTemplates = async () => {
      setLoadingTemplates(true);
      try {
        const response = await MessageTemplateService.getTemplates(data.inbox_id, { active: true });
        setTemplates(response.data || []);
      } catch (error) {
        console.error('Error fetching templates:', error);
        setTemplates([]);
      } finally {
        setLoadingTemplates(false);
      }
    };

    fetchTemplates();
  }, [data.inbox_id]);

  const handleSelectInbox = (inboxId: string) => {
    const selectedInbox = inboxes.find(inbox => inbox.id === inboxId);

    if (selectedInbox) {
      // Map channel type to CampaignChannelType
      let channelType: CampaignChannelType = CampaignChannelType.WHATSAPP;
      if (selectedInbox.channel_type?.toLowerCase().includes('email')) {
        channelType = CampaignChannelType.EMAIL;
      } else if (selectedInbox.channel_type?.toLowerCase().includes('sms')) {
        channelType = CampaignChannelType.SMS;
      }

      onChange({
        inbox_id: inboxId,
        channel_type: channelType,
        template_ids: [], // Reset templates when inbox changes
      });
    }
  };

  const handleToggleTemplate = (templateId: string) => {
    const currentIds = data.template_ids || [];
    const newIds = currentIds.includes(templateId)
      ? currentIds.filter(id => id !== templateId)
      : [...currentIds, templateId];

    onChange({ template_ids: newIds });
  };

  const handleNext = () => {
    const newErrors: Record<string, string> = {};

    if (!data.inbox_id) {
      newErrors.inbox_id = t('wizard.validation.inboxRequired');
    }

    if (!data.template_ids || data.template_ids.length === 0) {
      newErrors.template_ids = t('wizard.validation.templateRequired');
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onNext();
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      onboarding: 'text-blue-600 bg-blue-50 dark:bg-blue-950/20',
      promocional: 'text-purple-600 bg-purple-50 dark:bg-purple-950/20',
      transacional: 'text-orange-600 bg-orange-50 dark:bg-orange-950/20',
      feedback: 'text-green-600 bg-green-50 dark:bg-green-950/20',
      informativo: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-950/20',
    };
    return colors[category] || 'text-gray-600 bg-gray-50 dark:bg-gray-950/20';
  };

  const getChannelName = (channelType: string) => {
    switch (channelType) {
      case CampaignChannelType.WHATSAPP:
        return 'WhatsApp';
      case CampaignChannelType.EMAIL:
        return 'Email';
      case CampaignChannelType.SMS:
        return 'SMS';
      default:
        return 'Desconhecido';
    }
  };

  // Filter inboxes by selected channel type
  const filteredInboxes = data.channel_type 
    ? inboxes.filter(inbox => {
        const channelType = inbox.channel_type?.toLowerCase() || '';
        if (data.channel_type === CampaignChannelType.WHATSAPP) {
          return channelType.includes('whatsapp');
        } else if (data.channel_type === CampaignChannelType.EMAIL) {
          return channelType.includes('email');
        } else if (data.channel_type === CampaignChannelType.SMS) {
          return channelType.includes('sms') || channelType.includes('twilio');
        }
        return false;
      })
    : [];

  const isValid = !!data.inbox_id && data.template_ids?.length > 0;

  return (
    <div className="flex flex-col max-w-4xl mx-auto py-6 px-6 h-full">

      <div className="flex-1 overflow-y-auto min-h-0 px-1">
        <div className="w-full space-y-8 max-w-2xl mx-auto pb-4">
          {/* SECTION 1: Seleção de Canal */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <Label className="text-lg font-semibold block">
                  {t('wizard.step3.channelLabel')} <span className="text-red-500">*</span>
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('wizard.step3.channelDescription')}
                </p>
              </div>
            </div>

            {/* Seleção de Canal */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { type: CampaignChannelType.WHATSAPP, icon: MessageCircle, name: 'WhatsApp', color: 'from-green-500 to-emerald-500' },
                { type: CampaignChannelType.EMAIL, icon: Mail, name: 'Email', color: 'from-blue-500 to-cyan-500' },
                { type: CampaignChannelType.SMS, icon: Smartphone, name: 'SMS', color: 'from-purple-500 to-pink-500' },
              ].map((channel) => {
                const Icon = channel.icon;
                const isSelected = data.channel_type === channel.type;
                return (
                  <button
                    key={channel.type}
                    type="button"
                    onClick={() => onChange({ channel_type: channel.type, inbox_id: '' })}
                    className={`p-4 border-2 rounded-lg transition-all ${isSelected
                      ? `border-green-500 bg-gradient-to-br ${channel.color} text-white shadow-lg`
                      : 'border-border hover:border-primary/50 hover:shadow-md'
                      }`}
                  >
                    <Icon className={`h-8 w-8 mx-auto mb-2 ${isSelected ? 'text-white' : 'text-muted-foreground'}`} />
                    <p className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-foreground'}`}>
                      {channel.name}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Inboxes do canal selecionado */}
            {data.channel_type && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <Label className="text-base font-medium block">
                  {t('wizard.step3.inboxLabel', { channel: getChannelName(data.channel_type) })} <span className="text-red-500">*</span>
                </Label>
                <p className="text-sm text-muted-foreground mb-3">
                  {t('wizard.step3.inboxDescription')}
                </p>
                {loadingInboxes ? (
                  <div className="text-center py-4 text-muted-foreground">Loading inboxes...</div>
                ) : filteredInboxes.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    {t('wizard.step3.noInboxes', 'No inboxes available for this channel')}
                  </div>
                ) : (
                  <RadioGroup value={data.inbox_id} onValueChange={handleSelectInbox}>
                    {filteredInboxes.map((inbox) => {
                      const inboxId = inbox.id.toString();
                      return (
                        <div
                          key={inbox.id}
                          className={`flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer ${data.inbox_id === inboxId
                            ? 'border-green-500 bg-green-50/50 dark:bg-green-950/20'
                            : ''
                            }`}
                          onClick={() => handleSelectInbox(inboxId)}
                        >
                          <RadioGroupItem
                            value={inboxId}
                            id={inboxId}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <Label htmlFor={inboxId} className="text-base font-semibold cursor-pointer flex items-center gap-2">
                                {data.inbox_id === inboxId && (
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                )}
                                {inbox.name}
                              </Label>
                              {inbox.phone_number && (
                                <span className="text-xs text-muted-foreground">{inbox.phone_number}</span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground capitalize">{inbox.channel_type}</p>
                          </div>
                        </div>
                      );
                    })}
                  </RadioGroup>
                )}
              </div>
            )}
            {errors.inbox_id && <p className="text-sm text-red-600 mt-2">{errors.inbox_id}</p>}
          </div>

          {/* SECTION 2: Templates */}
          <div className="pt-6 border-t">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <Label className="text-lg font-semibold block">
                  {t('wizard.step3.templatesLabel')} <span className="text-red-500">*</span>
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('wizard.step3.templatesSelected', { count: data.template_ids?.length || 0 })}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {!data.inbox_id ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('wizard.step3.selectInboxFirst', 'Please select an inbox first')}
                </div>
              ) : loadingTemplates ? (
                <div className="text-center py-8 text-muted-foreground">Loading templates...</div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('wizard.step3.noTemplates', 'No templates available for this inbox')}
                </div>
              ) : (
                templates.map((template) => {
                  if (!template.id) return null;
                  const templateId = template.id.toString();
                  return (
                    <div
                      key={template.id}
                      className={`flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer ${data.template_ids?.includes(templateId)
                        ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20'
                        : ''
                        }`}
                      onClick={() => handleToggleTemplate(templateId)}
                    >
                      <Checkbox
                        checked={data.template_ids?.includes(templateId)}
                        onCheckedChange={() => handleToggleTemplate(templateId)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <Label className="text-base font-semibold cursor-pointer flex items-center gap-2">
                            {data.template_ids?.includes(templateId) && (
                              <CheckCircle2 className="h-4 w-4 text-purple-600" />
                            )}
                            {template.name}
                          </Label>
                          {template.category && (
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${getCategoryColor(template.category)}`}>
                              {template.category}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{template.content || 'No content preview'}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {errors.template_ids && <p className="text-sm text-red-600 mt-2">{errors.template_ids}</p>}
          </div>
        </div>
      </div>

      <div className="flex justify-between flex-shrink-0 pt-4 border-t mt-6">
        <Button variant="outline" className="px-6 gap-2" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          {t('wizard.actions.back')}
        </Button>
        <Button className="px-6 gap-2" onClick={handleNext} disabled={!isValid}>
          {t('wizard.actions.continue')}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default Step3_Content;
