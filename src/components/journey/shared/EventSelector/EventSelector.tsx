import { useMemo, useState, useId } from 'react';
import {
  Check,
  ChevronsUpDown,
  User,
  MessageCircle,
  MessageSquare,
  Megaphone,
  ShoppingCart,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
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
  type EventDtoType,
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
  // Restrict to specific evo-flow DTO surfaces. Some screens accept only
  // 'track' events; others accept only 'identify'. Matches the card's
  // `filterByEventType?: EventType[]` requirement.
  filterByEventType?: EventDtoType[];
  // Restrict to specific UI categories (contact/message/...). Independent of
  // filterByEventType; both filters AND together when set.
  filterByCategory?: EventCategory[];
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  // Lets a caller pair its own <Label htmlFor> with the trigger. Omitted → the
  // generated id is used, as before.
  id?: string;
}

const CATEGORY_ICON: Record<EventCategory, LucideIcon> = {
  contact: User,
  conversation: MessageCircle,
  message: MessageSquare,
  campaign: Megaphone,
  purchase: ShoppingCart,
  custom: Sparkles,
};

export function EventSelector({
  value,
  onChange,
  filterByEventType,
  filterByCategory,
  disabled,
  placeholder,
  className,
  id: idProp,
}: EventSelectorProps) {
  const { t, currentLanguage } = useLanguage('events');
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const [open, setOpen] = useState(false);

  const visibleCategories = filterByCategory ?? EVENT_CATEGORIES;

  const grouped = useMemo(() => {
    const catalog = getEventCatalog();
    return visibleCategories
      .map((category) => ({
        category,
        items: catalog.filter((e) => {
          if (e.category !== category) return false;
          if (filterByEventType && !filterByEventType.includes(e.dtoType)) return false;
          return true;
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [visibleCategories, filterByEventType]);

  const selected = value ? getEvent(value) : undefined;
  const triggerLabel = selected
    ? selectedLabel(selected, currentLanguage)
    : (placeholder ?? t('selector.placeholder'));

  const handleSelect = (eventName: string) => {
    onChange({ eventName, isCustom: isCustomEvent(eventName) });
    setOpen(false);
  };

  return (
    // `modal`: inside the node Dialog the wheel dies on the dialog's scroll lock
    // otherwise (Radix Popover-in-Dialog, CRM-519).
    <Popover open={open} onOpenChange={setOpen} modal>
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
          <span className={cn('flex items-center gap-2', !selected && 'text-muted-foreground')}>
            {selected && (() => {
              const Icon = CATEGORY_ICON[selected.category];
              return <Icon className="h-4 w-4" aria-hidden="true" />;
            })()}
            <span>{triggerLabel}</span>
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
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
  const Icon = CATEGORY_ICON[category];
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
              aria-hidden="true"
            />
            <Icon className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <div className="flex flex-col">
              <span className="flex items-center gap-2">
                {selectedLabel(item, currentLanguage)}
                {item.category === 'custom' && (
                  <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium uppercase text-amber-700 dark:text-amber-300">
                    {t('selector.customBadge')}
                  </span>
                )}
              </span>
              <span className="text-xs text-muted-foreground">{item.description}</span>
            </div>
          </CommandItem>
        ))}
      </CommandGroup>
    </>
  );
}

// M3 fix: only pt-BR/pt receive Portuguese labels; everything else falls back
// to English. Without this, es/fr/it users see Portuguese labels in an
// otherwise fully-translated UI.
function selectedLabel(entry: EventCatalogEntry, currentLanguage: string): string {
  return currentLanguage.toLowerCase().startsWith('pt') ? entry.labelPt : entry.labelEn;
}
