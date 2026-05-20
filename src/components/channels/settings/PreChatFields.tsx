import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@evoapi/design-system';
import { Switch, Input, Checkbox } from '@evoapi/design-system';
import { GripVertical } from 'lucide-react';
import { PreChatField, isFieldEditable } from './helpers/preChatHelpers';
import { useLanguage } from '@/hooks/useLanguage';

interface PreChatFieldsProps {
  preChatFields: PreChatField[];
  onUpdate: (fields: PreChatField[]) => void;
}

export default function PreChatFields({ preChatFields, onUpdate }: PreChatFieldsProps) {
  const { t } = useLanguage('channels');
  const [fields, setFields] = useState<PreChatField[]>(preChatFields);

  // Sync fields when preChatFields prop changes
  useEffect(() => {
    setFields(preChatFields);
  }, [preChatFields]);

  // Handle field updates
  const handleFieldUpdate = (fieldName: string, property: keyof PreChatField, value: any) => {
    const updatedFields = fields.map(field => {
      if (field.name === fieldName) {
        return { ...field, [property]: value };
      }
      return field;
    });

    setFields(updatedFields);
    onUpdate(updatedFields);
  };

  // Handle field toggle (enabled/disabled)
  const handleFieldToggle = (fieldName: string, enabled: boolean) => {
    handleFieldUpdate(fieldName, 'enabled', enabled);
  };

  // Handle required toggle
  const handleRequiredToggle = (fieldName: string, required: boolean) => {
    handleFieldUpdate(fieldName, 'required', required);
  };

  // Handle label change
  const handleLabelChange = (fieldName: string, label: string) => {
    handleFieldUpdate(fieldName, 'label', label);
  };

  // Handle placeholder change
  const handlePlaceholderChange = (fieldName: string, placeholder: string) => {
    handleFieldUpdate(fieldName, 'placeholder', placeholder);
  };

  // Handle drag and drop reordering
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);

    if (dragIndex === dropIndex) return;

    const newFields = [...fields];
    const draggedField = newFields[dragIndex];

    // Remove the dragged field
    newFields.splice(dragIndex, 1);

    // Insert at new position
    newFields.splice(dropIndex, 0, draggedField);

    setFields(newFields);
    onUpdate(newFields);
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-12"></TableHead>
            <TableHead className="w-16">{t('settings.preChatFields.table.active')}</TableHead>
            <TableHead className="w-32">{t('settings.preChatFields.table.field')}</TableHead>
            <TableHead className="w-24">{t('settings.preChatFields.table.type')}</TableHead>
            <TableHead className="w-20">{t('settings.preChatFields.table.required')}</TableHead>
            <TableHead className="flex-1">{t('settings.preChatFields.table.label')}</TableHead>
            <TableHead className="flex-1">{t('settings.preChatFields.table.placeholder')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fields.map((field, index) => (
            <TableRow
              key={field.name}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              className={`
                cursor-move transition-colors hover:bg-muted/30
                ${!field.enabled ? 'opacity-60' : ''}
              `}
            >
              {/* Drag Handle */}
              <TableCell className="p-2">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </TableCell>

              {/* Enabled Toggle */}
              <TableCell className="p-2">
                <Switch
                  checked={field.enabled}
                  onCheckedChange={(checked) => handleFieldToggle(field.name, checked)}
                />
              </TableCell>

              {/* Field Name */}
              <TableCell className={`p-2 font-medium ${!field.enabled ? 'text-muted-foreground' : ''}`}>
                {field.name}
              </TableCell>

              {/* Field Type */}
              <TableCell className={`p-2 ${!field.enabled ? 'text-muted-foreground' : ''}`}>
                <span className="px-2 py-1 bg-muted rounded text-xs font-medium">
                  {field.type}
                </span>
              </TableCell>

              {/* Required Checkbox */}
              <TableCell className="p-2">
                <Checkbox
                  checked={field.required}
                  onCheckedChange={(checked) => handleRequiredToggle(field.name, !!checked)}
                  disabled={!field.enabled}
                />
              </TableCell>

              {/* Label Input */}
              <TableCell className="p-2">
                <Input
                  value={field.label}
                  onChange={(e) => handleLabelChange(field.name, e.target.value)}
                  disabled={isFieldEditable(field)}
                  className="text-sm"
                  placeholder={t('settings.preChatFields.placeholders.label')}
                />
              </TableCell>

              {/* Placeholder Input */}
              <TableCell className="p-2">
                <Input
                  value={field.placeholder || ''}
                  onChange={(e) => handlePlaceholderChange(field.name, e.target.value)}
                  disabled={isFieldEditable(field)}
                  className="text-sm"
                  placeholder={t('settings.preChatFields.placeholders.placeholder')}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Empty State */}
      {fields.length === 0 && (
        <div className="p-8 text-center">
          <p className="text-muted-foreground">{t('settings.preChatFields.emptyState')}</p>
        </div>
      )}

      {/* Instructions */}
      <div className="p-4 bg-muted/30 border-t border-border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <GripVertical className="h-4 w-4" />
          <span>{t('settings.preChatFields.instructions.dragDrop')}</span>
        </div>
        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
          <p>• <strong>{t('settings.preChatFields.instructions.active.title')}:</strong> {t('settings.preChatFields.instructions.active.description')}</p>
          <p>• <strong>{t('settings.preChatFields.instructions.required.title')}:</strong> {t('settings.preChatFields.instructions.required.description')}</p>
          <p>• <strong>{t('settings.preChatFields.instructions.label.title')}:</strong> {t('settings.preChatFields.instructions.label.description')}</p>
          <p>• <strong>{t('settings.preChatFields.instructions.placeholder.title')}:</strong> {t('settings.preChatFields.instructions.placeholder.description')}</p>
        </div>
      </div>
    </div>
  );
}
