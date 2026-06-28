import { Button } from '@evoapi/design-system';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { KeyValueEditor } from '@/components/ai_agents/shared';

export interface Step3Data {
  method: string;
  query_params: Record<string, unknown>;
  path_params: Record<string, unknown>;
  body_params: Record<string, unknown>;
}

interface Step3Props {
  data: Step3Data;
  onChange: (data: Step3Data) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function Step3_Parameters({ data, onChange, onNext, onBack }: Step3Props) {
  const { t } = useLanguage('customTools');

  const showBody =
    data.method === 'POST' || data.method === 'PUT' || data.method === 'PATCH';

  return (
    <div className="flex flex-col h-full min-h-0 max-w-4xl mx-auto py-2 px-4">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="w-full max-w-2xl mx-auto space-y-5">
          <KeyValueEditor
            id="query_params"
            label={t('form.fields.queryParams.labelKv')}
            value={data.query_params}
            onChange={next => onChange({ ...data, query_params: next })}
            hint={t('form.fields.queryParams.hint')}
            keyPlaceholder={t('form.fields.queryParams.keyPlaceholder')}
            valuePlaceholder={t('form.fields.queryParams.valuePlaceholder')}
          />

          <KeyValueEditor
            id="path_params"
            label={t('form.fields.pathParams.labelKv')}
            value={data.path_params}
            onChange={next => onChange({ ...data, path_params: next })}
            hint={t('form.fields.pathParams.hint')}
            keyPlaceholder={t('form.fields.pathParams.keyPlaceholder')}
            valuePlaceholder={t('form.fields.pathParams.valuePlaceholder')}
          />

          {showBody && (
            <KeyValueEditor
              id="body_params"
              label={t('form.fields.bodyParams.labelKv')}
              value={data.body_params}
              onChange={next => onChange({ ...data, body_params: next })}
              hint={t('form.fields.bodyParams.hint')}
              keyPlaceholder={t('form.fields.bodyParams.keyPlaceholder')}
              valuePlaceholder={t('form.fields.bodyParams.valuePlaceholder')}
            />
          )}
        </div>
      </div>

      <div className="flex justify-between flex-shrink-0 pt-2 border-t">
        <Button variant="outline" className="px-6 gap-2" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          {t('wizard.actions.back')}
        </Button>
        <Button className="px-6 gap-2" onClick={onNext}>
          {t('wizard.actions.continue')}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
