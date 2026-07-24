import { useState } from 'react';
import { Button, Input, Label } from '@evoapi/design-system';
import { ArrowLeft, Plus, X, Check, Link2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { TestRequestButton } from '@/components/ai_agents/shared';
import type { CustomToolTestPayload } from '@/services/agents/customToolsService';

export interface Step6Data {
  examples: string[];
}

interface Step6Props {
  data: Step6Data;
  onChange: (data: Step6Data) => void;
  onBack: () => void;
  onSubmit: () => void;
  loading?: boolean;
  mode?: 'create' | 'edit';
  /**
   * EVO-1738 test-before-save. Rendering goes through the shared
   * TestRequestButton so the wizard shows the same rich result the rest of the
   * product does (status code, response time, headers, body) instead of a
   * status-only banner.
   */
  getTestPayload?: () => CustomToolTestPayload;
  /**
   * Serialized request definition. Changing it remounts the test button, so a
   * previous "HTTP 200" can never linger next to a config the user has edited.
   */
  testKey?: string;
}

export default function Step6_Finish({
  data,
  onChange,
  onBack,
  onSubmit,
  loading = false,
  mode = 'create',
  getTestPayload,
  testKey,
}: Step6Props) {
  const { t } = useLanguage('customTools');
  const [newExample, setNewExample] = useState('');

  const handleAdd = () => {
    if (newExample.trim()) {
      onChange({ ...data, examples: [...data.examples, newExample.trim()] });
      setNewExample('');
    }
  };

  const handleRemove = (index: number) => {
    onChange({
      ...data,
      examples: data.examples.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="flex flex-col h-full min-h-0 max-w-4xl mx-auto py-2 px-4">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="w-full max-w-2xl mx-auto space-y-4">
          <p className="text-sm text-muted-foreground bg-muted/40 rounded p-3">
            {t('wizard.step6.helperText')}
          </p>

          <div>
            <Label className="text-sm mb-1.5 block font-semibold">
              {t('form.fields.examples.label')}
            </Label>
            <div className="flex gap-2">
              <Input
                value={newExample}
                onChange={e => setNewExample(e.target.value)}
                placeholder={t('form.fields.examples.placeholder')}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
                className="h-10 text-sm"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAdd}
                disabled={!newExample.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {data.examples.length > 0 && (
              <div className="space-y-2 mt-3">
                {data.examples.map((example, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 bg-muted/30 rounded"
                  >
                    <span className="flex-1 text-sm">{example}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* EVO-1738: test the request before saving. */}
          {getTestPayload && (
            <TestRequestButton key={testKey} mode={mode} getPayload={getTestPayload} />
          )}

          <p className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded p-3">
            {getTestPayload ? t('wizard.step6.testHintDraft') : t('wizard.step6.testHint')}
          </p>

          <p className="flex items-start gap-2 text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded p-3">
            <Link2 className="h-4 w-4 flex-shrink-0 mt-px text-blue-600 dark:text-blue-400" />
            <span>{t('wizard.step6.attachHint')}</span>
          </p>
        </div>
      </div>

      <div className="flex justify-between flex-shrink-0 pt-2 border-t">
        <Button variant="outline" className="px-6 gap-2" onClick={onBack} disabled={loading}>
          <ArrowLeft className="h-4 w-4" />
          {t('wizard.actions.back')}
        </Button>
        <Button className="px-6 gap-2" onClick={onSubmit} disabled={loading}>
          <Check className="h-4 w-4" />
          {loading
            ? t('form.actions.saving')
            : t(mode === 'edit' ? 'wizard.actions.save' : 'wizard.actions.create')}
        </Button>
      </div>
    </div>
  );
}
