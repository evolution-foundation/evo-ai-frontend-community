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
import { Tag, X } from 'lucide-react';
import { RemoveLabelNodeData } from './RemoveLabelNode';
import { BaseFlowPanel } from '@/components/base';
import { labelsService } from '@/services/contacts/labelsService';
import type { Label as LabelType } from '@/types/settings';
import { useLanguage } from '@/hooks/useLanguage';

interface RemoveLabelPanelProps {
  nodeId: string;
  data: RemoveLabelNodeData;
  onUpdate: (nodeId: string, newData: RemoveLabelNodeData) => void;
  onClose: () => void;
}

export function RemoveLabelPanel({ nodeId, data, onUpdate, onClose }: RemoveLabelPanelProps) {
  const { t } = useLanguage('journey');
  const [formData, setFormData] = useState<RemoveLabelNodeData>({
    ...data,
  });
  const [labels, setLabels] = useState<LabelType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFormData(data);
  }, [data]);

  useEffect(() => {
    fetchLabels();
  }, []);

  const fetchLabels = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await labelsService.getLabels();
      setLabels(response.data || []);
    } catch (err) {
      console.error('Error fetching labels:', err);
      setError(t('panels.removeLabel.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    // Validação básica
    if (!formData.labelId) {
      alert(t('panels.removeLabel.selectLabelAlert'));
      return;
    }

    onUpdate(nodeId, formData);
    onClose();
  };

  const handleLabelChange = (labelId: string) => {
    const selectedLabel = labels.find(label => label.id === labelId);

    setFormData(prev => ({
      ...prev,
      labelId,
      labelName: selectedLabel?.title || '',
      labelColor: selectedLabel?.color || '',
    }));
  };

  const isValid = formData.labelId && formData.labelName;

  return (
    <BaseFlowPanel
      title={t('panels.removeLabel.title')}
      icon={
        <div className="relative">
          <Tag className="w-5 h-5 text-red-500" />
          <X className="w-3 h-3 text-red-500 absolute -top-1 -right-1" />
        </div>
      }
      onClose={onClose}
      width="w-[600px]"
    >
      <Separator />

      <div className="space-y-4">
        {/* Status de validação */}
        {!isValid && (
          <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800/30">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              {t('panels.removeLabel.incompleteConfig')}:
            </p>
            <ul className="text-xs text-yellow-700 dark:text-yellow-300 mt-1 list-disc list-inside">
              <li>{t('panels.removeLabel.selectLabel')}</li>
            </ul>
          </div>
        )}

        {/* Seleção da etiqueta */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t('panels.removeLabel.labelToRemove')}</Label>
          <Select
            value={formData.labelId || ''}
            onValueChange={handleLabelChange}
            disabled={loading}
          >
            <SelectTrigger className="w-full bg-sidebar border-sidebar-border text-sidebar-foreground">
              <SelectValue
                placeholder={
                  loading
                    ? t('panels.removeLabel.loading')
                    : t('panels.removeLabel.selectLabelPlaceholder')
                }
              />
            </SelectTrigger>
            <SelectContent className="bg-sidebar border-sidebar-border">
              {labels.map(label => (
                <SelectItem key={label.id} value={label.id} className="text-sidebar-foreground">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full border"
                      style={{ backgroundColor: label.color }}
                    />
                    <div>
                      <div className="font-medium">{label.title}</div>
                      {label.description && (
                        <div className="text-xs text-muted-foreground">{label.description}</div>
                      )}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Erro ao carregar */}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Preview da etiqueta selecionada */}
        {formData.labelId && formData.labelName && (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30">
            <p className="text-sm text-red-800 dark:text-red-200 mb-2">
              <strong>{t('panels.removeLabel.selectedLabel')}:</strong>
            </p>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full border"
                style={{ backgroundColor: formData.labelColor }}
              />
              <span className="font-medium">{formData.labelName}</span>
            </div>
            <p className="text-xs text-red-600 dark:text-red-400 mt-2">
              {t('panels.removeLabel.description')}
            </p>
          </div>
        )}

        {/* Ajuda */}
        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>⚠️ {t('panels.removeLabel.warning')}:</strong>{' '}
            {t('panels.removeLabel.warningDescription')}
          </p>
        </div>
      </div>

      {/* Botões de ação */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onClose} className="flex-1 h-10">
          {t('panels.actions.cancel')}
        </Button>
        <Button onClick={handleSave} className="flex-1 h-10" disabled={!isValid}>
          {isValid ? t('panels.actions.save') : t('panels.removeLabel.selectLabelButton')}
        </Button>
      </div>
    </BaseFlowPanel>
  );
}
