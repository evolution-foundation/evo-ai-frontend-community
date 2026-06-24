import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@evoapi/design-system';
import { X } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { CustomTool, CustomToolFormData } from '@/types/ai';
import WizardProgress from '@/pages/Customer/Agents/Agent/wizard/WizardProgress';
import {
  Step1_Identity,
  Step2_Endpoint,
  Step3_Parameters,
  Step4_Advanced,
  Step5_Modes,
  Step6_Finish,
} from './wizard';
import type { ErrorHandling } from './wizard/Step4_Advanced';

interface CustomToolWizardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading?: boolean;
  onSubmit: (data: CustomToolFormData) => void;
  /** Render as a full-page embedded view (sidebar/topbar visible) instead of a Dialog overlay. */
  embedded?: boolean;
  /** When provided, the wizard runs in edit mode and prefills its state from this tool. */
  tool?: CustomTool;
}

const MODES_META_KEY = '__modes_meta__';

const extractModesMeta = (
  values: Record<string, unknown> | undefined,
): { input: string; output: string; cleanValues: Record<string, unknown> } => {
  const safeValues = values || {};
  const meta = safeValues[MODES_META_KEY];
  const cleanValues = { ...safeValues };
  delete cleanValues[MODES_META_KEY];
  if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
    const m = meta as Record<string, unknown>;
    return {
      input: typeof m.input === 'string' ? m.input : '',
      output: typeof m.output === 'string' ? m.output : '',
      cleanValues,
    };
  }
  return { input: '', output: '', cleanValues };
};

const toolToWizardData = (tool: CustomTool): WizardData => {
  const { input, output, cleanValues } = extractModesMeta(
    tool.values as Record<string, unknown>,
  );
  const eh = (tool.error_handling as Record<string, unknown>) || {};
  return {
    name: tool.name || '',
    description: tool.description || '',
    tags: tool.tags || [],
    method: tool.method || 'GET',
    endpoint: tool.endpoint || '',
    headers: (tool.headers as Record<string, unknown>) || {},
    query_params: (tool.query_params as Record<string, unknown>) || {},
    path_params: (tool.path_params as Record<string, unknown>) || {},
    body_params: (tool.body_params as Record<string, unknown>) || {},
    values: cleanValues,
    error_handling: {
      timeout: typeof eh.timeout === 'number' ? eh.timeout : undefined,
      retry_count: typeof eh.retry_count === 'number' ? eh.retry_count : undefined,
      fallback_response:
        typeof eh.fallback_response === 'string' ? eh.fallback_response : undefined,
    },
    input_mode: tool.input_modes?.[0] || '',
    input_description: input,
    output_mode: tool.output_modes?.[0] || '',
    output_description: output,
    examples: tool.examples || [],
  };
};

interface WizardData {
  // Step 1
  name: string;
  description: string;
  tags: string[];
  // Step 2
  method: string;
  endpoint: string;
  headers: Record<string, unknown>;
  // Step 3
  query_params: Record<string, unknown>;
  path_params: Record<string, unknown>;
  body_params: Record<string, unknown>;
  // Step 4
  values: Record<string, unknown>;
  error_handling: ErrorHandling;
  // Step 5
  input_mode: string;
  input_description: string;
  output_mode: string;
  output_description: string;
  // Step 6
  examples: string[];
}

const initialWizardData: WizardData = {
  name: '',
  description: '',
  tags: [],
  method: 'GET',
  endpoint: '',
  headers: {},
  query_params: {},
  path_params: {},
  body_params: {},
  values: {},
  error_handling: {},
  input_mode: '',
  input_description: '',
  output_mode: '',
  output_description: '',
  examples: [],
};

const TOTAL_STEPS = 6;

const errorHandlingToObject = (eh: ErrorHandling): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  if (eh.timeout !== undefined) out.timeout = eh.timeout;
  if (eh.retry_count !== undefined) out.retry_count = eh.retry_count;
  if (eh.fallback_response !== undefined) out.fallback_response = eh.fallback_response;
  return out;
};

export default function CustomToolWizardModal({
  open,
  onOpenChange,
  loading = false,
  onSubmit,
  embedded = false,
  tool,
}: CustomToolWizardModalProps) {
  const { t } = useLanguage('customTools');
  const isEdit = !!tool;
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<WizardData>(() =>
    tool ? toolToWizardData(tool) : initialWizardData,
  );
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      const timeout = setTimeout(() => {
        setCurrentStep(1);
        setData(tool ? toolToWizardData(tool) : initialWizardData);
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [open, tool]);

  useEffect(() => {
    if (open && tool) {
      setData(toolToWizardData(tool));
    }
  }, [tool?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open && contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [open, currentStep]);

  const steps = [
    { id: 1, label: t('wizard.progress.identity') },
    { id: 2, label: t('wizard.progress.endpoint') },
    { id: 3, label: t('wizard.progress.parameters') },
    { id: 4, label: t('wizard.progress.advanced') },
    { id: 5, label: t('wizard.progress.modes') },
    { id: 6, label: t('wizard.progress.finish') },
  ];

  const stepHeader: Record<number, { title: string; subtitle: string }> = {
    1: { title: t('wizard.step1.title'), subtitle: t('wizard.step1.subtitle') },
    2: { title: t('wizard.step2.title'), subtitle: t('wizard.step2.subtitle') },
    3: { title: t('wizard.step3.title'), subtitle: t('wizard.step3.subtitle') },
    4: { title: t('wizard.step4.title'), subtitle: t('wizard.step4.subtitle') },
    5: { title: t('wizard.step5.title'), subtitle: t('wizard.step5.subtitle') },
    6: { title: t('wizard.step6.title'), subtitle: t('wizard.step6.subtitle') },
  };

  const handleNext = () => setCurrentStep(s => Math.min(s + 1, TOTAL_STEPS));
  const handleBack = () => setCurrentStep(s => Math.max(s - 1, 1));

  const handleSubmit = () => {
    // Mode descriptions don't map to a backend field; stash them inside `values`
    // under a reserved key so they round-trip across reads.
    const modesMeta: Record<string, string> = {};
    if (data.input_description.trim()) modesMeta.input = data.input_description.trim();
    if (data.output_description.trim()) modesMeta.output = data.output_description.trim();
    const valuesWithMeta =
      Object.keys(modesMeta).length > 0
        ? { ...data.values, __modes_meta__: modesMeta }
        : data.values;

    const payload: CustomToolFormData = {
      name: data.name.trim(),
      description: data.description.trim(),
      method: data.method,
      endpoint: data.endpoint.trim(),
      headers: data.headers,
      query_params: data.query_params,
      path_params: data.path_params,
      body_params: data.body_params,
      values: valuesWithMeta,
      error_handling: errorHandlingToObject(data.error_handling),
      input_modes: data.input_mode ? [data.input_mode] : [],
      output_modes: data.output_mode ? [data.output_mode] : [],
      tags: data.tags,
      examples: data.examples,
    };
    onSubmit(payload);
  };

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
          <Step2_Endpoint
            data={{
              method: data.method,
              endpoint: data.endpoint,
              headers: data.headers,
            }}
            onChange={d => setData(prev => ({ ...prev, ...d }))}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 3:
        return (
          <Step3_Parameters
            data={{
              method: data.method,
              query_params: data.query_params,
              path_params: data.path_params,
              body_params: data.body_params,
            }}
            onChange={d =>
              setData(prev => ({
                ...prev,
                query_params: d.query_params,
                path_params: d.path_params,
                body_params: d.body_params,
              }))
            }
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 4:
        return (
          <Step4_Advanced
            data={{
              values: data.values,
              error_handling: data.error_handling,
            }}
            onChange={d => setData(prev => ({ ...prev, ...d }))}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 5:
        return (
          <Step5_Modes
            data={{
              input_mode: data.input_mode,
              input_description: data.input_description,
              output_mode: data.output_mode,
              output_description: data.output_description,
            }}
            onChange={d => setData(prev => ({ ...prev, ...d }))}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 6:
        return (
          <Step6_Finish
            data={{ examples: data.examples }}
            onChange={d => setData(prev => ({ ...prev, examples: d.examples }))}
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
      <div className="flex items-center justify-end px-3 pt-3 pb-0 flex-shrink-0">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Close wizard"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

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

        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto px-3 min-h-0"
        >
          {renderStep()}
        </div>
      </div>
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
