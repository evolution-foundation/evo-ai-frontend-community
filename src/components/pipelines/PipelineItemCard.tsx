import { useLanguage } from '@/hooks/useLanguage';
import { Button, Badge, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@evoapi/design-system';
import { Edit, Trash2, MoreVertical, Phone, Mail, MessageSquare, User, Clock, AlertCircle, ListTodo, CheckCircle2, GripVertical, GitBranch } from 'lucide-react';
import { PipelineItem, Pipeline, PipelineStage } from '@/types/analytics';
import { getContactColor } from '@/utils/avatar';

interface PipelineItemCardProps {
  item: PipelineItem;
  pipeline?: Pipeline;
  stage?: PipelineStage;
  onView?: (item: PipelineItem) => void;
  onEdit?: (item: PipelineItem) => void;
  onRemove?: (item: PipelineItem) => void;
  showDragHandle?: boolean;
  showActions?: boolean;
}

const stripHtml = (html: string): string => {
  if (!html) return '';
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  return (tempDiv.textContent || tempDiv.innerText || '').trim();
};


export default function PipelineItemCard({
  item,
  pipeline,
  stage,
  onView,
  onEdit,
  onRemove,
  showDragHandle = false,
  showActions = true,
}: PipelineItemCardProps) {
  const { t } = useLanguage('pipelines');

  return (
    <div
      className="group bg-background rounded-xl p-4 border border-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 cursor-pointer select-none relative"
      onClick={() => onView?.(item)}
    >
      {/* Card Options Menu */}
      {showActions && (onEdit || onRemove) && (
        <div
          className="absolute top-2 right-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center space-x-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-1 hover:bg-muted"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(item)}>
                    <Edit className="h-4 w-4 mr-2" />
                    {t('kanban.item.editItem')}
                  </DropdownMenuItem>
                )}
                {onEdit && onRemove && <DropdownMenuSeparator />}
                {onRemove && (
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => onRemove(item)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('kanban.item.removeFromPipeline')}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            {showDragHandle && (
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </div>
      )}

      {/* Contact Info Header */}
      <div className="flex items-start space-x-3 mb-3">
        <div className="relative">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm"
            style={{
              backgroundColor: getContactColor(item.contact?.name),
            }}
          >
            {item.contact?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          {/* Online indicator */}
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-background rounded-full" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <h4 className="text-sm font-semibold text-foreground truncate">
              {item.contact?.name || t('kanban.item.unknownUser', 'Usuário Desconhecido')}
            </h4>
            {item.conversation?.display_id && (
              <span className="text-xs text-muted-foreground font-medium">
                #{item.conversation.display_id}
              </span>
            )}
          </div>
          {/* Contact details */}
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            {item.contact?.phone_number && (
              <span className="flex items-center space-x-1">
                <Phone className="w-3 h-3" />
                <span className="truncate max-w-20">
                  {item.contact.phone_number}
                </span>
              </span>
            )}
            {item.contact?.email && (
              <span className="flex items-center space-x-1">
                <Mail className="w-3 h-3" />
                <span className="truncate max-w-20">
                  {item.contact?.email}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Pipeline and Stage Info */}
      {(pipeline || stage) && (
        <div className="mb-3 flex items-center gap-2 flex-wrap">
          {pipeline && (
            <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-primary/10 rounded-md border border-primary/20">
              <GitBranch className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-foreground truncate max-w-32">
                {pipeline.name}
              </span>
            </div>
          )}
          {stage && (
            <div
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md border"
              style={{
                backgroundColor: `${stage.color}15`,
                borderColor: `${stage.color}40`,
              }}
            >
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: stage.color }}
              />
              <span className="text-xs font-medium text-foreground truncate max-w-24">
                {stage.name}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Last Message Preview */}
      {item.conversation?.last_non_activity_message?.content && (
        <div className="mb-3 p-3 bg-muted/50 rounded-lg border border-border">
          <div className="flex items-start space-x-2">
            <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-xs font-medium text-foreground">
                  {item.conversation.last_non_activity_message.sender?.name ||
                    t('kanban.item.system', 'Sistema')}
                </span>
              </div>
              <p className="text-sm text-foreground line-clamp-2 leading-relaxed">
                {stripHtml(item.conversation.last_non_activity_message.processed_message_content ||
                  item.conversation.last_non_activity_message.content)}
              </p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">
                  {new Date(
                    typeof item.conversation.last_non_activity_message.created_at === 'number'
                      ? item.conversation.last_non_activity_message.created_at * 1000
                      : item.conversation.last_non_activity_message.created_at,
                  ).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                {item.conversation.last_non_activity_message?.message_type !== undefined && (
                  <span className="text-xs text-muted-foreground">
                    {item.conversation.last_non_activity_message.message_type === 0
                      ? t('kanban.conversation.incoming', 'Entrada')
                      : item.conversation.last_non_activity_message.message_type === 1
                        ? t('kanban.conversation.outgoing', 'Saída')
                        : ''}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inbox and Status Row */}
      {!item.is_lead && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2 text-xs">
            <div className="flex items-center space-x-1 px-2 py-1 bg-muted/50 rounded-md">
              <div className="w-3 h-3 text-muted-foreground">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M2 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 002 2H4a2 2 0 01-2-2V5zm3 1h6v4H5V6zm6 6H5v2h6v-2z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <span className="text-foreground font-medium truncate max-w-16">
                {item.conversation?.inbox?.name || t('kanban.item.noInbox', 'Sem Inbox')}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {/* Status badge */}
            <span
              className={`text-xs px-2 py-1 rounded-full font-medium ${
                item.conversation?.status === 'open'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                  : item.conversation?.status === 'resolved'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
              }`}
            >
              {item.conversation?.status === 'open'
                ? t('kanban.item.status.open', 'Aberto')
                : item.conversation?.status === 'resolved'
                ? t('kanban.item.status.resolved', 'Resolvido')
                : item.conversation?.status || t('kanban.item.status.unknown', 'Desconhecido')}
            </span>
          </div>
        </div>
      )}

      {/* Services Total Value */}
      {item.services_info?.has_services &&
        item.services_info.total_value > 0 && (
          <div className="mb-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <div className="w-3 h-3">
                  <svg fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.51-1.31c-.562-.649-1.413-1.076-2.353-1.253V5z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <span className="font-medium">{t('kanban.item.valueLabel', 'Valor Total:')}</span>
              </div>
              <div className="text-xs font-semibold text-green-600 dark:text-green-400">
                {item.services_info.formatted_total}
              </div>
            </div>
          </div>
        )}

      {/* Tasks Summary - Compact and Visual */}
      {(item.tasks_info?.pending_count > 0 ||
        item.tasks_info?.overdue_count > 0 ||
        item.tasks_info?.due_soon_count > 0 ||
        item.tasks_info?.completed_count > 0) && (
        <div className="mb-3 flex items-center gap-1.5 flex-wrap">
          <div className="text-sm">{t('tasks.title')}</div>
          {/* Tasks vencidas - Prioridade máxima */}
          {item.tasks_info?.overdue_count > 0 && (
            <Badge title={t('tasks.status.overdue')} variant="destructive" className="h-5 px-1.5 text-xs">
              <AlertCircle className="w-3 h-3 mr-1" />
              {item.tasks_info.overdue_count}
            </Badge>
          )}

          {/* Tasks próximas do vencimento */}
          {item.tasks_info?.due_soon_count > 0 && (
            <Badge title={t('tasks.status.dueSoon')} className="h-5 px-1.5 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
              <Clock className="w-3 h-3 mr-1" />
              {item.tasks_info.due_soon_count}
            </Badge>
          )}

          {/* Tasks pendentes (sem urgência) */}
          {item.tasks_info?.pending_count > 0 &&
            !item.tasks_info?.overdue_count &&
            !item.tasks_info?.due_soon_count && (
              <Badge title={t('tasks.status.pending')} variant="secondary" className="h-5 px-1.5 text-xs">
                <ListTodo className="w-3 h-3 mr-1" />
                {item.tasks_info.pending_count}
              </Badge>
            )}

          {/* Tasks concluídas */}
          {item.tasks_info?.completed_count > 0 && (
            <Badge title={t('tasks.status.completed')} className="h-5 px-1.5 text-xs bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              {item.tasks_info.completed_count}
            </Badge>
          )}
        </div>
      )}

      {/* Time and assignee info */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-1 text-muted-foreground">
          <div className="w-3 h-3">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <span>
            {item.conversation?.last_activity_at
              ? new Date(item.conversation.last_activity_at * 1000).toLocaleDateString('pt-BR')
              : new Date((item.entered_at || 0) * 1000).toLocaleDateString('pt-BR')}
          </span>
        </div>

        {/* Assignee */}
        {item.conversation?.assignee && (
          <div className="flex items-center space-x-1 text-muted-foreground">
            <User className="w-3 h-3" />
            <span className="truncate max-w-20">
              {item.conversation.assignee.name}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

