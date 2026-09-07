import i18n from '@/i18n/config';
import { useTranslation as useUiTranslation } from 'react-i18next';
import { Fragment } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, Button } from '@evoapi/design-system';
import { useState } from 'react';
import { TooltipInfo } from '@/components/base/TooltipInfo';

interface OperationHeatmapData {
  timezone: string;
  days: Array<{ day_index: number; day_label: string; date: string; weekday_index: number; weekday_label: string }>;
  hours: number[];
  cells: Array<{ day_index: number; day_label: string; date: string; hour: number; conversations: number }>;
  max_value: number;
  peak_slot: { day_index: number; day_label: string; date: string | null; hour: number; conversations: number };
  peak_day_of_week: { day_index: number; day_label: string; conversations: number };
  peak_hour: { hour: number; conversations: number };
}

interface OperationHeatmapCardProps {
  title: string;
  description?: string;
  data: OperationHeatmapData;
  peakDayInPeriod?: { date: string | null; conversations: number };
  labels?: {
    peakSlot?: string;
    peakWeekday?: string;
    peakHour?: string;
    peakPeriodDay?: string;
    conversations?: string;
    timezone?: string;
    expand?: string;
    collapse?: string;
    showing?: string;
  };
  tooltip?: {
    title: string;
    content: string;
  };
}

const toHourLabel = (hour: number) => `${String(hour).padStart(2, '0')}h`;

const formatDateLabel = (date: string | null) => {
  if (!date) return '-';
  const [year, month, day] = date.split('-');
  if (!year || !month || !day) return date;
  return `${day}/${month}`;
};

const cellColor = (value: number, maxValue: number) => {
  if (maxValue <= 0 || value <= 0) return 'rgba(100, 116, 139, 0.12)';
  const ratio = value / maxValue;
  const alpha = Math.min(0.95, 0.16 + ratio * 0.84);
  return `rgba(34, 197, 94, ${alpha})`;
};

const OperationHeatmapCard = ({
  title,
  description,
  data,
  peakDayInPeriod,
  labels,
  tooltip,
}: OperationHeatmapCardProps) => {
  const { t: tUi } = useUiTranslation();
  const [expanded, setExpanded] = useState(false);
  const byKey = new Map<string, number>();
  data.cells.forEach(cell => {
    byKey.set(`${cell.day_index}-${cell.hour}`, cell.conversations);
  });
  const visibleDays = expanded ? data.days : data.days.slice(-15);
  const hasMoreThanDefaultDays = data.days.length > 15;
  const showingText =
    labels?.showing ||
    i18n.t("interface:messages.visibleDays", { visible: visibleDays.length, total: data.days.length });

  return (
    <Card>
      <CardHeader className="pb-2" data-tour="dashboard-heatmap">
        <CardTitle className="flex items-center gap-2 text-lg">
          {title}
          {tooltip && <TooltipInfo title={tooltip.title} content={tooltip.content} />}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto">
          <div
            className="grid gap-1 min-w-[760px]"
            style={{ gridTemplateColumns: '72px repeat(24, minmax(20px, 1fr))' }}
          >
            <div />
            {data.hours.map(hour => (
              <div key={`hour-${hour}`} className="text-[10px] text-muted-foreground text-center">
                {hour % 2 === 0 ? toHourLabel(hour) : ''}
              </div>
            ))}

            {visibleDays.map(day => (
              <Fragment key={`row-${day.day_index}`}>
                <div className="text-xs text-muted-foreground pr-2 flex items-center">
                  {day.day_label}
                </div>
                {data.hours.map(hour => {
                  const value = byKey.get(`${day.day_index}-${hour}`) || 0;
                  return (
                    <div
                      key={`cell-${day.day_index}-${hour}`}
                      className="h-5 rounded-sm border border-border/30"
                      style={{ backgroundColor: cellColor(value, data.max_value) }}
                      title={`${day.day_label} ${toHourLabel(hour)}: ${value} ${labels?.conversations || tUi("customerDashboard:dashboard.agents.conversations")}`}
                    />
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>

        {hasMoreThanDefaultDays && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {showingText
                .replace('{shown}', String(visibleDays.length))
                .replace('{total}', String(data.days.length))}
            </span>
            <Button variant="outline" size="sm" onClick={() => setExpanded(prev => !prev)}>
              {expanded
                ? (labels?.collapse || tUi("customerDashboard:dashboard.charts.heatmapCollapse"))
                : (labels?.expand || tUi("customerDashboard:dashboard.charts.heatmapExpand"))}
            </Button>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">
            {labels?.peakSlot || tUi("customerDashboard:dashboard.charts.heatmapPeakSlot")}: {data.peak_slot.day_label} {toHourLabel(data.peak_slot.hour)} ({data.peak_slot.conversations})
          </Badge>
          <Badge variant="secondary">
            {labels?.peakWeekday || tUi("customerDashboard:dashboard.charts.heatmapPeakWeekday")}: {data.peak_day_of_week.day_label} ({data.peak_day_of_week.conversations})
          </Badge>
          <Badge variant="secondary">
            {labels?.peakHour || tUi("customerDashboard:dashboard.charts.heatmapPeakHour")}: {toHourLabel(data.peak_hour.hour)} ({data.peak_hour.conversations})
          </Badge>
          <Badge variant="secondary">
            {labels?.peakPeriodDay || tUi("customerDashboard:dashboard.charts.heatmapPeakPeriodDay")}: {formatDateLabel(peakDayInPeriod?.date || null)} ({peakDayInPeriod?.conversations || 0})
          </Badge>
          <Badge variant="outline">
            {labels?.timezone || i18n.t('interface:fallbacks.timeZone')}: {data.timezone}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default OperationHeatmapCard;
