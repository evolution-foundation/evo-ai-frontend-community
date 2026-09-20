import { ReactNode } from 'react';
import { Card } from '@evoapi/design-system';
import BrandIcon, { getBrandIcon } from '@/components/BrandIcon';

interface CompactIntegrationCardProps {
  id: string;
  name: string;
  description: string;
  action: ReactNode;
}

/** Compact horizontal card shared by the Integrations and MCP blocks. */
export function CompactIntegrationCard({
  id,
  name,
  description,
  action,
}: CompactIntegrationCardProps) {
  const hasBrandIcon = Boolean(getBrandIcon(id));

  return (
    <Card className="flex flex-col items-start gap-4 p-4 transition-colors hover:border-primary/50 md:flex-row md:items-center">
      {/* `bg-accent`, not `bg-muted`: embedded in the shell `--muted` equals `--card`,
          so a muted tile is invisible on the card it sits on. */}
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-accent p-2">
        {hasBrandIcon ? (
          <BrandIcon id={id} size={32} className="h-8 w-8" />
        ) : (
          /* Not every catalog entry has a brand icon (e.g. monday, canva). */
          <span className="text-sm font-semibold uppercase text-muted-foreground">
            {name.slice(0, 2)}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{name}</p>
        <p className="line-clamp-2 text-xs text-muted-foreground">{description}</p>
      </div>

      <div className="w-full flex-shrink-0 md:w-auto">{action}</div>
    </Card>
  );
}
