import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Agent } from '@/types/agents';
import AgentTestChat from './AgentTestChat';

const listSessionsMock = vi.fn();
const getSessionMessagesMock = vi.fn();
const createSessionMock = vi.fn();
const deleteSessionMock = vi.fn();
const sendChatMessageMock = vi.fn();

vi.mock('@/services/agents/sessionService', () => ({
  listSessions: (...args: unknown[]) => listSessionsMock(...args),
  getSessionMessages: (...args: unknown[]) => getSessionMessagesMock(...args),
  createSession: (...args: unknown[]) => createSessionMock(...args),
  deleteSession: (...args: unknown[]) => deleteSessionMock(...args),
}));

vi.mock('@/services/agents/chatService', () => ({
  sendChatMessage: (...args: unknown[]) => sendChatMessageMock(...args),
}));

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key, currentLanguage: 'pt-BR' }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// JSDOM has no PointerEvent, so fireEvent.pointer* falls back to a bare Event and drops clientX.
if (typeof window.PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
    }
  }
  window.PointerEvent = PointerEventPolyfill as unknown as typeof PointerEvent;
}

const agent = { id: 'agent-1', name: 'Agente Teste' } as Agent;
const SESSION = { id: 'session-abc12345', update_time: '2026-10-08T12:00:00Z' };

const originalInnerWidth = window.innerWidth;

const setViewportWidth = (width: number) => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
};

const renderPanel = () =>
  render(<AgentTestChat open onOpenChange={vi.fn()} agent={agent} />);

const getHandle = () => screen.getByRole('separator', { name: 'chat.resizePanel' });

const drag = (handle: HTMLElement, fromX: number, toX: number) => {
  fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientX: fromX });
  fireEvent.pointerMove(handle, { pointerId: 1, clientX: toX });
  fireEvent.pointerUp(handle, { pointerId: 1, clientX: toX });
};

beforeEach(() => {
  setViewportWidth(1600);
  listSessionsMock.mockResolvedValue({ data: [] });
  getSessionMessagesMock.mockResolvedValue({ data: [] });
  createSessionMock.mockResolvedValue({ session_id: SESSION.id });
  deleteSessionMock.mockResolvedValue(undefined);
  sendChatMessageMock.mockResolvedValue({ message_history: [] });
});

afterEach(() => {
  setViewportWidth(originalInnerWidth);
  vi.clearAllMocks();
});

describe('AgentTestChat', () => {
  it('renders nothing while closed', () => {
    const { container } = render(
      <AgentTestChat open={false} onOpenChange={vi.fn()} agent={agent} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('opens as an in-page side panel, not a dialog', async () => {
    renderPanel();
    await waitFor(() => expect(listSessionsMock).toHaveBeenCalledWith('agent-1'));

    expect(screen.getByRole('complementary')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('starts at 460px and exposes the resize bounds', () => {
    renderPanel();
    const handle = getHandle();

    expect(handle).toHaveAttribute('aria-orientation', 'vertical');
    expect(handle).toHaveAttribute('aria-valuenow', '460');
    expect(handle).toHaveAttribute('aria-valuemin', '360');
    expect(handle).toHaveAttribute('aria-valuemax', '800');
  });

  it('widens when dragged left and stops at half the window', () => {
    renderPanel();
    const handle = getHandle();

    drag(handle, 1000, 900);
    expect(handle).toHaveAttribute('aria-valuenow', '560');

    drag(handle, 1000, 0);
    expect(handle).toHaveAttribute('aria-valuenow', '800');
  });

  it('narrows when dragged right and stops at the 360px minimum', () => {
    renderPanel();
    const handle = getHandle();

    drag(handle, 1000, 1050);
    expect(handle).toHaveAttribute('aria-valuenow', '410');

    drag(handle, 1000, 1600);
    expect(handle).toHaveAttribute('aria-valuenow', '360');
  });

  it('ignores pointer moves after the drag ended', () => {
    renderPanel();
    const handle = getHandle();

    drag(handle, 1000, 900);
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 500 });

    expect(handle).toHaveAttribute('aria-valuenow', '560');
  });

  it('resizes with the arrow keys inside the bounds', () => {
    renderPanel();
    const handle = getHandle();

    fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    expect(handle).toHaveAttribute('aria-valuenow', '476');

    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    expect(handle).toHaveAttribute('aria-valuenow', '444');

    for (let i = 0; i < 10; i++) fireEvent.keyDown(handle, { key: 'ArrowRight' });
    expect(handle).toHaveAttribute('aria-valuenow', '360');

    for (let i = 0; i < 40; i++) fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    expect(handle).toHaveAttribute('aria-valuenow', '800');
  });

  it('jumps to the bounds with Home/End and ignores modified arrows', () => {
    renderPanel();
    const handle = getHandle();

    fireEvent.keyDown(handle, { key: 'End' });
    expect(handle).toHaveAttribute('aria-valuenow', '800');

    fireEvent.keyDown(handle, { key: 'Home' });
    expect(handle).toHaveAttribute('aria-valuenow', '360');

    fireEvent.keyDown(handle, { key: 'ArrowLeft', shiftKey: true });
    expect(handle).toHaveAttribute('aria-valuenow', '360');
  });

  it('feeds the width to the panel through the CSS variable', () => {
    renderPanel();
    drag(getHandle(), 1000, 900);

    expect(screen.getByRole('complementary').style.getPropertyValue('--agent-chat-width')).toBe(
      '560px',
    );
  });

  it('locks text selection while dragging and restores it afterwards', () => {
    renderPanel();
    const handle = getHandle();

    fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientX: 1000 });
    expect(document.body.style.userSelect).toBe('none');
    expect(document.body.style.cursor).toBe('col-resize');

    fireEvent.pointerUp(handle, { pointerId: 1, clientX: 1000 });
    expect(document.body.style.userSelect).toBe('');
    expect(document.body.style.cursor).toBe('');
  });

  it('ends the drag when the pointer capture is lost', () => {
    renderPanel();
    const handle = getHandle();

    fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientX: 1000 });
    fireEvent.lostPointerCapture(handle, { pointerId: 1 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 900 });

    expect(handle).toHaveAttribute('aria-valuenow', '460');
    expect(document.body.style.userSelect).toBe('');
  });

  it('ignores a second pointer while a drag is active', () => {
    renderPanel();
    const handle = getHandle();

    fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientX: 1000 });
    fireEvent.pointerDown(handle, { button: 0, pointerId: 2, clientX: 500 });
    fireEvent.pointerMove(handle, { pointerId: 2, clientX: 400 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 900 });

    expect(handle).toHaveAttribute('aria-valuenow', '560');
  });

  it('re-applies the maximum when the window shrinks', () => {
    renderPanel();
    const handle = getHandle();
    drag(handle, 1000, 300);
    expect(handle).toHaveAttribute('aria-valuenow', '800');

    act(() => {
      setViewportWidth(1000);
      window.dispatchEvent(new Event('resize'));
    });

    expect(handle).toHaveAttribute('aria-valuenow', '500');
    expect(handle).toHaveAttribute('aria-valuemax', '500');
  });

  it('goes back to 460px when reopened', () => {
    const { rerender } = renderPanel();
    drag(getHandle(), 1000, 800);
    expect(getHandle()).toHaveAttribute('aria-valuenow', '660');

    rerender(<AgentTestChat open={false} onOpenChange={vi.fn()} agent={agent} />);
    rerender(<AgentTestChat open onOpenChange={vi.fn()} agent={agent} />);

    expect(getHandle()).toHaveAttribute('aria-valuenow', '460');
  });

  it('creates a session from the "+" button', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole('button', { name: 'chat.newConversation' }));

    await waitFor(() => expect(createSessionMock).toHaveBeenCalledWith('agent-1'));
  });

  it('sends the typed message through the chat service', async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole('button', { name: 'chat.newConversation' }));

    const input = await screen.findByPlaceholderText('chat.typeMessage');
    await user.type(input, 'Olá agente{Enter}');

    await waitFor(() =>
      expect(sendChatMessageMock).toHaveBeenCalledWith(
        'agent-1',
        SESSION.id,
        'Olá agente',
        undefined,
      ),
    );
  });

  it('deletes a session from the conversations popover', async () => {
    listSessionsMock.mockResolvedValue({ data: [SESSION] });
    const user = userEvent.setup();
    renderPanel();

    await user.click(await screen.findByRole('button', { name: 'chat.conversations' }));
    await user.click(await screen.findByRole('button', { name: 'actions.delete' }));

    await waitFor(() => expect(deleteSessionMock).toHaveBeenCalledWith(SESSION.id));
  });
});
