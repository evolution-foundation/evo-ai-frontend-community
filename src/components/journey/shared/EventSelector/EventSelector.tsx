import { useMemo, useState, useId } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@evoapi/design-system';
import {
  EVENT_CATEGORIES,
  getEventCatalog,
  getEvent,
  isCustomEvent,
  type EventCategory,
  type EventCatalogEntry,
} from '@/lib/events-manifest';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';

export interface EventSelectorChange {
  eventName: string;
  isCustom: boolean;
}

export interface EventSelectorProps {
  value?: string;
  onChange: (change: EventSelectorChange) => void;
  filterByEventType?: EventCategory[];
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function EventSelector({
  value,
  onChange,
  filterByEventType,
  disabled,
  placeholder,
  className,
}: EventSelectorProps) {
  const { t, currentLanguage } = useLanguage('events');
  const id = useId();
  const [open, setOpen] = useState(false);

  const visibleCategories = filterByEventType ?? EVENT_CATEGORIES;

  const grouped = useMemo(() => {
    const catalog = getEventCatalog();
    return visibleCategories
      .map((category) => ({
        category,
        items: catalog.filter((e) => e.category === category),
      }))
      .filter((group) => group.items.length > 0);
  }, [visibleCategories]);

  const selected = value ? getEvent(value) : undefined;
  const triggerLabel = selected
    ? selectedLabel(selected, currentLanguage)
    : (placeholder ?? t('selector.placeholder'));

  const handleSelect = (eventName: string) => {
    onChange({ eventName, isCustom: isCustomEvent(eventName) });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          disabled={disabled}
          className={cn('w-full justify-between font-normal', className)}
        >
          <span className={cn(!selected && 'text-muted-foreground')}>{triggerLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={t('selector.searchPlaceholder')} />
          <CommandList>
            <CommandEmpty>{t('selector.noResults')}</CommandEmpty>
            {grouped.map((group, index) => (
              <CommandGroupSection
                key={group.category}
                category={group.category}
                items={group.items}
                value={value}
                onSelect={handleSelect}
                showSeparatorBefore={index > 0}
                currentLanguage={currentLanguage}
                t={t}
              />
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function CommandGroupSection({
  category,
  items,
  value,
  onSelect,
  showSeparatorBefore,
  currentLanguage,
  t,
}: {
  category: EventCategory;
  items: EventCatalogEntry[];
  value?: string;
  onSelect: (eventName: string) => void;
  showSeparatorBefore: boolean;
  currentLanguage: string;
  t: (key: string) => string;
}) {
  return (
    <>
      {showSeparatorBefore && <CommandSeparator />}
      <CommandGroup heading={t(`categories.${category}`)}>
        {items.map((item) => (
          <CommandItem
            key={item.eventName}
            value={`${item.category} ${item.eventName} ${item.labelEn} ${item.labelPt}`}
            onSelect={() => onSelect(item.eventName)}
          >
            <Check
              className={cn(
                'mr-2 h-4 w-4',
                value === item.eventName ? 'opacity-100' : 'opacity-0',
              )}
            />
            <div className="flex flex-col">
              <span>{selectedLabel(item, currentLanguage)}</span>
              <span className="text-xs text-muted-foreground">{item.description}</span>
            </div>
          </CommandItem>
        ))}
      </CommandGroup>
    </>
  );
}

function selectedLabel(entry: EventCatalogEntry, currentLanguage: string): string {
  return currentLanguage === 'en' ? entry.labelEn : entry.labelPt;
}
