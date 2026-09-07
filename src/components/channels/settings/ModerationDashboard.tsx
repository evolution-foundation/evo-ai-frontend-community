import { getFormattingLocale } from '@/lib/formattingLocale';
import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Button,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Textarea,
  Label,
} from '@evoapi/design-system';
import {
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  MessageSquare,
  Trash2,
  Ban,
  Send,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';

import FacebookModerationService from '@/services/channels/facebookModerationService';
import { FacebookCommentModeration } from '@/types/channels/inbox';
import { PaginationMeta } from '@/types/core';

interface ModerationDashboardProps {
  conversationId?: string;
}

export default function ModerationDashboard({ conversationId }: ModerationDashboardProps) {
  const { t } = useLanguage('channels');
  const [moderations, setModerations] = useState<FacebookCommentModeration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('pending');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [rejectionReason, setRejectionReason] = useState<{ [key: string]: string }>({});
  const [meta, setMeta] = useState<PaginationMeta>({
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 1,
    has_next_page: false,
    has_previous_page: false,
  });

  // Load moderations
  const loadModerations = async (page = 1) => {
    setIsLoading(true);
    try {
      const params: any = {
        page,
        page_size: meta.page_size,
        pending_only: selectedStatus === 'pending' ? 'true' : undefined,
      };

      if (selectedStatus !== 'all' && selectedStatus !== 'pending') {
        params.status = selectedStatus;
      }

      if (selectedType !== 'all') {
        params.moderation_type = selectedType;
      }

      if (conversationId) {
        params.conversation_id = conversationId;
      }

      const response = await FacebookModerationService.getModerations(params);
      setModerations(response.data || []);
      setMeta(response.meta.pagination as PaginationMeta);
    } catch (error) {
      console.error('Error loading moderations:', error);
      toast.error(t('settings.moderation.errors.loadError'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadModerations(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStatus, selectedType, conversationId]);

  // Handle approve
  const handleApprove = async (moderation: FacebookCommentModeration) => {
    setIsProcessing(moderation.id);
    try {
      await FacebookModerationService.approveModeration(moderation.id);
      toast.success(t('settings.moderation.success.approved'));
      await loadModerations(meta.page);
    } catch (error) {
      console.error('Error approving moderation:', error);
      toast.error(t('settings.moderation.errors.approveError'));
    } finally {
      setIsProcessing(null);
    }
  };

  // Handle reject
  const handleReject = async (moderation: FacebookCommentModeration) => {
    setIsProcessing(moderation.id);
    try {
      const reason = rejectionReason[moderation.id] || '';
      await FacebookModerationService.rejectModeration(moderation.id, reason);
      toast.success(t('settings.moderation.success.rejected'));
      setRejectionReason(prev => {
        const newReason = { ...prev };
        delete newReason[moderation.id];
        return newReason;
      });
      await loadModerations(meta.page);
    } catch (error) {
      console.error('Error rejecting moderation:', error);
      toast.error(t('settings.moderation.errors.rejectError'));
    } finally {
      setIsProcessing(null);
    }
  };

  // Handle regenerate response
  const handleRegenerateResponse = async (moderation: FacebookCommentModeration) => {
    setIsProcessing(moderation.id);
    try {
      await FacebookModerationService.regenerateResponse(moderation.id);
      toast.success(t('settings.moderation.success.regenerated'));
      await loadModerations(meta.page);
    } catch (error) {
      console.error('Error regenerating response:', error);
      toast.error(t('settings.moderation.errors.regenerateError'));
    } finally {
      setIsProcessing(null);
    }
  };

  // Get moderation type label
  const getModerationTypeLabel = (type: string) => {
    switch (type) {
      case 'explicit_words':
        return t('settings.moderation.types.explicitWords');
      case 'offensive_sentiment':
        return t('settings.moderation.types.offensiveSentiment');
      case 'response_approval':
        return t('settings.moderation.types.responseApproval');
      default:
        return type;
    }
  };

  // Get moderation type color
  const getModerationTypeColor = (type: string) => {
    switch (type) {
      case 'explicit_words':
        return 'destructive';
      case 'offensive_sentiment':
        return 'destructive';
      case 'response_approval':
        return 'default';
      default:
        return 'secondary';
    }
  };

  // Get action type label
  const getActionTypeLabel = (actionType: string) => {
    switch (actionType) {
      case 'delete_comment':
        return t('settings.moderation.actions.deleteComment');
      case 'block_user':
        return t('settings.moderation.actions.blockUser');
      case 'send_response':
        return t('settings.moderation.actions.sendResponse');
      default:
        return actionType;
    }
  };

  // Get action type icon
  const getActionTypeIcon = (actionType: string) => {
    switch (actionType) {
      case 'delete_comment':
        return Trash2;
      case 'block_user':
        return Ban;
      case 'send_response':
        return Send;
      default:
        return AlertTriangle;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t('settings.moderation.title')}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t('settings.moderation.description')}
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">
                {t('settings.moderation.filters.status')}
              </Label>
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('settings.moderation.filters.all')}</SelectItem>
                <SelectItem value="pending">{t('settings.moderation.filters.pending')}</SelectItem>
                <SelectItem value="approved">
                  {t('settings.moderation.filters.approved')}
                </SelectItem>
                <SelectItem value="rejected">
                  {t('settings.moderation.filters.rejected')}
                </SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">{t('settings.moderation.filters.type')}</Label>
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('settings.moderation.filters.allTypes')}</SelectItem>
                <SelectItem value="explicit_words">
                  {t('settings.moderation.types.explicitWords')}
                </SelectItem>
                <SelectItem value="offensive_sentiment">
                  {t('settings.moderation.types.offensiveSentiment')}
                </SelectItem>
                <SelectItem value="response_approval">
                  {t('settings.moderation.types.responseApproval')}
                </SelectItem>
              </SelectContent>
            </Select>

            <div className="ml-auto text-sm text-muted-foreground">
              {t('settings.moderation.totalCount', { count: meta.total })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Moderations List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : moderations.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-foreground mb-2">
                {t('settings.moderation.empty.title')}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('settings.moderation.empty.description')}
              </p>
            </CardContent>
          </Card>
        ) : (
          moderations.map(moderation => {
            const ActionIcon = getActionTypeIcon(moderation.action_type);
            const isPending = moderation.status === 'pending';
            const isProcessingThis = isProcessing === moderation.id;

            return (
              <Card key={moderation.id}>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Shield className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={getModerationTypeColor(moderation.moderation_type)}>
                              {getModerationTypeLabel(moderation.moderation_type)}
                            </Badge>
                            <Badge
                              variant={
                                isPending
                                  ? 'default'
                                  : moderation.status === 'approved'
                                  ? 'default'
                                  : 'destructive'
                              }
                            >
                              {moderation.status === 'pending'
                                ? t('settings.moderation.status.pending')
                                : moderation.status === 'approved'
                                ? t('settings.moderation.status.approved')
                                : t('settings.moderation.status.rejected')}
                            </Badge>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <ActionIcon className="h-3 w-3" />
                              <span>{getActionTypeLabel(moderation.action_type)}</span>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {t('settings.moderation.commentId')}: {moderation.comment_id}
                          </p>
                          {moderation.conversation && (
                            <p className="text-xs text-muted-foreground">
                              {t('settings.moderation.conversation')}: #
                              {moderation.conversation.display_id}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(moderation.created_at).toLocaleString(getFormattingLocale())}
                      </div>
                    </div>

                    {/* Message Content */}
                    {moderation.message && (
                      <div className="bg-muted/50 rounded-md p-4">
                        <div className="flex items-start gap-2">
                          <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium mb-1">
                              {t('settings.moderation.originalComment')}
                            </p>
                            <p className="text-sm text-foreground">{moderation.message.content}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Response Content (for response_approval) */}
                    {moderation.moderation_type === 'response_approval' &&
                      moderation.response_content && (
                        <div className="bg-primary/5 border border-primary/20 rounded-md p-4">
                          <div className="flex items-start gap-2">
                            <Send className="h-4 w-4 text-primary mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm font-medium mb-1 text-primary">
                                {t('settings.moderation.generatedResponse')}
                              </p>
                              <p className="text-sm text-foreground">
                                {moderation.response_content}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                    {/* Rejection Reason */}
                    {moderation.status === 'rejected' && moderation.rejection_reason && (
                      <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
                        <p className="text-sm font-medium text-destructive mb-1">
                          {t('settings.moderation.rejectionReason')}
                        </p>
                        <p className="text-sm text-foreground">{moderation.rejection_reason}</p>
                      </div>
                    )}

                    {/* Actions */}
                    {isPending && (
                      <div className="flex items-end gap-3 pt-4 border-t border-border">
                        {moderation.moderation_type === 'response_approval' && (
                          <div className="flex-1">
                            <Label className="text-sm font-medium mb-2 block">
                              {t('settings.moderation.rejectionReasonLabel')}
                            </Label>
                            <Textarea
                              value={rejectionReason[moderation.id] || ''}
                              onChange={e =>
                                setRejectionReason(prev => ({
                                  ...prev,
                                  [moderation.id]: e.target.value,
                                }))
                              }
                              placeholder={t('settings.moderation.rejectionReasonPlaceholder')}
                              className="min-h-20"
                            />
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          {moderation.moderation_type === 'response_approval' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRegenerateResponse(moderation)}
                              disabled={isProcessingThis}
                            >
                              <RefreshCw
                                className={`h-4 w-4 mr-2 ${isProcessingThis ? 'animate-spin' : ''}`}
                              />
                              {t('settings.moderation.actions.regenerate')}
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReject(moderation)}
                            disabled={isProcessingThis}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            {t('settings.moderation.actions.reject')}
                          </Button>

                          <Button
                            size="sm"
                            onClick={() => handleApprove(moderation)}
                            disabled={isProcessingThis}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            {t('settings.moderation.actions.approve')}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Moderated By */}
                    {moderation.moderated_by && moderation.moderated_at && (
                      <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                        {moderation.status === 'approved'
                          ? t('settings.moderation.approvedBy', {
                              name: moderation.moderated_by.name,
                              date: new Date(moderation.moderated_at).toLocaleString(getFormattingLocale()),
                            })
                          : t('settings.moderation.rejectedBy', {
                              name: moderation.moderated_by.name,
                              date: new Date(moderation.moderated_at).toLocaleString(getFormattingLocale()),
                            })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {meta.total_pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadModerations(meta.page - 1)}
            disabled={meta.page === 1}
          >
            {t('settings.moderation.pagination.previous')}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t('settings.moderation.pagination.page', {
              current: meta.page,
              total: meta.total_pages,
            })}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadModerations(meta.page + 1)}
            disabled={meta.page >= meta.total_pages}
          >
            {t('settings.moderation.pagination.next')}
          </Button>
        </div>
      )}
    </div>
  );
}
