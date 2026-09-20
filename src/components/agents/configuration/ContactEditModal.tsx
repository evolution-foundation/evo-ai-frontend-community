import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@evoapi/design-system';
import ContactEditRules, { ContactEditConfig } from '@/pages/Customer/Agents/Agent/sections/ContactEditRules';
import { ModalSaveFooter } from './ModalSaveFooter';
import { useModalSaveClose } from './useModalSaveClose';

interface ContactEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: ContactEditConfig;
  onChange: (config: ContactEditConfig) => void;
  // Persists via the agent's save (CRM-213); resolving false keeps the modal open.
  onSave?: () => Promise<boolean> | boolean | void;
  isSaving?: boolean;
}

const ContactEditModal = ({
  open,
  onOpenChange,
  config,
  onChange,
  onSave,
  isSaving = false,
}: ContactEditModalProps) => {
  const { handleOpenChange, handleSave } = useModalSaveClose({
    open,
    value: config,
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
            Edição de Contatos
          </DialogTitle>
        </DialogHeader>
        <ContactEditRules config={config} onChange={onChange} />
        <ModalSaveFooter
          onCancel={() => handleOpenChange(false)}
          onSave={handleSave}
          isSaving={isSaving}
        />
      </DialogContent>
    </Dialog>
  );
};

export default ContactEditModal;
