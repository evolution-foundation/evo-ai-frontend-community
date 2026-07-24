import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle, Button } from '@evoapi/design-system';
import { X, Code2, LayoutList } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { CustomMcpServer, CustomMcpServerFormData } from '@/types/ai';
import {
  WizardData,
  initialWizardData,
  serverToWizardData,
  parseWizardConfig,
} from './wizardConfig';
import WizardProgress from '@/pages/Customer/Agents/Agent/wizard/WizardProgress';
import { AdvancedJsonEditor } from '@/components/ai_agents/shared';
import {
  Step1_Identity,
  Step2_Connection,
  Step3_Advanced,
  Step4_Finish,
} from './wizard';

interface CustomMCPServerWizardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading?: boolean;
  onSubmit: (data: CustomMcpServerFormData) => void;
  /** Render as a full-page embedded view (sidebar/topbar visible) instead of a Dialog overlay. */
  embedded?: boolean;
  /** When provided, the wizard runs in edit mode and prefills its state from this server. */
  server?: CustomMcpServer;
}

const TOTAL_STEPS = 4;

export default function CustomMCPServerWizardModal({
  open,
  onOpenChange,
  loading = false,
  onSubmit,
  embedded = false,
  server,
}: CustomMCPServerWizardModalProps) {
  const { t } = useLanguage('customMcpServers');
  const isEdit = !!server;
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<WizardData>(() =>
    server ? serverToWizardData(server) : initialWizardData,
  );
  // EVO-1739: advanced (raw JSON) mode — the whole config as editable JSON.
  const [mode, setMode] = useState<'form' | 'json'>('form');
  // Syntax validity (is it a JSON object?) is reported by the editor; `jsonIssues` holds
  // the semantic problems this component finds in that object. Both must be clear before
  // the config can be saved.
  const [jsonValid, setJsonValid] = useState(true);
  const [jsonIssues, setJsonIssues] = useState<string[]>([]);
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      const timeout = setTimeout(() => {
        setCurrentStep(1);
        setMode('form');
        setJsonValid(true);
        setJsonIssues([]);
        setData(server ? serverToWizardData(server) : initialWizardData);
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [open, server]);

  useEffect(() => {
    if (open && server) {
      setData(serverToWizardData(server));
    }
  }, [server?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open && contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [open, currentStep]);

  const steps = [
    { id: 1, label: t('wizard.progress.identity') },
    { id: 2, label: t('wizard.progress.connection') },
    { id: 3, label: t('wizard.progress.advanced') },
    { id: 4, label: t('wizard.progress.finish') },
  ];

  const stepHeader: Record<number, { title: string; subtitle: string }> = {
    1: { title: t('wizard.step1.title'), subtitle: t('wizard.step1.subtitle') },
    2: { title: t('wizard.step2.title'), subtitle: t('wizard.step2.subtitle') },
    3: { title: t('wizard.step3.title'), subtitle: t('wizard.step3.subtitle') },
    4: { title: t('wizard.step4.title'), subtitle: t('wizard.step4.subtitle') },
  };

  const handleNext = () => setCurrentStep(s => Math.min(s + 1, TOTAL_STEPS));
  const handleBack = () => setCurrentStep(s => Math.max(s - 1, 1));

  const handleSubmit = () => {
    const payload: CustomMcpServerFormData = {
      name: data.name.trim(),
      description: data.description.trim() || '',
      url: data.url.trim(),
      headers: data.headers,
      timeout: data.timeout,
      retry_count: data.retry_count,
      tags: data.tags,
    };
    onSubmit(payload);
  };

  // EVO-1739: the config object shown/edited in advanced (raw JSON) mode.
  const configObject = (): Record<string, unknown> => ({
    name: data.name,
    description: data.description,
    url: data.url,
    headers: data.headers,
    timeout: data.timeout,
    retry_count: data.retry_count,
    tags: data.tags,
  });

  const applyJson = (parsed: Record<string, unknown>) => {
    const { data: next, issues } = parseWizardConfig(parsed, t);
    setJsonIssues(issues);
    // Commit only a fully valid config. A partial commit would leave `data` holding some
    // of the user's edits and some stale values, which is the ambiguity the form/JSON
    // round-trip cannot recover from. While issues are listed, submit is blocked anyway.
    if (issues.length === 0) setData(next);
  };

  // Entering advanced mode re-derives the issues from the config that is about to be
  // serialized into the editor, so the listed problems always describe what is on screen.
  const enterJsonMode = () => {
    setJsonValid(true);
    setJsonIssues(parseWizardConfig(configObject(), t).issues);
    setMode('json');
  };

  const canSubmitJson = jsonValid && jsonIssues.length === 0;

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1_Identity
            data={{
              name: data.name,
              description: data.description,
              tags: data.tags,
            }}
            onChange={d => setData(prev => ({ ...prev, ...d }))}
            onNext={handleNext}
          />
        );
      case 2:
        return (
          <Step2_Connection
            data={{
              url: data.url,
              headers: data.headers,
            }}
            onChange={d => setData(prev => ({ ...prev, ...d }))}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 3:
        return (
          <Step3_Advanced
            data={{
              timeout: data.timeout,
              retry_count: data.retry_count,
            }}
            onChange={d => setData(prev => ({ ...prev, ...d }))}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 4:
        return (
          <Step4_Finish
            data={{
              name: data.name,
              description: data.description,
              url: data.url,
              headers: data.headers,
              timeout: data.timeout,
              retry_count: data.retry_count,
              tags: data.tags,
            }}
            onBack={handleBack}
            onSubmit={handleSubmit}
            loading={loading}
            mode={isEdit ? 'edit' : 'create'}
          />
        );
      default:
        return null;
    }
  };

  const header = stepHeader[currentStep];

  const wizardContent = (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between px-3 pt-3 pb-0 flex-shrink-0">
        {/* EVO-1739: Form ↔ advanced (raw JSON) mode toggle. */}
        <div className="inline-flex rounded-md border p-0.5" role="tablist" aria-label={t('wizard.mode.label')}>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'form'}
            onClick={() => setMode('form')}
            className={`inline-flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium transition-colors ${
              mode === 'form' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutList className="h-3.5 w-3.5" />
            {t('wizard.mode.form')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'json'}
            onClick={enterJsonMode}
            className={`inline-flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium transition-colors ${
              mode === 'json' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Code2 className="h-3.5 w-3.5" />
            {t('wizard.mode.json')}
          </button>
        </div>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Close wizard"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {mode === 'json' ? (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="border-b bg-transparent p-3 pt-1.5 flex-shrink-0 text-center">
            <h2 className="text-2xl font-semibold leading-tight">{t('wizard.advanced.title')}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t('wizard.advanced.subtitle')}</p>
          </div>
          <div ref={contentRef} className="flex-1 overflow-y-auto px-4 py-3 min-h-0">
            <AdvancedJsonEditor
              value={configObject()}
              onChange={applyJson}
              onValidityChange={setJsonValid}
              issues={jsonIssues}
              rows={20}
              hint={t('wizard.advanced.hint')}
            />
          </div>
          <div className="flex justify-end gap-2 flex-shrink-0 p-3 border-t">
            <Button variant="outline" className="px-6" onClick={() => onOpenChange(false)}>
              {t('wizard.actions.cancel')}
            </Button>
            <Button className="px-6" onClick={handleSubmit} disabled={loading || !canSubmitJson}>
              {isEdit ? t('wizard.actions.save') : t('wizard.actions.create')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="border-b bg-transparent p-3 pt-1.5 flex-shrink-0">
            <div className="text-center">
              <h2 className="text-2xl font-semibold leading-tight">{header.title}</h2>
              {header.subtitle && (
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">
                  {header.subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="py-2 px-4 flex-shrink-0 bg-transparent">
            <WizardProgress
              currentStep={currentStep}
              totalSteps={TOTAL_STEPS}
              steps={steps}
            />
          </div>

          <div ref={contentRef} className="flex-1 overflow-y-auto px-3 min-h-0">
            {renderStep()}
          </div>
        </div>
      )}
    </div>
  );

  if (embedded) {
    return (
      <div className="w-full h-full min-h-0 bg-background overflow-hidden">
        {wizardContent}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="!w-[72vw] !max-w-[72vw] h-[94vh] max-h-[94vh] overflow-hidden p-0 sm:!max-w-[72vw]"
      >
        <DialogTitle className="sr-only">{t('modal.title.create')}</DialogTitle>
        {wizardContent}
      </DialogContent>
    </Dialog>
  );
}
