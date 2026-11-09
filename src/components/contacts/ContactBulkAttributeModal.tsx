import { useEffect, useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
} from '@evoapi/design-system';

interface ContactBulkAttributeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onConfirm: (key: string, value: string) => void;
  loading: boolean;
}

export default function ContactBulkAttributeModal({
  open,
  onOpenChange,
  selectedCount,
  onConfirm,
  loading,
}: ContactBulkAttributeModalProps) {
  const { t } = useLanguage('contacts');
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');

  useEffect(() => {
    if (open) {
      setKey('');
      setValue('');
    }
  }, [open]);

  const trimmedKey = key.trim();
  const canApply = trimmedKey.length > 0 && value.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={next => !loading && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('dialog.bulkAttribute.title')}</DialogTitle>
          <DialogDescription>
            {t('dialog.bulkAttribute.description', { count: selectedCount })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="bulk-attribute-key">{t('dialog.bulkAttribute.key')}</Label>
            <Input
              id="bulk-attribute-key"
              value={key}
              onChange={event => setKey(event.target.value)}
              placeholder={t('dialog.bulkAttribute.keyPlaceholder')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bulk-attribute-value">{t('dialog.bulkAttribute.value')}</Label>
            <Input
              id="bulk-attribute-value"
              value={value}
              onChange={event => setValue(event.target.value)}
              placeholder={t('dialog.bulkAttribute.valuePlaceholder')}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {t('dialog.bulkAttribute.cancel')}
          </Button>
          <Button onClick={() => onConfirm(trimmedKey, value.trim())} disabled={loading || !canApply}>
            {loading ? t('dialog.bulkAttribute.applying') : t('dialog.bulkAttribute.apply')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
