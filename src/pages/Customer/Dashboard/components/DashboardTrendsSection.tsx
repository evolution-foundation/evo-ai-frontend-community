import { BarChart3, Layers, TrendingUp } from 'lucide-react';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@evoapi/design-system';
import { AreaChartCard, BarChartCard, DonutChartCard } from '@/components/charts';
import type { CustomerDashboardResponse } from '@/types/analytics/dashboard';
import { formatCurrency } from './dashboardUtils';
import { useTranslation } from '@/hooks/useTranslation';
import { useLanguage } from '@/hooks/useLanguage';
import { TooltipInfo } from '@/components/base/TooltipInfo';

interface DashboardTrendsSectionProps {
  data: CustomerDashboardResponse;
  t: (key: string) => string;
  channelShareData: Array<{ name: string; value: number; color: string }>;
}

const DashboardTrendsSection = ({ data, t, channelShareData }: DashboardTrendsSectionProps) => {
  const { t: tTours } = useTranslation('tours');
  const { currentLanguage } = useLanguage();
  const tx = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  const hasResultsData = data.trends.response_time_daily.length > 0;
  const responseTimeCardDescription = hasResultsData
    ? tx('dashboard.charts.sessionDescription', 'Média diária das sessões por dia')
    : tx('dashboard.charts.emptyState', 'Sem dados no período selecionado');

  const topChannel = data.channels[0];
  const top3Share = data.channels.slice(0, 3).reduce((sum, channel) => sum + channel.percentage, 0);
  const channelsRevenue = data.channels.reduce((sum, channel) => sum + channel.value, 0);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{tx('dashboard.sections.trends', 'Tendências no tempo')}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {tx('dashboard.sections.trendsSubtitle', 'Evolução da operação ao longo do período filtrado')}
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div data-tour="dashboard-trends-conversations" className="h-full">
          <AreaChartCard
            title={t('dashboard.charts.visitorsTrend') || 'Conversas por dia'}
            description={t('dashboard.charts.visitorsDescription') || 'Tendência diária de conversas no período'}
            data={data.trends.conversations_daily}
            icon={TrendingUp}
            color="#22c55e"
            gradientFrom="#22c55e"
            gradientTo="#10b981"
            valueFormatter={value => value.toFixed(0)}
            tooltip={{ title: tTours('dashboard.step9.title'), content: tTours('dashboard.step9.content') }}
          />
        </div>

        <div data-tour="dashboard-trends-response" className="h-full">
          <BarChartCard
            title={t('dashboard.charts.sessionDuration') || 'Tempo de 1ª resposta por dia'}
            description={responseTimeCardDescription}
            data={data.trends.response_time_daily}
            icon={BarChart3}
            color="#3b82f6"
            gradientFrom="#3b82f6"
            gradientTo="#8b5cf6"
            valueFormatter={value => `${Math.round(value)}s`}
            highlightMax
            tooltip={{ title: tTours('dashboard.step10.title'), content: tTours('dashboard.step10.content') }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div data-tour="dashboard-channel-participation" className="h-full">
          <DonutChartCard
            title={t('dashboard.charts.channelShare') || 'Participação por canal'}
            description={t('dashboard.charts.channelShareDescription') || 'Distribuição percentual de conversas por canal'}
            data={channelShareData}
            icon={Layers}
            gradientFrom="#ec4899"
            gradientTo="#8b5cf6"
            centerLabel={tx('dashboard.charts.channelsLabel', 'Canais')}
            centerValue={tx('dashboard.charts.shareLabel', 'Participação')}
            tooltip={{ title: tTours('dashboard.step11.title'), content: tTours('dashboard.step11.content') }}
          />
        </div>

        <Card data-tour="dashboard-channel-insights">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              {tx('dashboard.channels.insights', 'Insights de canais')}
              <TooltipInfo title={tTours('dashboard.step12.title')} content={tTours('dashboard.step12.content')} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-md border p-3 bg-muted/10 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm text-muted-foreground">{tx('dashboard.channels.topChannel', 'Canal líder')}</div>
                <div className="font-semibold">{topChannel?.name || '-'}</div>
              </div>
              <Badge variant="secondary">{topChannel?.percentage?.toFixed(2) || '0.00'}%</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-md border p-3 bg-muted/10">
                <div className="text-sm text-muted-foreground">{tx('dashboard.channels.concentration', 'Concentração Top 3')}</div>
                <div className="text-xl font-semibold">{top3Share.toFixed(2)}%</div>
              </div>
              <div className="rounded-md border p-3 bg-muted/10">
                <div className="text-sm text-muted-foreground">{tx('dashboard.channels.activeCount', 'Canais ativos')}</div>
                <div className="text-xl font-semibold">{data.channels.length}</div>
              </div>
            </div>

            <div className="rounded-md border p-3 bg-muted/10">
              <div className="text-sm text-muted-foreground">{tx('dashboard.channels.totalValue', 'Valor total por canais')}</div>
              <div className="text-xl font-semibold">{formatCurrency(channelsRevenue, currentLanguage)}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default DashboardTrendsSection;
