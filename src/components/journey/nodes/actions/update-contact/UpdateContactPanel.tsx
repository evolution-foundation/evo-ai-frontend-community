import { useState, useEffect } from 'react';
import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
} from '@evoapi/design-system';
import { VariableInput } from '@/components/journey/environment-manager';
import { UserCog } from 'lucide-react';
import { UpdateContactNodeData } from './UpdateContactNode';
import { BaseFlowPanel } from '@/components/base';
import { useLanguage } from '@/hooks/useLanguage';

interface UpdateContactPanelProps {
  nodeId: string;
  data: UpdateContactNodeData;
  onUpdate: (nodeId: string, newData: UpdateContactNodeData) => void;
  onClose: () => void;
  journeyId: string;
}

export function UpdateContactPanel({
  nodeId,
  data,
  onUpdate,
  onClose,
  journeyId,
}: UpdateContactPanelProps) {
  const { t } = useLanguage('journey');

  const CONTACT_FIELDS = [
    {
      id: 'name',
      label: t('panels.updateContact.fields.name'),
      placeholder: t('panels.updateContact.placeholders.name'),
    },
    {
      id: 'email',
      label: t('panels.updateContact.fields.email'),
      placeholder: t('panels.updateContact.placeholders.email'),
    },
    {
      id: 'phone_number',
      label: t('panels.updateContact.fields.phone_number'),
      placeholder: t('panels.updateContact.placeholders.phone_number'),
    },
    {
      id: 'identifier',
      label: t('panels.updateContact.fields.identifier'),
      placeholder: t('panels.updateContact.placeholders.identifier'),
    },
  ] as const;
  const [formData, setFormData] = useState<UpdateContactNodeData>({
    ...data,
  });

  useEffect(() => {
    setFormData(data);
  }, [data]);

  const handleSave = () => {
    // Validação básica
    if (!formData.fieldToUpdate) {
      alert(t('panels.updateContact.selectField'));
      return;
    }

    if (!formData.newValue || formData.newValue.trim() === '') {
      alert(t('panels.updateContact.enterValue'));
      return;
    }

    onUpdate(nodeId, formData);
    onClose();
  };

  const handleFieldChange = (fieldId: string) => {
    const selectedField = CONTACT_FIELDS.find(field => field.id === fieldId);

    setFormData(prev => ({
      ...prev,
      fieldToUpdate: fieldId as UpdateContactNodeData['fieldToUpdate'],
      fieldLabel: selectedField?.label || '',
      newValue: '', // Reset value when changing field
    }));
  };

  const handleValueChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      newValue: value,
    }));
  };

  const isValid = formData.fieldToUpdate && formData.newValue && formData.newValue.trim() !== '';

  return (
    <BaseFlowPanel
      title={t('panels.updateContact.title')}
      icon={<UserCog className="w-5 h-5 text-cyan-500" />}
      onClose={onClose}
      width="w-[600px]"
    >
      <Separator />

      <div className="space-y-4">
        {/* Status de validação */}
        {!isValid && (
          <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800/30">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              {t('panels.updateContact.incompleteConfig')}:
            </p>
            <ul className="text-xs text-yellow-700 dark:text-yellow-300 mt-1 list-disc list-inside">
              {!formData.fieldToUpdate && <li>{t('panels.updateContact.selectField')}</li>}
              {!formData.newValue && formData.fieldToUpdate && (
                <li>{t('panels.updateContact.enterValue')}</li>
              )}
            </ul>
          </div>
        )}

        {/* Seleção do campo */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t('panels.updateContact.fieldToUpdate')}</Label>
          <Select value={formData.fieldToUpdate || ''} onValueChange={handleFieldChange}>
            <SelectTrigger className="w-full bg-sidebar border-sidebar-border text-sidebar-foreground">
              <SelectValue placeholder={t('panels.updateContact.selectFieldPlaceholder')} />
            </SelectTrigger>
            <SelectContent className="bg-sidebar border-sidebar-border">
              {CONTACT_FIELDS.map(field => (
                <SelectItem key={field.id} value={field.id} className="text-sidebar-foreground">
                  <div className="flex items-center gap-2">
                    <UserCog className="w-4 h-4 text-cyan-500" />
                    <div>
                      <div className="font-medium">{field.label}</div>
                      <div className="text-xs text-muted-foreground">{field.placeholder}</div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Campo de novo valor */}
        {formData.fieldToUpdate && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('panels.updateContact.newValue')}</Label>
            <VariableInput
              type={
                formData.fieldToUpdate === 'email'
                  ? 'email'
                  : formData.fieldToUpdate === 'phone_number'
                  ? 'tel'
                  : 'text'
              }
              placeholder={
                CONTACT_FIELDS.find(f => f.id === formData.fieldToUpdate)?.placeholder ||
                t('panels.updateContact.enterNewValuePlaceholder')
              }
              value={formData.newValue || ''}
              onChange={e => handleValueChange(e.target.value)}
              className="w-full bg-sidebar border-sidebar-border text-sidebar-foreground"
              journeyId={journeyId}
            />
          </div>
        )}

        {/* Preview da atualização */}
        {isValid && (
          <div className="p-4 rounded-lg bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-800/30">
            <p className="text-sm text-cyan-800 dark:text-cyan-200 mb-2">
              <strong>{t('panels.updateContact.preview.title')}:</strong>
            </p>
            <div className="flex items-center gap-2">
              <UserCog className="w-4 h-4 text-cyan-500" />
              <span className="font-medium">{formData.fieldLabel}</span>
              <span className="text-cyan-600 dark:text-cyan-400">→</span>
              <span className="font-medium text-cyan-700 dark:text-cyan-300">
                {formData.newValue}
              </span>
            </div>
            <p className="text-xs text-cyan-600 dark:text-cyan-400 mt-2">
              {t('panels.updateContact.preview.description', {
                field: formData.fieldLabel?.toLowerCase(),
              })}
            </p>
          </div>
        )}

        {/* Ajuda */}
        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>{t('panels.updateContact.help.title')}:</strong>{' '}
            {t('panels.updateContact.help.description')}
          </p>
        </div>
      </div>

      {/* Botões de ação */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onClose} className="flex-1 h-10">
          {t('panels.updateContact.actions.cancel')}
        </Button>
        <Button onClick={handleSave} className="flex-1 h-10" disabled={!isValid}>
          {isValid
            ? t('panels.updateContact.actions.save')
            : t('panels.updateContact.actions.configureFields')}
        </Button>
      </div>
    </BaseFlowPanel>
  );
}
