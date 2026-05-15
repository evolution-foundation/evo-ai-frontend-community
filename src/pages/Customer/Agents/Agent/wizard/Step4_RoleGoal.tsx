import { useState } from 'react';
import { Input, Label, Button } from '@evoapi/design-system';
import { ArrowRight, ArrowLeft, Target, User } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface Step4Props {
  data: { role: string; goal: string };
  onChange: (data: { role: string; goal: string }) => void;
  onNext: () => void;
  onBack: () => void;
}

const Step4_RoleGoal = ({ data, onChange, onNext, onBack }: Step4Props) => {
  const { t } = useLanguage('aiAgents');
  const [roleError, setRoleError] = useState<string>('');

  const handleNext = () => {
    if (!data.role || !data.role.trim()) {
      setRoleError(t('validation.required'));
      return;
    }
    setRoleError('');
    onNext();
  };

  return (
    <div className="flex flex-col h-full min-h-0 max-w-5xl mx-auto py-2 px-4">
      <div className="flex-1 overflow-y-auto min-h-0 flex items-center justify-center">
        <div className="w-full max-w-5xl space-y-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-blue-500" />
              <Label className="text-sm font-semibold">
                {t('wizard.step4.roleLabel')} <span className="text-red-500">*</span>
              </Label>
            </div>
            <Input
              value={data.role || ''}
              onChange={(e) => {
                onChange({ ...data, role: e.target.value });
                if (e.target.value.trim()) setRoleError('');
              }}
              placeholder={t('wizard.step4.rolePlaceholder')}
              className={`h-10 ${roleError ? 'border-red-500' : ''}`}
            />
            {roleError && <p className="text-sm text-red-600">{roleError}</p>}
            <p className="text-xs text-muted-foreground">
              {t('wizard.step4.roleHelp')}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-500" />
              <Label className="text-sm font-semibold">
                {t('wizard.step4.goalLabel')}
              </Label>
            </div>
            <Input
              value={data.goal || ''}
              onChange={(e) => onChange({ ...data, goal: e.target.value })}
              placeholder={t('wizard.step4.goalPlaceholder')}
              className="h-10"
            />
            <p className="text-xs text-muted-foreground">
              {t('wizard.step4.goalHelp')}
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-between flex-shrink-0 pt-2 border-t">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t('actions.back')}
        </Button>
        <Button
          onClick={handleNext}
          disabled={!data.role?.trim()}
          className="gap-2 px-6"
        >
          {t('actions.continue')}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default Step4_RoleGoal;
