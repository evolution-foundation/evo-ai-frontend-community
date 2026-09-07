import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { usePipelineTasks } from '@/hooks/usePipelineTasks';
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@evoapi/design-system';
import { Plus, Loader2 } from 'lucide-react';
import HierarchicalTaskItem from './HierarchicalTaskItem';
import type { PipelineTask } from '@/types/analytics';

interface PipelineTasksListProps {
  pipelineId: string;
  pipelineItemId: string;
  onCreateClick: () => void;
  onEditClick: (task: PipelineTask) => void;
  onAddSubtask?: (parentTask: PipelineTask) => void;
}

export interface PipelineTasksListRef {
  reloadTasks: () => void;
  pendingCount: number;
  overdueCount: number;
  createTask: (data: any) => Promise<PipelineTask | null>;
  updateTask: (taskId: string, data: any) => Promise<PipelineTask | null>;
  creating: boolean;
  updating: boolean;
}

const PipelineTasksList = forwardRef<PipelineTasksListRef, PipelineTasksListProps>(({
  pipelineId,
  pipelineItemId,
  onCreateClick,
  onEditClick,
  onAddSubtask,
}, ref) => {
  const { t } = useLanguage('pipelines');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const {
    tasks,
    loading,
    deleting,
    deleteTask,
    completeTask,
    reopenTask,
    moveTask,
    pendingCount,
    overdueCount,
    loadTasks,
    createTask,
    updateTask,
    creating,
    updating,
  } = usePipelineTasks({
    pipelineId,
    pipelineItemId,
    autoLoad: true,
  });

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    reloadTasks: loadTasks,
    pendingCount,
    overdueCount,
    createTask,
    updateTask,
    creating,
    updating,
  }), [loadTasks, pendingCount, overdueCount, createTask, updateTask, creating, updating]);

  // Notify parent about count changes
  useEffect(() => {
    if (ref && typeof ref !== 'function' && ref.current) {
      // Force update parent by triggering a re-render when counts change
      const event = new CustomEvent('tasksCountChanged', {
        detail: { pendingCount, overdueCount }
      });
      window.dispatchEvent(event);
    }
  }, [pendingCount, overdueCount, ref]);

  console.log('tasks', tasks);
  // Filter tasks - only root tasks (hierarchy handled by HierarchicalTaskItem)
  const filteredTasks = tasks
    .filter(task => !task.parent_task_id) // Only root tasks
    .filter(task => {
      if (filterStatus === 'all') return true;
      return task.status === filterStatus;
    });

  const handleDelete = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    const hasSubtasks = task?.has_subtasks || false;
    
    let confirmMessage = t('tasks.messages.deleteConfirm');
    if (hasSubtasks) {
      confirmMessage = t('tasks.messages.deleteWithSubtasksConfirm', { 
        count: task?.subtask_count || 0 
      });
    }
    
    if (confirm(confirmMessage)) {
      await deleteTask(taskId);
    }
  };

  const handleAddSubtask = (parentTask: PipelineTask) => {
    if (onAddSubtask) {
      onAddSubtask(parentTask);
    }
  };

  const handleMoveTask = async (taskId: string, newParentId: string | null) => {
    await moveTask(taskId, newParentId);
  };

  // Flatten all tasks for passing to HierarchicalTaskItem
  const flattenTasks = (tasksList: PipelineTask[]): PipelineTask[] => {
    const result: PipelineTask[] = [];
    const flatten = (task: PipelineTask) => {
      result.push(task);
      if (task.subtasks && task.subtasks.length > 0) {
        task.subtasks.forEach(flatten);
      }
    };
    tasksList.forEach(flatten);
    return result;
  };

  const allFlatTasks = flattenTasks(tasks);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">
            {t('tasks.title')}
          </h3>
          <span className="text-sm text-muted-foreground">
            ({filteredTasks.length})
          </span>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
              {pendingCount} {t('tasks.pending')}
            </span>
          )}
          {overdueCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
              {overdueCount} {t('tasks.overdue')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Filter */}
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('tasks.filters.all')}</SelectItem>
              <SelectItem value="pending">{t('tasks.filters.pending')}</SelectItem>
              <SelectItem value="overdue">{t('tasks.filters.overdue')}</SelectItem>
              <SelectItem value="completed">{t('tasks.filters.completed')}</SelectItem>
            </SelectContent>
          </Select>

          {/* Create button */}
          <Button onClick={onCreateClick} size="sm" className="h-9">
            <Plus className="w-4 h-4 mr-1" />
            {t('tasks.newTask')}
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredTasks.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">{t('tasks.noTasks')}</p>
          <Button onClick={onCreateClick} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-1" />
            {t('tasks.createFirstTask')}
          </Button>
        </div>
      )}

      {/* Tasks list with hierarchy */}
      {!loading && filteredTasks.length > 0 && (
        <div className="space-y-2">
          {filteredTasks.map(task => (
            <HierarchicalTaskItem
              key={task.id}
              task={task}
              depth={0}
              onEdit={onEditClick}
              onDelete={handleDelete}
              onComplete={completeTask}
              onReopen={reopenTask}
              onAddSubtask={handleAddSubtask}
              onMoveTask={handleMoveTask}
              disabled={deleting}
              allTasks={allFlatTasks}
            />
          ))}
        </div>
      )}
    </div>
  );
});

PipelineTasksList.displayName = 'PipelineTasksList';

export default PipelineTasksList;
