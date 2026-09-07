import { useTranslation as useUiTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@evoapi/design-system';
import PipelineAutomation, { PipelineAutomationConfig } from '@/pages/Customer/Agents/Agent/sections/PipelineAutomation';

interface PipelineAutomationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rules: PipelineAutomationConfig[];
  onChange: (rules: PipelineAutomationConfig[]) => void;
  availablePipelines?: Array<{
    id: string;
    name: string;
    stages: Array<{ id: string; name: string }>;
  }>;
}

const PipelineAutomationModal = ({
  open,
  onOpenChange,
  rules,
  onChange,
  availablePipelines = [],
}: PipelineAutomationModalProps) => {
  const { t: tUi } = useUiTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tUi("interface:pipelineautomationmodal.pipelineAutomation")}</DialogTitle>
        </DialogHeader>
        <PipelineAutomation
          rules={rules}
          onChange={onChange}
          availablePipelines={availablePipelines}
        />
      </DialogContent>
    </Dialog>
  );
};

export default PipelineAutomationModal;
