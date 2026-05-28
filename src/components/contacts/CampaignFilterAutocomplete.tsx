import { useEffect, useRef, useState } from 'react';
import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@evoapi/design-system';
import { Check, ChevronsUpDown, Loader2, X } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { campaignsService } from '@/services/campaigns/campaignsService';
import type { Campaign } from '@/types/campaigns';

interface CampaignFilterAutocompleteProps {
  id?: string;
  value: string | undefined;
  onChange: (next: string | undefined) => void;
  disabled?: boolean;
}

// Debounce delay for server-side search. 250ms is the sweet spot for typing —
// shorter and we burn extra requests on every keystroke, longer and the list
// feels laggy.
const SEARCH_DEBOUNCE_MS = 250;
const PAGE_SIZE = 20;

function isUuidLike(value: string): boolean {
  return /^[0-9a-fA-F-]{36}$/.test(value);
}

export function CampaignFilterAutocomplete({
  id,
  value,
  onChange,
  disabled,
}: CampaignFilterAutocompleteProps) {
  const { t } = useLanguage('contacts');

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string | undefined>();

  // Tracks the latest in-flight request so out-of-order responses don't
  // overwrite the current option list.
  const requestIdRef = useRef(0);

  // Resolve the label for a value the caller pre-seeded (e.g., when reopening
  // the panel with a campaign already selected). Only fires for UUID-shaped
  // values; otherwise we trust the parent to have nothing to lookup.
  useEffect(() => {
    if (!value) {
      setSelectedLabel(undefined);
      return;
    }
    // Already labeled this value — don't fetch again.
    if (selectedLabel) return;
    if (!isUuidLike(value)) {
      setSelectedLabel(value);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const campaign = await campaignsService.getCampaign(value);
        if (!cancelled) {
          setSelectedLabel(campaign.title || campaign.name || value);
        }
      } catch {
        if (!cancelled) setSelectedLabel(value);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [value, selectedLabel]);

  // Debounced server-side search. Re-runs whenever search or open changes; we
  // only hit the API when the popover is actually visible to avoid prefetching
  // for users who never expand the field.
  useEffect(() => {
    if (!open) return;
    const requestId = ++requestIdRef.current;
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await campaignsService.getCampaigns({
          per_page: PAGE_SIZE,
          search: search.trim() || undefined,
          sort: 'name',
          order: 'asc',
        });
        if (requestIdRef.current === requestId) {
          setOptions(response.data ?? []);
        }
      } catch {
        if (requestIdRef.current === requestId) {
          setOptions([]);
        }
      } finally {
        if (requestIdRef.current === requestId) {
          setIsLoading(false);
        }
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [open, search]);

  const handleSelect = (campaign: Campaign) => {
    setSelectedLabel(campaign.title || campaign.name || campaign.id);
    onChange(campaign.id);
    setOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    // Stop the trigger from opening when the user just wants to clear.
    e.stopPropagation();
    setSelectedLabel(undefined);
    onChange(undefined);
  };

  const triggerLabel = value
    ? selectedLabel ?? t('events.filters.campaignLoading')
    : t('events.filters.campaignPlaceholder');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
          data-testid="campaign-filter-trigger"
        >
          <span className="truncate text-left">{triggerLabel}</span>
          <span className="ml-2 flex items-center gap-1">
            {value && !disabled && (
              <X
                role="button"
                aria-label={t('events.filters.clearCampaign')}
                tabIndex={0}
                onClick={handleClear}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') handleClear(e as unknown as React.MouseEvent);
                }}
                className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground"
              />
            )}
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t('events.filters.campaignSearchPlaceholder')}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t('events.filters.campaignLoading')}
              </div>
            )}
            {!isLoading && options.length === 0 && (
              <CommandEmpty>{t('events.filters.campaignEmpty')}</CommandEmpty>
            )}
            {!isLoading && options.length > 0 && (
              <CommandGroup>
                {options.map((campaign) => {
                  const label = campaign.title || campaign.name || campaign.id;
                  return (
                    <CommandItem
                      key={campaign.id}
                      value={campaign.id}
                      onSelect={() => handleSelect(campaign)}
                    >
                      <Check
                        className={
                          'mr-2 h-3.5 w-3.5 ' +
                          (value === campaign.id ? 'opacity-100' : 'opacity-0')
                        }
                      />
                      <span className="truncate">{label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default CampaignFilterAutocomplete;
