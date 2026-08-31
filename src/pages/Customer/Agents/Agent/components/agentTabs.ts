import { isExternalAgent, isOrchestratorAgent } from '@/utils/agents';

export type AgentDetailTab = 'profile' | 'tools' | 'products' | 'configuration' | 'channels';

/** Below 768px the 5 chips do not fit, so the bar scrolls instead of wrapping. */
export const AGENT_TAB_LIST_CLASS =
  'h-auto w-full flex-nowrap justify-start gap-2 overflow-x-auto rounded-none bg-transparent p-0';

/** `flex-none`/`h-auto` cancel the TabsTrigger base, which tailwind-merge leaves in place. */
export const AGENT_TAB_TRIGGER_CLASS =
  'inline-flex h-auto flex-none items-center gap-2 rounded-[9px] border border-transparent bg-transparent px-4 py-[9px] text-[13.5px] font-medium text-muted-foreground shadow-none hover:bg-accent hover:text-foreground data-[state=active]:border-primary/30 data-[state=active]:bg-primary/10 data-[state=active]:font-semibold data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:hover:bg-primary/20';

/** `size-*` and not `h-/w-`: the base applies `[&_svg:not([class*='size-'])]:size-4`. */
export const AGENT_TAB_ICON_CLASS = 'size-[18px]';

/** Sub agents are offered to LLM and flow orchestrators, not to `task`/`external`. */
export const supportsSubAgents = (agentType?: string): boolean =>
  ['llm', 'sequential', 'parallel', 'loop'].includes(agentType || '');

/** Tools, integrations and MCP servers: non-orchestrator, non-external types only. */
export const supportsToolBlocks = (agentType?: string): boolean =>
  !isOrchestratorAgent(agentType) && !isExternalAgent(agentType);

/** Mirrors the gates of the 3 ConfigurationSection cards; outside this list the tab is empty. */
export const supportsConfiguration = (agentType?: string): boolean =>
  ['llm', 'a2a', 'task', 'external'].includes(agentType || '');

export const getVisibleAgentTabs = (agentType?: string): AgentDetailTab[] => {
  const tabs: AgentDetailTab[] = ['profile'];

  if (supportsSubAgents(agentType) || supportsToolBlocks(agentType)) {
    tabs.push('tools');
  }
  if (!isOrchestratorAgent(agentType)) {
    tabs.push('products');
  }
  if (supportsConfiguration(agentType)) {
    tabs.push('configuration');
  }

  tabs.push('channels');
  return tabs;
};
