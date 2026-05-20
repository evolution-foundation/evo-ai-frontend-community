import { useLanguage } from '@/hooks/useLanguage';

interface TriggerDescriptionProps {
  triggerType: string;
}

export function TriggerDescription({ triggerType }: TriggerDescriptionProps) {
  const { t } = useLanguage('journey');
  const getDescription = () => {
    switch (triggerType) {
      case 'manual':
        return t('triggerComponents.descriptions.manual');
      case 'event':
        return t('triggerComponents.descriptions.event');
      case 'segment':
        return t('triggerComponents.descriptions.segment');
      case 'webhook':
        return t('triggerComponents.descriptions.webhook');
      case 'contactCreated':
        return t('triggerComponents.descriptions.contactCreated');
      case 'contactUpdated':
        return t('triggerComponents.descriptions.contactUpdated');
      case 'label':
        return t('triggerComponents.descriptions.label');
      case 'customAttribute':
        return t('triggerComponents.descriptions.customAttribute');
      default:
        return t('triggerComponents.descriptions.selectType');
    }
  };

  return (
    <div className="p-4 rounded-lg bg-sidebar-accent/20 border border-sidebar-border/50">
      <p className="text-sm text-sidebar-foreground/70">{getDescription()}</p>
    </div>
  );
}
