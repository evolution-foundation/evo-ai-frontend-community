import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Tag, Timer, X } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/utils/cn';
import {
  CustomMcpServerFacetKey,
  CustomMcpServerFacetOptions,
  CustomMcpServerFacetSelection,
  toggleFacetValue,
} from './customMcpServersFilterFacets';

interface CustomMCPServersFilterPanelProps {
  open: boolean;
  onClose: () => void;
  selection: CustomMcpServerFacetSelection;
  onSelectionChange: (next: CustomMcpServerFacetSelection) => void;
  onClear: () => void;
  options: CustomMcpServerFacetOptions;
}

interface FacetOption {
  value: string;
  label: string;
}

/** Same anchored popover as `AgentsFilterPanel` (PADRAO-DE-DESIGN §2.3). */
export default function CustomMCPServersFilterPanel({
  open,
  onClose,
  selection,
  onSelectionChange,
  onClear,
  options,
}: CustomMCPServersFilterPanelProps) {
  const { t } = useLanguage('customMcpServers');
  const rootRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState<Record<CustomMcpServerFacetKey, boolean>>({
    tags: false,
    timeout: false,
  });

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      // Outside is measured from the anchor, not the panel: closing on the trigger's
      // `mousedown` would let its `click` reopen, so the button could never close it.
      const anchor = rootRef.current?.closest('[data-filter-anchor]') ?? rootRef.current;
      if (!anchor?.contains(event.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const sections: {
    key: CustomMcpServerFacetKey;
    label: string;
    icon: typeof Tag;
    options: FacetOption[];
  }[] = [
    {
      key: 'tags',
      label: t('filters.sections.tags'),
      icon: Tag,
      options: options.tags.map(tag => ({ value: tag, label: tag })),
    },
    {
      key: 'timeout',
      label: t('filters.sections.timeout'),
      icon: Timer,
      options: options.timeout.map(value => ({
        value,
        label: t('filters.timeoutValue', { timeout: value }),
      })),
    },
  ];

  return (
    <div
      ref={rootRef}
      data-custom-mcp-filter-root=""
      className="absolute left-0 top-[calc(100%+8px)] z-50 max-h-[520px] w-72 overflow-y-auto rounded-[14px] border border-border bg-card p-[9px] shadow-[0_14px_36px_rgba(20,30,45,.20)]"
    >
      <div className="flex items-center justify-between px-1.5 pb-[9px] pt-[3px]">
        <span className="text-[13px] font-bold text-foreground">{t('filters.title')}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('filters.close')}
          className="flex text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      {sections.map(section => {
        const Icon = section.icon;
        const isOpen = !collapsed[section.key];
        return (
          <div key={section.key} className="mb-2 rounded-[11px] bg-background shadow-sm">
            <button
              type="button"
              onClick={() =>
                setCollapsed(prev => ({ ...prev, [section.key]: !prev[section.key] }))
              }
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-2.5 px-[13px] py-3"
            >
              <span className="flex items-center gap-[11px]">
                <Icon className="size-[17px] text-primary" />
                <span className="text-sm font-semibold text-foreground">{section.label}</span>
              </span>
              <ChevronDown
                className={cn(
                  'size-4 text-muted-foreground transition-transform duration-150',
                  isOpen && 'rotate-180',
                )}
              />
            </button>

            {isOpen && (
              <div className="px-2.5 pb-[11px] pt-0.5">
                <div className="-mx-2.5 mb-2 h-px bg-border" />
                {section.options.length === 0 ? (
                  <div className="px-1 pb-1 pt-1.5 text-[13px] text-muted-foreground">
                    {t('filters.empty')}
                  </div>
                ) : (
                  section.options.map(option => {
                    const checked = selection[section.key].includes(option.value);
                    return (
                      <button
                        type="button"
                        key={option.value}
                        role="checkbox"
                        aria-checked={checked}
                        onClick={() =>
                          onSelectionChange(
                            toggleFacetValue(selection, section.key, option.value),
                          )
                        }
                        className="flex w-full items-center gap-[11px] rounded-[7px] px-1 py-2 text-left hover:bg-accent"
                      >
                        <span
                          className={cn(
                            'flex size-[19px] flex-none items-center justify-center rounded-[6px] border-[1.6px]',
                            checked
                              ? 'border-primary bg-primary'
                              : 'border-muted-foreground/40 bg-background',
                          )}
                        >
                          {checked && (
                            <svg
                              width="11"
                              height="11"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3.4"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="text-primary-foreground"
                            >
                              <path d="M5 12l5 5L20 6" />
                            </svg>
                          )}
                        </span>
                        <span className="truncate text-[13.5px] text-foreground">
                          {option.label}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={onClear}
        className="mt-0.5 w-full rounded-[9px] p-[9px] text-center text-[13px] font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        {t('filters.clear')}
      </button>
    </div>
  );
}
