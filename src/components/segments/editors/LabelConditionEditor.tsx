import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
} from '@evoapi/design-system';
import { LabelNode } from '@/types/analytics';
import { Label as LabelType } from '@/types/settings';
import { useLanguage } from '@/hooks/useLanguage';

interface LabelConditionEditorProps {
  condition: LabelNode;
  availableLabels: LabelType[];
  loadingLabels: boolean;
  selectedLabelId: string;
  labelConditionType: 'has' | 'not_has';
  onLabelIdChange: (labelId: string) => void;
  onConditionTypeChange: (type: 'has' | 'not_has') => void;
  onUpdate: (condition: LabelNode) => void;
  onLoadLabels: () => void;
}

export default function LabelConditionEditor({
  condition,
  availableLabels,
  loadingLabels,
  selectedLabelId,
  labelConditionType,
  onLabelIdChange,
  onConditionTypeChange,
  onUpdate,
  onLoadLabels,
}: LabelConditionEditorProps) {
  const { t } = useLanguage('segments');
  const handleLabelChange = (labelId: string) => {
    onLabelIdChange(labelId);
    const updatedCondition = {
      ...condition,
      labelId,
    };
    onUpdate(updatedCondition);
  };

  const handleConditionChange = (newCondition: 'has' | 'not_has') => {
    onConditionTypeChange(newCondition);
    const updatedCondition = {
      ...condition,
      condition: newCondition,
    };
    onUpdate(updatedCondition);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>{t('labelEditor.label')}</Label>
        <Select
          value={selectedLabelId}
          onValueChange={handleLabelChange}
          onOpenChange={(open) => {
            if (open && availableLabels.length === 0) {
              onLoadLabels();
            }
          }}
        >
          <SelectTrigger>
            <SelectValue 
              placeholder={loadingLabels ? t('labelEditor.loading') : t('labelEditor.selectLabel')}
            />
          </SelectTrigger>
          <SelectContent>
            {availableLabels.length === 0 && !loadingLabels && (
              <div className="p-2 text-sm text-gray-500">
                {t('labelEditor.noLabels')}
              </div>
            )}
            {availableLabels.map((label) => (
              <SelectItem key={label.id} value={label.title}>
                {label.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>{t('labelEditor.condition')}</Label>
        <Select value={labelConditionType} onValueChange={handleConditionChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="has">{t('labelEditor.has')}</SelectItem>
            <SelectItem value="not_has">{t('labelEditor.notHas')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}