import { Cpu, List, Wrench, type LucideIcon } from 'lucide-react';

export type AgentsTabKey = 'agents' | 'customTools' | 'customMcpServers';

export interface AgentsTabDefinition {
  key: AgentsTabKey;
  route: string;
  /** RBAC resource the tab needs `read` on to be visible at all. */
  resource: string;
  labelKey: string;
  subtitleKey: string;
  icon: LucideIcon;
}

/** `/agents` is the menu href, not a tab route — landing on it resolves to a tab. */
export const AGENTS_INDEX_ROUTE = '/agents';

export const AGENTS_TABS: AgentsTabDefinition[] = [
  {
    key: 'agents',
    route: '/agents/list',
    resource: 'ai_agents',
    labelKey: 'container.tabs.agents',
    subtitleKey: 'container.subtitles.agents',
    icon: List,
  },
  {
    key: 'customTools',
    route: '/agents/custom-tools',
    resource: 'ai_custom_tools',
    labelKey: 'container.tabs.customTools',
    subtitleKey: 'container.subtitles.customTools',
    icon: Wrench,
  },
  {
    key: 'customMcpServers',
    route: '/agents/custom-mcp-servers',
    resource: 'ai_custom_mcp_servers',
    labelKey: 'container.tabs.customMcpServers',
    subtitleKey: 'container.subtitles.customMcpServers',
    icon: Cpu,
  },
];

/** Below 768px the 3 chips do not fit, so the bar scrolls instead of wrapping. */
export const AGENTS_TAB_LIST_CLASS =
  'h-auto w-full flex-nowrap justify-start gap-2 overflow-x-auto rounded-none bg-transparent p-0';

/** `flex-none`/`h-auto` cancel the TabsTrigger base, which tailwind-merge leaves in place. */
export const AGENTS_TAB_TRIGGER_CLASS =
  'inline-flex h-auto flex-none items-center gap-2 rounded-[9px] border border-transparent bg-transparent px-4 py-[9px] text-[13.5px] font-medium text-muted-foreground shadow-none hover:bg-accent hover:text-foreground data-[state=active]:border-primary/30 data-[state=active]:bg-primary/10 data-[state=active]:font-semibold data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:hover:bg-primary/20';

/** `size-*` and not `h-/w-`: the base applies `[&_svg:not([class*='size-'])]:size-4`. */
export const AGENTS_TAB_ICON_CLASS = 'size-[18px]';

type CanFn = (resource: string, action: string) => boolean;

/** Empty until `isReady`: half-loaded permissions would evict the user from their own tab. */
export const getAllowedAgentsTabs = (can: CanFn, isReady: boolean): AgentsTabDefinition[] =>
  isReady ? AGENTS_TABS.filter(tab => can(tab.resource, 'read')) : [];

export const resolveFirstAllowedTab = (
  can: CanFn,
  isReady: boolean,
): AgentsTabDefinition | null => getAllowedAgentsTabs(can, isReady)[0] ?? null;
