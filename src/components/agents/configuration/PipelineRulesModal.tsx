import { useLanguage } from '@/hooks/useLanguage';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@evoapi/design-system';
import PipelineRules, { PipelineRule } from '@/pages/Customer/Agents/Agent/sections/PipelineRules';
import { ModalSaveFooter } from './ModalSaveFooter';
import { useModalSaveClose } from './useModalSaveClose';

interface PipelineRulesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rules: PipelineRule[];
  onChange: (rules: PipelineRule[]) => void;
  availablePipelines?: Array<{
    id: string;
    name: string;
    stages: Array<{ id: string; name: string }>;
  }>;
  // Persists via the agent's save (CRM-213); resolving false keeps the modal open.
  onSave?: () => Promise<boolean> | boolean | void;
  isSaving?: boolean;
}

export const PipelineRulesModal = ({
  open,
  onOpenChange,
  rules,
  onChange,
  availablePipelines,
  onSave,
  isSaving = false,
}: PipelineRulesModalProps) => {
  const { t } = useLanguage('aiAgents');
  const { handleOpenChange, handleSave } = useModalSaveClose({
    open,
    value: rules,
    onChange,
    onOpenChange,
    onSave,
    isSaving,
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* `sm:max-w-*`/`sm:text-*` and not the plain utilities: tailwind-merge only cancels
          a responsive variant with another responsive variant. */}
      <DialogContent className="max-h-[90vh] gap-3 overflow-y-auto p-5 sm:max-w-[820px]">
        <DialogHeader className="sm:text-center">
          <DialogTitle className="text-xl font-bold text-foreground">
            {t('edit.configuration.pipelineRules.modalTitle') || 'Regras de Pipeline'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {t('edit.configuration.pipelineRules.modalDescription') ||
              'Configure quando e como o agente deve mover conversas entre pipelines e estágios.'}
          </DialogDescription>
        </DialogHeader>
        <div className="py-1">
          <PipelineRules
            rules={rules}
            onChange={onChange}
            availablePipelines={availablePipelines}
          />
        </div>
        <ModalSaveFooter
          onCancel={() => handleOpenChange(false)}
          onSave={handleSave}
          isSaving={isSaving}
        />
      </DialogContent>
    </Dialog>
  );
};
