import React, { useState } from 'react';
import { Button } from '@evoapi/design-system/button';
import { Check, Filter } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@evoapi/design-system/popover';
import { useLanguage } from '@/hooks/useLanguage';

interface StatusFilterProps {
  currentStatus: string[];
  onStatusChange: (status: string[]) => void;
  disabled?: boolean;
}

const StatusFilter: React.FC<StatusFilterProps> = ({
  currentStatus,
  onStatusChange,
  disabled = false,
}) => {
  const { t } = useLanguage('chat');
  const [open, setOpen] = useState(false);

  const STATUS_OPTIONS = [
    {
      value: 'all',
      label: t("contactSidebar.filters.status.options.all"),
      color: 'text-gray-700',
      count: null, // Será implementado depois
    },
    {
      value: 'open',
      label: t("contactSidebar.filters.status.options.open"),
      color: 'text-green-700',
      count: null,
    },
    {
      value: 'pending',
      label: t("contactSidebar.filters.status.options.pending"),
      color: 'text-yellow-700',
      count: null,
    },
    {
      value: 'resolved',
      label: t("contactSidebar.filters.status.options.resolved"),
      color: 'text-blue-700',
      count: null,
    },
    {
      value: 'snoozed',
      label: t("contactSidebar.filters.status.options.snoozed"),
      color: 'text-gray-700',
      count: null,
    },
  ];

  const handleStatusToggle = (statusValue: string) => {
    if (statusValue === 'all') {
      // Se selecionar "Todas", limpar outros filtros
      onStatusChange(['all']);
    } else {
      // Remove "all" se existir e toggle o status específico
      const newStatus = currentStatus.filter(s => s !== 'all');

      if (newStatus.includes(statusValue)) {
        // Remove se já selecionado
        const updated = newStatus.filter(s => s !== statusValue);
        onStatusChange(updated.length === 0 ? ['all'] : updated);
      } else {
        // Adiciona se não selecionado
        onStatusChange([...newStatus, statusValue]);
      }
    }
  };

  const isSelected = (statusValue: string) => {
    return currentStatus.includes(statusValue);
  };

  // const getDisplayLabel = () => {
  //   if (currentStatus.includes('all') || currentStatus.length === 0) {
  //     return 'Todas';
  //   }
  //   if (currentStatus.length === 1) {
  //     const selected = STATUS_OPTIONS.find(opt => opt.value === currentStatus[0]);
  //     return selected?.label || 'Status';
  //   }
  //   return `${currentStatus.length} status`;
  // };

  const hasActiveFilter = !currentStatus.includes('all') && currentStatus.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-6 w-6 p-0 relative ${
            hasActiveFilter ? 'text-primary' : 'text-muted-foreground'
          }`}
          disabled={disabled}
        >
          <Filter className={`h-4 w-4 ${disabled ? 'animate-spin' : ''}`} />
          {hasActiveFilter && !disabled && (
            <span className="absolute -top-1 -right-1 h-2 w-2 bg-primary rounded-full" />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-48 p-2" align="start">
        <div className="space-y-1">
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            {t("contactSidebar.filters.status.title")}
          </div>
          {STATUS_OPTIONS.map(option => (
            <button
              key={option.value}
              onClick={() => handleStatusToggle(option.value)}
              className="flex items-center w-full px-2 py-2 text-sm rounded hover:bg-muted transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 flex-1">
                <span className={`text-sm ${option.color}`}>{option.label}</span>
                {option.count !== null && (
                  <span className="text-xs text-muted-foreground">({option.count})</span>
                )}
              </div>
              {isSelected(option.value) && <Check className="h-4 w-4 text-primary" />}
            </button>
          ))}
        </div>

        {hasActiveFilter && (
          <div className="border-t mt-2 pt-2">
            <button
              onClick={() => onStatusChange(['all'])}
              className="w-full text-xs text-muted-foreground hover:text-foreground px-2 py-1 text-left cursor-pointer"
            >
              {t("contactSidebar.filters.status.clearFilters")}
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default StatusFilter;
