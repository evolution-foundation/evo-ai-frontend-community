import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@evoapi/design-system';
import { Integration } from '@/types/integrations';
import BrandIcon from '@/components/BrandIcon';

interface IntegrationModalProps {
  integration: Integration | null;
  open: boolean;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  title?: string;
  children?: React.ReactNode;
}

export default function IntegrationModal({
  integration,
  open,
  onClose,
  onSave: _,
  title,
  children
}: IntegrationModalProps) {
  const modalTitle = title || (integration ? `Configurar ${integration.name}` : 'Nova Integração');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {integration && (
              <div className="w-6 h-6 rounded overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <BrandIcon
                  id={integration.id}
                  size={20}
                  className="w-5 h-5"
                />
              </div>
            )}
            {modalTitle}
          </DialogTitle>
        </DialogHeader>

        {children}
      </DialogContent>
    </Dialog>
  );
}
