import { ReactNode, useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@evoapi/design-system';
import { ChevronDown, Settings } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

/** Shared between Custom Tools (EVO-1790) and Custom MCP (EVO-1791) UIs. */
export interface AdvancedJsonCollapseProps {
  title?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export default function AdvancedJsonCollapse({
  title,
  defaultOpen = false,
  children,
}: AdvancedJsonCollapseProps) {
  const { t } = useLanguage('customTools');
  const [open, setOpen] = useState(defaultOpen);
  const resolvedTitle = title || t('advancedConfig.title');

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border rounded-md">
      <CollapsibleTrigger
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/40"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          {resolvedTitle}
        </span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 py-4 space-y-4 border-t">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
