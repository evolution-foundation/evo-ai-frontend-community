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
  Checkbox,
  Label,
} from '@evoapi/design-system';
import { Minus, Plus } from 'lucide-react';

export type BulkLabelAction = 'add_labels' | 'remove_labels';

interface ContactBulkLabelsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  availableLabels: string[];
  onConfirm: (action: BulkLabelAction, labels: string[]) => void;
  loading: boolean;
}

export default function ContactBulkLabelsModal({
  open,
  onOpenChange,
  selectedCount,
  availableLabels,
  onConfirm,
  loading,
}: ContactBulkLabelsModalProps) {
  const { t } = useLanguage('contacts');
  const [action, setAction] = useState<BulkLabelAction>('add_labels');
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setAction('add_labels');
      setSelected([]);
    }
  }, [open]);

  const toggle = (label: string, checked: boolean) => {
    setSelected(prev => (checked ? [...prev, label] : prev.filter(item => item !== label)));
  };

  return (
    <Dialog open={open} onOpenChange={next => !loading && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('dialog.bulkLabels.title')}</DialogTitle>
          <DialogDescription>
            {t('dialog.bulkLabels.description', { count: selectedCount })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex gap-3">
            <Button
              type="button"
              size="sm"
              className="flex-1"
              variant={action === 'add_labels' ? 'default' : 'outline'}
              onClick={() => setAction('add_labels')}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('dialog.bulkLabels.add')}
            </Button>
            <Button
              type="button"
              size="sm"
              className="flex-1"
              variant={action === 'remove_labels' ? 'default' : 'outline'}
              onClick={() => setAction('remove_labels')}
            >
              <Minus className="mr-2 h-4 w-4" />
              {t('dialog.bulkLabels.remove')}
            </Button>
          </div>

          {availableLabels.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('dialog.bulkLabels.empty')}</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3">
              {availableLabels.map(label => {
                const id = `bulk-label-${label}`;
                return (
                  <div key={label} className="flex items-center space-x-2">
                    <Checkbox
                      id={id}
                      checked={selected.includes(label)}
                      onCheckedChange={checked => toggle(label, checked === true)}
                    />
                    <Label htmlFor={id} className="text-sm font-normal cursor-pointer">
                      {label}
                    </Label>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {t('dialog.bulkLabels.cancel')}
          </Button>
          <Button onClick={() => onConfirm(action, selected)} disabled={loading || selected.length === 0}>
            {loading ? t('dialog.bulkLabels.applying') : t('dialog.bulkLabels.apply')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
