import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BaseStatsCardProps {
  /** Título do card */
  title: string;
  /** Valor principal a ser exibido */
  value: string | number;
  /** Ícone do card */
  icon: LucideIcon;
  /** Cor do tema do card */
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'yellow' | 'pink' | 'indigo' | 'gray';
  /** Valor anterior para mostrar comparação (opcional) */
  previousValue?: number;
  /** Formato do valor */
  valueFormat?: 'number' | 'currency' | 'percentage' | 'custom';
  /** Moeda para formato currency */
  currency?: string;
  /** Se deve mostrar o card */
  show?: boolean;
  /** Sufixo customizado para o valor */
  suffix?: string;
  /** Classe CSS adicional */
  className?: string;
  /** Se o valor principal deve ter cor especial */
  valueColor?: string;
  /** Função onClick para tornar o card clicável */
  onClick?: () => void;
  /** Componente adicional no final do card */
  extra?: React.ReactNode;
}

const colorVariants = {
  blue: {
    bg: 'bg-blue-100 dark:bg-blue-900/50',
    text: 'text-blue-600 dark:text-blue-400',
  },
  green: {
    bg: 'bg-green-100 dark:bg-green-900/50',
    text: 'text-green-600 dark:text-green-400',
  },
  purple: {
    bg: 'bg-purple-100 dark:bg-purple-900/50',
    text: 'text-purple-600 dark:text-purple-400',
  },
  orange: {
    bg: 'bg-orange-100 dark:bg-orange-900/50',
    text: 'text-orange-600 dark:text-orange-400',
  },
  red: {
    bg: 'bg-red-100 dark:bg-red-900/50',
    text: 'text-red-600 dark:text-red-400',
  },
  yellow: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/50',
    text: 'text-yellow-600 dark:text-yellow-400',
  },
  pink: {
    bg: 'bg-pink-100 dark:bg-pink-900/50',
    text: 'text-pink-600 dark:text-pink-400',
  },
  indigo: {
    bg: 'bg-indigo-100 dark:bg-indigo-900/50',
    text: 'text-indigo-600 dark:text-indigo-400',
  },
  gray: {
    bg: 'bg-muted',
    text: 'text-muted-foreground',
  },
};

export default function BaseStatsCard({
  title,
  value,
  icon: Icon,
  color = 'blue',
  previousValue,
  valueFormat = 'number',
  currency = 'BRL',
  show = true,
  suffix,
  className,
  valueColor,
  onClick,
  extra,
}: BaseStatsCardProps) {
  // Não renderizar se show for false
  if (!show) return null;

  // Formatar valor baseado no tipo
  const formatValue = (val: string | number): string => {
    if (typeof val === 'string') return val;

    switch (valueFormat) {
      case 'currency':
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: currency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(val);
      
      case 'percentage':
        return `${val}%`;
      
      case 'number':
        return new Intl.NumberFormat('pt-BR').format(val);
      
      case 'custom':
        return val.toString() + (suffix || '');
      
      default:
        return val.toString();
    }
  };

  // Calcular diferença percentual se previousValue for fornecido
  const calculateChange = (): { percentage: number; isPositive: boolean } | null => {
    if (previousValue === undefined || typeof value !== 'number') return null;
    
    if (previousValue === 0) {
      return { percentage: value > 0 ? 100 : 0, isPositive: value >= 0 };
    }
    
    const percentage = ((value - previousValue) / previousValue) * 100;
    return { percentage: Math.abs(percentage), isPositive: percentage >= 0 };
  };

  const change = calculateChange();
  const colorScheme = colorVariants[color];

  return (
    <div 
      className={cn(
        "bg-card rounded-lg p-4 border transition-all duration-200",
        onClick && "cursor-pointer hover:shadow-md hover:border-primary/20",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center">
        {/* Ícone */}
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center mr-3",
          colorScheme.bg
        )}>
          <Icon className={cn("h-4 w-4", colorScheme.text)} />
        </div>

        {/* Conteúdo principal */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground mb-1">
            {title}
          </p>
          
          <div className="flex items-baseline gap-2">
            <p className={cn(
              "text-lg font-semibold truncate",
              valueColor || "text-foreground"
            )}>
              {formatValue(value)}
            </p>

            {/* Indicador de mudança */}
            {change && (
              <span className={cn(
                "text-xs font-medium px-1.5 py-0.5 rounded-full",
                change.isPositive 
                  ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                  : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
              )}>
                {change.isPositive ? '+' : '-'}{change.percentage.toFixed(1)}%
              </span>
            )}
          </div>
        </div>

        {/* Conteúdo extra */}
        {extra && (
          <div className="ml-2">
            {extra}
          </div>
        )}
      </div>
    </div>
  );
}