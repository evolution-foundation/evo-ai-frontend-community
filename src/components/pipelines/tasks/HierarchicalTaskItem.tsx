import { getFormattingDateFnsLocale } from '@/lib/formattingLocale';
import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Badge,
  Button,
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@evoapi/design-system';
import {
  ChevronRight,
  ChevronDown,
  GripVertical,
  Plus,
  Edit,
  Trash2,
  Calendar,
  User,
  Phone,
  Mail,
  Video,
  Bell,
  FileText,
  MoreHorizontal,
  CornerDownRight,
  CornerUpLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PipelineTask } from '@/types/analytics';
import { format } from 'date-fns';

interface HierarchicalTaskItemProps {
  task: PipelineTask;
  depth?: number;
  onEdit: (task: PipelineTask) => void;
  onDelete: (taskId: string) => void;
  onComplete: (taskId: string) => void;
  onReopen?: (taskId: string) => void;
  onAddSubtask: (parentTask: PipelineTask) => void;
  onMoveTask?: (taskId: string, newParentId: string | null) => void;
  disabled?: boolean;
  allTasks?: PipelineTask[];
}

export default function HierarchicalTaskItem({
  task,
  depth = 0,
  onEdit,
  onDelete,
  onComplete,
  onReopen,
  onAddSubtask,
  onMoveTask,
  disabled = false,
  allTasks = [],
}: HierarchicalTaskItemProps) {
  const { t } = useLanguage('pipelines');
  const [isExpanded, setIsExpanded] = useState(true);

  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const maxDepth = 2; // 0 = root, 1 = level 1, 2 = level 2
  const canAddSubtask = depth < maxDepth && task.status !== 'completed';
  const canPromote = depth > 0 && task.status !== 'completed'; // Can promote if not root and not completed
  const canMove = task.status !== 'completed'; // Can only move if not completed

  // Get possible parent tasks for this task (excluding itself and its descendants)
  const getPossibleParents = (): PipelineTask[] => {
    if (!allTasks || allTasks.length === 0) return [];
    
    const excludeIds = new Set([task.id]);
    
    // Add all descendants to exclude list
    const addDescendants = (t: PipelineTask) => {
      if (t.subtasks) {
        t.subtasks.forEach(st => {
          excludeIds.add(st.id);
          addDescendants(st);
        });
      }
    };
    addDescendants(task);
    
    // Also exclude current parent to avoid showing "move to same parent"
    if (task.parent_task_id) {
      excludeIds.add(task.parent_task_id);
    }
    
    // Current task depth and if it has subtasks
    const currentDepth = task.depth || 0;
    const taskHasSubtasks = hasSubtasks;
    
    // Filter tasks that can be parents based on depth restrictions
    return allTasks.filter(t => {
      if (excludeIds.has(t.id)) return false;
      
      // Exclude completed tasks as potential parents
      if (t.status === 'completed') return false;
      
      const potentialParentDepth = t.depth || 0;
      
      // Calculate what depth this task would have under the new parent
      const newDepth = potentialParentDepth + 1;
      
      // Cannot exceed max depth
      if (newDepth > maxDepth) return false;
      
      // If task has subtasks, need to ensure they won't exceed depth either
      // Check the deepest subtask level
      if (taskHasSubtasks) {
        const getMaxSubtaskDepth = (t: PipelineTask, baseDepth: number): number => {
          if (!t.subtasks || t.subtasks.length === 0) return baseDepth;
          return Math.max(...t.subtasks.map(st => getMaxSubtaskDepth(st, baseDepth + 1)));
        };
        
        const maxSubtaskDepth = getMaxSubtaskDepth(task, newDepth);
        if (maxSubtaskDepth > maxDepth) return false;
      }
      
      // Contextual filtering based on current position:
      // - If at depth 2 (max), can only move up (to depth 1 or 0)
      // - If at depth 1, can move to depth 0 or other depth 0 tasks
      // - If at depth 0, can move under other depth 0 or depth 1 tasks (if allowed)
      
      if (currentDepth === maxDepth) {
        // At max depth, can only move to shallower levels
        return potentialParentDepth < currentDepth;
      }
      
      return true;
    });
  };

  const handlePromoteToRoot = () => {
    if (onMoveTask && canPromote) {
      onMoveTask(task.id, null);
    }
  };

  const handleMoveToParent = (newParentId: string) => {
    if (onMoveTask) {
      onMoveTask(task.id, newParentId);
    }
  };

  const handleEdit = () => {
    if (task.status !== 'completed') {
      onEdit(task);
    }
  };

  const handleDelete = (id: string) => {
    if (task.status !== 'completed') {
      onDelete(id);
    }
  }

  // Get ALL descendants (recursive through all levels)
  const getAllDescendants = (t: PipelineTask): PipelineTask[] => {
    if (!t.subtasks || t.subtasks.length === 0) return [];
    
    const descendants: PipelineTask[] = [...t.subtasks];
    t.subtasks.forEach(st => {
      descendants.push(...getAllDescendants(st));
    });
    
    return descendants;
  };

  const handleCheckboxChange = (checked: boolean) => {
    if (checked) {
      // Count ALL descendants (not just direct subtasks)
      const allDescendants = getAllDescendants(task);
      const pendingDescendants = allDescendants.filter(d => d.status !== 'completed').length;
      
      if (pendingDescendants > 0) {
        const confirmed = window.confirm(
          t('tasks.messages.completeWithAllDescendantsConfirm', { count: pendingDescendants })
        );
        if (!confirmed) return;
      }
      onComplete(task.id);
    } else if (onReopen) {
      // Count ALL descendants that will be reopened
      const allDescendants = getAllDescendants(task);
      const completedDescendants = allDescendants.filter(d => d.status === 'completed').length;
      
      if (completedDescendants > 0) {
        const confirmed = window.confirm(
          t('tasks.messages.reopenWithAllDescendantsConfirm', { count: completedDescendants })
        );
        if (!confirmed) return;
      }
      onReopen(task.id);
    }
  };

  const getTaskTypeIcon = () => {
    const iconClass = 'w-3.5 h-3.5';
    switch (task.task_type) {
      case 'call':
        return <Phone className={iconClass} />;
      case 'email':
        return <Mail className={iconClass} />;
      case 'meeting':
        return <Video className={iconClass} />;
      case 'follow_up':
        return <Bell className={iconClass} />;
      case 'note':
        return <FileText className={iconClass} />;
      default:
        return <MoreHorizontal className={iconClass} />;
    }
  };

  const getPriorityColor = () => {
    switch (task.priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getStatusColor = () => {
    switch (task.status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    }
  };

  const formatDueDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'Pp', { locale: getFormattingDateFnsLocale() });
    } catch {
      return dateString;
    }
  };

  return (
    <div className={cn('space-y-1', depth > 0 && 'ml-6')}>
      {/* Main Task Card */}
      <div
        className={cn(
          'group relative rounded-lg border bg-card p-3 hover:shadow-md transition-all',
          task.status === 'completed' && 'opacity-60',
          task.overdue && task.status === 'pending' && 'border-red-300 dark:border-red-800',
          task.due_soon && task.status === 'pending' && 'border-yellow-300 dark:border-yellow-800',
        )}
      >
        {/* Depth indicator line */}
        {depth > 0 && (
          <div className="absolute -left-6 top-0 bottom-0 w-6 flex items-center justify-center">
            <div className="h-px w-4 bg-border" />
          </div>
        )}

        <div className="flex items-start gap-2">
          {/* Expand/Collapse Button */}
          {hasSubtasks ? (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-accent rounded transition-colors flex-shrink-0"
              aria-label={isExpanded ? t('tasks.actions.collapse') : t('tasks.actions.expand')}
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          ) : (
            <div className="w-6" /> // Spacer for alignment
          )}

          {/* Drag Handle */}
          <div className="cursor-grab p-1 opacity-0 group-hover:opacity-30 hover:opacity-50 transition-opacity flex-shrink-0">
            <GripVertical className="w-4 h-4" />
          </div>

          {/* Checkbox */}
          <Checkbox
            checked={task.status === 'completed'}
            onCheckedChange={handleCheckboxChange}
            disabled={disabled || task.status === 'cancelled'}
            className="mt-0.5 flex-shrink-0"
          />

          {/* Task Content */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Title and Actions Row */}
            <div className="flex items-start justify-between gap-2">
              <h4
                className={cn(
                  'text-sm font-medium break-words',
                  task.status === 'completed' && 'line-through text-muted-foreground',
                )}
              >
                {task.title}
              </h4>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Move Menu */}
                {onMoveTask && canMove && (canPromote || getPossibleParents().length > 0) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={disabled}
                        className="h-7 w-7 p-0"
                        title={t('tasks.actions.move')}
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {/* Promote to Root - only if not already root */}
                      {canPromote && (
                        <>
                          <DropdownMenuItem onClick={handlePromoteToRoot}>
                            <CornerUpLeft className="w-4 h-4 mr-2" />
                            {t('tasks.actions.promoteToRoot')}
                          </DropdownMenuItem>
                          {getPossibleParents().length > 0 && <DropdownMenuSeparator />}
                        </>
                      )}
                      {/* Move to other parents */}
                      {getPossibleParents().length > 0 && (
                        <>
                          {getPossibleParents().map(parent => (
                            <DropdownMenuItem
                              key={parent.id}
                              onClick={() => handleMoveToParent(parent.id)}
                            >
                              <CornerDownRight className="w-4 h-4 mr-2" />
                              {t('tasks.actions.moveUnder', { parent: parent.title })}
                            </DropdownMenuItem>
                          ))}
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Add Subtask */}
                {canAddSubtask && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAddSubtask(task)}
                    disabled={disabled}
                    className="h-7 w-7 p-0"
                    title={t('tasks.actions.addSubtask')}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                )}

                {/* Edit */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEdit}
                  disabled={disabled || task.status === 'completed'}
                  className="h-7 w-7 p-0"
                  title={t('tasks.edit')}
                >
                  <Edit className="h-3.5 w-3.5" />
                </Button>

                {/* Delete */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(task.id)}
                  disabled={disabled || task.status === 'completed'}
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  title={t('tasks.delete')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Description */}
            {task.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 break-words">
                {task.description}
              </p>
            )}

            {/* Metadata Row */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Task Type */}
              <div className="flex items-center gap-1 text-muted-foreground">
                {getTaskTypeIcon()}
                <span>{t(`tasks.types.${task.task_type}`)}</span>
              </div>

              {/* Priority */}
              <Badge variant="secondary" className={cn('text-xs px-1.5 py-0', getPriorityColor())}>
                {t(`tasks.priority.${task.priority}`)}
              </Badge>

              {/* Status */}
              {task.status !== 'pending' && (
                <Badge variant="secondary" className={cn('text-xs px-1.5 py-0', getStatusColor())}>
                  {t(`tasks.status.${task.status}`)}
                </Badge>
              )}

              {/* Subtask Counter */}
              {task.has_subtasks && (
                <Badge variant="outline" className="text-xs px-1.5 py-0">
                  {task.subtask_count} {task.subtask_count === 1 ? t('tasks.subtask') : t('tasks.subtasks')}
                </Badge>
              )}

              {/* Completion Percentage */}
              {task.has_subtasks && task.completion_percentage !== undefined && task.status !== 'completed' && (
                <div className="flex items-center gap-1.5">
                  <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${task.completion_percentage}%` }}
                    />
                  </div>
                  <span className="text-muted-foreground">{task.completion_percentage}%</span>
                </div>
              )}

              {/* Due Date */}
              {task.due_date && (
                <div
                  className={cn(
                    'flex items-center gap-1',
                    task.overdue && task.status === 'pending' && 'text-red-600 dark:text-red-400 font-medium',
                    task.due_soon && task.status === 'pending' && 'text-yellow-600 dark:text-yellow-400 font-medium',
                  )}
                >
                  <Calendar className="w-3 h-3" />
                  <span>{formatDueDate(task.due_date)}</span>
                </div>
              )}

              {/* Assigned To */}
              {task.assigned_to && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <User className="w-3 h-3" />
                  <span>{task.assigned_to.name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Subtasks (Recursive) */}
      {hasSubtasks && isExpanded && (
        <div className="space-y-1 relative">
          {/* Vertical line for hierarchy */}
          <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />
          
          {task.subtasks!.map(subtask => (
            <HierarchicalTaskItem
              key={subtask.id}
              task={subtask}
              depth={depth + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onComplete={onComplete}
              onReopen={onReopen}
              onAddSubtask={onAddSubtask}
              onMoveTask={onMoveTask}
              disabled={disabled}
              allTasks={allTasks}
            />
          ))}
        </div>
      )}
    </div>
  );
}
