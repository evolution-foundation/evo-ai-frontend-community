import React, { ReactNode } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Button,
  Input,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Badge,
} from '@evoapi/design-system';
import {
  Search,
  Filter,
  MoreVertical,
  X,
} from 'lucide-react';
import PrimaryActionButton from './PrimaryActionButton';
import { cn } from '@/utils/cn';

export interface HeaderAction {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  show?: boolean;
  className?: string;
  disabled?: boolean;
  tooltip?: string;
  dataTour?: string;
}

export interface HeaderFilter {
  label: string;
  value: string | number;
  onRemove: () => void;
}

export interface BaseHeaderProps {
  title: string;
  subtitle?: string;
  /** Suppresses only the rendering of title/subtitle, for screens whose layout
   *  already owns them (EVO-2231: the Agentes de IA tab container). */
  hideTitle?: boolean;
  /** Popover anchored to the "Filters" button. Opt-in: without it the button only
   *  fires `onFilterClick`. */
  filterPanel?: ReactNode;
  /** Badge count for screens whose filters do not become chips. Defaults to chip count. */
  filterCount?: number;
  filterButtonClassName?: string;
  /** `primary` is the canonical green bulk bar (PADRAO-DE-DESIGN §3.14). Opt-in so
   *  the 30+ screens still on the neutral bar are untouched. */
  selectionBarTone?: 'default' | 'primary';
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  primaryAction?: HeaderAction;
  secondaryActions?: HeaderAction[];
  moreActions?: HeaderAction[];
  filters?: HeaderFilter[];
  onFilterClick?: () => void;
  showFilters?: boolean;
  filterButtonDataTour?: string;
  searchDataTour?: string;
  totalCount?: number;
  selectedCount?: number;
  onClearSelection?: () => void;
  bulkActions?: HeaderAction[];
  className?: string;
  children?: ReactNode;
}

export default function BaseHeader({
  title,
  subtitle,
  hideTitle = false,
  selectionBarTone = 'default',
  searchValue,
  onSearchChange,
  searchPlaceholder,
  primaryAction,
  secondaryActions = [],
  moreActions = [],
  filters = [],
  onFilterClick,
  showFilters = false,
  filterButtonDataTour,
  searchDataTour,
  selectedCount = 0,
  onClearSelection,
  bulkActions = [],
  className = '',
  children,
  filterPanel,
  filterCount,
  filterButtonClassName,
}: BaseHeaderProps) {
  const { t } = useLanguage('common');
  const placeholder = searchPlaceholder || t('base.header.searchPlaceholder');
  const hasSelection = selectedCount > 0;
  const isPrimarySelectionBar = selectionBarTone === 'primary';
  const visibleSecondaryActions = secondaryActions.filter(action => action.show !== false);
  const visibleMoreActions = moreActions.filter(action => action.show !== false);
  const activeFilterCount = filterCount ?? filters.length;
  const hasPrimaryAction = !!primaryAction && primaryAction.show !== false;
  // With no title the top row would hold only the primary button, so it moves down to
  // the search row, right of the secondary actions.
  const primaryButton = hasPrimaryAction ? (
    <div className="flex-shrink-0" data-tour={primaryAction!.dataTour}>
      <PrimaryActionButton
        label={primaryAction!.label}
        icon={primaryAction!.icon}
        onClick={primaryAction!.onClick}
        size="sm"
        variant={primaryAction!.variant || 'default'}
        className={primaryAction!.className}
        disabled={primaryAction!.disabled}
        tooltip={primaryAction!.tooltip}
      />
    </div>
  ) : null;

  return (
    <div className={`space-y-4 sm:space-y-6 ${className}`}>
      {!hideTitle && (
        <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight leading-7 sm:leading-8 text-sidebar-foreground mb-1 sm:mb-2">{title}</h1>
            {subtitle && (
              <p className="hidden sm:block text-sm leading-5 text-sidebar-foreground/70">{subtitle}</p>
            )}
          </div>

          {primaryButton}
        </div>
      )}

      {/* Search and Filter Row */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3 flex-1">
          {/* Search */}
          {onSearchChange && (
            <div className="relative flex-1 max-w-md" data-tour={searchDataTour}>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sidebar-foreground/60" />
              <Input
                type="search"
                placeholder={placeholder}
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 bg-sidebar border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/50 focus:border-sidebar-border"
              />
            </div>
          )}

          {/* The wrapper anchors `filterPanel`: grouping button + panel is what tells the
              panel a click on the button is not an outside click. */}
          {showFilters && onFilterClick && (
            <div className="relative" data-filter-anchor="">
            <Button
              variant="outline"
              size="sm"
              onClick={onFilterClick}
              className={cn(
                'bg-sidebar border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent whitespace-nowrap',
                filterButtonClassName,
              )}
              data-tour={filterButtonDataTour}
            >
              <Filter className="h-4 w-4 mr-2" />
              {t('base.header.filters')}
              {activeFilterCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-2 h-5 px-1.5 text-xs bg-sidebar-accent"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
            {filterPanel}
            </div>
          )}
        </div>

        {/* Secondary Actions */}
        <div className="flex items-center gap-2">
          {visibleSecondaryActions.map((action, index) => {
            const renderIcon = () => {
              if (!action.icon) return null;
              // Check if it's a React component (function or object with $$typeof)
              if (typeof action.icon === 'function') {
                const IconComponent = action.icon as React.ComponentType<{ className?: string }>;
                return <IconComponent className="h-4 w-4 mr-2" />;
              }
              // If it's already a React element, render it directly
              if (React.isValidElement(action.icon)) {
                return <span className="mr-2">{action.icon}</span>;
              }
              // Otherwise render as is
              return <span className="mr-2">{action.icon}</span>;
            };

            return (
              <Button
                key={index}
                variant={action.variant || 'outline'}
                size="sm"
                onClick={action.onClick}
                className={cn(
                  'bg-sidebar border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent',
                  action.className,
                )}
                data-tour={action.dataTour}
              >
                {renderIcon()}
                {action.label}
              </Button>
            );
          })}

          {/* More Actions Dropdown */}
          {visibleMoreActions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-sidebar border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-sidebar border-sidebar-border text-sidebar-foreground"
              >
                {visibleMoreActions.map((action, index) => {
                  const renderIcon = () => {
                    if (!action.icon) return null;
                    // Check if it's a React component (function)
                    if (typeof action.icon === 'function') {
                      const IconComponent = action.icon as React.ComponentType<{ className?: string }>;
                      return <IconComponent className="h-4 w-4 mr-2" />;
                    }
                    // If it's already a React element, render it directly
                    if (React.isValidElement(action.icon)) {
                      return <span className="mr-2">{action.icon}</span>;
                    }
                    // Otherwise render as is
                    return <span className="mr-2">{action.icon}</span>;
                  };

                  return (
                    <DropdownMenuItem
                      key={index}
                      onClick={action.onClick}
                      className={`hover:bg-sidebar-accent ${action.variant === 'destructive' ? 'text-red-400' : ''}`}
                    >
                      {renderIcon()}
                      {action.label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {hideTitle && primaryButton}
        </div>
      </div>

      {/* Selection Bar */}
      {hasSelection && (
        <div className={isPrimarySelectionBar
          ? 'flex items-center justify-between rounded-xl border border-primary/30 bg-primary/10 px-[14px] py-[10px]'
          : 'flex items-center justify-between rounded-lg bg-sidebar-accent/50 border border-sidebar-border px-4 py-2'}
        >
          <div className="flex items-center gap-2">
            <span className={isPrimarySelectionBar
              ? 'text-[13.5px] font-bold text-primary'
              : 'text-sm font-medium text-sidebar-foreground'}
            >
              {t('base.header.selected', { count: selectedCount })}
            </span>
            {onClearSelection && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSelection}
                className={isPrimarySelectionBar
                  ? 'h-7 px-2 text-primary/80 hover:bg-primary/20 hover:text-primary'
                  : 'h-7 px-2 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'}
              >
                <X className="h-3 w-3 mr-1" />
                {t('base.header.clear')}
              </Button>
            )}
          </div>
          {bulkActions.length > 0 && (
            <div className="flex items-center gap-2">
              {isPrimarySelectionBar && <span className="h-5 w-px bg-primary/30" aria-hidden="true" />}
              {bulkActions.map((action, index) => {
                const isDanger = action.variant === 'destructive';
                return (
                <Button
                  key={index}
                  variant={isPrimarySelectionBar ? 'ghost' : action.variant || 'outline'}
                  size="sm"
                  onClick={action.onClick}
                  className={isPrimarySelectionBar
                    ? (isDanger
                        ? 'h-7 text-destructive hover:bg-destructive/10 hover:text-destructive'
                        : 'h-7 text-primary hover:bg-primary/20 hover:text-primary')
                    : 'h-7 bg-sidebar-accent border-sidebar-border text-sidebar-foreground hover:bg-sidebar'}
                >
                  {action.icon && (typeof action.icon === 'function' ? (
                    (() => {
                      const IconComponent = action.icon as React.ComponentType<{ className?: string }>;
                      return <IconComponent className="h-4 w-4 mr-1.5" />;
                    })()
                  ) : React.isValidElement(action.icon) ? (
                    <span className="mr-1.5">{action.icon}</span>
                  ) : (
                    <span className="mr-1.5">{action.icon}</span>
                  ))}
                  {action.label}
                </Button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Active Filters */}
      {filters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.map((filter, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="pl-2 pr-1 py-1 bg-sidebar-accent text-sidebar-foreground hover:bg-sidebar"
            >
              {filter.label}: {filter.value}
              <Button
                variant="ghost"
                size="sm"
                onClick={filter.onRemove}
                className="ml-1 h-4 w-4 p-0 hover:bg-transparent text-sidebar-foreground/60 hover:text-sidebar-foreground"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Custom Content */}
      {children}
    </div>
  );
}
