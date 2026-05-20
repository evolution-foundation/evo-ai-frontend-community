import { useState, useEffect } from 'react';
import { Button, Badge, Card, CardContent } from '@evoapi/design-system';
import { toast } from 'sonner';
import {
  X,
  Trash2,
  RefreshCw,
  Filter,
  Search,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  PauseCircle,
  Ban,
  User,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { journeyService } from '@/services';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useLanguage } from '@/hooks/useLanguage';

interface SessionsViewerProps {
  journeyId: string;
  journeyName: string;
  onClose: () => void;
}

interface JourneySession {
  id: string;
  journeyId: string;
  contactId: string;
  accountId: string;
  status: 'active' | 'waiting' | 'paused' | 'completed' | 'failed' | 'cancelled';
  currentNodeId?: string;
  variables: Record<string, any>;
  context?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  failedAt?: string;
  startedAt?: string;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  executionLogs: Array<{
    nodeId: string;
    nodeType: string;
    status: 'started' | 'completed' | 'failed';
    timestamp: string;
    executionTime?: number;
    result?: any;
    error?: string;
  }>;
}

export function SessionsViewer({ journeyId, journeyName, onClose }: SessionsViewerProps) {
  const { t } = useLanguage('journey');

  const getStatusConfig = () => ({
    active: {
      label: t('sessions.viewer.status.active'),
      icon: Activity,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20',
    },
    waiting: {
      label: t('sessions.viewer.status.waiting'),
      icon: Clock,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
    },
    paused: {
      label: t('sessions.viewer.status.paused'),
      icon: PauseCircle,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/20',
    },
    completed: {
      label: t('sessions.viewer.status.completed'),
      icon: CheckCircle,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
    },
    failed: {
      label: t('sessions.viewer.status.failed'),
      icon: XCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
    },
    cancelled: {
      label: t('sessions.viewer.status.cancelled'),
      icon: Ban,
      color: 'text-gray-500',
      bgColor: 'bg-gray-500/10',
      borderColor: 'border-gray-500/20',
    },
  });

  const statusConfig = getStatusConfig();
  const [sessions, setSessions] = useState<JourneySession[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<JourneySession | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchContact, setSearchContact] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const loadSessions = async () => {
    try {
      setLoading(true);
      const params: any = {
        page,
        pageSize,
      };

      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }

      if (searchContact.trim()) {
        params.contactId = searchContact.trim();
      }

      const [sessionsResponse, statsResponse] = await Promise.all([
        journeyService.getJourneySessions(journeyId, params),
        journeyService.getJourneySessionStats(journeyId),
      ]);

      setSessions(sessionsResponse.data.sessions || []);
      setTotal(sessionsResponse.data.total || 0);
      setStats(statsResponse.data);
    } catch (error) {
      console.error('Erro ao carregar sessões:', error);
      toast.error(t('sessions.viewer.messages.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, [journeyId, filterStatus, searchContact, page]);

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm(t('sessions.viewer.actions.confirmDelete'))) return;

    try {
      await journeyService.deleteJourneySession(journeyId, sessionId);
      toast.success(t('sessions.viewer.messages.deleteSuccess'));
      loadSessions();
    } catch (error) {
      console.error('Erro ao deletar sessão:', error);
      toast.error(t('sessions.viewer.messages.deleteError'));
    }
  };

  const handleCancelSession = async (sessionId: string) => {
    if (!confirm(t('sessions.viewer.actions.confirmCancel'))) return;

    try {
      await journeyService.cancelJourneySession(journeyId, sessionId);
      toast.success(t('sessions.viewer.messages.cancelSuccess'));
      loadSessions();
    } catch (error: any) {
      console.error('Erro ao cancelar sessão:', error);
      toast.error(error?.message || t('sessions.viewer.messages.cancelError'));
    }
  };

  const getStatusIcon = (status: string) => {
    const config = statusConfig[status as keyof ReturnType<typeof getStatusConfig>];
    const Icon = config?.icon || Activity;
    return <Icon className={`h-4 w-4 ${config?.color}`} />;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-sidebar w-full max-w-6xl h-[90vh] rounded-lg shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-sidebar-border">
          <div>
            <h2 className="text-xl font-semibold text-sidebar-foreground">{t('sessions.viewer.title')}</h2>
            <p className="text-sm text-sidebar-foreground/60 mt-1">{journeyName}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="p-6 border-b border-sidebar-border">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <Card className="bg-sidebar-accent">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-sidebar-foreground">{stats.total}</div>
                  <div className="text-xs text-sidebar-foreground/60 mt-1">{t('sessions.viewer.stats.total')}</div>
                </CardContent>
              </Card>
              <Card className="bg-green-500/10 border-green-500/20">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-green-500">{stats.byStatus.active}</div>
                  <div className="text-xs text-sidebar-foreground/60 mt-1">{t('sessions.viewer.stats.active')}</div>
                </CardContent>
              </Card>
              <Card className="bg-blue-500/10 border-blue-500/20">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-blue-500">{stats.byStatus.waiting}</div>
                  <div className="text-xs text-sidebar-foreground/60 mt-1">{t('sessions.viewer.stats.waiting')}</div>
                </CardContent>
              </Card>
              <Card className="bg-emerald-500/10 border-emerald-500/20">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-emerald-500">
                    {stats.byStatus.completed}
                  </div>
                  <div className="text-xs text-sidebar-foreground/60 mt-1">{t('sessions.viewer.stats.completed')}</div>
                </CardContent>
              </Card>
              <Card className="bg-red-500/10 border-red-500/20">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-red-500">{stats.byStatus.failed}</div>
                  <div className="text-xs text-sidebar-foreground/60 mt-1">{t('sessions.viewer.stats.failed')}</div>
                </CardContent>
              </Card>
              <Card className="bg-gray-500/10 border-gray-500/20">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-gray-500">{stats.byStatus.cancelled}</div>
                  <div className="text-xs text-sidebar-foreground/60 mt-1">{t('sessions.viewer.stats.cancelled')}</div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="p-6 border-b border-sidebar-border bg-sidebar-accent/50">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Status Filter */}
            <div className="flex items-center gap-2 flex-1">
              <Filter className="h-4 w-4 text-sidebar-foreground/60" />
              <select
                value={filterStatus}
                onChange={e => {
                  setFilterStatus(e.target.value);
                  setPage(1);
                }}
                className="flex-1 bg-sidebar border border-sidebar-border rounded-md px-3 py-2 text-sm text-sidebar-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">{t('sessions.viewer.filters.allStatus')}</option>
                <option value="active">{t('sessions.viewer.status.active')}</option>
                <option value="waiting">{t('sessions.viewer.status.waiting')}</option>
                <option value="paused">{t('sessions.viewer.status.paused')}</option>
                <option value="completed">{t('sessions.viewer.status.completed')}</option>
                <option value="failed">{t('sessions.viewer.status.failed')}</option>
                <option value="cancelled">{t('sessions.viewer.status.cancelled')}</option>
              </select>
            </div>

            {/* Contact Search */}
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4 text-sidebar-foreground/60" />
              <input
                type="text"
                value={searchContact}
                onChange={e => {
                  setSearchContact(e.target.value);
                  setPage(1);
                }}
                placeholder={t('sessions.viewer.filters.searchPlaceholder')}
                className="flex-1 bg-sidebar border border-sidebar-border rounded-md px-3 py-2 text-sm text-sidebar-foreground placeholder:text-sidebar-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Refresh Button */}
            <Button variant="outline" size="sm" onClick={() => loadSessions()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {t('sessions.viewer.filters.refresh')}
            </Button>
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && sessions.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-sidebar-foreground/40" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-sidebar-foreground/60">
              <Activity className="h-12 w-12 mb-4 opacity-40" />
              <p>{t('sessions.viewer.list.noSessions')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map(session => {
                const config = statusConfig[session.status];
                return (
                  <Card
                    key={session.id}
                    className={`hover:shadow-md transition-shadow cursor-pointer ${config.borderColor}`}
                    onClick={() => setSelectedSession(session)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${config.bgColor}`}>
                              {getStatusIcon(session.status)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sidebar-foreground">
                                  {config.label}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {session.id.slice(0, 8)}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-sidebar-foreground/60 mt-1">
                                <User className="h-3 w-3" />
                                <span>{t('sessions.viewer.list.contact')}: {session.contactId.slice(0, 8)}...</span>
                                <span>•</span>
                                <span>
                                  {formatDistanceToNow(new Date(session.createdAt), {
                                    addSuffix: true,
                                    locale: ptBR,
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>

                          {session.errorMessage && (
                            <div className="flex items-start gap-2 p-2 bg-red-500/10 rounded-md text-xs text-red-600 dark:text-red-400">
                              <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              <span className="flex-1">{session.errorMessage}</span>
                            </div>
                          )}

                          {session.currentNodeId && (
                            <div className="text-xs text-sidebar-foreground/60">
                              {t('sessions.viewer.list.currentNode')}: <span className="font-mono">{session.currentNodeId}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-4 text-xs text-sidebar-foreground/60">
                            <span>{t('sessions.viewer.list.logs')}: {session.executionLogs?.length || 0}</span>
                            <span>
                              {t('sessions.viewer.list.retries')}: {session.retryCount}/{session.maxRetries}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          {(session.status === 'active' || session.status === 'waiting') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={e => {
                                e.stopPropagation();
                                handleCancelSession(session.id);
                              }}
                              className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 dark:hover:bg-yellow-950"
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={e => {
                              e.stopPropagation();
                              handleDeleteSession(session.id);
                            }}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <ChevronRight className="h-5 w-5 text-sidebar-foreground/40" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {total > pageSize && (
          <div className="border-t border-sidebar-border p-4 flex items-center justify-between">
            <div className="text-sm text-sidebar-foreground/60">
              {t('sessions.viewer.pagination.showing', {
                from: (page - 1) * pageSize + 1,
                to: Math.min(page * pageSize, total),
                total,
              })}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                {t('sessions.viewer.pagination.previous')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page * pageSize >= total}
                onClick={() => setPage(p => p + 1)}
              >
                {t('sessions.viewer.pagination.next')}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Session Details Modal (opcional - pode expandir depois) */}
      {selectedSession && (
        <div
          className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4"
          onClick={() => setSelectedSession(null)}
        >
          <Card
            className="w-full max-w-2xl max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">{t('sessions.viewer.details.title')}</h3>
                <Button variant="ghost" size="sm" onClick={() => setSelectedSession(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-sidebar-foreground/60">{t('sessions.viewer.details.status')}</label>
                  <div className="mt-1">
                    <Badge className={statusConfig[selectedSession.status].bgColor}>
                      {statusConfig[selectedSession.status].label}
                    </Badge>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-sidebar-foreground/60">
                    {t('sessions.viewer.details.sessionId')}
                  </label>
                  <div className="mt-1 font-mono text-sm">{selectedSession.id}</div>
                </div>

                <div>
                  <label className="text-sm font-medium text-sidebar-foreground/60">
                    {t('sessions.viewer.details.contactId')}
                  </label>
                  <div className="mt-1 font-mono text-sm">{selectedSession.contactId}</div>
                </div>

                {selectedSession.executionLogs && selectedSession.executionLogs.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-sidebar-foreground/60 mb-2 block">
                      {t('sessions.viewer.details.executionLogs')} ({selectedSession.executionLogs.length})
                    </label>
                    <div className="space-y-2 max-h-60 overflow-y-auto bg-sidebar-accent rounded-lg p-3">
                      {selectedSession.executionLogs.map((log, index) => (
                        <div
                          key={index}
                          className="text-xs p-2 bg-sidebar rounded border border-sidebar-border"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-primary">{log.nodeId}</span>
                            <Badge
                              variant={
                                log.status === 'completed'
                                  ? 'default'
                                  : log.status === 'failed'
                                  ? 'destructive'
                                  : 'secondary'
                              }
                              className="text-xs"
                            >
                              {log.status}
                            </Badge>
                          </div>
                          <div className="text-sidebar-foreground/60">
                            {log.nodeType} •{' '}
                            {formatDistanceToNow(new Date(log.timestamp), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </div>
                          {log.error && (
                            <div className="mt-1 text-red-600 dark:text-red-400">{log.error}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedSession.variables && Object.keys(selectedSession.variables).length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-sidebar-foreground/60 mb-2 block">
                      {t('sessions.viewer.details.variables')}
                    </label>
                    <pre className="text-xs bg-sidebar-accent p-3 rounded-lg overflow-auto max-h-40">
                      {JSON.stringify(selectedSession.variables, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
