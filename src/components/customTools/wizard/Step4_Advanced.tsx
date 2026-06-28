import { Button, Input, Label, Textarea } from '@evoapi/design-system';
import { ArrowRight, ArrowLeft, SkipForward } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { KeyValueEditor } from '@/components/ai_agents/shared';

export interface ErrorHandling {
  timeout?: number;
  retry_count?: number;
  fallback_response?: string;
}

export interface Step4Data {
  values: Record<string, unknown>;
  error_handling: ErrorHandling;
}

interface Step4Props {
  data: Step4Data;
  onChange: (data: Step4Data) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function Step4_Advanced({ data, onChange, onNext, onBack }: Step4Props) {
  const { t } = useLanguage('customTools');

  const updateError = (patch: Partial<ErrorHandling>) => {
    onChange({ ...data, error_handling: { ...data.error_handling, ...patch } });
  };

  return (
    <div className="flex flex-col h-full min-h-0 max-w-4xl mx-auto py-2 px-4">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="w-full max-w-2xl mx-auto space-y-5">
          <p className="text-sm text-muted-foreground bg-muted/40 rounded p-3">
            {t('wizard.step4.helperText')}
          </p>

          <KeyValueEditor
            id="values"
            label={t('form.fields.values.labelKv')}
            value={data.values}
            onChange={next => onChange({ ...data, values: next })}
            hint={t('form.fields.values.hint')}
            keyPlaceholder={t('form.fields.values.keyPlaceholder')}
            valuePlaceholder={t('form.fields.values.valuePlaceholder')}
          />

          <div className="space-y-3">
            <Label className="text-sm font-semibold">
              {t('form.fields.errorHandling.labelVisual')}
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  {t('form.fields.errorHandling.timeoutLabel')}
                </Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="30"
                  value={data.error_handling.timeout ?? ''}
                  onChange={e =>
                    updateError({
                      timeout: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  {t('form.fields.errorHandling.retryLabel')}
                </Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="3"
                  value={data.error_handling.retry_count ?? ''}
                  onChange={e =>
                    updateError({
                      retry_count:
                        e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">
                {t('form.fields.errorHandling.fallbackLabel')}
              </Label>
              <Textarea
                value={data.error_handling.fallback_response ?? ''}
                onChange={e =>
                  updateError({
                    fallback_response: e.target.value === '' ? undefined : e.target.value,
                  })
                }
                placeholder={t('form.fields.errorHandling.fallbackPlaceholder')}
                rows={2}
                className="text-sm font-mono"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t('form.fields.errorHandling.hint')}
            </p>
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
