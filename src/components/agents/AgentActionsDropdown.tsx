import { useLanguage } from '@/hooks/useLanguage';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@evoapi/design-system';
import { Copy, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Agent } from '@/types/agents';
import { usePermissions } from '@/contexts/PermissionsContext';

interface AgentActionsDropdownProps {
  agent: Agent;
  trigger: React.ReactNode;
  onEdit: (agent: Agent) => void;
  onMoveToFolder?: (agent: Agent) => void;
  onExportAsJSON?: (agent: Agent) => void;
  onShare?: (agent: Agent) => void;
  onDelete: (agent: Agent) => void;
  align?: 'start' | 'center' | 'end';
}

/** `h-auto` cancels the design-system item height, which `cn()` would otherwise keep. */
const MENU_ITEM_CLASS =
  'h-auto cursor-pointer gap-2.5 rounded-lg px-3 py-[9px] text-[13.5px] font-medium text-foreground focus:bg-primary/10 focus:text-primary';

const MENU_ITEM_DANGER_CLASS =
  'h-auto cursor-pointer gap-2.5 rounded-lg px-3 py-[9px] text-[13.5px] font-medium text-destructive focus:bg-destructive/10 focus:text-destructive';

const MENU_ICON_CLASS = 'size-[15px]';

export default function AgentActionsDropdown({
  agent,
  trigger,
  onEdit,
  onDelete,
  align = 'end',
}: AgentActionsDropdownProps) {
  const { t } = useLanguage('agents');
  const { can, isReady } = usePermissions();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className="min-w-[168px] rounded-xl border-border p-1.5 shadow-[0_8px_28px_rgba(16,24,40,.14)]"
      >
        {isReady && can('ai_agents', 'update') && (
          <DropdownMenuItem onClick={() => onEdit(agent)} className={MENU_ITEM_CLASS}>
            <Edit className={MENU_ICON_CLASS} />
            {t('dropdown.edit')}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          className={MENU_ITEM_CLASS}
          onClick={async () => {
            await navigator.clipboard.writeText(agent.id);
            toast.success(t('dropdown.idCopied'));
          }}
        >
          <Copy className={MENU_ICON_CLASS} />
          {t('dropdown.copyId')}
        </DropdownMenuItem>
        {isReady && can('ai_agents', 'delete') && (
          <DropdownMenuItem onClick={() => onDelete(agent)} className={MENU_ITEM_DANGER_CLASS}>
            <Trash2 className={MENU_ICON_CLASS} />
            {t('dropdown.delete')}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
