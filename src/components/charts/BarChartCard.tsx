import { getFormattingLocale } from '@/lib/formattingLocale';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@evoapi/design-system';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { LucideIcon } from 'lucide-react';
import { TooltipInfo } from '@/components/base/TooltipInfo';

interface BarChartCardProps {
  title: string;
  description?: string;
  data: Array<{ name: string; value: number }>;
  icon?: LucideIcon;
  color?: string;
  gradientFrom?: string;
  gradientTo?: string;
  valueFormatter?: (value: number) => string;
  highlightMax?: boolean;
  tooltip?: {
    title: string;
    content: string;
  };
}

const toChartId = (value: string) =>
  (value || 'chart')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const BarChartCard = ({
  title,
  description,
  data,
  icon: Icon,
  color = '#3b82f6',
  gradientFrom = '#3b82f6',
  gradientTo = '#8b5cf6',
  valueFormatter = (value) => value.toLocaleString(getFormattingLocale()),
  highlightMax = true,
  tooltip,
}: BarChartCardProps) => {
  const maxValue = data.length > 0 ? Math.max(...data.map(d => d.value)) : 0;
  const chartId = toChartId(title);
  const barGradientId = `bar-gradient-${chartId}`;
  const barGradientHighlightId = `bar-gradient-highlight-${chartId}`;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-sm border-2 border-primary/20 rounded-lg p-3 shadow-xl">
          <p className="text-sm font-medium text-foreground">{payload[0].payload.name}</p>
          <p className="text-lg font-bold" style={{ color }}>
            {valueFormatter(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          {Icon && (
            <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          {title}
          {tooltip && <TooltipInfo title={tooltip.title} content={tooltip.content} />}
        </CardTitle>
        {description && (
          <CardDescription className="mt-1">{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="pt-4">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id={barGradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={gradientFrom} stopOpacity={1} />
                <stop offset="100%" stopColor={gradientTo} stopOpacity={0.8} />
              </linearGradient>
              <linearGradient id={barGradientHighlightId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
                <stop offset="100%" stopColor="#f97316" stopOpacity={0.8} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.1} />
            <XAxis
              dataKey="name"
              stroke="#888"
              fontSize={12}
              tickLine={false}
            />
            <YAxis
              stroke="#888"
              fontSize={12}
              tickLine={false}
              tickFormatter={valueFormatter}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="value"
              radius={[8, 8, 0, 0]}
              animationDuration={1000}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={highlightMax && entry.value === maxValue
                    ? `url(#${barGradientHighlightId})`
                    : `url(#${barGradientId})`
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default BarChartCard;
