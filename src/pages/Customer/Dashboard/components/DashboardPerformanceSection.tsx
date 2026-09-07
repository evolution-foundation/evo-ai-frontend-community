import { useTranslation as useUiTranslation } from 'react-i18next';
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@evoapi/design-system';
import { Bot, Layers, TrendingUp, Users } from 'lucide-react';
import { OperationHeatmapCard } from '@/components/charts';
import type { CustomerDashboardResponse } from '@/types/analytics/dashboard';
import { formatCurrency, formatSeconds } from './dashboardUtils';
import { useTranslation } from '@/hooks/useTranslation';
import { TooltipInfo } from '@/components/base/TooltipInfo';

interface DashboardPerformanceSectionProps {
  data: CustomerDashboardResponse;
  t: (key: string) => string;
}

const DashboardPerformanceSection = ({ data, t }: DashboardPerformanceSectionProps) => {
  const { t: tUi } = useUiTranslation();
  const { t: tTours } = useTranslation('tours');

  const pipelineConversionRate = data.stats.total_conversations > 0
    ? ((data.pipeline.total / data.stats.total_conversations) * 100)
    : 0;
  const avgTicketValue = data.pipeline.total > 0 ? (data.pipeline.total_value / data.pipeline.total) : 0;
  const topValueChannels = [...data.channels].sort((a, b) => b.value - a.value).slice(0, 3);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t('dashboard.sections.optimization')}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t('dashboard.sections.optimizationSubtitle')}
        </p>
      </div>

      <OperationHeatmapCard
        title={t('dashboard.charts.heatmapTitle')}
        description={t('dashboard.charts.heatmapDescription')}
        data={data.trends.operation_heatmap}
        peakDayInPeriod={data.trends.peak_day_in_period}
        tooltip={{ title: tTours('dashboard.step13.title'), content: tTours('dashboard.step13.content') }}
        labels={{
          peakSlot: t('dashboard.charts.heatmapPeakSlot'),
          peakWeekday: t('dashboard.charts.heatmapPeakWeekday'),
          peakHour: t('dashboard.charts.heatmapPeakHour'),
          peakPeriodDay: t('dashboard.charts.heatmapPeakPeriodDay'),
          conversations: t('dashboard.channels.conversations'),
          timezone: t('dashboard.charts.timezone'),
          expand: t('dashboard.charts.heatmapExpand'),
          collapse: t('dashboard.charts.heatmapCollapse'),
          showing: t('dashboard.charts.heatmapShowing'),
        }}
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card data-tour="dashboard-csat-distribution">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              {t('dashboard.csat.breakdown')}
              <TooltipInfo title={tTours('dashboard.step14.title')} content={tTours('dashboard.step14.content')} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.csat.total_responses < 5 && (
              <div className="rounded-md border border-dashed border-muted-foreground/30 bg-muted/10 p-3 text-sm text-muted-foreground">
                {t('dashboard.csat.lowSampleHint')}
              </div>
            )}
            {data.csat.rating_breakdown.map(item => (
              <div key={`csat-${item.rating}`} className="flex items-center gap-3">
                <div className="w-10 text-sm font-medium">{item.rating}★</div>
                <div className="flex-1 h-2 rounded bg-muted overflow-hidden">
                  <div className="h-2 bg-primary" style={{ width: `${item.percentage}%` }} />
                </div>
                <div className="w-24 text-right text-sm text-muted-foreground">
                  {item.count} ({item.percentage}%)
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card data-tour="dashboard-funnel">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </div>
                  {t('dashboard.pipeline.title')}
                  <TooltipInfo title={tTours('dashboard.step15.title')} content={tTours('dashboard.step15.content')} />
                </CardTitle>
                <CardDescription className="mt-1">{t('dashboard.pipeline.subtitle')}</CardDescription>
              </div>
              <Badge variant="secondary" className="px-3 py-1">
                {data.pipeline.total} total
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
          {data.pipeline.stages.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              {t('dashboard.empty.pipelineInactive')}
            </div>
          ) : (
              <div className="space-y-6">
                {data.pipeline.stages.map((stage, index) => {
                  const percentage = data.pipeline.total > 0 ? (stage.count / data.pipeline.total) * 100 : 0;
                  const colors = ['bg-blue-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-violet-500', 'bg-purple-500'];
                  const color = colors[index % colors.length];

                  return (
                    <div key={stage.id || stage.name} className="group">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`h-3 w-3 rounded-full ${color}`} />
                          <span className="font-semibold text-base">{stage.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {stage.count} {t('dashboard.pipeline.opportunities')}
                          </Badge>
                        </div>
                        <span className="text-lg font-semibold">{formatCurrency(stage.value)}</span>
                      </div>
                      <div className="relative w-full bg-secondary/50 rounded-full h-3 overflow-hidden">
                        <div className={`${color} h-3 rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card data-tour="dashboard-funnel-summary">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              {t('dashboard.pipeline.insights')}
              <TooltipInfo title={tTours('dashboard.step16.title')} content={tTours('dashboard.step16.content')} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-md border p-3 bg-muted/10">
              <div className="text-sm text-muted-foreground">{t('dashboard.pipeline.conversionRate')}</div>
              <div className="text-xl font-semibold">{pipelineConversionRate.toFixed(2)}%</div>
            </div>
            <div className="rounded-md border p-3 bg-muted/10">
              <div className="text-sm text-muted-foreground">{t('dashboard.pipeline.avgTicket')}</div>
              <div className="text-xl font-semibold">{formatCurrency(avgTicketValue)}</div>
            </div>
            <div className="rounded-md border p-3 bg-muted/10">
              <div className="text-sm text-muted-foreground">{t('dashboard.pipeline.totalValue')}</div>
              <div className="text-xl font-semibold">{formatCurrency(data.pipeline.total_value)}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2" data-tour="dashboard-channel-performance">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center">
                <Layers className="h-4 w-4 text-muted-foreground" />
              </div>
              {t('dashboard.channels.title')}
              <TooltipInfo title={tTours('dashboard.step17.title')} content={tTours('dashboard.step17.content')} />
            </CardTitle>
            <CardDescription className="mt-1">{t('dashboard.channels.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            {data.channels.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                {t('dashboard.empty.channels')}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.channels.map(channel => (
                  <div key={channel.id || channel.name} className="flex items-center justify-between p-3 rounded-md border bg-muted/20">
                    <div>
                      <div className="font-semibold">{channel.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {channel.conversations} {t('dashboard.channels.conversations')} ({channel.percentage}%)
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{formatCurrency(channel.value)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card data-tour="dashboard-channels-value">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              {t('dashboard.channels.valueLeaders')}
              <TooltipInfo title={tTours('dashboard.step18.title')} content={tTours('dashboard.step18.content')} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topValueChannels.length === 0 ? (
              <div className="text-sm text-muted-foreground">-</div>
            ) : (
              topValueChannels.map(channel => (
                <div key={`value-${channel.id || channel.name}`} className="flex items-center justify-between rounded-md border p-3 bg-muted/10">
                  <div>
                    <div className="font-medium">{channel.name}</div>
                    <div className="text-xs text-muted-foreground">{channel.percentage}{tUi("interface:dashboardperformancesection.ofVolume")}</div>
                  </div>
                  <div className="font-semibold">{formatCurrency(channel.value)}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4">
          <Card data-tour="dashboard-agents-performance">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center">
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                {t('dashboard.agents.humanTitle')}
                <TooltipInfo title={tTours('dashboard.step19.title')} content={tTours('dashboard.step19.content')} />
              </CardTitle>
              <CardDescription className="mt-1">
                {t('dashboard.agents.humanSubtitle')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.agents.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  {t('dashboard.empty.agents')}
                </div>
              ) : (
                <div className="space-y-3">
                  {data.agents.slice(0, 5).map(agent => (
                    <div key={agent.id} className="flex items-center justify-between p-3 rounded-md border bg-muted/20">
                      <div>
                        <div className="font-semibold">{agent.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {agent.conversations} {t('dashboard.agents.conversations')} ({agent.percentage}%)
                        </div>
                      </div>
                      <div className="text-right min-w-[120px]">
                        <Badge variant="secondary" className="mb-1">{agent.availability_status}</Badge>
                        <div className="text-sm text-muted-foreground">{tUi("interface:dashboardperformancesection.firstReply")} {formatSeconds(agent.avg_first_response_time_seconds)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-tour="dashboard-ai-agents-performance">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center">
                  <Bot className="h-4 w-4 text-muted-foreground" />
                </div>
                {t('dashboard.agents.aiTitle')}
                <TooltipInfo title={tTours('dashboard.step20.title')} content={tTours('dashboard.step20.content')} />
              </CardTitle>
              <CardDescription className="mt-1">
                {t('dashboard.agents.aiSubtitle')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.ai_agents.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  {t('dashboard.agents.aiEmpty')}
                </div>
              ) : (
                <div className="space-y-3">
                  {data.ai_agents.slice(0, 5).map(agent => (
                    <div key={agent.id} className="flex items-center justify-between p-3 rounded-md border bg-muted/20">
                      <div>
                        <div className="font-semibold">{agent.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {agent.messages} {t('dashboard.agents.aiMessages')} ({agent.percentage}%)
                        </div>
                      </div>
                      <div className="text-right min-w-[120px]">
                        <div className="text-sm text-muted-foreground">
                          {agent.conversations} {t('dashboard.agents.conversations')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default DashboardPerformanceSection;
