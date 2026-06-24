import { useState } from 'react';
import { Input, Label, Button, Textarea } from '@evoapi/design-system';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { TagInput } from '@/components/ai_agents/shared';

export interface Step1Data {
  name: string;
  description: string;
  tags: string[];
}

interface Step1Props {
  data: Step1Data;
  onChange: (data: Step1Data) => void;
  onNext: () => void;
}

export default function Step1_Identity({ data, onChange, onNext }: Step1Props) {
  const { t } = useLanguage('customTools');
  const [error, setError] = useState('');

  const handleNext = () => {
    if (!data.name || !data.name.trim()) {
      setError(t('form.validation.nameRequired'));
      return;
    }
    setError('');
    onNext();
  };

  return (
    <div className="flex flex-col h-full min-h-0 max-w-4xl mx-auto py-2 px-4">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="w-full max-w-2xl mx-auto space-y-4">
          <div>
            <Label className="text-sm mb-1.5 block font-semibold">
              {t('form.fields.name.label')} <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder={t('form.fields.name.placeholder')}
              value={data.name}
              onChange={e => onChange({ ...data, name: e.target.value })}
              className={`h-10 text-sm ${error ? 'border-red-500' : ''}`}
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter' && data.name) handleNext();
              }}
            />
            {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
          </div>

          <div>
            <Label className="text-sm mb-1.5 block font-semibold">
              {t('form.fields.description.label')}
            </Label>
            <Textarea
              placeholder={t('form.fields.description.placeholder')}
              value={data.description}
              onChange={e => onChange({ ...data, description: e.target.value })}
              className="min-h-[80px] text-sm resize-none"
              maxLength={500}
            />
          </div>

          <TagInput
            id="tags"
            label={t('form.fields.tags.label')}
            value={data.tags}
            onChange={tags => onChange({ ...data, tags })}
            placeholder={t('form.fields.tags.placeholderTagInput')}
            hint={t('form.fields.tags.hintTagInput')}
          />
        </div>
      </div>

      <div className="flex justify-end flex-shrink-0 pt-2 border-t">
        <Button className="px-6 gap-2" onClick={handleNext} disabled={!data.name}>
          {t('wizard.actions.continue')}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
