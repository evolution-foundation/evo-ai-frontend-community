import { getFormattingLocale } from '@/lib/formattingLocale';
import { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Label,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@evoapi/design-system';
import { Loader2 } from 'lucide-react';
import type { CreateTaskData, PipelineTask } from '@/types/analytics';
import type { User } from '@/types/users';

interface CreateTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateTaskData) => Promise<void>;
  loading?: boolean;
  availableUsers?: User[];
  parentTask?: PipelineTask | null;
}

export default function CreateTaskModal({
  open,
  onOpenChange,
  onSubmit,
  loading = false,
  availableUsers = [],
  parentTask = null,
}: CreateTaskModalProps) {
  const { t } = useLanguage('pipelines');

  const [formData, setFormData] = useState<CreateTaskData>({
    title: '',
    description: '',
    task_type: 'call',
    priority: 'medium',
    due_date: '',
    assigned_to_id: '',
    parent_task_id: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update parent_task_id when parentTask changes
  useEffect(() => {
    if (parentTask) {
      setFormData(prev => ({
        ...prev,
        parent_task_id: parentTask.id,
      }));
    }
  }, [parentTask]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!open) {
      setFormData({
        title: '',
        description: '',
        task_type: 'call',
        priority: 'medium',
        due_date: '',
        assigned_to_id: '',
        parent_task_id: null,
      });
      setErrors({});
    }
  }, [open]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title?.trim()) {
      newErrors.title = t('tasks.form.errors.titleRequired');
    }

    // Validate due_date against parent task if it exists
    if (parentTask?.due_date && formData.due_date) {
      const taskDueDate = new Date(formData.due_date);
      const parentDueDate = new Date(parentTask.due_date);

      if (taskDueDate > parentDueDate) {
        newErrors.due_date = t('tasks.form.errors.dueDateExceedsParent');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    // Prepare data
    const submitData: CreateTaskData = {
      title: formData.title.trim(),
      task_type: formData.task_type,
      priority: formData.priority,
    };

    if (formData.description?.trim()) {
      submitData.description = formData.description.trim();
    }

    if (formData.due_date) {
      submitData.due_date = formData.due_date;
    }

    if (formData.assigned_to_id?.trim()) {
      submitData.assigned_to_id = formData.assigned_to_id.trim();
    }

    if (formData.parent_task_id) {
      submitData.parent_task_id = formData.parent_task_id;
    }

    await onSubmit(submitData);
  };

  const updateField = (field: keyof CreateTaskData, value: string | number | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {parentTask 
              ? t('tasks.createModal.title', { parent: parentTask.title })
              : t('tasks.createModal.title')}
          </DialogTitle>
          <DialogDescription>
            {t('tasks.createModal.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              {t('tasks.form.title')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={e => updateField('title', e.target.value)}
              placeholder={t('tasks.form.titlePlaceholder')}
              className={errors.title ? 'border-destructive' : ''}
              disabled={loading}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title}</p>
            )}
          </div>

          {/* Type and Priority in row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Type */}
            <div className="space-y-2">
              <Label>{t('tasks.form.type')}</Label>
              <Select
                value={formData.task_type}
                onValueChange={value => updateField('task_type', value as PipelineTask['task_type'])}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">{t('tasks.types.call')}</SelectItem>
                  <SelectItem value="email">{t('tasks.types.email')}</SelectItem>
                  <SelectItem value="meeting">{t('tasks.types.meeting')}</SelectItem>
                  <SelectItem value="follow_up">{t('tasks.types.follow_up')}</SelectItem>
                  <SelectItem value="note">{t('tasks.types.note')}</SelectItem>
                  <SelectItem value="other">{t('tasks.types.other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label>{t('tasks.form.priority')}</Label>
              <Select
                value={formData.priority}
                onValueChange={value => updateField('priority', value as PipelineTask['priority'])}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t('tasks.priority.low')}</SelectItem>
                  <SelectItem value="medium">{t('tasks.priority.medium')}</SelectItem>
                  <SelectItem value="high">{t('tasks.priority.high')}</SelectItem>
                  <SelectItem value="urgent">{t('tasks.priority.urgent')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="due_date">{t('tasks.form.dueDate')}</Label>
            <Input
              id="due_date"
              type="datetime-local"
              value={formData.due_date}
              onChange={e => updateField('due_date', e.target.value)}
              disabled={loading}
            />
            {parentTask?.due_date && (
              <p className="text-xs text-muted-foreground">
                {t('tasks.form.exactDueDate')}: {new Date(parentTask.due_date).toLocaleString(getFormattingLocale())}
              </p>
            )}
            {errors.due_date && (
              <p className="text-xs text-destructive">{errors.due_date}</p>
            )}
          </div>

          {/* Assigned To */}
          {availableUsers && availableUsers.length > 0 && (
            <div className="space-y-2">
              <Label>{t('tasks.form.assignedTo')}</Label>
              <Select
                value={formData.assigned_to_id || 'none'}
                onValueChange={value => updateField('assigned_to_id', value === 'none' ? '' : value)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('tasks.form.assignedToPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('tasks.form.none')}</SelectItem>
                  {availableUsers.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{t('tasks.form.description')}</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={e => updateField('description', e.target.value)}
              placeholder={t('tasks.form.descriptionPlaceholder')}
              rows={3}
              disabled={loading}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {t('tasks.form.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t('tasks.form.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
