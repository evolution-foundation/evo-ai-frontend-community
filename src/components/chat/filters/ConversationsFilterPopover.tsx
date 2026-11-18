import React, { useEffect, useState } from 'react';
import { Button } from '@evoapi/design-system/button';
import { Badge } from '@evoapi/design-system/badge';
import { Clock, Filter, Hash, Tag, UserCheck, Users, Workflow } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@evoapi/design-system/popover';
import { ScrollArea } from '@evoapi/design-system/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@evoapi/design-system/accordion';
import { Checkbox } from '@evoapi/design-system/checkbox';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/hooks/useLanguage';
import { useFilterOptions } from '@/hooks/chat/useFilterOptions';
import { BaseFilter } from '@/types/core';
import { getStatusConfig, type ConversationStatus } from '@/utils/chat/conversationStatus';

interface ConversationsFilterPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: BaseFilter[];
  onFiltersChange: (filters: BaseFilter[]) => void;
  onApplyFilters: (filters: BaseFilter[]) => void;
  onClearFilters: () => void;
  disabled?: boolean;
}

// Uma seção por attributeKey. `multi: true` agrega vários valores no MESMO
// BaseFilter (values: string[]) — labels e assignee_id suportam OR entre valores;
// os demais atributos
// ficam single-select até o backend confirmar suporte a lista em equal_to.
interface FilterSection {
  attributeKey: string;
  icon: typeof Filter;
  optionsKey: 'inboxes' | 'labels' | 'users' | 'teams' | 'pipelines';
  multi: boolean;
}

const SECTIONS: FilterSection[] = [
  { attributeKey: 'inbox_id', icon: Hash, optionsKey: 'inboxes', multi: false },
  { attributeKey: 'labels', icon: Tag, optionsKey: 'labels', multi: true },
  { attributeKey: 'assignee_id', icon: UserCheck, optionsKey: 'users', multi: true },
  { attributeKey: 'team_id', icon: Users, optionsKey: 'teams', multi: false },
  { attributeKey: 'pipeline_id', icon: Workflow, optionsKey: 'pipelines', multi: false },
];

// Status é atributo válido no POST /conversations/filter (única navegação por
// chip que também é filtro real — ver CHIP_NAV_KEYS/handleApplyAdvancedFilters
// em ChatSidebar.tsx) — por isso pode ter seção própria aqui, coexistindo com
// os chips de busca (ConversationSegments), sem duplicar a arquitetura.
const STATUS_OPTIONS: ConversationStatus[] = ['pending', 'open', 'resolved', 'snoozed'];

// `status: ['all']` é o DEFAULT_FILTER global (FiltersContext.tsx) — sentinela de
// "sem filtro de status", não uma seleção real. Chega até o draft deste popover via
// o sync activeFilters->popover em ChatSidebar.tsx (que inclui `status` de propósito,
// para refletir chips de status já ativos). Sem filtrar o sentinela aqui, ele: (1)
// acende o badge/dot como se houvesse um filtro aplicado com nenhum checkbox marcado,
// e (2) ao marcar um status real, é ACUMULADO junto (['all','pending']) em vez de
// substituído, e o attribute_key final chega ao backend como 'all' sozinho de novo.
const STATUS_SENTINEL = 'all';

const filterToValues = (filter: BaseFilter | undefined): string[] => {
  if (!filter) return [];
  const raw = Array.isArray(filter.values)
    ? filter.values.map(String)
    : String(filter.values || '')
        .split(',')
        .filter(Boolean);
  return filter.attributeKey === 'status' ? raw.filter(v => v !== STATUS_SENTINEL) : raw;
};

const buildFilter = (attributeKey: string, values: string[]): BaseFilter => ({
  attributeKey,
  filterOperator: 'equal_to',
  values: values.length > 1 ? values : values[0] || '',
  queryOperator: 'and',
  attributeModel: 'standard',
});

// Cada card-seção tem sua própria cor de acento (ícone + borda ao expandir),
// espelhando o protótipo — não é decorativo à toa, ajuda a escanear a lista
// de seções rapidamente (mesmo princípio das cores de status).
const SECTION_ACCENT = 'text-primary';

const ConversationsFilterPopover: React.FC<ConversationsFilterPopoverProps> = ({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  onApplyFilters,
  onClearFilters,
  disabled = false,
}) => {
  const { t } = useLanguage('chat');
  const filterOptions = useFilterOptions({ enabled: open });

  // Rascunho local: só vira `filters` de verdade ao clicar Aplicar (evita um
  // POST /conversations/filter por clique, como no BaseFilter/Dialog antigo).
  const [draft, setDraft] = useState<BaseFilter[]>(filters);
  // Accordion aberto por padrão (Status é o mais usado — bate com o protótipo,
  // que mostra Status já expandido e as demais seções recolhidas).
  const [openSections, setOpenSections] = useState<string[]>(['status']);

  useEffect(() => {
    if (open) {
      setDraft(filters);
    }
  }, [open, filters]);

  const optionsBySection: Record<FilterSection['optionsKey'], Array<{ label: string; value: string }>> = {
    inboxes: filterOptions.inboxes,
    labels: filterOptions.labels,
    users: filterOptions.users,
    teams: filterOptions.teams,
    pipelines: filterOptions.pipelines,
  };

  const toggleValue = (attributeKey: string, value: string, multi: boolean) => {
    const current = draft.find(f => f.attributeKey === attributeKey);
    const currentValues = filterToValues(current);

    let nextValues: string[];
    if (multi) {
      nextValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
    } else {
      nextValues = currentValues.includes(value) ? [] : [value];
    }

    const withoutSection = draft.filter(f => f.attributeKey !== attributeKey);
    setDraft(nextValues.length > 0 ? [...withoutSection, buildFilter(attributeKey, nextValues)] : withoutSection);
  };

  const statusValues = filterToValues(draft.find(f => f.attributeKey === 'status'));

  const activeCount = draft.filter(f => filterToValues(f).length > 0).length;
  const hasAppliedFilters = filters.filter(f => filterToValues(f).length > 0).length > 0;

  const handleApply = () => {
    const validDraft = draft.filter(f => filterToValues(f).length > 0);
    onFiltersChange(validDraft);
    onApplyFilters(validDraft);
    onOpenChange(false);
  };

  const handleClearAll = () => {
    setDraft([]);
    onClearFilters();
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="h-8 px-2 cursor-pointer relative"
          data-tour="chat-filter-button"
        >
          <Filter className="h-4 w-4" />
          {t('chatSidebar.filtersButton')}
          {hasAppliedFilters && (
            <span className="absolute -top-1 -right-1 h-2 w-2 bg-primary rounded-full" />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-80 h-[26rem] p-0 flex flex-col overflow-hidden bg-muted"
        side="right"
        align="start"
        sideOffset={8}
        collisionPadding={12}
      >
        <div className="flex items-center justify-between px-4 py-3 shrink-0 bg-background border-b">
          <span className="text-sm font-semibold">{t('conversationsFilter.title')}</span>
          {activeCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeCount}
            </Badge>
          )}
        </div>

        <ScrollArea className="grow min-h-0 overflow-y-auto">
          <div className="p-2.5 flex flex-col gap-2">
            {/* Status é um card à parte (não faz parte do Accordion abaixo) por
                ser o único com bolinha colorida por opção, em vez de checkbox
                puro — visual ligeiramente diferente das demais seções. */}
            <Accordion type="multiple" value={openSections} onValueChange={setOpenSections}>
              <AccordionItem
                value="status"
                className="border-0 rounded-xl bg-background shadow-sm overflow-hidden"
              >
                <AccordionTrigger className="px-3.5 py-3 text-sm font-semibold hover:no-underline [&>svg]:text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <Clock className={cn('h-4 w-4', SECTION_ACCENT)} />
                    {t('conversationsFilter.attributes.status')}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-3.5 pb-3 pt-0 space-y-1">
                  {STATUS_OPTIONS.map(status => {
                    const config = getStatusConfig(status, t);
                    const dotColor = config.color.replace('text-', 'bg-');
                    return (
                      <label
                        key={status}
                        className="flex items-center gap-2.5 w-full py-1.5 text-sm rounded-lg cursor-pointer"
                      >
                        <Checkbox
                          checked={statusValues.includes(status)}
                          onCheckedChange={() => toggleValue('status', status, true)}
                        />
                        <span className="flex-1">{config.label}</span>
                        <span className={cn('h-2.5 w-2.5 rounded-full flex-shrink-0', dotColor)} />
                      </label>
                    );
                  })}
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {SECTIONS.map(section => {
              const IconComponent = section.icon;
              const sectionOptions = optionsBySection[section.optionsKey];
              const selectedValues = filterToValues(draft.find(f => f.attributeKey === section.attributeKey));
              const isOpen = openSections.includes(section.attributeKey);

              return (
                <Accordion
                  key={section.attributeKey}
                  type="multiple"
                  value={openSections}
                  onValueChange={setOpenSections}
                >
                  <AccordionItem
                    value={section.attributeKey}
                    className={cn(
                      'border-0 rounded-xl bg-background shadow-sm overflow-hidden',
                      isOpen && 'ring-1 ring-primary/25',
                    )}
                  >
                    <AccordionTrigger className="px-3.5 py-3 text-sm font-semibold hover:no-underline [&>svg]:text-muted-foreground">
                      <span className="flex items-center gap-2">
                        <IconComponent className={cn('h-4 w-4', SECTION_ACCENT)} />
                        {t(`conversationsFilter.attributes.${section.attributeKey}`)}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="px-3.5 pb-3 pt-0 space-y-1">
                      {sectionOptions.length === 0 ? (
                        <div className="py-1.5 text-xs text-muted-foreground">
                          {t('conversationsFilter.popover.noOptions')}
                        </div>
                      ) : (
                        sectionOptions.map(option => (
                          <label
                            key={option.value}
                            className="flex items-center gap-2.5 w-full py-1.5 text-sm rounded-lg cursor-pointer"
                          >
                            <Checkbox
                              checked={selectedValues.includes(option.value)}
                              onCheckedChange={() => toggleValue(section.attributeKey, option.value, section.multi)}
                            />
                            <span className="flex-1 truncate">{option.label}</span>
                          </label>
                        ))
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              );
            })}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between px-4 py-3 border-t bg-background gap-2 shrink-0">
          <Button variant="ghost" size="sm" onClick={handleClearAll} className="text-xs cursor-pointer">
            {t('conversationsFilter.popover.clearAll')}
          </Button>
          <Button size="sm" onClick={handleApply} className="cursor-pointer">
            {t('conversationsFilter.applyFilters')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ConversationsFilterPopover;
