import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@evoapi/design-system';
import { useLanguage } from '@/hooks/useLanguage';

interface TriggerTypeSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function TriggerTypeSelector({ value, onChange }: TriggerTypeSelectorProps) {
  const { t } = useLanguage('journey');

  return (
    <div className="space-y-2">
      <Label className="text-sidebar-foreground font-medium">
        {t('triggerComponents.triggerType')}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full bg-sidebar border-sidebar-border text-sidebar-foreground">
          <SelectValue placeholder={t('triggerComponents.selectType')} />
        </SelectTrigger>
        <SelectContent className="bg-sidebar border-sidebar-border">
          <SelectItem value="manual" className="text-sidebar-foreground">
            {t('triggerComponents.types.manual')}
          </SelectItem>
          <SelectItem value="event" className="text-sidebar-foreground">
            {t('triggerComponents.types.event')}
          </SelectItem>
          <SelectItem value="segment" className="text-sidebar-foreground">
            {t('triggerComponents.types.segment')}
          </SelectItem>
          <SelectItem value="webhook" className="text-sidebar-foreground">
            {t('triggerComponents.types.webhook')}
          </SelectItem>
          <SelectItem value="contactCreated" className="text-sidebar-foreground">
            {t('triggerComponents.types.contactCreated')}
          </SelectItem>
          <SelectItem value="contactUpdated" className="text-sidebar-foreground">
            {t('triggerComponents.types.contactUpdated')}
          </SelectItem>
          <SelectItem value="label" className="text-sidebar-foreground">
            {t('triggerComponents.types.label')}
          </SelectItem>
          <SelectItem value="customAttribute" className="text-sidebar-foreground">
            {t('triggerComponents.types.customAttribute')}
          </SelectItem>
          <SelectItem value="pipelineStageChanged" className="text-sidebar-foreground">
            {t('triggerComponents.types.pipelineStageChanged')}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
