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
  Input,
  Label,
} from '@evoapi/design-system';
import { customAttributesService } from '@/services/customAttributes/customAttributesService';
import type { CustomAttributeDefinition } from '@/types/settings';

interface ContactBulkAttributeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onConfirm: (key: string, value: string | boolean) => void;
  loading: boolean;
}

const INPUT_TYPES: Record<string, string> = {
  number: 'number',
  currency: 'number',
  percent: 'number',
  date: 'date',
  datetime: 'datetime-local',
};

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
  const [checked, setChecked] = useState(false);
  const [definitions, setDefinitions] = useState<CustomAttributeDefinition[]>([]);

  useEffect(() => {
    if (!open) return;
    setKey('');
    setValue('');
    setChecked(false);

    let cancelled = false;
    customAttributesService
      .getCustomAttributes('contact_attribute')
      .then(response => {
        if (!cancelled) setDefinitions(response.data ?? []);
      })
      .catch(() => {
        // Without the definitions every key is written as free text.
        if (!cancelled) setDefinitions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const trimmedKey = key.trim();
  // A defined attribute is written the way the contact form writes it.
  const definition = definitions.find(item => item.attribute_key === trimmedKey);
  const displayType = definition?.attribute_display_type;
  const isCheckbox = displayType === 'checkbox';
  const isList = displayType === 'list';

  const canApply = trimmedKey.length > 0 && (isCheckbox || value.trim().length > 0);

  const handleConfirm = () => onConfirm(trimmedKey, isCheckbox ? checked : value.trim());

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
              list="bulk-attribute-definitions"
              value={key}
              onChange={event => {
                setKey(event.target.value);
                setValue('');
                setChecked(false);
              }}
              placeholder={t('dialog.bulkAttribute.keyPlaceholder')}
            />
            <datalist id="bulk-attribute-definitions">
              {definitions.map(item => (
                <option key={item.attribute_key} value={item.attribute_key}>
                  {item.attribute_display_name}
                </option>
              ))}
            </datalist>
          </div>

          {isCheckbox ? (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="bulk-attribute-value"
                checked={checked}
                onCheckedChange={next => setChecked(next === true)}
              />
              <Label htmlFor="bulk-attribute-value" className="text-sm font-normal cursor-pointer">
                {definition?.attribute_display_name}
              </Label>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="bulk-attribute-value">{t('dialog.bulkAttribute.value')}</Label>
              {isList ? (
                <select
                  id="bulk-attribute-value"
                  value={value}
                  onChange={event => setValue(event.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                >
                  <option value="" disabled>
                    {t('dialog.bulkAttribute.valuePlaceholder')}
                  </option>
                  {definition?.attribute_values?.map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  id="bulk-attribute-value"
                  type={(displayType && INPUT_TYPES[displayType]) || 'text'}
                  value={value}
                  onChange={event => setValue(event.target.value)}
                  placeholder={t('dialog.bulkAttribute.valuePlaceholder')}
                />
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {t('dialog.bulkAttribute.cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={loading || !canApply}>
            {loading ? t('dialog.bulkAttribute.applying') : t('dialog.bulkAttribute.apply')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
