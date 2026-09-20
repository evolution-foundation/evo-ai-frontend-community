import { ReactNode, useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@evoapi/design-system';
import { ChevronDown } from 'lucide-react';

interface CollapsibleCardProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}

/** The border lives on the header and the body: on the root it draws an extra seam. */
const CollapsibleCard = ({
  title,
  subtitle,
  icon,
  defaultOpen = false,
  children,
}: CollapsibleCardProps) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        className={`flex w-full items-center gap-[13px] border border-border bg-card px-[22px] py-[18px] text-left shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${
          open ? 'rounded-t-[14px] border-b-0' : 'rounded-[14px]'
        }`}
        aria-expanded={open}
      >
        {icon && (
          <span className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-[10px] bg-primary/10 text-primary">
            {icon}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-bold text-foreground">{title}</span>
          {subtitle && (
            <span className="mt-[3px] block text-[13px] text-muted-foreground">{subtitle}</span>
          )}
        </span>
        <ChevronDown
          className={`h-[18px] w-[18px] flex-shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </CollapsibleTrigger>

      <CollapsibleContent className="rounded-b-[14px] border border-t-0 border-border bg-card px-[22px] pb-[18px] pt-1">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};

export default CollapsibleCard;
