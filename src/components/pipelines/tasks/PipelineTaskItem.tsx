import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { useLanguage } from '@/hooks/useLanguage';
import { getDateFnsLocale } from '@/lib/dateFnsLocale';
import { Badge, Button, Checkbox } from '@evoapi/design-system';
import {
  Phone,
  Mail,
  Calendar,
  MessageSquare,
  FileText,
  ListTodo,
  User,
  Edit,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PipelineTask } from '@/types/analytics';

interface PipelineTaskItemProps {
  task: PipelineTask;
  onEdit: (task: PipelineTask) => void;
  onDelete: (taskId: string) => void;
  onComplete: (taskId: string) => void;
  onReopen?: (taskId: string) => void;
  disabled?: boolean;
}

export default function PipelineTaskItem({
  task,
  onEdit,
  onDelete,
  onComplete,
  onReopen,
  disabled = false,
}: PipelineTaskItemProps) {
  const { t, currentLanguage } = useLanguage('pipelines');

  // Get task type icon
  const getTaskTypeIcon = () => {
    const iconClass = 'w-4 h-4';
    switch (task.task_type) {
      case 'call':
        return <Phone className={iconClass} />;
      case 'email':
        return <Mail className={iconClass} />;
      case 'meeting':
        return <Calendar className={iconClass} />;
      case 'follow_up':
        return <MessageSquare className={iconClass} />;
      case 'note':
        return <FileText className={iconClass} />;
      default:
        return <ListTodo className={iconClass} />;
    }
  };

  // Get priority badge color
  const getPriorityColor = () => {
    switch (task.priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'low':
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
      default:
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  // Format due date
  const formatDueDate = () => {
    if (!task.due_date) return null;

    const date = new Date(task.due_date);

    if (isToday(date)) {
      return t('tasks.dueDates.today');
    }
    if (isTomorrow(date)) {
      return t('tasks.dueDates.tomorrow');
    }

    return format(date, 'P p', { locale: getDateFnsLocale(currentLanguage) });
  };

  // Get due date classes
  const getDueDateClasses = () => {
    if (!task.due_date || task.status === 'completed') {
      return 'text-muted-foreground';
    }

    const date = new Date(task.due_date);
    if (isPast(date) || task.status === 'overdue') {
      return 'text-red-600 font-semibold dark:text-red-400';
    }
    if (isToday(date)) {
      return 'text-orange-600 font-medium dark:text-orange-400';
    }

    return 'text-muted-foreground';
  };

  // Get task card classes
  const getTaskCardClasses = () => {
    const baseClasses =
      'p-4 border rounded-lg transition-all duration-200 hover:shadow-sm';

    if (task.status === 'overdue') {
      return cn(
        baseClasses,
        'border-red-300 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20',
      );
    }

    if (task.status === 'completed') {
      return cn(
        baseClasses,
        'border-green-300 bg-green-50/50 dark:border-green-900/50 dark:bg-green-950/20',
      );
    }

    if (task.status === 'cancelled') {
      return cn(
        baseClasses,
        'border-slate-300 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-900/20 opacity-60',
      );
    }

    return cn(baseClasses, 'border-border bg-card hover:bg-accent/30');
  };

  const handleCheckboxChange = (checked: boolean) => {
    if (checked && task.status === 'pending') {
      if (confirm(t('tasks.messages.completeConfirm'))) {
        onComplete(task.id);
      }
    } else if (!checked && task.status === 'completed' && onReopen) {
      if (confirm(t('tasks.messages.reopenConfirm'))) {
        onReopen(task.id);
      }
    }
  };

  return (
    <div className={getTaskCardClasses()}>
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <Checkbox
          checked={task.status === 'completed'}
          onCheckedChange={handleCheckboxChange}
          disabled={disabled || task.status === 'cancelled'}
          className="mt-1"
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h4
            className={cn(
              'text-sm font-medium mb-2',
              task.status === 'completed' && 'line-through text-muted-foreground',
              task.status === 'cancelled' && 'line-through text-muted-foreground',
            )}
          >
            {task.title}
          </h4>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Type */}
            <div className="flex items-center gap-1 text-muted-foreground">
              {getTaskTypeIcon()}
              <span>{t(`tasks.types.${task.task_type}`)}</span>
            </div>

            {/* Priority */}
            <Badge variant="secondary" className={cn('text-xs px-2 py-0.5', getPriorityColor())}>
              {t(`tasks.priority.${task.priority}`)}
            </Badge>

            {/* Due date */}
            {task.due_date && (
              <div className={cn('flex items-center gap-1', getDueDateClasses())}>
                <Calendar className="w-3 h-3" />
                <span>{formatDueDate()}</span>
              </div>
            )}

            {/* Assignee */}
            {task.assigned_to && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <User className="w-3 h-3" />
                <span>{task.assigned_to.name}</span>
              </div>
            )}

            {/* Status badge */}
            {task.status === 'overdue' && (
              <Badge variant="destructive" className="text-xs">
                {t('tasks.status.overdue')}
              </Badge>
            )}
            {task.status === 'cancelled' && (
              <Badge variant="secondary" className="text-xs">
                {t('tasks.status.cancelled')}
              </Badge>
            )}
          </div>

          {/* Description */}
          {task.description && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
              {task.description}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {task.status === 'completed' && onReopen && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReopen(task.id)}
              disabled={disabled}
              className="h-8 w-8 p-0"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
          {task.status !== 'completed' && task.status !== 'cancelled' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(task)}
              disabled={disabled}
              className="h-8 w-8 p-0"
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(task.id)}
            disabled={disabled}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
