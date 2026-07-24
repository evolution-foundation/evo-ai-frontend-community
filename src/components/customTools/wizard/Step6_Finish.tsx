import { useState } from 'react';
import { Button, Input, Label } from '@evoapi/design-system';
import {
  ArrowLeft,
  Plus,
  X,
  Check,
  Link2,
  PlugZap,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import type { CustomToolTestPayloadResult } from '@/services/agents/customToolsService';

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
  // EVO-1738: test-before-save.
  onTest?: () => void;
  testing?: boolean;
  testResult?: CustomToolTestPayloadResult | null;
  testError?: string;
}

export default function Step6_Finish({
  data,
  onChange,
  onBack,
  onSubmit,
  loading = false,
  mode = 'create',
  onTest,
  testing = false,
  testResult = null,
  testError = '',
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
          {onTest && (
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={onTest}
                disabled={testing}
              >
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />}
                {testing ? t('wizard.test.testing') : t('wizard.test.button')}
              </Button>

              {testResult && (
                <div
                  className={`flex items-start gap-2 rounded-md border p-3 text-sm ${
                    testResult.success
                      ? 'border-green-500/40 bg-green-500/5 text-green-700'
                      : 'border-red-500/40 bg-red-500/5 text-red-700'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  )}
                  <span>
                    {testResult.success
                      ? t('wizard.test.ok', { status: testResult.status_code })
                      : testResult.error || t('wizard.test.fail')}
                  </span>
                </div>
              )}

              {testError && (
                <div className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/5 p-3 text-sm text-red-700">
                  <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{testError}</span>
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded p-3">
            {t('wizard.step6.testHint')}
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
