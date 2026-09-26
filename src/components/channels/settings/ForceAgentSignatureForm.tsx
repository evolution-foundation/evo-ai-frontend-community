import { Switch } from '@evoapi/design-system';
import { useLanguage } from '@/hooks/useLanguage';

interface ForceAgentSignatureFormData {
  force_agent_signature: boolean;
}

interface ForceAgentSignatureFormProps {
  formData: ForceAgentSignatureFormData;
  onFormChange: (updates: Partial<ForceAgentSignatureFormData>) => void;
}

export default function ForceAgentSignatureForm({
  formData,
  onFormChange,
}: ForceAgentSignatureFormProps) {
  const { t } = useLanguage('channels');
  return (
    <div className="flex items-center justify-between p-4 border border-border rounded-lg">
      <div>
        <label className="text-sm font-medium text-foreground">
          {t('settings.forceAgentSignature.label')}
        </label>
        <p className="text-xs text-muted-foreground">
          {t('settings.forceAgentSignature.description')}
        </p>
      </div>
      <Switch
        checked={formData.force_agent_signature}
        onCheckedChange={checked => onFormChange({ force_agent_signature: checked })}
      />
    </div>
  );
}
