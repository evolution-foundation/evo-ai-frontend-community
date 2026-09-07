import { useCallback, useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import TaskConfigForm, { TaskConfigData } from '@/components/ai_agents/Forms/TaskConfigForm';

interface TaskSectionProps {
  data: TaskConfigData;
  onChange: (data: TaskConfigData) => void;
  editingAgentId?: string;
  folderId?: string;
}

const TaskSection = ({ data, onChange, editingAgentId, folderId }: TaskSectionProps) => {
  const { t } = useLanguage('aiAgents');
  const [, setIsValid] = useState(false);
  const [, setErrors] = useState<string[]>([]);

  const handleValidationChange = useCallback((valid: boolean, validationErrors: string[]) => {
    setIsValid(valid);
    setErrors(validationErrors);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">{t('edit.task.title')}</h2>
        <p className="text-sm text-muted-foreground">
          {t('edit.task.subtitle')}
        </p>
      </div>

      <TaskConfigForm
        mode="edit"
        data={data}
        onChange={onChange}
        onValidationChange={handleValidationChange}
        editingAgentId={editingAgentId}
        folderId={folderId}
      />
    </div>
  );
};

export default TaskSection;
