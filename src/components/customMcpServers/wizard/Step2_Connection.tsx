import { useState } from 'react';
import { Input, Label, Button } from '@evoapi/design-system';
import { ArrowRight, ArrowLeft, PlugZap, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { KeyValueEditor } from '@/components/ai_agents/shared';
import { testCustomMcpServerConnection } from '@/services/agents/customMcpServerService';
import type { McpTestResult } from '@/types/ai';

export interface Step2Data {
  url: string;
  headers: Record<string, unknown>;
}

interface Step2Props {
  data: Step2Data;
  onChange: (data: Step2Data) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function Step2_Connection({ data, onChange, onNext, onBack }: Step2Props) {
  const { t } = useLanguage('customMcpServers');
  const [error, setError] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<McpTestResult | null>(null);
  const [testError, setTestError] = useState('');

  const validateUrl = (): boolean => {
    if (!data.url || !data.url.trim()) {
      setError(t('form.validation.urlRequired'));
      return false;
    }
    try {
      new URL(data.url);
    } catch {
      setError(t('form.validation.urlInvalid'));
      return false;
    }
    setError('');
    return true;
  };

  const handleNext = () => {
    if (validateUrl()) onNext();
  };

  // EVO-1739: test-before-save — hit the stateless endpoint with the typed url/headers
  // and surface the MCP handshake result (discovered tool count / error).
  const handleTest = async () => {
    if (!validateUrl()) return;
    setTesting(true);
    setTestResult(null);
    setTestError('');
    try {
      const res = await testCustomMcpServerConnection(data.url.trim(), data.headers);
      setTestResult(res.test_result);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setTestError(err?.response?.data?.message || err?.message || t('wizard.test.fail'));
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 max-w-4xl mx-auto py-2 px-4">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="w-full max-w-2xl mx-auto space-y-4">
          <div>
            <Label className="text-sm mb-1.5 block font-semibold">
              {t('form.labels.url')} <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder={t('form.placeholders.url')}
              value={data.url}
              onChange={e => onChange({ ...data, url: e.target.value })}
              className={`h-10 text-sm ${error ? 'border-red-500' : ''}`}
              autoFocus
            />
            {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
          </div>

          <div className="pt-2">
            <KeyValueEditor
              id="headers"
              label={t('form.labels.headers')}
              value={data.headers}
              onChange={next => onChange({ ...data, headers: next })}
              hint={t('form.hints.headers')}
            />
          </div>

          {/* EVO-1739: test the connection before saving. */}
          <div className="pt-2 space-y-2">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={handleTest}
              disabled={testing || !data.url}
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
                    ? t('wizard.test.ok', { count: testResult.tools_count ?? 0 })
                    : testResult.message || testResult.error || t('wizard.test.fail')}
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
        </div>
      </div>

      <div className="flex justify-between flex-shrink-0 pt-2 border-t">
        <Button variant="outline" className="px-6 gap-2" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          {t('wizard.actions.back')}
        </Button>
        <Button className="px-6 gap-2" onClick={handleNext} disabled={!data.url}>
          {t('wizard.actions.continue')}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
