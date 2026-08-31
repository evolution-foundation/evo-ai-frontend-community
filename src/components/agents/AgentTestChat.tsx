import { Agent } from '@/types/agents';
import { AgentChatProvider } from '@/contexts/agents/AgentChatContext';
import { AgentChatArea } from '@/pages/Customer/Agents/Agent/chat';
import { AgentChatPanelHeader } from './chat/AgentChatPanelHeader';

interface AgentTestChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: Agent;
}

/**
 * Side panel, not a modal: a flex sibling of the content, so the edit area shrinks and
 * stays editable while the chat is open. Below 768px its 360px minimum does not fit,
 * so it leaves the flow and covers the screen instead of overflowing the page.
 */
export default function AgentTestChat({ open, onOpenChange, agent }: AgentTestChatProps) {
  if (!open) return null;

  return (
    <aside className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-background md:static md:z-auto md:w-[460px] md:min-w-[360px] md:flex-shrink-0 md:border-l md:border-border">
      <AgentChatProvider agentId={agent.id}>
        <AgentChatPanelHeader agent={agent} onClose={() => onOpenChange(false)} />
        <AgentChatArea agent={agent} />
      </AgentChatProvider>
    </aside>
  );
}
