import { useLanguage } from '@/hooks/useLanguage';
import { Button, DialogFooter } from '@evoapi/design-system';

interface ModalSaveFooterProps {
  onCancel: () => void;
  onSave: () => void;
  isSaving: boolean;
}

export const ModalSaveFooter = ({ onCancel, onSave, isSaving }: ModalSaveFooterProps) => {
  const { t } = useLanguage('aiAgents');

  return (
    <DialogFooter className="gap-2 border-t pt-4">
      <Button variant="outline" onClick={onCancel} disabled={isSaving}>
        {t('edit.configuration.modalFooter.cancel')}
      </Button>
      <Button onClick={onSave} disabled={isSaving}>
        {isSaving
          ? t('edit.configuration.modalFooter.saving')
          : t('edit.configuration.modalFooter.save')}
      </Button>
    </DialogFooter>
  );
};
