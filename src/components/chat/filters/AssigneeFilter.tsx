import React, { useState } from 'react';
import { Button } from '@evoapi/design-system/button';
import { Check, UserCheck } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@evoapi/design-system/popover';
import { useLanguage } from '@/hooks/useLanguage';

interface AssigneeFilterProps {
  currentAssignee: string;
  onAssigneeChange: (assignee: string) => void;
  disabled?: boolean;
}

const AssigneeFilter: React.FC<AssigneeFilterProps> = ({
  currentAssignee,
  onAssigneeChange,
  disabled = false,
}) => {
  const { t } = useLanguage('chat');
  const [open, setOpen] = useState(false);

  const ASSIGNEE_OPTIONS = [
    {
      value: 'all',
      label: t("contactSidebar.filters.assignee.options.all.label"),
      description: t("contactSidebar.filters.assignee.options.all.description"),
    },
    {
      value: 'me',
      label: t("contactSidebar.filters.assignee.options.me.label"),
      description: t("contactSidebar.filters.assignee.options.me.description"),
    },
    {
      value: 'unassigned',
      label: t("contactSidebar.filters.assignee.options.unassigned.label"),
      description: t("contactSidebar.filters.assignee.options.unassigned.description"),
    },
  ];

  const handleAssigneeChange = (assigneeValue: string) => {
    onAssigneeChange(assigneeValue);
    setOpen(false);
  };

  // const getDisplayLabel = () => {
  //   const selected = ASSIGNEE_OPTIONS.find(opt => opt.value === currentAssignee);
  //   return selected?.label || 'Atribuição';
  // };

  // const getShortLabel = () => {
  //   switch (currentAssignee) {
  //     case 'me':
  //       return 'Minhas';
  //     case 'unassigned':
  //       return 'Livres';
  //     default:
  //       return 'Todas';
  //   }
  // };

  const hasActiveFilter = currentAssignee !== 'all';

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
          <UserCheck className={`h-4 w-4 ${disabled ? 'animate-spin' : ''}`} />
          {hasActiveFilter && !disabled && (
            <span className="absolute -top-1 -right-1 h-2 w-2 bg-primary rounded-full" />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-56 p-2" align="start">
        <div className="space-y-1">
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            {t("contactSidebar.filters.assignee.title")}
          </div>
          {ASSIGNEE_OPTIONS.map(option => (
            <button
              key={option.value}
              onClick={() => handleAssigneeChange(option.value)}
              className="flex items-start w-full px-2 py-2 text-sm rounded hover:bg-muted transition-colors cursor-pointer"
            >
              <div className="flex-1 text-left">
                <div className="font-medium">{option.label}</div>
                <div className="text-xs text-muted-foreground">{option.description}</div>
              </div>
              {currentAssignee === option.value && (
                <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>

        {hasActiveFilter && (
          <div className="border-t mt-2 pt-2">
            <button
              onClick={() => handleAssigneeChange('all')}
              className="w-full text-xs text-muted-foreground hover:text-foreground px-2 py-1 text-left cursor-pointer"
            >
              {t("contactSidebar.filters.assignee.showAll")}
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default AssigneeFilter;
