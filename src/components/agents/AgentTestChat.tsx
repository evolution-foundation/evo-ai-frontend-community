import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import { Agent } from '@/types/agents';
import { AgentChatProvider } from '@/contexts/agents/AgentChatContext';
import { AgentChatArea } from '@/pages/Customer/Agents/Agent/chat';
import { useLanguage } from '@/hooks/useLanguage';
import { AgentChatPanelHeader } from './chat/AgentChatPanelHeader';

interface AgentTestChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: Agent;
}

const PANEL_DEFAULT_WIDTH = 460;
const PANEL_MIN_WIDTH = 360;
const KEYBOARD_STEP = 16;

const maxPanelWidth = () => Math.max(PANEL_MIN_WIDTH, Math.floor(window.innerWidth / 2));

const clampPanelWidth = (width: number) =>
  Math.min(maxPanelWidth(), Math.max(PANEL_MIN_WIDTH, width));

/**
 * Side panel, not a modal: a flex sibling of the content, so the edit area shrinks and
 * stays editable while the chat is open. Below 768px its 360px minimum does not fit,
 * so it leaves the flow and covers the screen instead of overflowing the page.
 */
export default function AgentTestChat({ open, onOpenChange, agent }: AgentTestChatProps) {
  if (!open) return null;

  return <AgentTestChatPanel agent={agent} onClose={() => onOpenChange(false)} />;
}

function AgentTestChatPanel({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const { t } = useLanguage('aiAgents');
  const [width, setWidth] = useState(() => clampPanelWidth(PANEL_DEFAULT_WIDTH));
  const [maxWidth, setMaxWidth] = useState(maxPanelWidth);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<{ pointerId: number; x: number; width: number } | null>(null);

  useEffect(() => {
    const handleResize = () => {
      setMaxWidth(maxPanelWidth());
      setWidth(clampPanelWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    const { userSelect, cursor } = document.body.style;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    return () => {
      document.body.style.userSelect = userSelect;
      document.body.style.cursor = cursor;
    };
  }, [isDragging]);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || dragStart.current) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = { pointerId: event.pointerId, x: event.clientX, width };
    setIsDragging(true);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragStart.current?.pointerId !== event.pointerId) return;
    // The panel sits on the right, so dragging left (smaller clientX) widens it.
    setWidth(clampPanelWidth(dragStart.current.width + dragStart.current.x - event.clientX));
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (dragStart.current?.pointerId !== event.pointerId) return;
    dragStart.current = null;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const resize: Record<string, (current: number) => number> = {
      ArrowLeft: current => current + KEYBOARD_STEP,
      ArrowRight: current => current - KEYBOARD_STEP,
      Home: () => PANEL_MIN_WIDTH,
      End: () => maxPanelWidth(),
    };
    const next = resize[event.key];
    if (!next) return;
    event.preventDefault();
    setWidth(current => clampPanelWidth(next(current)));
  };

  // Width changes at pointer rate; keep the chat (and its message history) out of that render.
  const chat = useMemo(
    () => (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <AgentChatProvider agentId={agent.id}>
          <AgentChatPanelHeader agent={agent} onClose={onClose} />
          <AgentChatArea agent={agent} />
        </AgentChatProvider>
      </div>
    ),
    [agent, onClose],
  );

  return (
    <aside
      style={{ '--agent-chat-width': `${width}px` } as CSSProperties}
      className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-background md:relative md:inset-auto md:z-auto md:w-(--agent-chat-width) md:flex-shrink-0 md:overflow-visible md:border-l md:border-border"
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={t('chat.resizePanel') || 'Redimensionar painel'}
        aria-valuenow={width}
        aria-valuemin={PANEL_MIN_WIDTH}
        aria-valuemax={maxWidth}
        aria-valuetext={`${width}px`}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
        onKeyDown={handleKeyDown}
        data-dragging={isDragging || undefined}
        className="group absolute inset-y-0 -left-[3px] z-10 hidden w-2 cursor-col-resize touch-none outline-none md:block"
      >
        <span className="pointer-events-none absolute inset-y-0 left-[3px] w-0.5 bg-border transition-colors duration-[120ms] ease-[ease] group-hover:bg-primary group-focus-visible:bg-primary group-data-[dragging]:bg-primary" />
      </div>

      {chat}
    </aside>
  );
}
