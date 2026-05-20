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
  const { t } = useLanguage('campaigns');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const newErrors: Record<string, string> = {};

    if (data.name && data.name.trim().length < 3) {
      newErrors.name = 'Nome deve ter no mínimo 3 caracteres';
    }

    setErrors(newErrors);
  }, [data.name]);

  const handleNext = () => {
    const newErrors: Record<string, string> = {};

    if (!data.name || !data.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    } else if (data.name.trim().length < 3) {
      newErrors.name = 'Nome deve ter no mínimo 3 caracteres';
    }

    if (!data.type) {
      newErrors.type = t('wizard.validation.typeRequired');
    }

    if (data.type === CampaignType.TRIGGER) {
      if (!data.triggerConfig || !data.triggerConfig.triggerType) {
        newErrors.triggerConfig = 'Configuração de trigger é obrigatória para campanhas com gatilho';
      } else if (data.triggerConfig.triggerType === 'event' && (!data.triggerConfig.eventName || !data.triggerConfig.eventName.trim())) {
        newErrors.triggerConfig = 'Nome do evento é obrigatório para triggers do tipo evento';
      } else if (data.triggerConfig.triggerType === 'segment' && !data.triggerConfig.segmentId) {
        newErrors.triggerConfig = 'Segmento é obrigatório para triggers do tipo segmento';
      } else if (data.triggerConfig.triggerType === 'label' && !data.triggerConfig.labelId) {
        newErrors.triggerConfig = 'Etiqueta é obrigatória para triggers do tipo etiqueta';
      } else if (data.triggerConfig.triggerType === 'customAttribute' && !data.triggerConfig.customAttributeName) {
        newErrors.triggerConfig = 'Atributo personalizado é obrigatório para triggers do tipo atributo';
      } else if (data.triggerConfig.triggerType === 'webhook' && (!data.triggerConfig.webhookUrl || !data.triggerConfig.webhookUrl.trim())) {
        newErrors.triggerConfig = 'URL do webhook é obrigatória para triggers do tipo webhook';
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
              Nome <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder="Ex: Campanha Black Friday 2025"
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
              Descrição
            </Label>
            <Textarea
              placeholder="Descreva brevemente o objetivo desta campanha..."
              value={data.description}
              onChange={(e) => onChange({ description: e.target.value })}
              className="min-h-[100px] text-base resize-none"
              rows={4}
            />
            <p className="text-xs text-muted-foreground mt-1">Opcional</p>
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
