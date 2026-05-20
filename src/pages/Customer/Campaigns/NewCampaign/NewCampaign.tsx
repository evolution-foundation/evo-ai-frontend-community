import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import { useNavigate, useParams } from 'react-router-dom';
import { CampaignType, CampaignChannelType, CampaignStatus } from '@/types/campaigns';
import { campaignsService } from '@/services/campaigns';

// Wizard components - 5 PASSOS
import WizardProgress from './wizard/WizardProgress';
import Step1_BasicInfo from './wizard/Step1_BasicInfo';
import Step2_Audience from './wizard/Step2_Audience';
import Step3_Content from './wizard/Step3_Content';
import Step4_Settings from './wizard/Step4_Settings';
import Step5_Review from './wizard/Step5_Review';

import { CampaignTriggerConfig } from './components/CampaignTriggerConfig';

interface WizardData {
  // Step 1: GERAL
  name: string;
  description: string;
  type: CampaignType | '';
  channel_type: CampaignChannelType | '';
  triggerConfig?: CampaignTriggerConfig;

  // Step 2: AUDIÊNCIA
  contact_selection: 'all' | 'segments' | 'tags' | '';
  segment_ids?: string[];
  tag_ids?: string[];
  estimated_contacts?: number;

  // Step 3: CONTEÚDO
  inbox_id: string;
  template_ids: string[];

  // Step 4: CONFIGURAÇÕES
  schedule_option: 'now' | 'later' | '';
  scheduled_date?: string;
  template_strategy?: 'round_robin' | 'weighted' | 'random' | 'ab_test';
  template_weights?: Record<string, number>;
  ab_test_percentage?: number;
  use_business_hours?: boolean;
  business_hours_start?: string;
  business_hours_end?: string;
  timezone?: string;
  allowed_weekdays?: number[];
  enable_rate_limit?: boolean;
  rate_limit_per_hour?: number;
  enable_retry?: boolean;
  max_retry_attempts?: number;
  spread_sending_hours?: number;

  // A/B Test Details
  ab_test_winner_criteria?: 'open_rate' | 'click_rate';
  ab_test_schedule_option?: 'now' | 'later';
  ab_test_scheduled_date?: string;
  ab_test_skip_winner?: boolean;
  ab_test_winner_scheduled_date?: string;
  ab_test_spread_sending_hours?: number;
}

const INITIAL_DATA: WizardData = {
  name: '',
  description: '',
  type: '',
  channel_type: '',
  contact_selection: '',
  inbox_id: '',
  template_ids: [],
  schedule_option: '',
  template_strategy: 'round_robin',
  ab_test_percentage: 20,
  use_business_hours: false,
  timezone: 'America/Sao_Paulo',
  allowed_weekdays: [1, 2, 3, 4, 5],
  business_hours_start: '09:00',
  business_hours_end: '18:00',
  enable_rate_limit: false,
  enable_retry: true,
  max_retry_attempts: 3,
  estimated_contacts: 0,
  ab_test_winner_criteria: 'open_rate',
  ab_test_schedule_option: 'now',
  ab_test_skip_winner: false,
};

export default function NewCampaign() {
  const { t } = useLanguage('campaigns');
  const navigate = useNavigate();
  const { id: campaignId } = useParams<{ id: string }>();
  const isEditMode = !!campaignId;

  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState<WizardData>(INITIAL_DATA);
  const [loadingCampaign, setLoadingCampaign] = useState(false);
  const [currentCampaignName, setCurrentCampaignName] = useState('');
  const [existingSteps, setExistingSteps] = useState<Record<string, any>>({});

  const steps = [
    { id: 1, label: 'Geral' },
    { id: 2, label: 'Audiência' },
    { id: 3, label: 'Conteúdo' },
    { id: 4, label: 'Configurações' },
    { id: 5, label: 'Revisão' },
  ];

  const totalSteps = steps.length;

  // Navigation handlers
  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleDataChange = useCallback((data: Partial<WizardData>) => {
    setWizardData((prev) => ({ ...prev, ...data }));
  }, []);

  useEffect(() => {
    const loadCampaignForEdit = async () => {
      if (!campaignId) return;
      setLoadingCampaign(true);
      try {
        const campaign = await campaignsService.getCampaign(campaignId);
        setCurrentCampaignName(campaign.name);
        const safeSteps =
          campaign.steps && typeof campaign.steps === 'object' && !Array.isArray(campaign.steps)
            ? campaign.steps
            : {};
        setExistingSteps(safeSteps);
        const wizardState = safeSteps.wizard_state || safeSteps._wizard || {};
        const audienceState = safeSteps.audience || safeSteps.step2 || {};
        const contentState = safeSteps.content || safeSteps.step3 || {};
        const settingsState = safeSteps.settings || safeSteps.step4 || {};

        const asStringArray = (value: unknown): string[] => {
          if (!Array.isArray(value)) return [];
          return value.map((item) => String(item)).filter(Boolean);
        };

        const segmentIds = asStringArray(
          wizardState.segment_ids ?? audienceState.segment_ids ?? safeSteps.segment_ids,
        );
        const tagIds = asStringArray(
          wizardState.tag_ids ?? audienceState.tag_ids ?? safeSteps.tag_ids ?? campaign.tags,
        );

        const templateIds = asStringArray(
          wizardState.template_ids ??
            contentState.template_ids ??
            safeSteps.template_ids ??
            (campaign.templates || []).map(
              (template: any) =>
                template.messageTemplateId ||
                template.message_template_id ||
                template.template_id ||
                template.templateId,
            ),
        );

        const inferredContactSelection: WizardData['contact_selection'] = campaign.send_to_all
          ? 'all'
          : segmentIds.length > 0
            ? 'segments'
            : tagIds.length > 0
              ? 'tags'
              : '';

        const strategy = campaign.template_allocation_config?.strategy;
        const templateStrategy: WizardData['template_strategy'] =
          strategy === 'weighted'
            ? 'weighted'
            : strategy === 'performance_based'
              ? 'ab_test'
              : 'round_robin';

        const triggerConfig = campaign.trigger_config
          ? {
              triggerType: campaign.trigger_config.trigger_type,
              eventName: campaign.trigger_config.event_name,
              eventProperties: campaign.trigger_config.event_properties?.map((prop: any) => ({
                path: prop.path,
                operator: { type: prop.operator, value: prop.value },
              })),
              segmentId: campaign.trigger_config.segment_id,
              segmentName: campaign.trigger_config.segment_name,
              segmentAction: campaign.trigger_config.segment_action,
              contactFields: campaign.trigger_config.contact_fields,
              labelId: campaign.trigger_config.label_id,
              labelName: campaign.trigger_config.label_name,
              labelAction: campaign.trigger_config.label_action,
              customAttributeName: campaign.trigger_config.custom_attribute_name,
              customAttributeDisplayName: campaign.trigger_config.custom_attribute_display_name,
              customAttributeOperator: campaign.trigger_config.custom_attribute_operator,
              customAttributeValue: campaign.trigger_config.custom_attribute_value,
              webhookUrl: campaign.trigger_config.webhook_url,
              webhookSecret: campaign.trigger_config.webhook_secret,
              webhookMethod: campaign.trigger_config.webhook_method,
              expectedHeaders: campaign.trigger_config.expected_headers,
            }
          : undefined;

        setWizardData({
          ...INITIAL_DATA,
          name: wizardState.name || campaign.title || campaign.name || '',
          description: wizardState.description || campaign.description || '',
          type: (wizardState.type || campaign.type || '') as CampaignType,
          channel_type: (wizardState.channel_type || campaign.channel_type || '') as CampaignChannelType,
          triggerConfig: triggerConfig as any,
          contact_selection: (wizardState.contact_selection || audienceState.contact_selection || inferredContactSelection) as WizardData['contact_selection'],
          segment_ids: segmentIds,
          tag_ids: tagIds,
          estimated_contacts: campaign.contacts_count || 0,
          inbox_id: wizardState.inbox_id || contentState.inbox_id || campaign.inbox_id || '',
          template_ids: templateIds,
          schedule_option: wizardState.schedule_option || (campaign.schedule_to ? 'later' : 'now'),
          scheduled_date: wizardState.scheduled_date || campaign.schedule_to || undefined,
          template_strategy: wizardState.template_strategy || settingsState.template_strategy || templateStrategy,
          template_weights:
            wizardState.template_weights ||
            settingsState.template_weights ||
            campaign.template_allocation_config?.weights ||
            {},
          ab_test_percentage: wizardState.ab_test_percentage || campaign.testab_percentage || 20,
          use_business_hours:
            wizardState.use_business_hours ?? !!campaign.recurrence_settings?.business_hours?.enabled,
          business_hours_start:
            wizardState.business_hours_start || campaign.recurrence_settings?.business_hours?.start || '09:00',
          business_hours_end:
            wizardState.business_hours_end || campaign.recurrence_settings?.business_hours?.end || '18:00',
          timezone:
            wizardState.timezone || campaign.recurrence_settings?.business_hours?.timezone || 'America/Sao_Paulo',
          allowed_weekdays: wizardState.allowed_weekdays || campaign.recurrence_settings?.week_days || [1, 2, 3, 4, 5],
          enable_rate_limit: wizardState.enable_rate_limit ?? (campaign.is_rate_limit || false),
          spread_sending_hours:
            wizardState.spread_sending_hours || campaign.spread_sending || campaign.delivery_distribution?.spread_hours || 0,
          ab_test_winner_criteria:
            (wizardState.ab_test_winner_criteria ||
              campaign.testab_winner_criteria ||
              'open_rate') as 'open_rate' | 'click_rate',
          ab_test_schedule_option:
            wizardState.ab_test_schedule_option || (campaign.schedule_to ? 'later' : 'now'),
          ab_test_scheduled_date: wizardState.ab_test_scheduled_date || campaign.schedule_to || undefined,
          ab_test_skip_winner: wizardState.ab_test_skip_winner || false,
          ab_test_winner_scheduled_date: wizardState.ab_test_winner_scheduled_date,
          ab_test_spread_sending_hours: wizardState.ab_test_spread_sending_hours,
          enable_retry: wizardState.enable_retry,
          max_retry_attempts: wizardState.max_retry_attempts,
          rate_limit_per_hour: wizardState.rate_limit_per_hour,
        });
      } catch (error) {
        console.error('Error loading campaign for edit:', error);
        toast.error(t('messages.loadError'));
        navigate('/campaigns');
      } finally {
        setLoadingCampaign(false);
      }
    };

    loadCampaignForEdit();
  }, [campaignId, navigate, t]);

  // Create or update campaign
  const handleSaveCampaign = async () => {
    const toastId = toast.loading(isEditMode ? t('loading.updating') : t('loading.creating'));

    try {
      // Build campaign data
      const wizardState = {
        name: wizardData.name,
        description: wizardData.description,
        type: wizardData.type,
        channel_type: wizardData.channel_type,
        contact_selection: wizardData.contact_selection,
        segment_ids: wizardData.segment_ids || [],
        tag_ids: wizardData.tag_ids || [],
        inbox_id: wizardData.inbox_id,
        template_ids: wizardData.template_ids || [],
        schedule_option: wizardData.schedule_option,
        scheduled_date: wizardData.scheduled_date,
        template_strategy: wizardData.template_strategy,
        template_weights: wizardData.template_weights || {},
        ab_test_percentage: wizardData.ab_test_percentage,
        use_business_hours: wizardData.use_business_hours,
        business_hours_start: wizardData.business_hours_start,
        business_hours_end: wizardData.business_hours_end,
        timezone: wizardData.timezone,
        allowed_weekdays: wizardData.allowed_weekdays || [],
        enable_rate_limit: wizardData.enable_rate_limit,
        rate_limit_per_hour: wizardData.rate_limit_per_hour,
        enable_retry: wizardData.enable_retry,
        max_retry_attempts: wizardData.max_retry_attempts,
        spread_sending_hours: wizardData.spread_sending_hours,
        ab_test_winner_criteria: wizardData.ab_test_winner_criteria,
        ab_test_schedule_option: wizardData.ab_test_schedule_option,
        ab_test_scheduled_date: wizardData.ab_test_scheduled_date,
        ab_test_skip_winner: wizardData.ab_test_skip_winner,
        ab_test_winner_scheduled_date: wizardData.ab_test_winner_scheduled_date,
        ab_test_spread_sending_hours: wizardData.ab_test_spread_sending_hours,
      };

      const campaignData = {
        name: currentCampaignName || wizardData.name.toLowerCase().replace(/\s+/g, '_'),
        title: wizardData.name,
        description: wizardData.description,
        type: wizardData.type as CampaignType,
        channel_type: wizardData.channel_type as CampaignChannelType,
        status: wizardData.type === CampaignType.TRIGGER
          ? CampaignStatus.SCHEDULED // Trigger campaigns start as SCHEDULED until event fires
          : wizardData.schedule_option === 'now' 
            ? CampaignStatus.SENDING 
            : CampaignStatus.SCHEDULED,
        scheduled_at: wizardData.type === CampaignType.TRIGGER
          ? undefined // Trigger campaigns don't use scheduled_at
          : wizardData.schedule_option === 'later' 
            ? wizardData.scheduled_date 
            : undefined,

        // Inbox (apenas 1)
        inbox_id: wizardData.inbox_id,

        // Templates
        template_ids: wizardData.template_ids,

        // Distribution strategy (apenas templates)
        template_allocation_config: {
          strategy: (wizardData.template_strategy === 'weighted'
            ? 'weighted'
            : wizardData.template_strategy === 'ab_test'
              ? 'performance_based'
              : 'equal') as 'equal' | 'weighted' | 'performance_based',
          weights: wizardData.template_weights,
        },

        // Time windows
        schedule_config: {
          week_days: wizardData.allowed_weekdays || [1, 2, 3, 4, 5],
          business_hours: wizardData.use_business_hours && wizardData.business_hours_start && wizardData.business_hours_end
            ? {
              enabled: true,
              start: wizardData.business_hours_start,
              end: wizardData.business_hours_end,
              timezone: wizardData.timezone || 'America/Sao_Paulo',
            }
            : undefined,
        },

        // A/B Test Config
        ab_test_config: wizardData.template_strategy === 'ab_test' ? {
          winner_criteria: wizardData.ab_test_winner_criteria,
          test_percentage: wizardData.ab_test_percentage,
          schedule_option: wizardData.ab_test_schedule_option,
          scheduled_at: wizardData.ab_test_schedule_option === 'later' ? wizardData.ab_test_scheduled_date : undefined,
          skip_winner: wizardData.ab_test_skip_winner,
          winner_scheduled_at: !wizardData.ab_test_skip_winner ? wizardData.ab_test_winner_scheduled_date : undefined,
          spread_hours: wizardData.ab_test_spread_sending_hours,
        } : undefined,

        // Technical config
        is_rate_limit: wizardData.enable_rate_limit || false,
        rate_limits: wizardData.enable_rate_limit
          ? {
            [wizardData.channel_type]: wizardData.rate_limit_per_hour || 1000,
          }
          : undefined,
        retry_config: wizardData.enable_retry
          ? {
            max_attempts: wizardData.max_retry_attempts || 3,
          }
          : undefined,
        spread_sending: wizardData.spread_sending_hours,
        delivery_distribution: wizardData.spread_sending_hours
          ? {
            spread_hours: wizardData.spread_sending_hours,
            timezone: wizardData.timezone,
          }
          : undefined,

        // Contacts
        send_to_all: wizardData.contact_selection === 'all',
        segment_ids: wizardData.segment_ids,
        tag_ids: wizardData.tag_ids,
        steps: {
          ...existingSteps,
          wizard_state: wizardState,
        },

        // Trigger Configuration (if type is TRIGGER)
        trigger_config: wizardData.type === CampaignType.TRIGGER && wizardData.triggerConfig ? {
          trigger_type: wizardData.triggerConfig.triggerType,
          // Event config
          ...(wizardData.triggerConfig.triggerType === 'event' && {
            event_name: wizardData.triggerConfig.eventName,
            event_properties: wizardData.triggerConfig.eventProperties?.map(prop => ({
              path: prop.path,
              operator: prop.operator.type,
              value: prop.operator.value,
            })),
          }),
          // Segment config
          ...(wizardData.triggerConfig.triggerType === 'segment' && {
            segment_id: wizardData.triggerConfig.segmentId,
            segment_name: wizardData.triggerConfig.segmentName,
            segment_action: wizardData.triggerConfig.segmentAction,
          }),
          // Contact config
          ...(['contactCreated', 'contactUpdated'].includes(wizardData.triggerConfig.triggerType) && {
            contact_fields: wizardData.triggerConfig.contactFields,
          }),
          // Label config
          ...(wizardData.triggerConfig.triggerType === 'label' && {
            label_id: wizardData.triggerConfig.labelId,
            label_name: wizardData.triggerConfig.labelName,
            label_action: wizardData.triggerConfig.labelAction,
          }),
          // Custom attribute config
          ...(wizardData.triggerConfig.triggerType === 'customAttribute' && {
            custom_attribute_name: wizardData.triggerConfig.customAttributeName,
            custom_attribute_display_name: wizardData.triggerConfig.customAttributeDisplayName,
            custom_attribute_operator: wizardData.triggerConfig.customAttributeOperator,
            custom_attribute_value: wizardData.triggerConfig.customAttributeValue,
          }),
          // Webhook config
          ...(wizardData.triggerConfig.triggerType === 'webhook' && {
            webhook_url: wizardData.triggerConfig.webhookUrl,
            webhook_secret: wizardData.triggerConfig.webhookSecret,
            webhook_method: wizardData.triggerConfig.webhookMethod,
            expected_headers: wizardData.triggerConfig.expectedHeaders,
          }),
        } : undefined,
      };

      if (isEditMode && campaignId) {
        await campaignsService.updateCampaign(campaignId, campaignData as any);
        toast.success(t('messages.updateSuccess'), { id: toastId });
      } else {
        await campaignsService.createCampaign(campaignData as any);
        toast.success(t('messages.createSuccess'), { id: toastId });
      }
    } catch (error) {
      console.error('Error saving campaign:', error);
      toast.error(isEditMode ? t('messages.updateError') : t('messages.createError'), { id: toastId });
      throw error;
    }
  };

  // Render current step
  const renderCurrentStep = () => {
    switch (currentStep) {
        case 1:
        return (
          <Step1_BasicInfo
            data={{
              name: wizardData.name,
              description: wizardData.description,
              type: wizardData.type,
              triggerConfig: wizardData.triggerConfig,
            }}
            onChange={handleDataChange}
            onNext={handleNext}
          />
        );

      case 2:
        return (
          <Step2_Audience
            data={{
              contact_selection: wizardData.contact_selection,
              segment_ids: wizardData.segment_ids,
              tag_ids: wizardData.tag_ids,
              estimated_contacts: wizardData.estimated_contacts,
            }}
            onChange={handleDataChange}
            onNext={handleNext}
            onBack={handleBack}
          />
        );

      case 3:
        return (
          <Step3_Content
            data={{
              channel_type: wizardData.channel_type,
              inbox_id: wizardData.inbox_id,
              template_ids: wizardData.template_ids,
            }}
            onChange={handleDataChange}
            onNext={handleNext}
            onBack={handleBack}
          />
        );

      case 4:
        return (
          <Step4_Settings
            data={wizardData}
            availableTemplates={[]}
            onChange={handleDataChange}
            onNext={handleNext}
            onBack={handleBack}
          />
        );

      case 5:
        return (
          <Step5_Review
            data={wizardData}
            availableTemplates={[]}
            onBack={handleBack}
            onCreate={handleSaveCampaign}
            isEditMode={isEditMode}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {loadingCampaign && (
        <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
          {t('loading.campaigns')}
        </div>
      )}
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur p-6 flex-shrink-0">
        <div>
          <h2 className="text-2xl font-semibold">
            {isEditMode ? t('wizard.editTitle') : t('wizard.title')}
          </h2>
          <p className="text-sm text-muted-foreground">{t('wizard.subtitle')}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="py-6 px-6 flex-shrink-0">
        <WizardProgress currentStep={currentStep} totalSteps={totalSteps} steps={steps} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">{renderCurrentStep()}</div>
    </div>
  );
}
