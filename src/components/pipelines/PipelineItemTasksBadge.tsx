import { useTranslation as useUiTranslation } from 'react-i18next';
import { useMemo } from 'react';
import { Badge } from '@evoapi/design-system';
import { CheckCircle2, Clock, AlertCircle, ListTodo } from 'lucide-react';
import { isPast, isToday, addHours } from 'date-fns';
import type { PipelineTask } from '@/types/analytics';

interface PipelineItemTasksBadgeProps {
  tasks: PipelineTask[];
  compact?: boolean;
}

export default function PipelineItemTasksBadge({ tasks, compact = false }: PipelineItemTasksBadgeProps) {
  const { t: tUi } = useUiTranslation();
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });
  }, [tasks]);

  const counters = useMemo(() => {
    const pending = sortedTasks.filter(t => t.status === 'pending').length;
    const completed = sortedTasks.filter(t => t.status === 'completed').length;
    
    let overdue = 0;
    let dueSoon = 0;

    sortedTasks.forEach(task => {
      if (task.status !== 'pending' || !task.due_date) return;
      
      const dueDate = new Date(task.due_date);
      
      if (isPast(dueDate)) {
        overdue++;
      } else if (isToday(dueDate) || dueDate <= addHours(new Date(), 24)) {
        dueSoon++;
      }
    });

    return { pending, completed, overdue, dueSoon, total: tasks.length };
  }, [sortedTasks, tasks.length]);


  if (counters.total === 0) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {counters.overdue > 0 && (
          <Badge variant="destructive" className="h-5 px-1.5 text-xs">
            <AlertCircle className="w-3 h-3 mr-1" />
            {counters.overdue}
          </Badge>
        )}
        {counters.dueSoon > 0 && counters.overdue === 0 && (
          <Badge className="h-5 px-1.5 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
            <Clock className="w-3 h-3 mr-1" />
            {counters.dueSoon}
          </Badge>
        )}
        {counters.pending > 0 && counters.overdue === 0 && counters.dueSoon === 0 && (
          <Badge variant="secondary" className="h-5 px-1.5 text-xs">
            <ListTodo className="w-3 h-3 mr-1" />
            {counters.pending}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Tasks vencidas */}
      {counters.overdue > 0 && (
        <Badge variant="destructive" className="h-6 px-2 text-xs">
          <AlertCircle className="w-3 h-3 mr-1" />
          {tUi("pipelines:tasks.badge.overdue", { count: counters.overdue })}
        </Badge>
      )}

      {/* Tasks próximas do vencimento */}
      {counters.dueSoon > 0 && (
        <Badge className="h-6 px-2 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
          <Clock className="w-3 h-3 mr-1" />
          {tUi("pipelines:tasks.badge.dueSoon", { count: counters.dueSoon })}
        </Badge>
      )}

      {/* Tasks pendentes */}
      {counters.pending > 0 && (
        <Badge variant="secondary" className="h-6 px-2 text-xs">
          <ListTodo className="w-3 h-3 mr-1" />
          {tUi("pipelines:tasks.badge.pending", { count: counters.pending })}
        </Badge>
      )}

      {/* Tasks concluídas */}
      {counters.completed > 0 && (
        <Badge className="h-6 px-2 text-xs bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          {counters.completed}
        </Badge>
      )}
    </div>
  );
}
