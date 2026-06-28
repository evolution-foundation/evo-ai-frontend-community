import {
  Button,
  Badge,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@evoapi/design-system';
import { ArrowRight, ArrowLeft, SkipForward, LogIn, LogOut } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

export interface Step5Data {
  input_mode: string;
  input_description: string;
  output_mode: string;
  output_description: string;
}

interface Step5Props {
  data: Step5Data;
  onChange: (data: Step5Data) => void;
  onNext: () => void;
  onBack: () => void;
}

const MODE_OPTIONS = ['text', 'image', 'audio', 'video', 'json', 'file'] as const;

export default function Step5_Modes({ data, onChange, onNext, onBack }: Step5Props) {
  const { t } = useLanguage('customTools');

  return (
    <div className="flex flex-col h-full min-h-0 max-w-4xl mx-auto py-2 px-4">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="w-full max-w-3xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Input column */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-1.5">
                <LogIn className="h-4 w-4 text-emerald-500" />
                {t('wizard.step5.input.typeLabel')}
              </Label>
              <Select
                value={data.input_mode || undefined}
                onValueChange={value => onChange({ ...data, input_mode: value })}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder={t('wizard.step5.selectPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {MODE_OPTIONS.map(opt => (
                    <SelectItem key={opt} value={opt}>
                      {t(`wizard.step5.modeOptions.${opt}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2 pt-1">
                <Label className="text-sm font-semibold">
                  {t('wizard.step5.input.descriptionLabel')}
                </Label>
                <Badge variant="secondary" className="text-[10px] font-normal">
                  {t('wizard.step5.input.badge')}
                </Badge>
              </div>
              <Textarea
                value={data.input_description}
                onChange={e =>
                  onChange({ ...data, input_description: e.target.value })
                }
                placeholder={t('wizard.step5.input.descriptionPlaceholder')}
                rows={4}
                className="text-sm resize-none"
              />
            </div>

            {/* Output column */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-1.5">
                <LogOut className="h-4 w-4 text-emerald-500" />
                {t('wizard.step5.output.typeLabel')}
              </Label>
              <Select
                value={data.output_mode || undefined}
                onValueChange={value => onChange({ ...data, output_mode: value })}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder={t('wizard.step5.selectPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {MODE_OPTIONS.map(opt => (
                    <SelectItem key={opt} value={opt}>
                      {t(`wizard.step5.modeOptions.${opt}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2 pt-1">
                <Label className="text-sm font-semibold">
                  {t('wizard.step5.output.descriptionLabel')}
                </Label>
                <Badge variant="secondary" className="text-[10px] font-normal">
                  {t('wizard.step5.output.badge')}
                </Badge>
              </div>
              <Textarea
                value={data.output_description}
                onChange={e =>
                  onChange({ ...data, output_description: e.target.value })
                }
                placeholder={t('wizard.step5.output.descriptionPlaceholder')}
                rows={4}
                className="text-sm resize-none"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between flex-shrink-0 pt-2 border-t">
        <Button variant="outline" className="px-6 gap-2" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          {t('wizard.actions.back')}
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" className="px-6 gap-2" onClick={onNext}>
            <SkipForward className="h-4 w-4" />
            {t('wizard.actions.skip')}
          </Button>
          <Button className="px-6 gap-2" onClick={onNext}>
            {t('wizard.actions.continue')}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
