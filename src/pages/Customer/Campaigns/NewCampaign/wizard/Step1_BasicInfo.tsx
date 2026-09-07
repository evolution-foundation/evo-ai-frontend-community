import { useTranslation as useUiTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Input, Label, Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from '@evoapi/design-system';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { CampaignType } from '@/types/campaigns';
import { CampaignTriggerConfig } from '../components/CampaignTriggerConfig';

interface Step1Props {
  data: {
    name: string;
    description: string;
    type: CampaignType | '';
    triggerConfig?: CampaignTriggerConfig;
  };
  onChange: (data: Partial<Step1Props['data']>) => void;
  onNext: () => void;
}

const Step1_BasicInfo = ({ data, onChange, onNext }: Step1Props) => {
  const { t: tUi } = useUiTranslation();
  const { t } = useLanguage('campaigns');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const newErrors: Record<string, string> = {};

    if (data.name && data.name.trim().length < 3) {
      newErrors.name = tUi("campaigns:wizard.validation.nameMinLength");
    }

    setErrors(newErrors);
  }, [data.name, tUi]);

  const handleNext = () => {
    const newErrors: Record<string, string> = {};

    if (!data.name || !data.name.trim()) {
      newErrors.name = tUi("campaigns:wizard.validation.nameRequired");
    } else if (data.name.trim().length < 3) {
      newErrors.name = tUi("campaigns:wizard.validation.nameMinLength");
    }

    if (!data.type) {
      newErrors.type = t('wizard.validation.typeRequired');
    }

    if (data.type === CampaignType.TRIGGER) {
      if (!data.triggerConfig || !data.triggerConfig.triggerType) {
        newErrors.triggerConfig = tUi("interface:step1Basicinfo.triggerConfigurationIsRequiredForTriggeredCampaigns");
      } else if (data.triggerConfig.triggerType === 'event' && (!data.triggerConfig.eventName || !data.triggerConfig.eventName.trim())) {
        newErrors.triggerConfig = tUi("interface:step1Basicinfo.anEventNameIsRequiredForEventTriggers");
      } else if (data.triggerConfig.triggerType === 'segment' && !data.triggerConfig.segmentId) {
        newErrors.triggerConfig = tUi("interface:step1Basicinfo.aSegmentIsRequiredForSegmentTriggers");
      } else if (data.triggerConfig.triggerType === 'label' && !data.triggerConfig.labelId) {
        newErrors.triggerConfig = tUi("interface:step1Basicinfo.aLabelIsRequiredForLabelTriggers");
      } else if (data.triggerConfig.triggerType === 'customAttribute' && !data.triggerConfig.customAttributeName) {
        newErrors.triggerConfig = tUi("interface:step1Basicinfo.aCustomAttributeIsRequiredForAttributeTriggers");
      } else if (data.triggerConfig.triggerType === 'webhook' && (!data.triggerConfig.webhookUrl || !data.triggerConfig.webhookUrl.trim())) {
        newErrors.triggerConfig = tUi("interface:step1Basicinfo.aWebhookUrlIsRequiredForWebhookTriggers");
      }
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onNext();
    }
  };

  const isValid =
    data.name?.trim() &&
    data.type &&
    (data.type !== CampaignType.TRIGGER || (data.triggerConfig && data.triggerConfig.triggerType)) &&
    Object.keys(errors).length === 0;

  return (
    <div className="flex flex-col max-w-4xl mx-auto py-6 px-6 h-full">
      <div className="flex-1 overflow-y-auto min-h-0 px-1">
        <div className="w-full space-y-6 max-w-2xl mx-auto pb-4">
          {/* Name */}
          <div>
            <Label className="text-base mb-2 block font-semibold">
              {tUi("roles:table.name")} <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder={tUi("interface:step1Basicinfo.eGBlackFridayCampaign")}
              value={data.name}
              onChange={(e) => onChange({ name: e.target.value })}
              className={`h-12 text-base ${errors.name ? 'border-red-500 focus:border-red-500' : ''}`}
              autoFocus
            />
            {errors.name && <p className="text-sm text-red-600 mt-2">{errors.name}</p>}
          </div>

          {/* Description */}
          <div>
            <Label className="text-base mb-2 block font-semibold">
              {tUi("campaigns:dialog.details.fields.description")}</Label>
            <Textarea
              placeholder={tUi("interface:step1Basicinfo.brieflyDescribeThePurposeOfThisCampaign")}
              value={data.description}
              onChange={(e) => onChange({ description: e.target.value })}
              className="min-h-[100px] text-base resize-none"
              rows={4}
            />
            <p className="text-xs text-muted-foreground mt-1">{tUi("interface:step1Basicinfo.optional")}</p>
          </div>

          {/* Type */}
          <div>
            <Label className="text-base mb-2 block font-semibold">
              {t('wizard.step1.typeLabel')} <span className="text-red-500">*</span>
            </Label>
            <Select
              value={data.type || ''}
              onValueChange={(value) => onChange({ type: value as CampaignType })}
            >
              <SelectTrigger className={`h-12 text-base ${errors.type ? 'border-red-500' : ''}`}>
                <SelectValue placeholder={t('wizard.step1.typePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CampaignType.SIMPLE}>{t('type.simple')}</SelectItem>
                <SelectItem value={CampaignType.RECURRING}>{t('type.recurring')}</SelectItem>
                <SelectItem value={CampaignType.TRIGGER}>{t('type.trigger')}</SelectItem>
              </SelectContent>
            </Select>
            {errors.type && <p className="text-sm text-red-600 mt-2">{errors.type}</p>}
          </div>

          {/* Trigger Configuration */}
          {data.type === CampaignType.TRIGGER && (
            <>
              <CampaignTriggerConfig
                config={data.triggerConfig || { triggerType: 'event' }}
                onChange={(config) => onChange({ triggerConfig: config })}
              />
              {errors.triggerConfig && (
                <p className="text-sm text-red-600 mt-2">{errors.triggerConfig}</p>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex justify-end flex-shrink-0 pt-4 border-t mt-6">
        <Button className="px-6 gap-2" onClick={handleNext} disabled={!isValid}>
          {t('wizard.actions.continue')}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default Step1_BasicInfo;
