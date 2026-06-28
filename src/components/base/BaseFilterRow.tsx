import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  Calendar,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Button,
} from '@evoapi/design-system';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

import { BaseFilter, FilterType } from '@/types/core';

interface BaseFilterRowProps<T extends BaseFilter> {
  filter: T;
  index: number;
  showQueryOperator: boolean;
  filterTypes: FilterType[];
  onUpdate: (index: number, field: keyof T, value: string | number | boolean) => void;
  onRemove: (index: number) => void;
  className?: string;
  translationNamespace?: string;
}

export default function BaseFilterRow<T extends BaseFilter>({
  filter,
  index,
  showQueryOperator,
  filterTypes,
  onUpdate,
  onRemove,
  className = '',
  translationNamespace = 'common',
}: BaseFilterRowProps<T>) {
  const { t } = useLanguage(translationNamespace);
  const { t: tCommon } = useLanguage('common');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const currentFilterType = filterTypes.find(ft => ft.attributeKey === filter.attributeKey);

  // Operator labels live either in the screen namespace (Contacts/Conversations)
  // or in the shared `common` namespace (other list screens). Resolve
  // namespace-first, then fall back to common so every screen shows a
  // translated operator instead of the raw key.
  const translateOperatorLabel = (label: string): string => {
    const fromNamespace = t(label);
    return fromNamespace === label ? tCommon(label) : fromNamespace;
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onUpdate(index, 'values' as keyof T, format(date, 'yyyy-MM-dd'));
      setCalendarOpen(false);
    }
  };

  const renderValueInput = () => {
    if (!currentFilterType) return null;

    const needsValueInput = !['is_present', 'is_not_present'].includes(filter.filterOperator);

    if (!needsValueInput) return null;

    switch (currentFilterType.inputType) {
      case 'date':
        return (
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal bg-sidebar border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent truncate min-w-0"
              >
                <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                <span className="truncate">
                  {filter.values
                    ? format(new Date(filter.values as string), 'dd/MM/yyyy', { locale: pt })
                    : tCommon('base.filter.selectDate')}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-sidebar border-sidebar-border" align="start">
              <Calendar
                mode="single"
                selected={filter.values ? new Date(filter.values as string) : undefined}
                onSelect={handleDateSelect}
                initialFocus
                className="bg-sidebar text-sidebar-foreground"
              />
            </PopoverContent>
          </Popover>
        );
      case 'search_select':
        return (
          <Select
            value={filter.values as string}
            onValueChange={value => onUpdate(index, 'values' as keyof T, value)}
          >
            <SelectTrigger className="w-full bg-sidebar border-sidebar-border text-sidebar-foreground truncate min-w-0">
              <SelectValue placeholder={tCommon('base.filter.selectOption')} className="truncate" />
            </SelectTrigger>
            <SelectContent className="bg-sidebar border-sidebar-border">
              {currentFilterType.options?.map(option => {
                // Check if label is a translation key (contains a dot, indicating namespace.key format)
                const isTranslationKey = typeof option.label === 'string' && option.label.includes('.');
                const displayLabel = isTranslationKey ? t(option.label) : option.label;
                return (
                  <SelectItem
                    key={option.value}
                    value={option.value.toString()}
                    className="text-sidebar-foreground focus:bg-sidebar-accent truncate"
                  >
                    {displayLabel}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        );
      case 'number':
        return (
          <Input
            type="number"
            value={filter.values as string}
            onChange={e => onUpdate(index, 'values' as keyof T, e.target.value)}
            placeholder={tCommon('base.filter.enterNumber')}
            className="w-full bg-sidebar border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/50 truncate min-w-0"
          />
        );
      default:
        return (
          <Input
            type="text"
            value={filter.values as string}
            onChange={e => onUpdate(index, 'values' as keyof T, e.target.value)}
            placeholder={tCommon('base.filter.enterValue')}
            className="w-full bg-sidebar border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/50 truncate min-w-0"
          />
        );
    }
  };

  return (
    <div
      className={`flex items-center gap-3 p-4 rounded-lg bg-sidebar-accent/30 border border-sidebar-border min-w-0 overflow-hidden ${className}`}
    >
      {/* Query Operator */}
      {showQueryOperator && (
        <div className="flex-shrink-0">
          <Select
            value={filter.queryOperator}
            onValueChange={(value: 'and' | 'or') =>
              onUpdate(index, 'queryOperator' as keyof T, value)
            }
          >
            <SelectTrigger className="w-20 bg-sidebar border-sidebar-border text-sidebar-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-sidebar border-sidebar-border">
              <SelectItem value="and" className="text-sidebar-foreground focus:bg-sidebar-accent">
                {tCommon('base.filter.and')}
              </SelectItem>
              <SelectItem value="or" className="text-sidebar-foreground focus:bg-sidebar-accent">
                {tCommon('base.filter.or')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Attribute */}
      <div className="min-w-0 flex-1">
        <Select
          value={filter.attributeKey}
          onValueChange={value => onUpdate(index, 'attributeKey' as keyof T, value)}
        >
          <SelectTrigger className="w-full bg-sidebar border-sidebar-border text-sidebar-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-sidebar border-sidebar-border">
            {filterTypes.map(filterType => (
              <SelectItem
                key={filterType.attributeKey}
                value={filterType.attributeKey}
                className="text-sidebar-foreground focus:bg-sidebar-accent"
              >
                {t(filterType.attributeI18nKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Operator */}
      <div className="min-w-0 flex-1">
        <Select
          value={filter.filterOperator}
          onValueChange={value => onUpdate(index, 'filterOperator' as keyof T, value)}
        >
          <SelectTrigger className="w-full bg-sidebar border-sidebar-border text-sidebar-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-sidebar border-sidebar-border">
            {currentFilterType?.filterOperators.map(operator => (
              <SelectItem
                key={operator.key}
                value={operator.key}
                className="text-sidebar-foreground focus:bg-sidebar-accent"
              >
                {translateOperatorLabel(operator.label)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Value */}
      <div className="flex-1 min-w-0">{renderValueInput()}</div>

      {/* Remove Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onRemove(index)}
        className="flex-shrink-0 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
