import { Clock, MessageSquare, Bot, CheckCircle2, AlertTriangle, UserX, Users } from 'lucide-react';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@evoapi/design-system';
import type { CustomerDashboardResponse } from '@/types/analytics/dashboard';
import DashboardMetricCard from './DashboardMetricCard';
import { formatSeconds } from './dashboardUtils';
import { useTranslation } from '@/hooks/useTranslation';
import { TooltipInfo } from '@/components/base/TooltipInfo';

interface DashboardMetricsSectionProps {
  data: CustomerDashboardResponse;
  t: (key: string) => string;
}

const DashboardMetricsSection = ({ data, t }: DashboardMetricsSectionProps) => {
  const { t: tTours } = useTranslation('tours');

  const responseStatus = data.stats.avg_first_response_time_seconds <= 60
    ? { label: t('dashboard.status.good'), tone: 'good' as const }
    : data.stats.avg_first_response_time_seconds <= 180
      ? { label: t('dashboard.status.warning'), tone: 'warning' as const }
      : { label: t('dashboard.status.critical'), tone: 'critical' as const };

  const csatStatus = data.csat.total_responses === 0
    ? { label: t('dashboard.status.noSample'), tone: 'neutral' as const }
    : data.csat.avg_rating >= 4
      ? { label: t('dashboard.status.good'), tone: 'good' as const }
      : data.csat.avg_rating >= 3
        ? { label: t('dashboard.status.warning'), tone: 'warning' as const }
        : { label: t('dashboard.status.critical'), tone: 'critical' as const };

  const followUpStatus = data.follow_ups.pending === 0
    ? { label: t('dashboard.status.good'), tone: 'good' as const }
    : data.follow_ups.pending <= 10
      ? { label: t('dashboard.status.warning'), tone: 'warning' as const }
      : { label: t('dashboard.status.critical'), tone: 'critical' as const };

  const unassignedStatus = data.stats.unassigned_conversations === 0
    ? { label: t('dashboard.status.good'), tone: 'good' as const }
    : data.stats.unassigned_conversations <= 5
      ? { label: t('dashboard.status.warning'), tone: 'warning' as const }
      : { label: t('dashboard.status.critical'), tone: 'critical' as const };
  const hasAiVsHumanSample = (data.ai_vs_human.ai_messages_count + data.ai_vs_human.human_messages_count) > 0;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t('dashboard.sections.statusNow')}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t('dashboard.sections.statusNowSubtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div data-tour="dashboard-messages-card" className="h-full">
          <DashboardMetricCard
            title={t('dashboard.stats.incomingMessages')}
            value={data.stats.incoming_messages_count}
            subtitle={`${data.stats.outgoing_messages_count} ${t('dashboard.stats.sent')}`}
            icon={MessageSquare}
            accentClassName="bg-fuchsia-500/20 text-fuchsia-400"
            importance="primary"
            status={{
              label: t('dashboard.status.volume'),
              tone: 'neutral',
            }}
            tooltip={{ title: tTours('dashboard.step2.title'), content: tTours('dashboard.step2.content') }}
          />
        </div>

        <div data-tour="dashboard-response-time-card" className="h-full">
          <DashboardMetricCard
            title={t('dashboard.stats.avgResponseTime')}
            value={formatSeconds(data.stats.avg_first_response_time_seconds)}
            subtitle={t('dashboard.stats.realData')}
            icon={Clock}
            accentClassName="bg-emerald-500/20 text-emerald-400"
            importance="primary"
            status={responseStatus}
            tooltip={{ title: tTours('dashboard.step3.title'), content: tTours('dashboard.step3.content') }}
          />
        </div>

        <div data-tour="dashboard-csat-card" className="h-full">
          <DashboardMetricCard
            title={t('dashboard.csat.avg')}
            value={`${data.csat.avg_rating.toFixed(2)} / 5`}
            subtitle={`${data.csat.total_responses} ${t('dashboard.csat.responses')}`}
            icon={CheckCircle2}
            accentClassName="bg-violet-500/20 text-violet-400"
            importance="primary"
            status={csatStatus}
            tooltip={{ title: tTours('dashboard.step4.title'), content: tTours('dashboard.step4.content') }}
          />
        </div>

        <div data-tour="dashboard-followups-card" className="h-full">
          <DashboardMetricCard
            title={t('dashboard.stats.followUpsPending')}
            value={data.follow_ups.pending}
            subtitle={`${data.follow_ups.overdue} ${t('dashboard.status.overdue')}`}
            icon={AlertTriangle}
            accentClassName="bg-amber-500/20 text-amber-400"
            importance="primary"
            status={followUpStatus}
            tooltip={{ title: tTours('dashboard.step5.title'), content: tTours('dashboard.step5.content') }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <Card className="xl:col-span-7 border-primary/20 bg-primary/[0.02]" data-tour="dashboard-ia-vs-human">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              {t('dashboard.aiVsHuman.title')}
              <TooltipInfo title={tTours('dashboard.step6.title')} content={tTours('dashboard.step6.content')} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!hasAiVsHumanSample && (
              <div className="rounded-md border border-dashed border-muted-foreground/30 bg-muted/10 p-3 text-sm text-muted-foreground">
                {t('dashboard.aiVsHuman.noDataHint')}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('dashboard.aiVsHuman.aiShare')}</span>
                  <span className="font-semibold">{data.ai_vs_human.ai_messages_share}%</span>
                </div>
                <div className="h-2 rounded bg-muted overflow-hidden">
                  <div className="h-2 bg-indigo-500" style={{ width: `${data.ai_vs_human.ai_messages_share}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {data.ai_vs_human.ai_messages_count} {t('dashboard.aiVsHuman.responses')}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('dashboard.aiVsHuman.humanShare')}</span>
                  <span className="font-semibold">{data.ai_vs_human.human_messages_share}%</span>
                </div>
                <div className="h-2 rounded bg-muted overflow-hidden">
                  <div className="h-2 bg-sky-500" style={{ width: `${data.ai_vs_human.human_messages_share}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {data.ai_vs_human.human_messages_count} {t('dashboard.aiVsHuman.responsesHuman')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="rounded-md border p-3 bg-muted/10">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Bot className="h-4 w-4" />
                  {t('dashboard.aiVsHuman.aiFirstResponse')}
                </div>
                <div className="text-xl font-semibold mt-1">
                  {formatSeconds(data.ai_vs_human.avg_first_response_time_ai_seconds)}
                </div>
              </div>

              <div className="rounded-md border p-3 bg-muted/10">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {t('dashboard.aiVsHuman.humanFirstResponse')}
                </div>
                <div className="text-xl font-semibold mt-1">
                  {formatSeconds(data.ai_vs_human.avg_first_response_time_human_seconds)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="xl:col-span-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4">
          <Card className="border-dashed border-amber-500/40 bg-amber-500/[0.03]" data-tour="dashboard-active-conversations">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-amber-400" />
                {t('dashboard.stats.activeConversations')}
                <TooltipInfo title={tTours('dashboard.step7.title')} content={tTours('dashboard.step7.content')} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-semibold">{data.stats.open_conversations}</div>
                <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10">
                  {data.stats.open_conversations > 0
                    ? t('dashboard.status.monitor')
                    : t('dashboard.status.good')}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {t('dashboard.status.currentBacklog')}
              </p>
            </CardContent>
          </Card>

          <Card className="border-dashed border-rose-500/40 bg-rose-500/[0.03]" data-tour="dashboard-unassigned">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <UserX className="h-4 w-4 text-rose-400" />
                {t('dashboard.stats.unassignedConversations')}
                <TooltipInfo title={tTours('dashboard.step8.title')} content={tTours('dashboard.step8.content')} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-semibold">{data.stats.unassigned_conversations}</div>
                <Badge
                  variant="outline"
                  className={
                    unassignedStatus.tone === 'critical'
                      ? 'border-red-500/40 text-red-700 dark:text-red-300 bg-red-500/10'
                      : unassignedStatus.tone === 'warning'
                        ? 'border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10'
                        : 'border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10'
                  }
                >
                  {unassignedStatus.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {data.stats.pending_conversations} {t('dashboard.status.pendingNow')}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default DashboardMetricsSection;
