import React, { useState } from 'react';
import { Button } from '@evoapi/design-system/button';
import { Check, Hash, MessageSquare, Mail } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@evoapi/design-system/popover';
import { useLanguage } from '@/hooks/useLanguage';

interface InboxFilterProps {
  currentInboxes: string[];
  onInboxChange: (inboxes: string[]) => void;
  disabled?: boolean;
}

const InboxFilter: React.FC<InboxFilterProps> = ({
  currentInboxes,
  onInboxChange,
  disabled = false,
}) => {
  const { t } = useLanguage('chat');
  const [open, setOpen] = useState(false);

  // Mock data - em produção viria da API
  const INBOX_OPTIONS = [
    {
      value: 'all',
      label: t("contactSidebar.filters.inbox.options.all"),
      type: 'all',
      icon: Hash,
      count: null,
    },
    {
      value: 'whatsapp',
      label: t("contactSidebar.filters.inbox.options.whatsapp"),
      type: 'whatsapp',
      icon: MessageSquare,
      count: 45,
    },
    {
      value: 'email',
      label: t("contactSidebar.filters.inbox.options.email"),
      type: 'email',
      icon: Mail,
      count: 12,
    },
    {
      value: 'website',
      label: t("contactSidebar.filters.inbox.options.website"),
      type: 'website',
      icon: MessageSquare,
      count: 8,
    },
    {
      value: 'telegram',
      label: t("contactSidebar.filters.inbox.options.telegram"),
      type: 'telegram',
      icon: MessageSquare,
      count: 3,
    },
  ];

  const handleInboxToggle = (inboxValue: string) => {
    if (inboxValue === 'all') {
      // Se selecionar "Todos", limpar outros filtros
      onInboxChange(['all']);
    } else {
      // Remove "all" se existir e toggle o inbox específico
      const newInboxes = currentInboxes.filter(i => i !== 'all');

      if (newInboxes.includes(inboxValue)) {
        // Remove se já selecionado
        const updated = newInboxes.filter(i => i !== inboxValue);
        onInboxChange(updated.length === 0 ? ['all'] : updated);
      } else {
        // Adiciona se não selecionado
        onInboxChange([...newInboxes, inboxValue]);
      }
    }
  };

  const isSelected = (inboxValue: string) => {
    return currentInboxes.includes(inboxValue);
  };

  // const getDisplayLabel = () => {
  //   if (currentInboxes.includes('all') || currentInboxes.length === 0) {
  //     return 'Todos';
  //   }
  //   if (currentInboxes.length === 1) {
  //     const selected = INBOX_OPTIONS.find(opt => opt.value === currentInboxes[0]);
  //     return selected?.label || 'Canal';
  //   }
  //   return `${currentInboxes.length} canais`;
  // };

  // const getShortLabel = () => {
  //   if (currentInboxes.includes('all') || currentInboxes.length === 0) {
  //     return 'Todos';
  //   }
  //   if (currentInboxes.length === 1) {
  //     const selected = INBOX_OPTIONS.find(opt => opt.value === currentInboxes[0]);
  //     if (selected?.value === 'whatsapp') return 'WhatsApp';
  //     if (selected?.value === 'email') return 'Email';
  //     if (selected?.value === 'website') return 'Site';
  //     if (selected?.value === 'telegram') return 'Telegram';
  //     return selected?.label || 'Canal';
  //   }
  //   return `${currentInboxes.length} canais`;
  // };

  const hasActiveFilter = !currentInboxes.includes('all') && currentInboxes.length > 0;

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
          <Hash className={`h-4 w-4 ${disabled ? 'animate-spin' : ''}`} />
          {hasActiveFilter && !disabled && (
            <span className="absolute -top-1 -right-1 h-2 w-2 bg-primary rounded-full" />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-56 p-2" align="start">
        <div className="space-y-1">
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            {t("contactSidebar.filters.inbox.title")}
          </div>
          {INBOX_OPTIONS.map(option => {
            const IconComponent = option.icon;
            return (
              <button
                key={option.value}
                onClick={() => handleInboxToggle(option.value)}
                className="flex items-center w-full px-2 py-2 text-sm rounded hover:bg-muted transition-colors cursor-pointer"
              >
                <IconComponent className="h-4 w-4 mr-2 text-muted-foreground" />
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-sm">{option.label}</span>
                  {option.count !== null && (
                    <span className="text-xs text-muted-foreground">({option.count})</span>
                  )}
                </div>
                {isSelected(option.value) && <Check className="h-4 w-4 text-primary" />}
              </button>
            );
          })}
        </div>

        {hasActiveFilter && (
          <div className="border-t mt-2 pt-2">
            <button
              onClick={() => onInboxChange(['all'])}
              className="w-full text-xs text-muted-foreground hover:text-foreground px-2 py-1 text-left cursor-pointer"
            >
              {t("contactSidebar.filters.inbox.showAll")}
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default InboxFilter;
