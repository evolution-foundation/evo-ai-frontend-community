import { useEffect, useMemo, useState } from 'react';
import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@evoapi/design-system';
import { Tag, X } from 'lucide-react';
import { RemoveLabelNodeData } from './RemoveLabelNode';
import { NodeConfigModal } from '@/components/journey/shared/NodeConfigModal';
import { FlowFeedbackBanner } from '@/components/journey/_ui';
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
  const [originalData] = useState<RemoveLabelNodeData>(() => ({ ...data }));
  const [formData, setFormData] = useState<RemoveLabelNodeData>({ ...data });
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

  const isValid = Boolean(formData.labelId && formData.labelName);
  const dirty = useMemo(
    () => JSON.stringify(formData) !== JSON.stringify(originalData),
    [formData, originalData],
  );

  return (
    <NodeConfigModal
      open
      variant="simple"
      title={t('panels.removeLabel.title')}
      icon={
        <div className="relative">
          <Tag className="h-5 w-5 text-flow-node-action-label-fg" />
          <X className="h-3 w-3 text-flow-node-action-label-fg absolute -top-1 -right-1" />
        </div>
      }
      onCancel={onClose}
      onSave={handleSave}
      dirty={dirty && isValid}
      saveLabel={t('panels.actions.save')}
      cancelLabel={t('panels.actions.cancel')}
    >
      <div className="space-y-4">
        {!isValid && (
          <FlowFeedbackBanner variant="warn">
            <p className="font-medium">{t('panels.removeLabel.incompleteConfig')}:</p>
            <ul className="text-xs mt-1 list-disc list-inside">
              <li>{t('panels.removeLabel.selectLabel')}</li>
            </ul>
          </FlowFeedbackBanner>
        )}

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

        {error && (
          <FlowFeedbackBanner variant="error">
            <p>{error}</p>
          </FlowFeedbackBanner>
        )}

        {formData.labelId && formData.labelName && (
          <FlowFeedbackBanner variant="error">
            <p className="mb-2">
              <strong>{t('panels.removeLabel.selectedLabel')}:</strong>
            </p>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full border"
                style={{ backgroundColor: formData.labelColor }}
              />
              <span className="font-medium">{formData.labelName}</span>
            </div>
            <p className="text-xs mt-2">{t('panels.removeLabel.description')}</p>
          </FlowFeedbackBanner>
        )}

        <FlowFeedbackBanner variant="warn">
          <p>
            <strong>⚠️ {t('panels.removeLabel.warning')}:</strong>{' '}
            {t('panels.removeLabel.warningDescription')}
          </p>
        </FlowFeedbackBanner>
      </div>
    </NodeConfigModal>
  );
}
